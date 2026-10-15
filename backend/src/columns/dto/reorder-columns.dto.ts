import { IsArray, IsMongoId, IsNotEmpty } from "class-validator"

export class ReorderColumnsDto {
  @IsNotEmpty()
  @IsMongoId()
  boardId: string

  @IsArray()
  @IsMongoId({ each: true })
  columnIds: string[]
}
