"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Modal, Stack, Text, Group, Avatar, Badge, Checkbox, Button, Divider, Alert } from "@mantine/core"
import { IconInfoCircle } from "@tabler/icons-react"
import { notifications } from "@mantine/notifications"
import { boardMembersApi } from "../services/api"

interface BoardMember {
    memberId: string | null
    userId: string
    email: string
    name: string
    isAdmin?: boolean
    isOwner?: boolean
    permissions?: string[]
}

interface PermissionManagementModalProps {
    opened: boolean
    onClose: () => void
    boardId: string
    members: BoardMember[]
    onMembersUpdate: () => void
    isOwner: boolean
}

const PERMISSION_LABELS = {
    view: "View Board",
    edit_tasks: "Edit Tasks",
    manage_columns: "Manage Columns",
    manage_members: "Manage Members",
    admin: "Admin Access",
}

const PERMISSION_DESCRIPTIONS = {
    view: "Can view the board and its contents",
    edit_tasks: "Can create, edit, and delete tasks",
    manage_columns: "Can create, edit, and delete columns",
    manage_members: "Can add and remove board members",
    admin: "Full access to all board features",
}

export const PermissionManagementModal: React.FC<PermissionManagementModalProps> = ({
                                                                                        opened,
                                                                                        onClose,
                                                                                        boardId,
                                                                                        members,
                                                                                        onMembersUpdate,
                                                                                        isOwner,
                                                                                    }) => {
    const [memberPermissions, setMemberPermissions] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState<string | null>(null)

    // Filter out the owner from members list
    const editableMembers = members.filter((member) => !member.isOwner)

    useEffect(() => {
        if (opened) {
            loadMemberPermissions()
        }
    }, [opened, members])

    const loadMemberPermissions = async () => {
        setLoading(true)
        try {
            const permissions: Record<string, string[]> = {}

            for (const member of editableMembers) {
                if (member.memberId) {
                    try {
                        const memberPerms = await boardMembersApi.getMemberPermissions(boardId, member.memberId)
                        permissions[member.memberId] = memberPerms
                    } catch (error) {
                        console.error(`Failed to load permissions for member ${member.memberId}:`, error)
                        // Set default permissions if loading fails
                        permissions[member.memberId] = ["view", "edit_tasks"]
                    }
                }
            }

            setMemberPermissions(permissions)
        } catch (error) {
            console.error("Failed to load member permissions:", error)
            notifications.show({
                title: "Error",
                message: "Failed to load member permissions",
                color: "red",
            })
        } finally {
            setLoading(false)
        }
    }

    const handlePermissionChange = (memberId: string, permission: string, checked: boolean) => {
        setMemberPermissions((prev) => {
            const currentPermissions = prev[memberId] || []

            if (checked) {
                // Add permission if not already present
                if (!currentPermissions.includes(permission)) {
                    return {
                        ...prev,
                        [memberId]: [...currentPermissions, permission],
                    }
                }
            } else {
                // Remove permission
                return {
                    ...prev,
                    [memberId]: currentPermissions.filter((p) => p !== permission),
                }
            }

            return prev
        })
    }

    const handleSavePermissions = async (memberId: string) => {
        setSaving(memberId)
        try {
            const permissions = memberPermissions[memberId] || []
            await boardMembersApi.updateMemberPermissions(boardId, memberId, permissions)

            notifications.show({
                title: "Success",
                message: "Member permissions updated successfully",
                color: "green",
            })

            onMembersUpdate()
        } catch (error) {
            console.error("Failed to update member permissions:", error)
            notifications.show({
                title: "Error",
                message: "Failed to update member permissions",
                color: "red",
            })
        } finally {
            setSaving(null)
        }
    }

    if (!isOwner) {
        return (
            <Modal opened={opened} onClose={onClose} title="Permission Management">
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                    Only board owners and admins can manage member permissions.
                </Alert>
            </Modal>
        )
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Manage Member Permissions"
            size="lg"
            // scrollAreaComponent={Modal.NativeScrollArea}
        >
            <Stack gap="md">
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                    Manage what each member can do on this board. Changes take effect immediately.
                </Alert>

                {editableMembers.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                        No members to manage. Share the board to add members.
                    </Text>
                ) : (
                    editableMembers.map((member) => {
                    if (!member.memberId) return null;
                        return (
                            <div key={member.memberId || member.userId}>
                            <Group justify="space-between" mb="sm">
                                <Group>
                                    <Avatar radius="xl" size="sm" color="blue">
                                        {(member.name || member.email).charAt(0).toUpperCase()}
                                    </Avatar>
                                    <div>
                                        <Text fw={500}>{member.name || member.email}</Text>
                                        <Text size="xs" c="dimmed">
                                            {member.email}
                                        </Text>
                                    </div>
                                    {member.isAdmin && (
                                        <Badge size="sm" color="teal">
                                            Admin
                                        </Badge>
                                    )}
                                </Group>

                                {member.memberId && (
                                    <Button
                                        size="xs"
                                        onClick={() => handleSavePermissions(member.memberId!)}
                                        loading={saving === member.memberId}
                                        disabled={loading}
                                    >
                                        Save Changes
                                    </Button>
                                )}
                            </Group>

                            {member.memberId && (
                                <Stack gap="xs" ml="md" mb="lg">
                                    {(Object.entries(PERMISSION_LABELS)as [keyof typeof PERMISSION_LABELS, string][]).map(([permission, label]) => (
                                        <Group key={permission} justify="space-between">
                                            <div>
                                                <Text size="sm" fw={500}>
                                                    {label}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {PERMISSION_DESCRIPTIONS[permission]}
                                                </Text>
                                            </div>
                                            <Checkbox
                                                checked={memberPermissions[member.memberId as string]?.includes(permission) || false}
                                                onChange={(event) =>
                                                    handlePermissionChange(member.memberId!, permission, event.currentTarget.checked)
                                                }
                                                disabled={loading || saving === member.memberId}
                                            />
                                        </Group>
                                    ))}
                                </Stack>
                            )}

                            <Divider />
                        </div>
                    );})
                )}

                <Group justify="flex-end">
                    <Button variant="subtle" onClick={onClose}>
                        Close
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
