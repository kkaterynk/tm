"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ActionIcon, Indicator, Popover, Stack, Text, Group, Button, ScrollArea, Badge, Divider } from "@mantine/core"
import { IconBell, IconCheck } from "@tabler/icons-react"
import { notifications } from "@mantine/notifications"
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

export const NotificationBell: React.FC = () => {
    const [notificationsList, setNotificationsList] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [opened, setOpened] = useState(false)
    const [loading, setLoading] = useState(false)

    const loadNotifications = async () => {
        try {
            const [notifs, count] = await Promise.all([notificationsApi.getAll(10), notificationsApi.getUnreadCount()])
            setNotificationsList(notifs)
            setUnreadCount(count)
        } catch (error) {
            console.error("Failed to load notifications:", error)
        }
    }

    useEffect(() => {
        loadNotifications()

        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsApi.markAsRead(id)
            setNotificationsList((prev) => prev.map((notif) => (notif._id === id ? { ...notif, read: true } : notif)))
            setUnreadCount((prev) => Math.max(0, prev - 1))
        } catch (error) {
            console.error("Failed to mark notification as read:", error)
        }
    }

    const handleMarkAllAsRead = async () => {
        setLoading(true)
        try {
            await notificationsApi.markAllAsRead()
            setNotificationsList((prev) => prev.map((notif) => ({ ...notif, read: true })))
            setUnreadCount(0)
            notifications.show({
                title: "Success",
                message: "All notifications marked as read",
                color: "green",
            })
        } catch (error) {
            console.error("Failed to mark all as read:", error)
            notifications.show({
                title: "Error",
                message: "Failed to mark notifications as read",
                color: "red",
            })
        } finally {
            setLoading(false)
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

    return (
        <Popover position="bottom-end" withArrow shadow="md" opened={opened} onChange={setOpened} width={350}>
            <Popover.Target>
                <Indicator color="red" size={16} disabled={unreadCount === 0} label={unreadCount > 9 ? "9+" : unreadCount}>
                    <ActionIcon variant="subtle" color="gray" onClick={() => setOpened(!opened)}>
                        <IconBell size={20} />
                    </ActionIcon>
                </Indicator>
            </Popover.Target>

            <Popover.Dropdown p={0}>
                <Stack gap={0}>
                    <Group justify="space-between" p="md" pb="xs">
                        <Text fw={600}>Notifications</Text>
                        {unreadCount > 0 && (
                            <Button
                                variant="subtle"
                                size="xs"
                                leftSection={<IconCheck size={14} />}
                                onClick={handleMarkAllAsRead}
                                loading={loading}
                            >
                                Mark all read
                            </Button>
                        )}
                    </Group>

                    <Divider />

                    <ScrollArea h={400}>
                        {notificationsList.length === 0 ? (
                            <Text ta="center" c="dimmed" p="md">
                                No notifications yet
                            </Text>
                        ) : (
                            <Stack gap={0}>
                                {notificationsList.map((notification) => (
                                    <div
                                        key={notification._id}
                                        style={{
                                            padding: "12px 16px",
                                            backgroundColor: notification.read ? "transparent" : "var(--mantine-color-blue-0)",
                                            borderLeft: notification.read ? "none" : "3px solid var(--mantine-color-blue-5)",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                                    >
                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                            <div style={{ flex: 1 }}>
                                                <Group gap="xs" mb={4}>
                                                    <Badge size="xs" color={getNotificationColor(notification.type)} variant="light">
                                                        {notification.title}
                                                    </Badge>
                                                    <Text size="xs" c="dimmed">
                                                        {formatTimeAgo(notification.createdAt)}
                                                    </Text>
                                                </Group>
                                                <Text size="sm" lineClamp={2}>
                                                    {notification.message}
                                                </Text>
                                            </div>
                                            {!notification.read && (
                                                <div
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: "50%",
                                                        backgroundColor: "var(--mantine-color-blue-5)",
                                                        flexShrink: 0,
                                                        marginTop: 4,
                                                    }}
                                                />
                                            )}
                                        </Group>
                                    </div>
                                ))}
                            </Stack>
                        )}
                    </ScrollArea>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    )
}
