import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { type Document, Types } from "mongoose"

export type ColumnDocument = Column & Document

@Schema({ timestamps: true })
export class Column {
  @Prop({ required: true })
  title: string

  @Prop({ type: Types.ObjectId, ref: "Board", required: true })
  boardId: Types.ObjectId

  @Prop({ default: 0 })
  position: number
}

export const ColumnSchema = SchemaFactory.createForClass(Column)
