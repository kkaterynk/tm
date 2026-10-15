import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  ValidateNested
} from "class-validator"
import {Type} from "class-transformer";

class TaskLabel {
  @IsString()
  name: string

  @IsString()
  color: string
}

class TaskAttachment {
  @IsString()
  name: string

  @IsString()
  url: string

  @IsNumber()
  size: number

  @IsString()
  type: string

  @IsString()
  uploadedBy: string
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsNotEmpty()
  @IsMongoId()
  columnId: string

  @IsOptional()
  @IsDateString()
  dueDate?: Date

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[]

  @IsOptional()
  @IsMongoId()
  assigneeId?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLabel)
  customLabels?: TaskLabel[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachment)
  attachments?: TaskAttachment[]
}
