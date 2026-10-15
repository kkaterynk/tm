import { IsNotEmpty, IsString, IsMongoId } from "class-validator"

export class CreateColumnDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @IsMongoId()
  boardId: string
}
