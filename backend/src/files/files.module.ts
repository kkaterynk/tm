import { Module } from "@nestjs/common"
import { MulterModule } from "@nestjs/platform-express"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { FilesController } from "./files.controller"
import { FilesService } from "./files.service"
import { memoryStorage } from "multer"

@Module({
    imports: [
        ConfigModule,
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                storage: memoryStorage(),
                limits: {
                    fileSize: 50 * 1024 * 1024, // 50MB limit
                    files: 1,
                },
                fileFilter: (req, file, callback) => {
                    // Allow all file types for general uploads
                    if (req.url.includes("/background")) {
                        // Only allow images for background uploads
                        if (file.mimetype.startsWith("image/")) {
                            callback(null, true)
                        } else {
                            callback(new Error("Only image files are allowed for backgrounds"), false)
                        }
                    } else {
                        // Allow all file types for attachments
                        callback(null, true)
                    }
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [FilesController],
    providers: [FilesService],
    exports: [FilesService],
})
export class FilesModule {}
