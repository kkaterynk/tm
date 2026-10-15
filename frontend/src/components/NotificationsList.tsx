"use client"

import { useState, useEffect } from "react"
import {Stack, Text, Group, Badge, Button, Skeleton, ScrollArea} from "@mantine/core"
import { IconCheck } from "@tabler/icons-react"
import { notificationsApi } from "../services/api"

interface Notification {
    _id: string
    type: string
    title: string
    message: string
    read: boolean
    createdAt: string
    data?: Record<string, any>
}

export function NotificationsList() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)

    const loadNotifications = async () => {
        try {
            setLoading(true)
            const [notifs, count] = await Promise.all([
                notificationsApi.getAll(3), // Limit to 5 notifications for the sidebar
                notificationsApi.getUnreadCount(),
            ])
            setNotifications(notifs)
            setUnreadCount(count)
        } catch (error) {
            console.error("Failed to load notifications:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadNotifications()

        // Poll for new notifications every minute
        const interval = setInterval(loadNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead()
            setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error("Failed to mark all as read:", error)
        }
    }

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsApi.markAsRead(id)
            setNotifications((prev) => prev.map((notif) => (notif._id === id ? { ...notif, read: true } : notif)))
            setUnreadCount((prev) => Math.max(0, prev - 1))
        } catch (error) {
            console.error("Failed to mark notification as read:", error)
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    const getNotificationColor = (type: string) => {
        switch (type) {
            case "board_shared":
                return "blue"
            case "task_assigned":
                return "green"
            case "task_due_soon":
                return "orange"
            case "board_permission_changed":
                return "purple"
            default:
                return "gray"
        }
    }

    if (loading) {
        return (
            <Stack>
                <Skeleton height={20} radius="md" />
                <Skeleton height={20} radius="md" />
                <Skeleton height={20} radius="md" />
            </Stack>
        )
    }

    if (notifications.length === 0) {
        return (
            <Text size="sm" c="dimmed" ta="center" py="md">
                No notifications
            </Text>
        )
    }

    return (
        <Stack gap="xs">
            {unreadCount > 0 && (
                <Group justify="space-between" align="center">
                    <Badge size="sm">{unreadCount} unread</Badge>
                    <Button variant="subtle" size="xs" leftSection={<IconCheck size={14} />} onClick={handleMarkAllAsRead}>
                        Mark all read
                    </Button>
                </Group>
            )}

            <Group justify="space-between">
            {notifications.map((notification) => (
                <div
                    key={notification._id}
                    style={{
                        padding: "8px",
                        backgroundColor: notification.read ? "transparent" : "var(--mantine-color-blue-0)",
                        borderLeft: notification.read ? "none" : "3px solid var(--mantine-color-blue-5)",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                    onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                >
                    <Group justify="space-between" wrap="nowrap" mb={2}>
                        <Badge size="xs" color={getNotificationColor(notification.type)}>
                            {notification.title}
                        </Badge>
                        <Text size="xs" c="dimmed">
                            {formatTimeAgo(notification.createdAt)}
                        </Text>
                    </Group>
                    <Text size="sm" lineClamp={3}>
                        {notification.message}
                    </Text>
                </div>
            ))}
            </Group>
            {/*<Button variant="subtle" size="xs" component="a" href="/notifications" mt="xs">*/}
            {/*    View all notifications*/}
            {/*</Button>*/}
        </Stack>
    )
}
