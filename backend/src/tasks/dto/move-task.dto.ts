import { IsNotEmpty, IsMongoId, IsNumber, Min } from "class-validator"

export class MoveTaskDto {
  @IsNotEmpty()
  @IsMongoId()
  columnId: string

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  position: number
}
