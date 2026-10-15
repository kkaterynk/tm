import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { type Document, Types } from "mongoose"

export type NotificationDocument = Notification & Document

export enum NotificationType {
    BOARD_SHARED = "board_shared",
    TASK_ASSIGNED = "task_assigned",
    TASK_DUE_SOON = "task_due_soon",
    BOARD_PERMISSION_CHANGED = "board_permission_changed",
}

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    userId: Types.ObjectId

    @Prop({ required: true, enum: Object.values(NotificationType) })
    type: NotificationType

    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    message: string

    @Prop({ default: false })
    read: boolean

    @Prop({ type: Object })
    data: Record<string, any>
}

export const NotificationSchema = SchemaFactory.createForClass(Notification)

NotificationSchema.index({ userId: 1, read: 1 })
NotificationSchema.index({ createdAt: -1 })
