import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { type Document, Types } from "mongoose"

export type BoardDocument = Board & Document

@Schema({ timestamps: true })
export class Board {
  @Prop({ required: true })
  title: string

  @Prop()
  description: string

  @Prop({ default: "#0079bf" })
  background: string

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  owner: Types.ObjectId
}

export const BoardSchema = SchemaFactory.createForClass(Board)
