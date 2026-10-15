import {forwardRef, Module} from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { ColumnsService } from "./columns.service"
import { ColumnsController } from "./columns.controller"
import { Column, ColumnSchema } from "./schemas/column.schema"
import { BoardsModule } from "../boards/boards.module"
import {TasksModule} from "../tasks/tasks.module";

@Module({
  imports: [MongooseModule.forFeature([{ name: Column.name, schema: ColumnSchema }]), forwardRef(() => BoardsModule),
    forwardRef(() => TasksModule)],
  controllers: [ColumnsController],
  providers: [ColumnsService],
  exports: [ColumnsService],
})
export class ColumnsModule {}
