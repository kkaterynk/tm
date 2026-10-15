import {Controller, Get, Post, Patch, Param, Delete, UseGuards, Request, Body} from "@nestjs/common"
import { BoardsService } from "./boards.service"
import { CreateBoardDto } from "./dto/create-board.dto"
import { UpdateBoardDto } from "./dto/update-board.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import {ShareBoardDto} from "./dto/share-board.dto";
import {ApiTags} from "@nestjs/swagger";

interface AuthenticatedRequest extends Request {
  user: {
    userId: string
    email: string
  }
}

@ApiTags("Board")
@Controller("boards")
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@Body()createBoardDto: CreateBoardDto, @Request() req: AuthenticatedRequest) {
    return this.boardsService.create(createBoardDto, req.user.userId)
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.boardsService.findAllByUser(req.user.userId)
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.boardsService.findOne(id, req.user.userId)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateBoardDto: UpdateBoardDto, @Request() req: AuthenticatedRequest) {
    return this.boardsService.update(id, updateBoardDto, req.user.userId)
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.boardsService.remove(id, req.user.userId)
  }

  @Post(":id/share")
  shareBoard(@Param("id") id: string, @Request() req: AuthenticatedRequest, @Body() shareBoardDto: ShareBoardDto) {
    return this.boardsService.shareBoard(id, shareBoardDto.email, req.user.userId)
  }

  @Get(":id/members")
  getBoardMembers(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.boardsService.getBoardMembers(id, req.user.userId)
  }

  @Delete(":id/members/:memberId")
  removeMember(@Param("id") id: string, @Param("memberId") memberId: string, @Request() req: AuthenticatedRequest) {
    return this.boardsService.removeMember(id, memberId, req.user.userId)
  }

  @Get("debug/memberships")
  async debugMemberships(@Request() req: AuthenticatedRequest) {
    const { boardMemberModel } = this.boardsService as any
    const memberships = await boardMemberModel.find({ userId: req.user.userId }).exec()
    return {
      userId: req.user.userId,
      memberships: memberships.map(m => ({
        boardId: m.boardId.toString(),
        userId: m.userId.toString(),
        isAdmin: m.isAdmin
      }))
    }
  }

  // Leave board endpoint
  @Post(":id/leave")
  async leaveBoard(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    await this.boardsService.leaveBoard(id, req.user.userId)
    return { message: "Successfully left the board" }
  }

  // Permission check endpoints
  @Get(":id/permissions")
  async getBoardPermissions(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.boardsService.getBoardPermissionsForUser(id, req.user.userId)
  }

  @Patch(":id/members/:memberId/permissions")
  updateMemberPermissions(
      @Param("id") id: string,
      @Param("memberId") memberId: string,
      @Body() body: { permissions: string[] },
      @Request() req: AuthenticatedRequest,
  ) {
    return this.boardsService.updateMemberPermissions(id, memberId, body.permissions as any, req.user.userId)
  }

  @Get(":id/members/:memberId/permissions")
  getMemberPermissions(
      @Param("id") id: string,
      @Param("memberId") memberId: string,
      @Request() req: AuthenticatedRequest,
  ) {
    return this.boardsService.getMemberPermissionsByMemberId(id, memberId, req.user.userId)
  }
}
