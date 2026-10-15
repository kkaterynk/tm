import {forwardRef, Module} from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TasksService } from "./tasks.service"
import { TasksController } from "./tasks.controller"
import { Task, TaskSchema } from "./schemas/task.schema"
import { ColumnsModule } from "../columns/columns.module"
import {BoardsModule} from "../boards/boards.module";
import {NotificationsModule} from "../notifications/notifications.module";
import {UsersModule} from "../users/users.module";

@Module({
  imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]), forwardRef(() => BoardsModule), forwardRef(() => ColumnsModule), forwardRef(() => NotificationsModule), UsersModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
