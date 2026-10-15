"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
    Modal,
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    Select,
    Badge,
    Text,
    ActionIcon,
    ColorInput,
    FileInput,
    Card,
    Avatar,
    Divider,
    Chip,
    SimpleGrid,
    Alert,
    Progress, Tooltip,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { IconCalendar, IconUser, IconPaperclip, IconTrash, IconPlus, IconDownload, IconX, IconPhoto, IconFileDescription, IconFileSpreadsheet, IconFileCode, IconFile, IconFileText, IconFileZip, IconAlertCircle } from "@tabler/icons-react"
import { notifications } from "@mantine/notifications"
import {filesApi} from "../services/api";

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
    key?: string
    size: number
    type: string
    uploadedBy: string
    uploadedAt?: string
}

interface BoardMember {
    memberId: string | null
    userId: string
    email: string
    name: string
    isAdmin?: boolean
    isOwner?: boolean
}

interface TaskModalProps {
    task: Task | null
    opened: boolean
    onClose: () => void
    members: BoardMember[]
    onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDelete: (taskId: string) => Promise<void>
    findMemberById: (userId: string) => BoardMember | undefined
    permissions?: {
        canEditTasks: boolean
        canManageColumns: boolean
        isAdmin: boolean
        isOwner: boolean
    }
}

const DEFAULT_LABEL_COLORS = [
    "#e03131",
    "#d6336c",
    "#ae3ec9",
    "#7048e8",
    "#4263eb",
    "#1c7ed6",
    "#0ca678",
    "#37b24d",
    "#74b816",
    "#f59f00",
    "#fd7e14",
    "#868e96",
]

