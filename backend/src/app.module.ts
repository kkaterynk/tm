import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { MongooseModule } from "@nestjs/mongoose"
import { AuthModule } from "./auth/auth.module"
import { UsersModule } from "./users/users.module"
import { BoardsModule } from "./boards/boards.module"
import { ColumnsModule } from "./columns/columns.module"
import { TasksModule } from "./tasks/tasks.module"
import { NotificationsModule } from "./notifications/notifications.module"
import {FilesModule} from "./files/files.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    BoardsModule,
    ColumnsModule,
    TasksModule,
    NotificationsModule,
    FilesModule,
  ],
})
export class AppModule {}
