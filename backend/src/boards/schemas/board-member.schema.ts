import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { type Document, Types } from "mongoose"

export type BoardMemberDocument = BoardMember & Document

export enum BoardPermission {
    VIEW = "view",
    EDIT_TASKS = "edit_tasks",
    MANAGE_COLUMNS = "manage_columns",
    MANAGE_MEMBERS = "manage_members",
    ADMIN = "admin",
}

@Schema({ timestamps: true })
export class BoardMember {
    @Prop({ type: Types.ObjectId, ref: "Board", required: true })
    boardId: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    userId: Types.ObjectId

    @Prop({ default: false })
    isAdmin: boolean

    @Prop({
        type: [String],
        enum: Object.values(BoardPermission),
        default: [BoardPermission.VIEW, BoardPermission.EDIT_TASKS],
    })
    permissions: BoardPermission[]
}

export const BoardMemberSchema = SchemaFactory.createForClass(BoardMember)

