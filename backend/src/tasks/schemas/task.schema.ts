import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { type Document, Types } from "mongoose"

export type TaskDocument = Task & Document

@Schema({ timestamps: true })
export class TaskLabel {
  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  color: string
}

@Schema({ timestamps: true })
export class TaskAttachment {
  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  url: string

  @Prop({ required: true })
  size: number

  @Prop({ required: true })
  type: string

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  uploadedBy: Types.ObjectId
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string

  @Prop()
  description: string

  @Prop({ type: Types.ObjectId, ref: "Column", required: true })
  columnId: Types.ObjectId

  @Prop({ default: 0 })
  position: number

  @Prop({type: Date})
  dueDate: Date

  @Prop([String])
  labels: string[]

  @Prop({ type: Types.ObjectId, ref: "User" })
  assigneeId: Types.ObjectId

  @Prop([TaskLabel])
  customLabels: TaskLabel[]

  @Prop([TaskAttachment])
  attachments: TaskAttachment[]
}

export const TaskSchema = SchemaFactory.createForClass(Task)
