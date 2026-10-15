import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import {Model, Types} from "mongoose"
import { Task, TaskDocument } from "./schemas/task.schema"
import { CreateTaskDto } from "./dto/create-task.dto"
import { UpdateTaskDto } from "./dto/update-task.dto"
import { MoveTaskDto } from "./dto/move-task.dto"
import { ColumnsService } from "../columns/columns.service"
import { NotificationsService } from "../notifications/notifications.service"
import { BoardsService } from "../boards/boards.service"
import { UsersService } from "../users/users.service";
import {BoardPermission} from "../boards/schemas/board-member.schema";

@Injectable()
export class TasksService {
  private taskModel: Model<TaskDocument>
  constructor(
      @InjectModel(Task.name) taskModel: Model<TaskDocument>,
      private columnsService: ColumnsService,
      private readonly usersService: UsersService,
      @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
      @Inject(forwardRef(() => BoardsService)) private boardsService: BoardsService,
  ) {
    this.taskModel = taskModel
  }

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<TaskDocument> {
    console.log("Creating task:", createTaskDto, "for user:", userId)
    // Verify user owns the column
    const column = await this.columnsService.findOne(createTaskDto.columnId, userId)

    const permissions = await this.boardsService.getMemberPermissions(column.boardId.toString(), userId)
    if (!permissions.includes(BoardPermission.EDIT_TASKS) && !permissions.includes(BoardPermission.ADMIN)) {
      const isOwner = await this.boardsService.isOwner(column.boardId.toString(), userId)
      if (!isOwner) {
        throw new ForbiddenException("You don't have permission to create tasks")
      }
    }

    const taskCount = await this.taskModel.countDocuments({ columnId: createTaskDto.columnId })

    const createdTask = new this.taskModel({
      ...createTaskDto,
      position: taskCount,
    })
    const savedTask = await createdTask.save()
    console.log("Created task:", savedTask)
    return savedTask
  }

  async findByColumn(columnId: string, userId: string): Promise<TaskDocument[]> {
    console.log("Finding tasks by column:", columnId, "for user:", userId)
    // Verify user owns the column
    await this.columnsService.findOne(columnId, userId)

    const tasks = await this.taskModel.find({ columnId }).sort({ position: 1 }).exec()
    console.log("Found tasks:", tasks)
    return tasks
  }

  async findByBoard(boardId: string, userId: string): Promise<TaskDocument[]> {
    console.log("Finding tasks by board:", boardId, "for user:", userId)
    // Get all columns for the board
    const columns = await this.columnsService.findByBoard(boardId, userId)
    const columnIds = columns.map((col) => col._id.toString())

    const tasks = await this.taskModel
        .find({ columnId: { $in: columnIds } })
        .sort({ position: 1 })
        .exec()

    console.log("Found tasks for board:", tasks)
    return tasks
  }

