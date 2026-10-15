import {ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common"
import {InjectModel} from "@nestjs/mongoose"
import {Model, Types} from "mongoose"
import {Board, type BoardDocument} from "./schemas/board.schema"
import {BoardMember, type BoardMemberDocument, BoardPermission} from "./schemas/board-member.schema"
import {CreateBoardDto} from "./dto/create-board.dto"
import {UpdateBoardDto} from "./dto/update-board.dto"
import {UsersService} from "../users/users.service"
import {TasksService} from "../tasks/tasks.service";
import {NotificationsService} from "../notifications/notifications.service";

@Injectable()
export class BoardsService {
  constructor(
      @InjectModel(Board.name)
      private readonly boardModel: Model<BoardDocument>,
      @InjectModel(BoardMember.name)
      private readonly boardMemberModel: Model<BoardMemberDocument>,
      private readonly usersService: UsersService,
      private notificationsService: NotificationsService,
      @Inject(forwardRef(() => TasksService))
      private tasksService: TasksService,
  ) {  }

  async create(createBoardDto: CreateBoardDto, userId: string): Promise<BoardDocument> {
    const createdBoard = new this.boardModel({
      ...createBoardDto,
      owner: userId,
    })
    return createdBoard.save()
  }

  async findAllByUser(userId: string): Promise<BoardDocument[]> {
    console.log(`Finding boards for user: ${userId}`)
    const userObjectId = new Types.ObjectId(userId)
    // Get boards owned by the user
    const ownedBoards = await this.boardModel.find({ owner: userId }).sort({ createdAt: -1 }).exec()
    console.log(`Found ${ownedBoards.length} owned boards`)

    // Get shared boards
    const memberBoards = await this.boardMemberModel.find({ userId: userObjectId }).exec()
    console.log(`Found ${memberBoards.length} board memberships`)
    const sharedBoardIds = memberBoards.map((member) => member.boardId)
    const sharedBoards =
        sharedBoardIds.length > 0
            ? await this.boardModel
                .find({ _id: { $in: sharedBoardIds } })
                .sort({ createdAt: -1 })
                .exec()
            : []
    console.log(`Found ${sharedBoards.length} shared boards`)

    return [...ownedBoards, ...sharedBoards]
  }

  async findOne(id: string, userId: string): Promise<BoardDocument> {
    const board = await this.boardModel.findById(id).exec()
    if (!board) {
      throw new NotFoundException("Board not found")
    }

    if (board.owner.toString() === userId) {
      return board
    }

    // Check if user is a member
    const membership = await this.boardMemberModel.findOne({ boardId: id, userId: new Types.ObjectId(userId)}).exec()
    if (!membership) {
      throw new ForbiddenException("Access denied")
    }

    return board
  }

  async update(id: string, updateBoardDto: UpdateBoardDto, userId: string): Promise<BoardDocument> {
    const board = await this.findOne(id, userId)

    // Only the owner can update critical properties
    if (board.owner.toString() !== userId) {
      const userPermissions = await this.getMemberPermissions(id, userId)
      if (!userPermissions.includes(BoardPermission.ADMIN)) {
        // For shared users, limit what can be updated
        const allowedFields = ["description"]
        const attemptedUpdates = Object.keys(updateBoardDto)

        for (const field of attemptedUpdates) {
          if (!allowedFields.includes(field)) {
            throw new ForbiddenException(`You don't have permission to update the ${field} field`)
          }
        }
      }
    }

    Object.assign(board, updateBoardDto)
    return board.save()
  }

  async remove(id: string, userId: string): Promise<BoardDocument> {
    const board = await this.findOne(id, userId)
    if (board.owner.toString() !== userId) {
      throw new ForbiddenException("Only the board owner can delete it")
    }

    // Delete all related memberships
    await this.boardMemberModel.deleteMany({ boardId: id }).exec()

    return this.boardModel.findByIdAndDelete(id).exec()
  }

  async shareBoard(id: string, email: string, userId: string): Promise<BoardMemberDocument> {
    // Verify board exists and user is the owner
    const board = await this.boardModel.findById(id).exec()
    if (!board) {
      throw new NotFoundException("Board not found")
    }

    // Check if user is the owner or admin member
    const isOwner = board.owner.toString() === userId

    if (!isOwner) {
      // Check if user is admin member
      const userPermissions = await this.getMemberPermissions(id, userId)
      if (
          !userPermissions.includes(BoardPermission.MANAGE_MEMBERS) &&
          !userPermissions.includes(BoardPermission.ADMIN)
      ) {
        throw new ForbiddenException("You don't have permission to share this board")
      }
    }

    // Find user by email
    const userToShare = await this.usersService.findByEmail(email)
    if (!userToShare) {
      throw new NotFoundException(`User with email ${email} not found`)
    }

    // Check if already shared
    const existingMembership = await this.boardMemberModel
        .findOne({
          boardId: id,
          userId: userToShare._id,
        })
        .exec()

    if (existingMembership) {
      throw new ConflictException("Board is already shared with this user")
    }

    // Don't share with the owner
    if (userToShare._id.toString() === board.owner.toString()) {
      throw new ConflictException("Cannot share board with its owner")
    }

    // Create new membership
    const boardMember = new this.boardMemberModel({
      boardId: id,
      userId: userToShare._id,
      isAdmin: false,
      permissions: [BoardPermission.VIEW, BoardPermission.EDIT_TASKS],
    })

    const sharedByUser = await this.usersService.findById(userId)
    await this.notificationsService.notifyBoardShared(
        userToShare._id.toString(),
        board.title,
        sharedByUser.name || sharedByUser.email,
    )

    return boardMember.save()
  }

  async getBoardMembers(id: string, userId: string): Promise<any[]> {
    // Verify access to board
    await this.findOne(id, userId)

    // Get all members
    const members = await this.boardMemberModel.find({ boardId: id }).exec()

    // Get user details for each member
    const memberDetails = await Promise.all(
        members.map(async (member) => {
          const user = await this.usersService.findById(member.userId.toString())
          return {
            memberId: member._id,
            userId: user._id,
            email: user.email,
            name: user.name,
            isAdmin: member.isAdmin,
            permissions: member.permissions,
          }
        }),
    )

    // Get the owner details
    const board = await this.boardModel.findById(id).exec()
    const owner = await this.usersService.findById(board.owner.toString())

    return [
      {
        memberId: null, // Owner is not in the members table
        userId: owner._id,
        email: owner.email,
        name: owner.name,
        isOwner: true,
        permissions: Object.values(BoardPermission),
      },
      ...memberDetails,
    ]
  }

  async removeMember(boardId: string, memberId: string, userId: string): Promise<void> {
    // Verify board exists and user has access
    const board = await this.findOne(boardId, userId)

    // Check if user is the owner or an admin
    const isOwner = board.owner.toString() === userId

    if (!isOwner) {

      const userPermissions = await this.getMemberPermissions(boardId, userId)
      if (
          !userPermissions.includes(BoardPermission.MANAGE_MEMBERS) &&
          !userPermissions.includes(BoardPermission.ADMIN)
      ) {
        throw new ForbiddenException("You don't have permission to remove members")
      }
    }

    // Find the membership to remove
    const memberToRemove = await this.boardMemberModel.findById(memberId).exec()
    if (!memberToRemove) {
      throw new NotFoundException("Board member not found")
    }

    // Remove the membership
    await this.boardMemberModel.findByIdAndDelete(memberId).exec()
    await this.removeUserFromBoardTasks(boardId, memberToRemove.userId.toString())
  }

  async leaveBoard(boardId: string, userId: string): Promise<void> {
    console.log(`User ${userId} attempting to leave board ${boardId}`)

    // Convert string IDs to ObjectIds
    const boardObjectId = new Types.ObjectId(boardId)
    const userObjectId = new Types.ObjectId(userId)

    // Verify board exists and user has access
    const board = await this.findOne(boardId, userId)

    // Check if user is the owner
    if (board.owner.toString() === userId) {
      throw new ForbiddenException(
          "Board owners cannot leave their own boards. Transfer ownership or delete the board instead.",
      )
    }

    // Find the user's membership
    const membership = await this.boardMemberModel
        .findOne({
          boardId,
          userId: userObjectId,
        })
        .exec()

    if (!membership) {
      throw new NotFoundException("You are not a member of this board")
    }

    // Remove the membership
    await this.boardMemberModel.findByIdAndDelete(membership._id).exec()

    // Remove user from all task assignments on this board
    await this.removeUserFromBoardTasks(boardId, userId)

    console.log(`User ${userId} successfully left board ${boardId}`)
  }

  private async removeUserFromBoardTasks(boardId: string, userId: string): Promise<void> {
    console.log(`Removing user ${userId} from all task assignments on board ${boardId}`)

    await this.tasksService.removeUserFromBoardTasks(boardId, userId)
  }

  // Check if a user has access to a board
  async hasAccess(boardId: string, userId: string): Promise<boolean> {
    try {
      await this.findOne(boardId, userId)
      return true
    } catch (error) {
      return false
    }
  }

  // Check if a user is the owner of a board
  async isOwner(boardId: string, userId: string): Promise<boolean> {
    try {
      const board = await this.boardModel.findById(new Types.ObjectId(boardId)).exec()
      return board?.owner.toString() === userId
    } catch (error) {
      return false
    }
  }

  // Check if a user is an admin of a board
  async isAdmin(boardId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.boardMemberModel
          .findOne({
            boardId: new Types.ObjectId(boardId),
            userId: new Types.ObjectId(userId),
            // isAdmin: true,
          })
          .exec()
      return membership?.isAdmin || false
    } catch (error) {
      return false
    }
  }

  async updateMemberPermissions(
      boardId: string,
      memberId: string,
      permissions: BoardPermission[],
      userId: string,
  ): Promise<BoardMemberDocument> {
    // Verify user is owner or admin
    const board = await this.findOne(boardId, userId)
    const isOwner = board.owner.toString() === userId

    if (!isOwner) {
      const userMembership = await this.boardMemberModel
          .findOne({
            boardId,
            userId: new Types.ObjectId(userId),
            // isAdmin: true,
            permissions: BoardPermission.ADMIN
          })
          .exec()

      if (!userMembership) {
        throw new ForbiddenException("Only board owners or admins can update permissions")
      }
    }

    const member = await this.boardMemberModel.findById(memberId).exec()
    if (!member) {
      throw new NotFoundException("Board member not found")
    }

    const updatedPermissions = permissions.includes(BoardPermission.VIEW)
        ? permissions
        : [BoardPermission.VIEW, ...permissions]

    member.permissions = updatedPermissions
    const updatedMember = await member.save()

    // Send notification
    const updatedByUser = await this.usersService.findById(userId)
    await this.notificationsService.notifyPermissionChanged(
        member.userId.toString(),
        board.title,
        updatedPermissions,
        updatedByUser.name || updatedByUser.email,
    )

    return updatedMember
  }

  async getMemberPermissions(boardId: string, userId: string): Promise<BoardPermission[]> {
    const board = await this.boardModel.findById(boardId).exec()
    if (!board) {
      throw new NotFoundException("Board not found")
    }

    // Owner has all permissions
    if (board.owner.toString() === userId) {
      return Object.values(BoardPermission)
    }

    const membership = await this.boardMemberModel
        .findOne({
          boardId,
          userId: new Types.ObjectId(userId),
        })
        .exec()

    console.log("MEMBERSHIP__", membership)

    return membership?.permissions || [BoardPermission.VIEW]
  }

  async getMemberPermissionsByMemberId(
      boardId: string,
      memberId: string,
      requestingUserId: string,
  ): Promise<BoardPermission[]> {
    // Verify requesting user has access to the board
    await this.findOne(boardId, requestingUserId)

    const member = await this.boardMemberModel.findById(memberId).exec()
    if (!member) {
      throw new NotFoundException("Board member not found")
    }

    return member.permissions || [BoardPermission.VIEW]
  }

  async getBoardPermissionsForUser(boardId: string, userId: string) {
    const board = await this.boardModel.findById(boardId).exec()
    if (!board) {
      throw new NotFoundException("Board not found")
    }

    const isOwner = board.owner.toString() === userId

    if (isOwner) {
      return {
        isOwner: true,
        isAdmin: true,
        canEdit: true,
        canManageMembers: true,
        canLeave: false,
        canEditTasks: true,
        canManageColumns: true,
        permissions: Object.values(BoardPermission),
      }
    }

    const membership = await this.boardMemberModel
        .findOne({
          boardId,
          userId: new Types.ObjectId(userId),
        })
        .exec()

    if (!membership) {
      throw new ForbiddenException("Access denied - you are not a member of this board")
    }

    const permissions = membership.permissions || [BoardPermission.VIEW]

    return {
      isOwner: false,
      isAdmin: membership.isAdmin || permissions.includes(BoardPermission.ADMIN),
      canEdit: permissions.includes(BoardPermission.ADMIN),
      canManageMembers:
          permissions.includes(BoardPermission.MANAGE_MEMBERS) || permissions.includes(BoardPermission.ADMIN),
      canLeave: true,
      canEditTasks: permissions.includes(BoardPermission.EDIT_TASKS) || permissions.includes(BoardPermission.ADMIN),
      canManageColumns:
          permissions.includes(BoardPermission.MANAGE_COLUMNS) || permissions.includes(BoardPermission.ADMIN),
      permissions,
    }
  }
}
