import {Controller, Get, Post, Patch, Param, Delete, UseGuards, Request, Query, Body} from "@nestjs/common"
import { TasksService } from "./tasks.service"
import { CreateTaskDto } from "./dto/create-task.dto"
import { UpdateTaskDto } from "./dto/update-task.dto"
import { MoveTaskDto } from "./dto/move-task.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import {ApiTags} from "@nestjs/swagger";

interface AuthenticatedRequest extends Request {
  user: {
    userId: string
  }
}

@ApiTags("Task")
@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: AuthenticatedRequest) {
    return this.tasksService.create(createTaskDto, req.user.userId)
  }

  @Get()
  findByColumn(
      @Query("columnId") columnId: string,
      @Query("boardId") boardId: string,
      @Request() req: AuthenticatedRequest,
  ) {
    if (boardId) {
      return this.tasksService.findByBoard(boardId, req.user.userId)
    }
    return this.tasksService.findByColumn(columnId, req.user.userId)
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.findOne(id, req.user.userId)
  }

  @Patch(":id/move")
  move(@Param("id") id: string, @Body() moveTaskDto: MoveTaskDto, @Request() req: AuthenticatedRequest) {
    return this.tasksService.move(id, moveTaskDto, req.user.userId)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req: AuthenticatedRequest) {
    return this.tasksService.update(id, updateTaskDto, req.user.userId)
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.remove(id, req.user.userId)
  }
}
