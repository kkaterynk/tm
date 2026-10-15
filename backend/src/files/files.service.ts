import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuid } from "uuid"

@Injectable()
export class FilesService {
    private s3Client: S3Client
    private bucketName: string
    private region: string
    private readonly logger = new Logger(FilesService.name)

    constructor(private configService: ConfigService) {
        this.region = this.configService.get<string>("AWS_REGION") || "us-east-1"
        this.s3Client = new S3Client({
            region: this.configService.get<string>("AWS_REGION"),
            credentials: {
                accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID"),
                secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY"),
            },
        })
        this.bucketName = this.configService.get<string>("AWS_S3_BUCKET_NAME")

        this.logger.log(`FilesService initialized with bucket: ${this.bucketName}`)
    }

    isSignedUrl(url: string): boolean {
        return url.includes("X-Amz-Algorithm") || url.includes("X-Amz-Signature")
    }

    async uploadFile(
        fileBuffer: Buffer,
        originalName: string,
        mimeType: string,
        folder = "attachments",
    ): Promise<{ url: string; key: string; size: number }> {
        try {
            // Sanitize filename and create unique key
            const sanitizedName = this.sanitizeFileName(originalName)
            const key = `${folder}/${uuid()}-${sanitizedName}`

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: mimeType,
                }),
            )

            const url = `https://${this.bucketName}.s3.${this.configService.get<string>("AWS_REGION")}.amazonaws.com/${key}`

            this.logger.log(`File uploaded successfully: ${key}`)

            return {
                url,
                key,
                size: fileBuffer.length,
            }
        } catch (error) {
            this.logger.error(`Failed to upload file: ${error.message}`, error.stack)
            throw new BadRequestException(`File upload failed: ${error.message}`)
        }
    }

    async getPresignedSignedUrl(url: string): Promise<string> {
        try {
            // const objectKey = url
            //     .split(`https://${this.bucketName}.s3.${this.configService.get<string>("AWS_REGION")}.amazonaws.com/`)
            //     .pop()

            if (!url) {
                throw new BadRequestException("URL is required")
            }

            console.log(`Generating signed URL for: ${url}`)
            const objectKey = this.extractKeyFromUrl(url)
            console.log(`Extracted key: ${objectKey}`)

            if (!objectKey) {
                throw new Error("Invalid S3 URL format")
            }

            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: objectKey,
            })

            const signedUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn: this.configService.get<number>("S3_URL_EXPIRATION") || 3600,
            })

            return signedUrl
        } catch (error) {
            this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack)
            throw new BadRequestException(`Failed to generate presigned URL: ${error.message}`)
        }
    }

    async extractUnsignedUrl(signedUrl: string): Promise<string> {
        try {
            return signedUrl.split("?")[0]
        } catch (error) {
            this.logger.error(`Failed to extract unsigned URL: ${error.message}`, error.stack)
            throw new BadRequestException(`Failed to extract unsigned URL: ${error.message}`)
        }
    }

    async deleteFile(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            })

            await this.s3Client.send(command)

            this.logger.log(`File ${key} successfully deleted from S3.`)
        } catch (error) {
            this.logger.error(`Error deleting file ${key} from S3:`, error.message, error.stack)
            throw new BadRequestException(`Failed to delete file: ${error.message}`)
        }
    }

    async deleteFileByUrl(url: string): Promise<void> {
        try {
            const key = this.extractKeyFromUrl(url)
            await this.deleteFile(key)
        } catch (error) {
            this.logger.error(`Error deleting file by URL ${url}:`, error.message, error.stack)
            throw new BadRequestException(`Failed to delete file: ${error.message}`)
        }
    }

    extractKeyFromUrl(url: string): string {
        try {
            const baseUrl = `https://${this.bucketName}.s3.${this.configService.get<string>("AWS_REGION")}.amazonaws.com/`
            return url.replace(baseUrl, "").split("?")[0] // Remove query parameters if present
        } catch (error) {
            throw new BadRequestException("Invalid S3 URL format")
        }
    }

    validateFileSize(size: number, maxSize = 10 * 1024 * 1024): boolean {
        return size <= maxSize
    }

    validateFileType(contentType: string, allowedTypes: string[]): boolean {
        return allowedTypes.includes(contentType)
    }

    sanitizeFileName(fileName: string): string {
        // Replace special characters and spaces
        let sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")

        // Ensure the filename isn't too long
        if (sanitized.length > 100) {
            const extension = sanitized.split(".").pop() || ""
            const name = sanitized.substring(0, 100 - extension.length - 1)
            sanitized = `${name}.${extension}`
        }

        return sanitized
    }
}
