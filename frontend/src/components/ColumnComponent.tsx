"use client"

import React from "react"
import { useState, useCallback, useMemo } from "react"
import { Paper, Title, ActionIcon, Menu, TextInput, Button, Stack, Card, Group, Text } from "@mantine/core"
import { IconDots, IconTrash, IconEdit, IconPlus } from "@tabler/icons-react"
import { Droppable, Draggable } from "react-beautiful-dnd"
import { TaskComponent } from "./TaskComponent"

interface Column {
    _id: string
    title: string
    boardId: string
    position: number
}

interface Task {
    _id: string
    title: string
    description?: string
    columnId: string
    position: number
    dueDate?: string
    assigneeId?: string
}

interface BoardMember {
    memberId: string | null
    userId: string
    email: string
    name: string
    isAdmin?: boolean
    isOwner?: boolean
}

interface BoardPermissions {
    isOwner: boolean,
    isAdmin: boolean,
    canEdit: boolean,
    canManageMembers: boolean,
    canLeave: boolean
}

interface ColumnComponentProps {
    column: Column
    tasks: Task[]
    members: BoardMember[]
    permissions: BoardPermissions
    onCreateTask: (columnId: string, title: string, description?: string) => Promise<void>
    onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
    onUpdateColumn: (columnId: string, title: string) => Promise<void>
    onDeleteColumn: (columnId: string) => Promise<void>
    onOpenTaskModal: (task: Task) => void
    findMemberById: (userId: string) => BoardMember | undefined
}

export const ColumnComponent: React.FC<ColumnComponentProps> = React.memo(
    ({
         column,
         tasks,
         members,
         permissions,
         onCreateTask,
         onUpdateTask,
         onDeleteTask,
         onUpdateColumn,
         onDeleteColumn,
         onOpenTaskModal,
         findMemberById,
     }) => {
        const [isAddingTask, setIsAddingTask] = useState(false)
        const [newTaskTitle, setNewTaskTitle] = useState("")
        const [newTaskDescription, setNewTaskDescription] = useState("")
        const [isEditingTitle, setIsEditingTitle] = useState(false)
        const [editedTitle, setEditedTitle] = useState(column.title)
        const [creating, setCreating] = useState(false)

        const handleAddTask = async () => {
            if (!newTaskTitle.trim()) return

            setCreating(true)
            try {
                await onCreateTask(column._id, newTaskTitle, newTaskDescription || undefined)
                setNewTaskTitle("")
                setNewTaskDescription("")
                setIsAddingTask(false)
            } catch (error) {
                console.error("Failed to create task:", error)
            } finally {
                setCreating(false)
            }
        }

        const handleDeleteColumn = () => {
            if (window.confirm("Are you sure you want to delete this column and all its tasks?")) {
                onDeleteColumn(column._id)
            }
        }

        const handleUpdateTitle = useCallback(async () => {
            if (editedTitle.trim() && editedTitle !== column.title) {
                await onUpdateColumn(column._id, editedTitle)
            } else {
                setEditedTitle(column.title)
            }
            setIsEditingTitle(false)
        }, [editedTitle, column.title, column._id, onUpdateColumn])

        // Memoize tasks to prevent unnecessary re-renders
        const memoizedTasks = useMemo(() => {
            return tasks.filter((task) => task._id) // Ensure all tasks have valid IDs
        }, [tasks])

        // Ensure we have a valid droppable ID
        const droppableId = column._id

        return (
            <Paper
                shadow="xs"
                p="md"
                radius="md"
                style={{
                    width: 280,
                    backgroundColor: "white",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "calc(100vh - 120px)",
                }}
            >
                <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
                    {isEditingTitle ? (
                        <TextInput
                            placeholder="Column Title"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleUpdateTitle}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleUpdateTitle()
                                }
                                if (e.key === "Escape") {
                                    setEditedTitle(column.title)
                                    setIsEditingTitle(false)
                                }
                            }}
                            autoFocus
                            style={{ flex: 1 }}
                        />
                    ) : (
                        <Title order={5} style={{ flex: 1 }} onClick={() => setIsEditingTitle(true)}>
                            {column.title}
                        </Title>
                    )}
                    <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                            <ActionIcon>
                                <IconDots size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => setIsEditingTitle(true)}>
                                Edit Title
                            </Menu.Item>
                            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={handleDeleteColumn}>
                                Delete Column
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>

                <Droppable droppableId={droppableId} type="task">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                                minHeight: 100,
                                flexGrow: 1,
                                overflowY: "auto",
                                backgroundColor: snapshot.isDraggingOver ? "rgba(0, 0, 0, 0.02)" : "transparent",
                                padding: "4px 0",
                                transition: "background-color 0.2s ease",
                                borderRadius: "4px",
                            }}
                        >
                            {memoizedTasks.map((task, index) => (
                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{
                                                ...provided.draggableProps.style,
                                                marginBottom: 8,
                                                opacity: snapshot.isDragging ? 0.8 : 1,
                                                transform: snapshot.isDragging
                                                    ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                                    : provided.draggableProps.style?.transform,
                                            }}
                                        >
                                            <TaskComponent
                                                key={`task-${task._id}`}
                                                task={task}
                                                members={members}
                                                onUpdate={onUpdateTask}
                                                onDelete={onDeleteTask}
                                                onOpenModal={onOpenTaskModal}
                                                findMemberById={findMemberById}
                                                permissions={permissions}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                {isAddingTask ? (
                    <Card shadow="sm" p="sm" mt="sm" style={{ flexShrink: 0 }}>
                        <Stack gap="xs">
                            <TextInput
                                placeholder="Enter task title"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                autoFocus
                            />
                            <TextInput
                                placeholder="Enter task description (optional)"
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                            />
                            <Group justify="flex-end" mt="xs">
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    onClick={() => {
                                        setIsAddingTask(false)
                                        setNewTaskTitle("")
                                        setNewTaskDescription("")
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button size="xs" onClick={handleAddTask} loading={creating} disabled={!newTaskTitle.trim()}>
                                    Add Task
                                </Button>
                            </Group>
                        </Stack>
                    </Card>
                ) : (
                    <Button
                        leftSection={<IconPlus size={14} />}
                        variant="subtle"
                        fullWidth
                        mt="md"
                        onClick={() => setIsAddingTask(true)}
                        style={{ flexShrink: 0 }}
                    >
                        Add Task
                    </Button>
                )}

                <Text size="xs" c="dimmed" mt="xs" style={{ flexShrink: 0 }}>
                    {memoizedTasks.length} {memoizedTasks.length === 1 ? "task" : "tasks"}
                </Text>
            </Paper>
        )
    },
)

ColumnComponent.displayName = "ColumnComponent"
