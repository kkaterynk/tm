import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { type Model, Types } from "mongoose"
import { Notification, type NotificationDocument, NotificationType } from "./schemas/notification.schema"

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name)
        private notificationModel: Model<NotificationDocument>
    ) {}

    async create(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        data?: Record<string, any>,
    ): Promise<NotificationDocument> {
        const notification = new this.notificationModel({
            userId: new Types.ObjectId(userId),
            type,
            title,
            message,
            data: data || {},
        })
        return notification.save()
    }

    async findByUser(userId: string, limit = 20): Promise<NotificationDocument[]> {
        return this.notificationModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec()
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationModel
            .countDocuments({
                userId: new Types.ObjectId(userId),
                read: false,
            })
            .exec()
    }

    async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
        return this.notificationModel
            .findOneAndUpdate(
                { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
                { read: true },
                { new: true },
            )
            .exec()
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationModel.updateMany({ userId: new Types.ObjectId(userId), read: false }, { read: true }).exec()
    }

    // Helper methods for creating specific notification types
    async notifyBoardShared(userId: string, boardTitle: string, sharedBy: string): Promise<void> {
        await this.create(
            userId,
            NotificationType.BOARD_SHARED,
            "Board Shared",
            `You have been added to the board "${boardTitle}" by ${sharedBy}`,
            { boardTitle, sharedBy },
        )
    }

    async notifyTaskAssigned(userId: string, taskTitle: string, boardTitle: string, assignedBy: string): Promise<void> {
        await this.create(
            userId,
            NotificationType.TASK_ASSIGNED,
            "Task Assigned",
            `You have been assigned to task "${taskTitle}" in board "${boardTitle}" by ${assignedBy}`,
            { taskTitle, boardTitle, assignedBy },
        )
    }

    async notifyPermissionChanged(
        userId: string,
        boardTitle: string,
        permissions: string[],
        changedBy: string,
    ): Promise<void> {
        await this.create(
            userId,
            NotificationType.BOARD_PERMISSION_CHANGED,
            "Permissions Updated",
            `Your permissions for board "${boardTitle}" have been updated by ${changedBy}`,
            { boardTitle, permissions, changedBy },
        )
    }
}
