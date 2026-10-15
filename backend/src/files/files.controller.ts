import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    Body,
    UseGuards,
    Request,
    BadRequestException,
    Logger,
    PayloadTooLargeException,
    UnsupportedMediaTypeException,
} from "@nestjs/common"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { FilesService } from "./files.service"
import {ApiTags} from "@nestjs/swagger";

interface AuthenticatedRequest {
    user: {
        userId: string
        username?: string
    }
}

interface FileUploadDto {
    fileName: string
    contentType: string
    fileData: string // base64 encoded file data
    folder?: string
}

interface BackgroundUploadDto {
    fileName: string
    contentType: string
    fileData: string // base64 encoded file data
}

@ApiTags("File")
@Controller("files")
@UseGuards(JwtAuthGuard)
export class FilesController {
    private readonly logger = new Logger(FilesController.name)
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    private readonly ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]

    constructor(private readonly filesService: FilesService) {}

    @Post("upload")
    async uploadFile(@Request() req: AuthenticatedRequest, @Body() uploadDto: FileUploadDto) {
        try {
            const { fileName, contentType, fileData, folder = "attachments" } = uploadDto

            if (!fileName || !contentType || !fileData) {
                throw new BadRequestException("Missing required fields: fileName, contentType, fileData")
            }

            // Decode base64 file data
            const buffer = Buffer.from(fileData, "base64")

            // Validate file size
            if (!this.filesService.validateFileSize(buffer.length, this.MAX_FILE_SIZE)) {
                throw new PayloadTooLargeException("File size exceeds 10MB limit")
            }

            const result = await this.filesService.uploadFile(buffer, fileName, contentType, folder)

            this.logger.log(`File uploaded: ${fileName} by user ${req.user.userId}`)

            return {
                success: true,
                data: {
                    url: result.url,
                    key: result.key,
                    name: fileName,
                    type: contentType,
                    size: result.size,
                    uploadedBy: req.user.userId,
                    uploadedAt: new Date().toISOString(),
                },
            }
        } catch (error) {
            this.logger.error(`File upload failed: ${error.message}`, error.stack)
            throw error
        }
    }

    @Post("upload/background")
    async uploadBackground(@Body() uploadDto: BackgroundUploadDto, @Request() req: AuthenticatedRequest) {
        try {
            const { fileName, contentType, fileData } = uploadDto

            if (!fileName || !contentType || !fileData) {
                throw new BadRequestException("Missing required fields: fileName, contentType, fileData")
            }

            // Validate content type for images
            if (!this.filesService.validateFileType(contentType, this.ALLOWED_IMAGE_TYPES)) {
                throw new UnsupportedMediaTypeException("Only image files (JPEG, PNG, GIF, WebP) are allowed")
            }

            // Decode base64 file data
            const buffer = Buffer.from(fileData, "base64")

            // Validate file size
            if (!this.filesService.validateFileSize(buffer.length, this.MAX_FILE_SIZE)) {
                throw new PayloadTooLargeException("File size exceeds 10MB limit")
            }

            const result = await this.filesService.uploadFile(buffer, fileName, contentType, "backgrounds")

            this.logger.log(`Background uploaded: ${fileName} by user ${req.user.userId}`)

            return {
                success: true,
                data: {
                    url: result.url,
                    key: result.key,
                    name: fileName,
                    type: contentType,
                    size: result.size,
                    uploadedBy: req.user.userId,
                    uploadedAt: new Date().toISOString(),
                },
            }
        } catch (error) {
            this.logger.error(`Background upload failed: ${error.message}`, error.stack)
            throw error
        }
    }

    @Delete("key/:key")
    async deleteFileByKey(@Param('key') key: string, @Request() req: AuthenticatedRequest) {
        try {
            const decodedKey = decodeURIComponent(key)
            await this.filesService.deleteFile(decodedKey)

            this.logger.log(`File deleted by key: ${decodedKey} by user ${req.user.userId}`)

            return {
                success: true,
                message: "File deleted successfully",
            }
        } catch (error) {
            this.logger.error(`File deletion failed: ${error.message}`, error.stack)
            throw error
        }
    }

    @Delete("url")
    async deleteFileByUrl(@Body() { url }: { url: string }, @Request() req: AuthenticatedRequest) {
        try {
            await this.filesService.deleteFileByUrl(url)

            this.logger.log(`File deleted by URL by user ${req.user.userId}`)

            return {
                success: true,
                message: "File deleted successfully",
            }
        } catch (error) {
            this.logger.error(`File deletion failed: ${error.message}`, error.stack)
            throw error
        }
    }

    @Post('signed-url')
    async getSignedUrl(@Body() body: { url?: string }) {
        console.log("Received body:", body)
        try {
            const signedUrl = await this.filesService.getPresignedSignedUrl(body.url);

            return {
                success: true,
                data: { url: signedUrl },
            };
        } catch (error) {
            this.logger.error(`Failed to generate signed URL: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Post('extract-unsigned-url')
    async extractUnsignedUrl(@Body() { signedUrl }: { signedUrl: string }) {
        try {
            const unsignedUrl = await this.filesService.extractUnsignedUrl(signedUrl);

            return {
                success: true,
                data: { url: unsignedUrl },
            };
        } catch (error) {
            this.logger.error(`Failed to extract unsigned URL: ${error.message}`, error.stack);
            throw error;
        }
    }
}
