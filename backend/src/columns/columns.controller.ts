import {Controller, Get, Post, Patch, Param, Delete, UseGuards, Request, Query, Body} from "@nestjs/common"
import { ColumnsService } from "./columns.service"
import { CreateColumnDto } from "./dto/create-column.dto"
import { UpdateColumnDto } from "./dto/update-column.dto"
import { ReorderColumnsDto } from "./dto/reorder-columns.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import {ApiTags} from "@nestjs/swagger";

interface AuthenticatedRequest extends Request {
  user: {
    userId: string
  }
}

@ApiTags("Column")
@Controller("columns")
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  create(@Body() createColumnDto: CreateColumnDto, @Request() req: AuthenticatedRequest) {
    return this.columnsService.create(createColumnDto, req.user.userId)
  }

  @Get()
  findByBoard(@Query("boardId") boardId: string, @Request() req: AuthenticatedRequest) {
    return this.columnsService.findByBoard(boardId, req.user.userId)
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.columnsService.findOne(id, req.user.userId)
  }

  @Patch("reorder")
  reorder(@Body() reorderDto: ReorderColumnsDto, @Request() req: AuthenticatedRequest) {
    return this.columnsService.reorder(reorderDto, req.user.userId)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateColumnDto: UpdateColumnDto, @Request() req: AuthenticatedRequest) {
    return this.columnsService.update(id, updateColumnDto, req.user.userId)
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.columnsService.remove(id, req.user.userId)
  }
}
