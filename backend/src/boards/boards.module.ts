import {forwardRef, Module} from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { BoardsService } from "./boards.service"
import { BoardsController } from "./boards.controller"
import { Board, BoardSchema } from "./schemas/board.schema"
import {BoardMember, BoardMemberSchema} from "./schemas/board-member.schema"
import {UsersModule} from "../users/users.module";
import {ColumnsModule} from "../columns/columns.module";
import {TasksModule} from "../tasks/tasks.module";
import {NotificationsModule} from "../notifications/notifications.module";

@Module({
  imports: [MongooseModule.forFeature([
      { name: Board.name, schema: BoardSchema },
      { name: BoardMember.name, schema: BoardMemberSchema }
  ]),
    UsersModule,
    NotificationsModule,
    forwardRef(() => ColumnsModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [BoardsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
