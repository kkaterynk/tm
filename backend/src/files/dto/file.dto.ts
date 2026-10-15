import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator"

export class FileChunkDto {
    @IsString()
    @IsNotEmpty()
    fileName: string

    @IsString()
    @IsNotEmpty()
    contentType: string

    @IsString()
    @IsNotEmpty()
    chunkData: string // base64 encoded chunk

    @IsString()
    @IsNotEmpty()
    uploadId: string

    @IsString()
    @IsNotEmpty()
    chunkIndex: string

    @IsString()
    @IsNotEmpty()
    totalChunks: string

    @IsString()
    @IsOptional()
    folder?: string
}

export class InitiateUploadDto {
    @IsString()
    @IsNotEmpty()
    fileName: string

    @IsString()
    @IsNotEmpty()
    contentType: string

    @IsString()
    @IsNotEmpty()
    fileSize: string

    @IsString()
    @IsOptional()
    folder?: string
}

export class CompleteUploadDto {
    @IsString()
    @IsNotEmpty()
    uploadId: string

    @IsString()
    @IsNotEmpty()
    fileName: string

    @IsString()
    @IsNotEmpty()
    contentType: string

    @IsString()
    @IsOptional()
    folder?: string
}

export enum FileType {
    ATTACHMENT = "attachment",
    BACKGROUND = "background",
}

export class DirectUploadDto {
    @IsString()
    @IsNotEmpty()
    fileName: string

    @IsString()
    @IsNotEmpty()
    contentType: string

    @IsString()
    @IsNotEmpty()
    fileData: string // base64 encoded file data

    @IsEnum(FileType)
    @IsNotEmpty()
    fileType: FileType

    @IsString()
    @IsOptional()
    folder?: string
}