  async findOne(id: string, userId: string): Promise<TaskDocument> {
    console.log("Finding task:", id, "for user:", userId)
    const task = await this.taskModel.findById(id).exec()
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`)
    }

    // Verify user owns the column
    await this.columnsService.findOne(task.columnId.toString(), userId)

    return task
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<TaskDocument> {
    console.log("Updating task:", id, "with data:", updateTaskDto, "for user:", userId)
    const task = await this.findOne(id, userId)

    if (updateTaskDto.title !== undefined) {
      task.title = updateTaskDto.title
    }

    if (updateTaskDto.description !== undefined) {
      task.description = updateTaskDto.description
    }

    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate
    }

    if (updateTaskDto.attachments !== undefined) {
      task.attachments = updateTaskDto.attachments.map((attachment) => ({
        ...attachment,
        uploadedBy: new Types.ObjectId(attachment.uploadedBy),
      }))    }

    if (updateTaskDto.customLabels !== undefined) {
      task.customLabels = updateTaskDto.customLabels.map(label => ({
        name: label.name,
        color: label.color,
      }));
    }

    if (updateTaskDto.labels !== undefined) {
      task.labels = updateTaskDto.labels
    }

    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate
    }

    // if (updateTaskDto.assigneeId !== undefined) {
    //   task.assigneeId = new Types.ObjectId(updateTaskDto.assigneeId)
    // }

    if (updateTaskDto.assigneeId !== undefined) {
      if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== task.assigneeId?.toString()) {
        // Get board info for notification
        const column = await this.columnsService.findOne(task.columnId.toString(), userId)
        const board = await this.boardsService.findOne(column.boardId.toString(), userId)
        const assignedByUser = await this.usersService.findById(userId)

        await this.notificationsService.notifyTaskAssigned(
            updateTaskDto.assigneeId,
            task.title,
            board.title,
            assignedByUser.name || assignedByUser.email,
        )
      }
      task.assigneeId = new Types.ObjectId(updateTaskDto.assigneeId)
    }

    const updatedTask = await task.save()
    console.log("Updated task:", updatedTask)
    return updatedTask
  }

  async move(id: string, moveTaskDto: MoveTaskDto, userId: string): Promise<TaskDocument> {
    console.log("Moving task:", id, "with data:", moveTaskDto, "for user:", userId)

    const { columnId, position } = moveTaskDto

    // Validate inputs
    if (position < 0) {
      throw new BadRequestException("Position must be a non-negative number")
    }
    const task = await this.findOne(id, userId)

    /*// Verify user owns the target column
    await this.columnsService.findOne(moveTaskDto.columnId, userId)

    // Update task position and column
    task.columnId = moveTaskDto.columnId as any
    task.position = moveTaskDto.position

    return task.save()*/
    await this.columnsService.findOne(columnId, userId)

    const sourceColumnId = task.columnId.toString()
    const targetColumnId = columnId

    console.log("Moving task from column:", sourceColumnId, "to column:", targetColumnId, "at position:", position)

    // If moving to a different column
    if (sourceColumnId !== targetColumnId) {
      // Update task's column
      task.columnId = columnId as any

      // Get all tasks in the target column
      const targetColumnTasks = await this.taskModel.find({ columnId: targetColumnId }).sort({ position: 1 }).exec()

      // Shift positions in the target column to make space
      for (let i = targetColumnTasks.length - 1; i >= position; i--) {
        const taskToUpdate = targetColumnTasks[i]
        taskToUpdate.position = i + 1
        await taskToUpdate.save()
      }

      // Set the task's new position
      task.position = position

      // Save the updated task
      await task.save()

      // Normalize positions in the source column
      await this.normalizePositions(sourceColumnId)
    } else {
      // Moving within the same column
      const currentPosition = task.position

      if (position === currentPosition) {
        return task // No change needed
      }

      // Get all tasks in the column
      const columnTasks = await this.taskModel.find({ columnId: columnId }).sort({ position: 1 }).exec()

      if (position > currentPosition) {
        // Moving down: decrement positions of tasks between current and target
        for (const taskToUpdate of columnTasks) {
          if (taskToUpdate.position > currentPosition && taskToUpdate.position <= position) {
            taskToUpdate.position -= 1
            await taskToUpdate.save()
          }
        }
      } else {
        // Moving up: increment positions of tasks between target and current
        for (const taskToUpdate of columnTasks) {
          if (taskToUpdate.position >= position && taskToUpdate.position < currentPosition) {
            taskToUpdate.position += 1
            await taskToUpdate.save()
          }
        }
      }

      // Update the task's position
      task.position = position
      await task.save()
    }

    console.log("Task moved successfully:", task)
    return task
  }

  async remove(id: string, userId: string): Promise<TaskDocument> {
    console.log("Removing task:", id, "for user:", userId)
    const task = await this.findOne(id, userId)
    // return this.taskModel.findByIdAndDelete(id).exec()
    const columnId = task.columnId.toString()
    const position = task.position

    // Delete the task
    await this.taskModel.findByIdAndDelete(id).exec()

    // Normalize positions in the column
    await this.taskModel.updateMany({ columnId, position: { $gt: position } }, { $inc: { position: -1 } })

    console.log("Task removed successfully")
    return task
  }

  private async normalizePositions(columnId: string): Promise<void> {
    console.log("Normalizing positions for column:", columnId)
    // Get all tasks in the column, sorted by position
    const tasks = await this.taskModel.find({columnId}).sort({position: 1}).exec()

    // Update positions to be sequential
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].position !== i) {
        tasks[i].position = i
        await tasks[i].save()
      }
    }
    console.log("Positions normalized for column:", columnId)
  }

  async removeUserFromBoardTasks(boardId: string, userId: string): Promise<number> {
    console.log(`Removing user ${userId} as assignee from all tasks in board ${boardId}`)

    try {
      // Convert string IDs to ObjectIds if needed
      const boardObjectId = typeof boardId === "string" ? new Types.ObjectId(boardId) : boardId
      const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId

      // Get all columns for the board
      const columns = await this.columnsService.findByBoardWithoutPermissionCheck(boardObjectId)
      if (!columns || columns.length === 0) {
        console.log(`No columns found for board ${boardId}`)
        return 0
      }

      const columnIds = columns.map((col) => col._id)
      console.log(`Found ${columnIds.length} columns for board ${boardId}`)

      // Find and update all tasks where the user is assigned
      const result = await this.taskModel
          .updateMany(
              {
                columnId: { $in: columnIds },
                assigneeId: userId, // Use string comparison since assigneeId is stored as string
              },
              {
                $unset: { assigneeId: "" },
              },
          )
          .exec()

      console.log(`Removed user ${userId} from ${result.modifiedCount} tasks in board ${boardId}`)
      return result.modifiedCount
    } catch (error) {
      console.error(`Error removing user ${userId} from tasks in board ${boardId}:`, error)
      throw error
    }
  }
}
