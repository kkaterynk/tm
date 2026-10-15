"use client"

import type React from "react"
import { useState } from "react"
import {
    Card,
    Text,
    Menu,
    ActionIcon,
    Group,
    TextInput,
    Textarea,
    Button,
    Stack,
    Badge,
    Select,
    Avatar,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { IconDots, IconTrash, IconEdit, IconCalendar, IconUser, IconClock } from "@tabler/icons-react"

interface Task {
    _id: string
    title: string
    description?: string
    columnId: string
    position: number
    dueDate?: string
    assigneeId?: string
    labels?: string[]
    customLabels?: TaskLabel[]
    attachments?: TaskAttachment[]
}

interface TaskLabel {
    name: string
    color: string
}

interface TaskAttachment {
    name: string
    url: string
    size: number
    type: string
    uploadedBy: string
}

interface BoardMember {
    memberId: string | null
    userId: string
    email: string
    name: string
    isAdmin?: boolean
    isOwner?: boolean
}

interface TaskComponentProps {
    task: Task
    members: BoardMember[]
    permissions?: BoardPermissions
    onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDelete: (taskId: string) => Promise<void>
    onOpenModal: (task: Task) => void
    findMemberById: (userId: string) => BoardMember | undefined
}

interface BoardPermissions {
    isOwner: boolean
    isAdmin: boolean
    canEdit: boolean
    canManageMembers: boolean
    canLeave: boolean
}

export const TaskComponent: React.FC<TaskComponentProps> = ({ task, members, permissions = { isOwner: true, isAdmin: true, canEdit: true, canManageMembers: true, canLeave: false }, onUpdate, onDelete, onOpenModal, findMemberById }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editedTitle, setEditedTitle] = useState(task.title)
    const [editedDescription, setEditedDescription] = useState(task.description || "")
    const [editedDueDate, setEditedDueDate] = useState<Date | null>(task.dueDate ? new Date(task.dueDate) : null)
    const [editedAssigneeId, setEditedAssigneeId] = useState<string | null>(task.assigneeId || null)
    const [saving, setSaving] = useState(false)

    const assignee = task.assigneeId ? findMemberById(task.assigneeId) : undefined
    const isPastDue = task.dueDate ? new Date(task.dueDate) < new Date() : false

    const activeMemberOptions = members
        .filter((member) => member.userId)
        .map((member) => ({
            value: member.userId,
            label: member.name || member.email,
        }))

    const formatDueDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffTime = date.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return `${Math.abs(diffDays)} days overdue`
        } else if (diffDays === 0) {
            return "Due today"
        } else if (diffDays === 1) {
            return "Due tomorrow"
        } else {
            return `Due in ${diffDays} days`
        }
    }

    const handleSaveChanges = async () => {
        if (!editedTitle.trim()) return

        setSaving(true)
        try {
            await onUpdate(task._id, {
                title: editedTitle,
                description: editedDescription || undefined,
                dueDate: editedDueDate ? editedDueDate.toISOString() : undefined,
                assigneeId: editedAssigneeId || undefined,
            })
            setIsEditing(false)
        } catch (error) {
            console.error("Failed to update task:", error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            onDelete(task._id)
        }
    }

    const handleCancel = () => {
        setEditedTitle(task.title)
        setEditedDescription(task.description || "")
        setEditedDueDate(task.dueDate ? new Date(task.dueDate) : null)
        setEditedAssigneeId(task.assigneeId || null)
        setIsEditing(false)
    }

    const isAssigneeActive = assignee && members.some((member) => member.userId === assignee.userId)

    if (isEditing) {
        return (
            <Card shadow="sm" p="sm" withBorder>
                <Stack gap="xs">
                    <TextInput label="Title" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} required />

                    <Textarea
                        label="Description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        minRows={2}
                        placeholder="Add a description..."
                    />

                    <DateInput
                        label="Due Date"
                        placeholder="Set due date"
                        value={editedDueDate}
                        onChange={setEditedDueDate}
                        clearable
                        leftSection={<IconCalendar size={16} />}
                    />

                    <Select
                        label="Assignee"
                        placeholder="Assign to member"
                        value={editedAssigneeId}
                        onChange={setEditedAssigneeId}
                        clearable
                        data={activeMemberOptions}
                        // data={members.map((member) => ({
                        //     value: member.userId,
                        //     label: member.name || member.email,
                        // }))}
                        leftSection={<IconUser size={16} />}
                    />

                    <Group justify="flex-end" mt="xs">
                        <Button variant="subtle" size="xs" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button size="xs" onClick={handleSaveChanges} loading={saving} disabled={!editedTitle.trim()}>
                            Save
                        </Button>
                    </Group>
                </Stack>
            </Card>
        )
    }

    return (
        <Card
            shadow="sm"
            p="sm"
            withBorder
            style={{
                cursor: "pointer",
                userSelect: "none",
            }}
            onClick={() => onOpenModal(task)}
        >
            {/* Labels */}
            {(((task.labels && task.labels.length > 0) ||
                (task.customLabels && task.customLabels.length > 0)) && (
                    <Group gap={4} mt={4}>
                        {task.labels?.map((label) => (
                            <Badge key={label} size="xs" variant="light">
                                {label}
                            </Badge>
                        ))}
                        {task.customLabels?.map((label, index) => (
                            <Badge key={index} size="xs" style={{ backgroundColor: label.color, color: "white" }}>
                                {label.name}
                            </Badge>
                        ))}
                    </Group>
                ))}
            <Group justify="space-between" align="baseline" wrap="nowrap" mt={4}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                    <Text fw={500} lineClamp={2}>
                        {task.title}
                    </Text>
                    {task.description && (
                        <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                            {task.description}
                        </Text>
                    )}

                    <Group mt={8} gap="xs">
                        {task.dueDate && (
                            <Badge leftSection={<IconClock size={12} />} color={isPastDue ? "red" : "blue"} variant="light" size="sm">
                                {formatDueDate(task.dueDate)}
                            </Badge>
                        )}

                        {assignee && (
                            <Group gap={4}>
                                <Avatar size={16} radius="xl" color="blue">
                                    {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                                </Avatar>
                                <Text size="xs" c={isAssigneeActive ? "dimmed" : "red"}>
                                    {assignee.name || assignee.email}
                                    {!isAssigneeActive && " (removed)"}
                                </Text>
                            </Group>
                        )}
                    </Group>
                </div>

                {permissions.canEdit && (
                    // <Button leftSection={<IconTrash size={14} />} color="red" justify="bottom-end" onClick={handleDelete} />
                    //     Save
                    // </Button>
                    <IconTrash size={16} onClick={(e)=> {
                        e.stopPropagation()
                        handleDelete()
                    }} color="red"/>

                /*<Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon size="sm" variant="subtle">
                            <IconDots size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => setIsEditing(true)}>
                            Edit
                        </Menu.Item>
                        <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={handleDelete}>
                            Delete
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>*/
                )}
            </Group>
        </Card>
    )
}
