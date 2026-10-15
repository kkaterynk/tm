import {ForbiddenException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import {Model, Types} from "mongoose"
import { Column, ColumnDocument } from "./schemas/column.schema"
import { CreateColumnDto } from "./dto/create-column.dto"
import { UpdateColumnDto } from "./dto/update-column.dto"
import { ReorderColumnsDto } from "./dto/reorder-columns.dto"
import { BoardsService } from "../boards/boards.service"
import {BoardPermission} from "../boards/schemas/board-member.schema";

@Injectable()
export class ColumnsService {
  constructor(
      @InjectModel(Column.name) private columnModel: Model<ColumnDocument>,
      @Inject(forwardRef(()=>BoardsService))
      private boardsService: BoardsService
  ) {}

  async create(createColumnDto: CreateColumnDto, userId: string): Promise<ColumnDocument> {
    // Verify user owns the board
    // await this.boardsService.findOne(createColumnDto.boardId, userId)

    const permissions = await this.boardsService.getMemberPermissions(createColumnDto.boardId, userId)
    if (!permissions.includes(BoardPermission.MANAGE_COLUMNS) && !permissions.includes(BoardPermission.ADMIN)) {
      const isOwner = await this.boardsService.isOwner(createColumnDto.boardId, userId)
      if (!isOwner) {
        throw new ForbiddenException("You don't have permission to create columns")
      }
    }

    const columnCount = await this.columnModel.countDocuments({ boardId: createColumnDto.boardId })

    const createdColumn = new this.columnModel({
      ...createColumnDto,
      position: columnCount,
    })
    return createdColumn.save()
  }

  async findByBoard(boardId: string, userId: string): Promise<ColumnDocument[]> {
    // Verify user owns the board
    await this.boardsService.findOne(boardId, userId)

    return this.columnModel.find({ boardId }).sort({ position: 1 }).exec()
  }

  async findOne(id: string, userId: string): Promise<ColumnDocument> {
    const column = await this.columnModel.findById(id).exec()
    if (!column) {
      throw new NotFoundException("Column not found")
    }

    // Verify user owns the board
    await this.boardsService.findOne(column.boardId.toString(), userId)

    return column
  }

  async update(id: string, updateColumnDto: UpdateColumnDto, userId: string): Promise<ColumnDocument> {
    const column = await this.findOne(id, userId)

    // Check if user has permission to manage columns
    const permissions = await this.boardsService.getMemberPermissions(column.boardId.toString(), userId)
    if (!permissions.includes(BoardPermission.MANAGE_COLUMNS) && !permissions.includes(BoardPermission.ADMIN)) {
      const isOwner = await this.boardsService.isOwner(column.boardId.toString(), userId)
      if (!isOwner) {
        throw new ForbiddenException("You don't have permission to update columns")
      }
    }

    Object.assign(column, updateColumnDto)
    return column.save()
  }

  async reorder(reorderDto: ReorderColumnsDto, userId: string): Promise<ColumnDocument[]> {
    // Verify user owns the board
    await this.boardsService.findOne(reorderDto.boardId, userId)

    const permissions = await this.boardsService.getMemberPermissions(reorderDto.boardId, userId)
    console.log("PERMISSIONS__", permissions)
    const isOwner = await this.boardsService.isOwner(reorderDto.boardId, userId)

    if (!permissions.includes(BoardPermission.MANAGE_COLUMNS) && !permissions.includes(BoardPermission.ADMIN) && !isOwner) {
        throw new ForbiddenException("You don't have permission to reorder columns")
    }

    // Update positions
    for (let i = 0; i < reorderDto.columnIds.length; i++) {
      await this.columnModel.findByIdAndUpdate(reorderDto.columnIds[i], { position: i })
    }

    return this.findByBoard(reorderDto.boardId, userId)
  }

  async remove(id: string, userId: string): Promise<ColumnDocument> {
    const column = await this.findOne(id, userId)

    // Check if user has permission to manage columns
    const permissions = await this.boardsService.getMemberPermissions(column.boardId.toString(), userId)
    if (!permissions.includes(BoardPermission.MANAGE_COLUMNS) && !permissions.includes(BoardPermission.ADMIN)) {
      const isOwner = await this.boardsService.isOwner(column.boardId.toString(), userId)
      if (!isOwner) {
        throw new ForbiddenException("You don't have permission to delete columns")
      }
    }

    return this.columnModel.findByIdAndDelete(id).exec()
  }

  async findByBoardWithoutPermissionCheck(boardId: string | Types.ObjectId): Promise<ColumnDocument[]> {
    console.log(`Finding columns for board ${boardId} without permission check`)

    const boardObjectId = typeof boardId === "string" ? new Types.ObjectId(boardId) : boardId

    const columns = await this.columnModel.find({ boardId: boardObjectId }).sort({ position: 1 }).exec()
    console.log(`Found ${columns.length} columns for board ${boardId}`)

    return columns
  }
}