export const TaskModal: React.FC<TaskModalProps> = ({
                                                        task,
                                                        opened,
                                                        onClose,
                                                        members,
                                                        onUpdate,
                                                        onDelete,
                                                        findMemberById,
                                                        permissions = { canEditTasks: true, canManageColumns: false, isAdmin: false, isOwner: false },
                                                    }) => {
    const [editedTitle, setEditedTitle] = useState("")
    const [editedDescription, setEditedDescription] = useState("")
    const [editedDueDate, setEditedDueDate] = useState<Date | null>(null)
    const [editedAssigneeId, setEditedAssigneeId] = useState<string | null>(null)
    const [editedLabels, setEditedLabels] = useState<string[]>([])
    const [editedCustomLabels, setEditedCustomLabels] = useState<TaskLabel[]>([])
    const [newLabelName, setNewLabelName] = useState("")
    const [newLabelColor, setNewLabelColor] = useState("#e03131")
    const [attachments, setAttachments] = useState<TaskAttachment[]>([])
    const [fileToUpload, setFileToUpload] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [saving, setSaving] = useState(false)
    const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)

    useEffect(() => {
        if (task) {
            setEditedTitle(task.title)
            setEditedDescription(task.description || "")
            setEditedDueDate(task.dueDate ? new Date(task.dueDate) : null)
            setEditedAssigneeId(task.assigneeId || null)
            setEditedLabels(task.labels || [])
            setEditedCustomLabels(task.customLabels || [])
            setAttachments(task.attachments || [])
        }
    }, [task])

    const assignee = editedAssigneeId ? findMemberById(editedAssigneeId) : undefined
    const isPastDue = editedDueDate ? editedDueDate < new Date() : false

    const activeMemberOptions = members
        .filter((member) => member.userId)
        .map((member) => ({
            value: member.userId,
            label: member.name || member.email,
        }))

    const handleSave = async () => {
        if (!task || !editedTitle.trim()) return

        setSaving(true)
        try {
            await onUpdate(task._id, {
                title: editedTitle,
                description: editedDescription || undefined,
                dueDate: editedDueDate ? editedDueDate.toISOString() : undefined,
                assigneeId: editedAssigneeId || undefined,
                labels: editedLabels,
                customLabels: editedCustomLabels,
                attachments,
            })
            onClose()
        } catch (error) {
            console.error("Failed to update task:", error)
            notifications.show({
                title: "Error",
                message: "Failed to update task",
                color: "red",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!task) return

        if (window.confirm("Are you sure you want to delete this task?")) {
            try {
                await onDelete(task._id)
                onClose()
            } catch (error) {
                console.error("Failed to delete task:", error)
            }
        }
    }

    const handleAddCustomLabel = () => {
        if (!newLabelName.trim()) return

        const newLabel: TaskLabel = {
            name: newLabelName.trim(),
            color: newLabelColor,
        }

        setEditedCustomLabels((prev) => [...prev, newLabel])
        setNewLabelName("")
        setNewLabelColor("#e03131")
    }

    const handleRemoveCustomLabel = (index: number) => {
        setEditedCustomLabels((prev) => prev.filter((_, i) => i !== index))
    }

    const handleFileUpload = async (/*file: File | null*/) => {
        if(!fileToUpload) return

        // if (!file) return

        /*
        // In a real app, you would upload the file to a server
        // For now, we'll create a mock attachment
        const mockAttachment: TaskAttachment = {
            name: file.name,
            url: URL.createObjectURL(file),
            size: file.size,
            type: file.type,
            uploadedBy: "current-user", // This should be the current user's ID
        }

        setAttachments((prev) => [...prev, mockAttachment])
        */
        setUploading(true)
        setUploadProgress(0)
        setUploadError(null)

        try {

            const uploadResult = await filesApi.uploadFile(fileToUpload, (progress) => {
                setUploadProgress(progress)
            })

            const newAttachment: TaskAttachment = {
                name: uploadResult.name,
                url: uploadResult.url,
                key: uploadResult.key,
                size: uploadResult.size,
                type: uploadResult.type,
                uploadedBy: uploadResult.uploadedBy,
                uploadedAt: uploadResult.uploadedAt,
            }

            setAttachments((prev) => [...prev, newAttachment])
            setFileToUpload(null)

            notifications.show({
                title: "Success",
                message: "File uploaded successfully",
                color: "green",
            })
        } catch (error: any) {
            console.error("Failed to upload file:", error)
            setUploadError(error.message || "Failed to upload file")
            notifications.show({
                title: "Error",
                message: error.message || "Failed to upload file",
                color: "red",
            })
        } finally {
            setUploading(false)
            setUploadProgress(0)
        }
    }

    const handleRemoveAttachment = async (index: number) => {
        // setAttachments((prev) => prev.filter((_, i) => i !== index))
        const attachment = attachments[index]

        // if (!attachment.key) {
        //     // If there's no key, just remove it from the local state
        //     setAttachments((prev) => prev.filter((_, i) => i !== index))
        //     return
        // }

        setDeletingAttachment(attachment.key || attachment.url)

        try {
            // await filesApi.deleteFile(attachment.key)
            // Try to delete by key first, then by URL
            if (attachment.key) {
                await filesApi.deleteFileByKey(attachment.key)
            } else {
                await filesApi.deleteFileByUrl(attachment.url)
            }
            setAttachments((prev) => prev.filter((_, i) => i !== index))

            notifications.show({
                title: "Success",
                message: "Attachment removed",
                color: "green",
            })
        } catch (error: any) {
            console.error("Failed to remove attachment:", error)
            notifications.show({
                title: "Error",
                message: error.message || "Failed to remove attachment",
                color: "red",
            })
        } finally {
            setDeletingAttachment(null)
        }
    }

    const handleDownloadAttachment = async (attachment: TaskAttachment) => {
        try {
            let downloadUrl = attachment.url

            // If the URL is not signed, get a signed URL for secure download
            if (!filesApi.isSignedUrl(attachment.url)) {
                console.log("!!!", attachment.url)
                downloadUrl = await filesApi.getSignedUrl(attachment.url)
            }

            // Create a temporary link and trigger download
            const link = document.createElement("a")
            link.href = downloadUrl
            link.download = attachment.name
            link.target = "_blank"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error: any) {
            console.error("Failed to download attachment:", error)
            notifications.show({
                title: "Error",
                message: "Failed to download file",
                color: "red",
            })
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith("image/")) return <IconPhoto size={16} />
        if (fileType.includes("pdf")) return <IconFileDescription size={16} />
        if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.includes("csv"))
            return <IconFileSpreadsheet size={16} />
        if (fileType.includes("word") || fileType.includes("document")) return <IconFileText size={16} />
        if (fileType.includes("zip") || fileType.includes("compressed")) return <IconFileZip size={16} />
        if (fileType.includes("code") || fileType.includes("javascript") || fileType.includes("html"))
            return <IconFileCode size={16} />
        return <IconFile size={16} />
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return ""
        const date = new Date(dateString)
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    const validateFile = (file: File): string | null => {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            return "File size exceeds 10MB limit"
        }

        // Check file name length
        if (file.name.length > 255) {
            return "File name is too long (max 255 characters)"
        }

        return null
    }

    const handleFileSelect = (file: File | null) => {
        setUploadError(null)

        if (!file) {
            setFileToUpload(null)
            return
        }

        const error = validateFile(file)
        if (error) {
            setUploadError(error)
            setFileToUpload(null)
            return
        }

        setFileToUpload(file)
    }

    if (!task) return null

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Task Details"
            size="lg"
            // scrollAreaComponent={Modal.NativeScrollArea}
        >
            <Stack gap="md">
                {/* Title */}
                <TextInput
                    label="Title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    required
                    size="md"
                    readOnly={!permissions.canEditTasks}
                />

                {/* Description */}
                <Textarea
                    label="Description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    minRows={3}
                    placeholder="Add a description..."
                    readOnly={!permissions.canEditTasks}
                />

                {/* Due Date and Assignee */}
                <SimpleGrid cols={2}>
                    <DateInput
                        label="Due Date"
                        placeholder="Set due date"
                        value={editedDueDate}
                        onChange={setEditedDueDate}
                        clearable
                        leftSection={<IconCalendar size={16} />}
                        error={isPastDue ? "This task is overdue" : undefined}
                        readOnly={!permissions.canEditTasks}
                    />

                    <Select
                        label="Assignee"
                        placeholder="Assign to member"
                        value={editedAssigneeId}
                        onChange={setEditedAssigneeId}
                        clearable
                        data={activeMemberOptions}
                        leftSection={<IconUser size={16} />}
                        disabled={!permissions.canEditTasks}
                    />
                </SimpleGrid>

                {/* Current Assignee Display */}
                {assignee && (
                    <Group gap="xs">
                        <Text size="sm" c="dimmed">
                            Assigned to:
                        </Text>
                        <Group gap={4}>
                            <Avatar size={20} radius="xl" color="blue">
                                {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                            </Avatar>
                            <Text size="sm">{assignee.name || assignee.email}</Text>
                        </Group>
                    </Group>
                )}

                <Divider />

                {/* Labels Section */}
                <div>
                    <Text fw={500} mb="xs">
                        Labels
                    </Text>

                    {/* Predefined Labels */}
                    <Group gap="xs" mb="sm">
                        {["urgent", "bug", "feature", "enhancement", "documentation"].map((label) => (
                            <Chip
                                key={label}
                                checked={editedLabels.includes(label)}
                                onChange={(checked) => {
                                    if (checked) {
                                        setEditedLabels((prev) => [...prev, label])
                                    } else {
                                        setEditedLabels((prev) => prev.filter((l) => l !== label))
                                    }
                                }}
                                size="sm"
                                disabled={!permissions.canEditTasks}
                            >
                                {label}
                            </Chip>
                        ))}
                    </Group>

                    {/* Custom Labels */}
                    {editedCustomLabels.length > 0 && (
                        <Group gap="xs" mb="sm">
                            {editedCustomLabels.map((label, index) => (
                                <Badge
                                    key={index}
                                    color={label.color}
                                    variant="filled"
                                    rightSection={
                                        permissions.canEditTasks && (
                                        <ActionIcon
                                            size="xs"
                                            color="white"
                                            variant="transparent"
                                            onClick={() => handleRemoveCustomLabel(index)}
                                        >
                                            <IconX size={10} />
                                        </ActionIcon>
                                        )
                                    }
                                >
                                    {label.name}
                                </Badge>
                            ))}
                        </Group>
                    )}

                    {/* Add Custom Label */}
                    {permissions.canEditTasks && (
                    <Group gap="xs">
                        <TextInput
                            placeholder="Label name"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            size="xs"
                            style={{ flex: 1 }}
                        />
                        <ColorInput
                            value={newLabelColor}
                            onChange={setNewLabelColor}
                            size="xs"
                            swatches={DEFAULT_LABEL_COLORS}
                            withEyeDropper={false}
                        />
                        <ActionIcon onClick={handleAddCustomLabel} disabled={!newLabelName.trim()} size="sm">
                            <IconPlus size={14} />
                        </ActionIcon>
                    </Group>
                    )}
                </div>

                <Divider />

                {/* Attachments Section */}
                <div>
                    <Text fw={500} mb="xs">
                        Attachments
                    </Text>

                    {/*<FileInput
                        placeholder="Upload file"
                        leftSection={<IconPaperclip size={16} />}
                        onChange={handleFileUpload}
                        mb="sm"
                    />*/}

                    {permissions.canEditTasks && (
                        <>
                            <Group align="flex-end" mb="sm">
                                <FileInput
                                    placeholder="Select file (max 10MB)"
                                    leftSection={<IconPaperclip size={16} />}
                                    value={fileToUpload}
                                    onChange={handleFileSelect}
                                    style={{ flex: 1 }}
                                    error={uploadError}
                                />
                                <Button
                                    onClick={handleFileUpload}
                                    disabled={!fileToUpload || uploading || !!uploadError}
                                    loading={uploading}
                                >
                                    Upload
                                </Button>
                            </Group>

                            {uploadError && (
                                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="sm">
                                    {uploadError}
                                </Alert>
                            )}

                            {uploading && (
                                <Progress
                                    value={uploadProgress}
                                    size="sm"
                                    mb="sm"
                                    color={uploadProgress === 100 ? "green" : "blue"}
                                    aria-label={`${Math.round(uploadProgress)}%`}
                                    striped
                                    animated
                                />
                            )}
                        </>
                    )}

                    {attachments.length > 0 && (
                        <Stack gap="xs">
                            {attachments.map((attachment, index) => (
                                <Card key={index} withBorder p="xs">
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            {getFileIcon(attachment.type)}
                                            <div>
                                                <Text size="sm" fw={500}>
                                                    {attachment.name}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {formatFileSize(attachment.size)} •{" "}
                                                    {attachment.uploadedAt ? formatDate(attachment.uploadedAt) : "Unknown date"}
                                                </Text>
                                            </div>
                                        </Group>
                                        <Group gap="xs">
                                            <Tooltip label="Download">
                                                <ActionIcon
                                                    size="sm"
                                                    variant="subtle"
                                                    onClick={() => handleDownloadAttachment(attachment)}
                                                    // component="a"
                                                    // href={attachment.url}
                                                    // target="_blank"
                                                    // download
                                                >
                                                    <IconDownload size={14} />
                                                </ActionIcon>
                                            </Tooltip>

                                            {permissions.canEditTasks && (
                                                <Tooltip label="Delete">
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => handleRemoveAttachment(index)}
                                                        loading={deletingAttachment === (attachment.key || attachment.url)}
                                                    >
                                                        <IconTrash size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    )}

                    {/*{attachments.length > 0 && (
                        <Stack gap="xs">
                            {attachments.map((attachment, index) => (
                                <Card key={index} withBorder p="xs">
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <IconPaperclip size={16} />
                                            <div>
                                                <Text size="sm" fw={500}>
                                                    {attachment.name}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {formatFileSize(attachment.size)} • {attachment.type}
                                                </Text>
                                            </div>
                                        </Group>
                                        <Group gap="xs">
                                            <ActionIcon size="sm" variant="subtle" onClick={() => window.open(attachment.url, "_blank")}>
                                                <IconDownload size={14} />
                                            </ActionIcon>
                                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleRemoveAttachment(index)}>
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    )}*/}
                </div>

                {/* Action Buttons */}
                <Group justify="space-between" mt="md">
                    <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
                        Delete Task
                    </Button>

                    <Group>
                        <Button variant="subtle" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} loading={saving} disabled={!editedTitle.trim()}>
                            Save Changes
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </Modal>
    )
}
