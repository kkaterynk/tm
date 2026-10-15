import { Controller, Get, Patch, Param, UseGuards, Request, Query } from "@nestjs/common"
import { NotificationsService } from "./notifications.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import {ApiTags} from "@nestjs/swagger";

interface AuthenticatedRequest extends Request {
    user: {
        userId: string
    }
}

@ApiTags("Notification")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    findAll(@Request() req: AuthenticatedRequest, @Query("limit") limit?: string) {
        const limitNum = limit ? Number.parseInt(limit, 10) : 20
        return this.notificationsService.findByUser(req.user.userId, limitNum)
    }

    @Get("unread-count")
    getUnreadCount(@Request() req: AuthenticatedRequest) {
        return this.notificationsService.getUnreadCount(req.user.userId)
    }

    @Patch(":id/read")
    markAsRead(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
        return this.notificationsService.markAsRead(id, req.user.userId)
    }

    @Patch("mark-all-read")
    markAllAsRead(@Request() req: AuthenticatedRequest) {
        return this.notificationsService.markAllAsRead(req.user.userId)
    }
}
