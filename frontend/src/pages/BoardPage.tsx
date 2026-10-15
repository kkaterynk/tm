"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  AppShell,
  Container,
  Title,
  Button,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Stack,
  LoadingOverlay,
  Text,
  Textarea,
  Menu,
  Popover,
  Divider,
  Badge,
  Avatar,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconSettings,
  IconUsers,
  IconUserPlus,
  IconTrash,
  IconLogout,
} from "@tabler/icons-react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { boardsApi, columnsApi, tasksApi, boardMembersApi } from "../services/api"
import { ColumnComponent } from "../components/ColumnComponent"
import { TaskModal } from "../components/TaskModal"
import { NotificationBell } from "../components/NotificationBell"
import { PermissionManagementModal } from "../components/PermissionManagementModal"

interface Board {
  _id: string
  title: string
  description?: string
  background: string
  owner: string
}

interface Column {
  _id: string
  title: string
  boardId: string
  position: number
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

interface BoardMember {
  memberId: string | null
  userId: string
  email: string
  name: string
  isAdmin?: boolean
  isOwner?: boolean
}

interface BoardPermissions {
  isOwner: boolean
  isAdmin: boolean
  canEdit: boolean
  canManageMembers: boolean
  canLeave: boolean
  canEditTasks: boolean
  canManageColumns: boolean
  permissions?: string[]
}

export const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<BoardMember[]>([])
  const [permissions, setPermissions] = useState<BoardPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Modals
  const [createColumnModalOpened, { open: openCreateColumnModal, close: closeCreateColumnModal }] = useDisclosure(false)
  const [editBoardModalOpened, { open: openEditBoardModal, close: closeEditBoardModal }] = useDisclosure(false)
  const [shareBoardModalOpened, { open: openShareBoardModal, close: closeShareBoardModal }] = useDisclosure(false)
  const [permissionModalOpened, { open: openPermissionModal, close: closePermissionModal }] = useDisclosure(false)

  // Form states
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [editedTitle, setEditedTitle] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskModalOpened, { open: openTaskModal, close: closeTaskModal }] = useDisclosure(false)

  // Handle hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const loadBoardData = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      console.log("Loading board data for ID:", id)

      const [boardData, columnsData, tasksData, permissionsData] = await Promise.all([
        boardsApi.getById(id),
        columnsApi.getByBoard(id),
        tasksApi.getByBoard(id),
        boardMembersApi.getBoardPermissions(id),
      ])

      console.log("Loaded data:", {
        board: boardData,
        columns: columnsData.length,
        tasks: tasksData.length,
        permissions: permissionsData,
      })

      setBoard(boardData)
      setEditedTitle(boardData.title)
      setEditedDescription(boardData.description || "")
      setPermissions(permissionsData)

      // Sort columns by position
      const sortedColumns = columnsData.filter((col: Column) => col._id).sort((a: Column, b: Column) => a.position - b.position)
      setColumns(sortedColumns)

      // Sort tasks by position
      const sortedTasks = tasksData.filter((task: Task) => task._id).sort((a: Task, b: Task) => a.position - b.position)
      setTasks(sortedTasks)

      // Load members separately with error handling
      try {
        const membersData = await boardMembersApi.getBoardMembers(id)
        // Ensure membersData is an array
        if (Array.isArray(membersData)) {
          setMembers(membersData)
          console.log("Loaded members:", membersData.length)
        } else {
          console.error("Members data is not an array:", membersData)
          setMembers([])
        }
      } catch (memberError) {
        console.error("Failed to load board members:", memberError)
        setMembers([])
      }
    } catch (error) {
      console.error("Failed to load board data:", error)
      notifications.show({
        title: "Error",
        message: "Failed to load board data",
        color: "red",
      })
      navigate("/dashboard")
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    if (id) {
      loadBoardData()
    }
  }, [loadBoardData])

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId, type } = result

    if (!destination) {
      return
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    if (!permissions) return

    // Handle column reordering
    if (type === "column") {
      if (!permissions.canManageColumns) {
        notifications.show({
          title: "Permission Denied",
          message: "You don't have permission to reorder columns",
          color: "red",
        })
        return
      }
      const newColumns = Array.from(columns)
      const movedColumn = newColumns.splice(source.index, 1)[0]
      newColumns.splice(destination.index, 0, movedColumn)

      // Update positions
      const updatedColumns = newColumns.map((col, index) => ({
        ...col,
        position: index,
      }))

      setColumns(updatedColumns)

      try {
        // Send update to server
        await columnsApi.reorder({
          boardId: id!,
          columnIds: updatedColumns.map((c) => c._id),
        })
      } catch (error) {
        console.error("Failed to reorder columns:", error)
        notifications.show({
          title: "Error",
          message: "Failed to reorder columns",
          color: "red",
        })
        loadBoardData() // Reload data if reordering fails
      }
      return
    }

    // Handle task reordering/moving
    const sourceColumn = source.droppableId
    const destinationColumn = destination.droppableId

    if (sourceColumn === destinationColumn) {
      // Reordering within the same column
      const columnTasks = tasks.filter((t) => t.columnId === sourceColumn).sort((a, b) => a.position - b.position)

      const movedTask = columnTasks.find((t) => t._id === draggableId)
      if (!movedTask) return

      const newColumnTasks = Array.from(columnTasks)
      newColumnTasks.splice(source.index, 1)
      newColumnTasks.splice(destination.index, 0, movedTask)

      const updatedTasks = tasks.map((t) => {
        if (t.columnId !== sourceColumn) return t
        const index = newColumnTasks.findIndex((nt) => nt._id === t._id)
        return { ...t, position: index }
      })

      setTasks(updatedTasks)

      try {
        await tasksApi.move(draggableId, {
          columnId: sourceColumn,
          position: destination.index,
        })
      } catch (error) {
        console.error("Failed to move task:", error)
        notifications.show({
          title: "Error",
          message: "Failed to move task",
          color: "red",
        })
        loadBoardData()
      }
    } else {
      // Moving to a different column
      const sourceColumnTasks = tasks.filter((t) => t.columnId === sourceColumn).sort((a, b) => a.position - b.position)

      const destinationColumnTasks = tasks
          .filter((t) => t.columnId === destinationColumn)
          .sort((a, b) => a.position - b.position)

      const movedTask = sourceColumnTasks.find((t) => t._id === draggableId)
      if (!movedTask) return

      // Remove from source column
      const newSourceColumnTasks = Array.from(sourceColumnTasks)
      newSourceColumnTasks.splice(source.index, 1)

      // Add to destination column
      const newDestinationColumnTasks = Array.from(destinationColumnTasks)
      newDestinationColumnTasks.splice(destination.index, 0, { ...movedTask, columnId: destinationColumn })

      // Update all tasks with new positions
      const updatedTasks = tasks.map((t) => {
        if (t._id === draggableId) {
          return { ...t, columnId: destinationColumn, position: destination.index }
        }
        if (t.columnId === sourceColumn) {
          const index = newSourceColumnTasks.findIndex((nt) => nt._id === t._id)
          return index !== -1 ? { ...t, position: index } : t
        }
        if (t.columnId === destinationColumn) {
          const index = newDestinationColumnTasks.findIndex((nt) => nt._id === t._id)
          return index !== -1 ? { ...t, position: index } : t
        }
        return t
      })

      setTasks(updatedTasks)

      try {
        await tasksApi.move(draggableId, {
          columnId: destinationColumn,
          position: destination.index,
        })
      } catch (error) {
        console.error("Failed to move task:", error)
        notifications.show({
          title: "Error",
          message: "Failed to move task",
          color: "red",
        })
        loadBoardData()
      }
    }
  }

  const handleCreateColumn = async () => {
    if (!newColumnTitle.trim() || !id) return

    if (!permissions?.canManageColumns) {
      notifications.show({
        title: "Permission Denied",
        message: "You don't have permission to create columns",
        color: "red",
      })
      return
    }

    setCreating(true)
    try {
      console.log("Creating column:", { title: newColumnTitle, boardId: id })
      const newColumn = await columnsApi.create({
        title: newColumnTitle,
        boardId: id,
      })
      console.log("Created column:", newColumn)
      setColumns((prev) => [...prev, newColumn])
      setNewColumnTitle("")
      closeCreateColumnModal()
      notifications.show({
        title: "Success",
        message: "Column created successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to create column:", error)
      notifications.show({
        title: "Error",
        message: "Failed to create column",
        color: "red",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateColumn = async (columnId: string, title: string) => {
    if (!permissions?.canManageColumns) {
      notifications.show({
        title: "Permission Denied",
        message: "You don't have permission to update columns",
        color: "red",
      })
      return
    }
    try {
      console.log("Updating column:", columnId, title)
      const updatedColumn = await columnsApi.update(columnId, { title })
      setColumns((prev) => prev.map((c) => (c._id === columnId ? { ...c, title } : c)))
      notifications.show({
        title: "Success",
        message: "Column updated successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to update column:", error)
      notifications.show({
        title: "Error",
        message: "Failed to update column",
        color: "red",
      })
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!permissions?.canManageColumns) {
      notifications.show({
        title: "Permission Denied",
        message: "You don't have permission to delete columns",
        color: "red",
      })
      return
    }
    try {
      console.log("Deleting column:", columnId)
      await columnsApi.delete(columnId)
      setColumns((prev) => prev.filter((c) => c._id !== columnId))
      setTasks((prev) => prev.filter((t) => t.columnId !== columnId))
      notifications.show({
        title: "Success",
        message: "Column deleted successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to delete column:", error)
      notifications.show({
        title: "Error",
        message: "Failed to delete column",
        color: "red",
      })
    }
  }

  const handleUpdateBoard = async () => {
    if (!editedTitle.trim() || !id) return

    setUpdating(true)
    try {
      const updatedBoard = await boardsApi.update(id, {
        title: editedTitle,
        description: editedDescription || undefined,
      })
      setBoard(updatedBoard)
      closeEditBoardModal()
      notifications.show({
        title: "Success",
        message: "Board updated successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to update board:", error)
      notifications.show({
        title: "Error",
        message: "Failed to update board",
        color: "red",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateTask = async (columnId: string, title: string, description?: string) => {
    if (!permissions?.canEditTasks) {
      notifications.show({
        title: "Permission Denied",
        message: "You don't have permission to create tasks",
        color: "red",
      })
      return
    }
    try {
      console.log("Creating task:", { title, description, columnId })
      const newTask = await tasksApi.create({
        title,
        description,
        columnId,
      })
      console.log("Created task:", newTask)
      setTasks((prev) => [...prev, newTask])
      notifications.show({
        title: "Success",
        message: "Task created successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to create task:", error)
      notifications.show({
        title: "Error",
        message: "Failed to create task",
        color: "red",
      })
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!permissions?.canEditTasks) {
      notifications.show({
        title: "Permission Denied",
        message: "You don't have permission to edit tasks",
        color: "red",
      })
      return
    }
    try {
      const cleanedUpdates = {
        ...updates,
        customLabels: updates.customLabels?.map(({ name, color }) => ({ name, color })),
        attachments: updates.attachments?.map(({ name, type, url, size, uploadedBy }) => ({ name, type, url, size, uploadedBy }))
      }
      console.log("Updating task:", taskId, cleanedUpdates)
      const updatedTask = await tasksApi.update(taskId, cleanedUpdates)
      console.log("Updated task:", updatedTask)
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, ...updatedTask } : t)))
      notifications.show({
        title: "Success",
        message: "Task updated successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to update task:", error)
      notifications.show({
        title: "Error",
        message: "Failed to update task",
        color: "red",
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!permissions?.canEditTasks) {
      notifications.show({
        title: "Permission Denied",
        message: "You don't have permission to delete tasks",
        color: "red",
      })
      return
    }
    try {
      console.log("Deleting task:", taskId)
      await tasksApi.delete(taskId)
      setTasks((prev) => prev.filter((t) => t._id !== taskId))
      notifications.show({
        title: "Success",
        message: "Task deleted successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to delete task:", error)
      notifications.show({
        title: "Error",
        message: "Failed to delete task",
        color: "red",
      })
    }
  }

  const handleShareBoard = async () => {
    if (!newMemberEmail.trim() || !id) return

    setSharing(true)
    try {
      await boardMembersApi.shareBoard(id, newMemberEmail)

      // Reload members after sharing
      try {
        const updatedMembers = await boardMembersApi.getBoardMembers(id)
        if (Array.isArray(updatedMembers)) {
          setMembers(updatedMembers)
        } else {
          console.error("Members data is not an array:", updatedMembers)
        }
      } catch (memberError) {
        console.error("Failed to reload members:", memberError)
      }

      setNewMemberEmail("")
      notifications.show({
        title: "Success",
        message: "Board shared successfully",
        color: "green",
      })
    } catch (error: any) {
      console.error("Failed to share board:", error)
      notifications.show({
        title: "Error",
        message: `Failed to share board. ${error?.response?.data?.message}`,
        color: "red",
      })
    } finally {
      setSharing(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!id || !memberId) return

    try {
      await boardMembersApi.removeMember(id, memberId)
      setMembers((prev) => prev.filter((m) => m.memberId !== memberId))
      notifications.show({
        title: "Success",
        message: "Member removed successfully",
        color: "green",
      })
    } catch (error) {
      console.error("Failed to remove member:", error)
      notifications.show({
        title: "Error",
        message: "Failed to remove member",
        color: "red",
      })
    }
  }

  const handleLeaveBoard = async () => {
    if (!id) return

    if (!window.confirm("Are you sure you want to leave this board? You will lose access to all tasks and data.")) {
      return
    }

    setLeaving(true)
    try {
      await boardMembersApi.leaveBoard(id)
      notifications.show({
        title: "Success",
        message: "You have left the board successfully",
        color: "green",
      })
      navigate("/dashboard")
    } catch (error: any) {
      console.error("Failed to leave board:", error)
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to leave board",
        color: "red",
      })
    } finally {
      setLeaving(false)
    }
  }

  const handleOpenTaskModal = (task: Task) => {
    setSelectedTask(task)
    openTaskModal()
  }

  const handleCloseTaskModal = () => {
    setSelectedTask(null)
    closeTaskModal()
  }

  // Get tasks for a specific column
  const getTasksForColumn = useCallback(
      (columnId: string) => {
        return tasks.filter((task) => task.columnId === columnId).sort((a, b) => a.position - b.position)
      },
      [tasks],
  )

  // Find member by ID - with safety check
  const findMemberById = useCallback(
      (userId: string) => {
        if (!Array.isArray(members)) {
          console.error("Members is not an array:", members)
          return undefined
        }
        return members.find((member) => member.userId === userId)
      },
      [members],
  )

  // Check if current user is owner - with safety check
  const isCurrentUserOwner = useMemo(() => {
    if (!Array.isArray(members) || members.length === 0) return false
    const currentUserMember = members.find((m) => m.isOwner)
    return !!currentUserMember
  }, [members])

  // Safe members array for rendering
  const safeMembers = useMemo(() => {
    return Array.isArray(members) ? members : []
  }, [members])

  if (loading) {
    return <LoadingOverlay visible />
  }

  if (!board || !permissions) {
    return (
        <Container>
          <Text>Board not found</Text>
        </Container>
    )
  }

  return (
      <AppShell
          header={{ height: 60 }}
          padding={0}
          style={{
            background: board.background || "#f0f2f5",
            minHeight: "100vh",
          }}
      >
        <AppShell.Header style={{ background: "rgba(0, 0, 0, 0.1)", border: "none" }}>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <ActionIcon variant="subtle" color="white" onClick={() => navigate("/dashboard")}>
                <IconArrowLeft size={20} />
              </ActionIcon>
              <Title order={3} c="white">
                {board.title}
              </Title>
              {!permissions.isOwner && (
                  <Badge color="blue" variant="light">
                    Shared
                  </Badge>
              )}
            </Group>
            <Group>
              <NotificationBell />
              <Popover position="bottom-end" withArrow shadow="md">
                <Popover.Target>
                  <ActionIcon variant="subtle" color="white">
                    <IconUsers size={20} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Text fw={600}>Board Members</Text>
                    {safeMembers.map((member) => (
                        <Group key={member.userId} justify="space-between">
                          <Group>
                            <Avatar radius="xl" size="sm" color="blue">
                              {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text size="sm">{member.name || member.email}</Text>
                              {member.isOwner && (
                                  <Badge size="xs" color="blue">
                                    Owner
                                  </Badge>
                              )}
                              {member.isAdmin && (
                                  <Badge size="xs" color="teal">
                                    Admin
                                  </Badge>
                              )}
                            </div>
                          </Group>
                          {(permissions.canManageMembers && !member.isOwner && member.memberId) && (
                              <ActionIcon color="red" onClick={() => handleRemoveMember(member.memberId!)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                          )}
                        </Group>
                    ))}
                    <Divider />
                    {/*<Button leftSection={<IconUserPlus size={16} />} variant="light" size="sm" onClick={openShareBoardModal}>
                      Add Member
                    </Button>*/}
                    <Group>
                      {/* Only show add member button if user can manage members */}
                      {permissions.canManageMembers && (
                          <Button
                              leftSection={<IconUserPlus size={16} />}
                              variant="light"
                              size="sm"
                              onClick={openShareBoardModal}
                          >
                            Add Member
                          </Button>
                      )}
                      {/* Show leave board button if user can leave */}
                      {permissions.canLeave && (
                          <Button
                              leftSection={<IconLogout size={16} />}
                              variant="light"
                              color="red"
                              size="sm"
                              onClick={handleLeaveBoard}
                              loading={leaving}
                          >
                            Leave Board
                          </Button>
                      )}
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              {permissions.canEdit && (
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="white">
                    <IconSettings size={20} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEdit size={16} />} onClick={openEditBoardModal}>
                    Edit Board Details
                  </Menu.Item>
                  <Menu.Item leftSection={<IconUserPlus size={16} />} onClick={openShareBoardModal}>
                    Share Board
                  </Menu.Item>
                  <Menu.Item leftSection={<IconSettings size={16} />} onClick={openPermissionModal}>
                    Manage Permissions
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              )}
              {permissions.canManageColumns && (
              <Button leftSection={<IconPlus size={16} />} variant="white" onClick={openCreateColumnModal}>
                Add Column
              </Button>
              )}
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Container fluid p="md">
            {isMounted ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="board" type="column" direction="horizontal">
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={{
                              display: "flex",
                              overflowX: "auto",
                              padding: "8px 0",
                              minHeight: "calc(100vh - 120px)",
                              backgroundColor: snapshot.isDraggingOver ? "rgba(255, 255, 255, 0.1)" : "transparent",
                            }}
                        >
                          {columns.map((column, index) => (
                              <Draggable key={column._id} draggableId={column._id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          ...provided.draggableProps.style,
                                          marginRight: "16px",
                                          opacity: snapshot.isDragging ? 0.8 : 1,
                                        }}
                                    >
                                      <ColumnComponent
                                          key={`column-${column._id}`}
                                          column={column}
                                          tasks={getTasksForColumn(column._id)}
                                          members={safeMembers}
                                          permissions={permissions}
                                          onCreateTask={handleCreateTask}
                                          onUpdateTask={handleUpdateTask}
                                          onDeleteTask={handleDeleteTask}
                                          onUpdateColumn={handleUpdateColumn}
                                          onDeleteColumn={handleDeleteColumn}
                                          onOpenTaskModal={handleOpenTaskModal}
                                          findMemberById={findMemberById}
                                      />
                                    </div>
                                )}
                              </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                    )}
                  </Droppable>
                </DragDropContext>
            ) : (
                <div style={{ display: "flex", overflowX: "auto", padding: "8px 0" }}>
                  <Text>Loading drag and drop...</Text>
                </div>
            )}
          </Container>
        </AppShell.Main>

        {/* Create Column Modal */}
        {permissions.canManageColumns && (
        <Modal opened={createColumnModalOpened} onClose={closeCreateColumnModal} title="Create New Column">
          <Stack>
            <TextInput
                label="Column Title"
                placeholder="Enter column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                required
            />
            <Group justify="space-between" align="flex-end">
              <Button variant="subtle" onClick={closeCreateColumnModal}>
                Cancel
              </Button>
              <Button onClick={handleCreateColumn} loading={creating} disabled={!newColumnTitle.trim()}>
                Create Column
              </Button>
            </Group>
          </Stack>
        </Modal>
        )}

        {/* Edit Board Modal */}
        {permissions.canEdit && (
        <Modal opened={editBoardModalOpened} onClose={closeEditBoardModal} title="Edit Board Details">
          <Stack>
            <TextInput
                label="Board Title"
                placeholder="Enter board title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                required
            />
            <Textarea
                label="Board Description"
                placeholder="Enter board description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                minRows={3}
            />
            <Group justify="space-between" align="flex-end">
              <Button variant="subtle" onClick={closeEditBoardModal}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBoard} loading={updating} disabled={!editedTitle.trim()}>
                Update Board
              </Button>
            </Group>
          </Stack>
        </Modal>
        )}

        {/* Share Board Modal */}
        {permissions.canManageMembers && (
        <Modal opened={shareBoardModalOpened} onClose={closeShareBoardModal} title="Share Board">
          <Stack>
            <TextInput
                label="Email Address"
                placeholder="Enter email address to share with"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
            />
            <Group justify="space-between" align="flex-end">
              <Button variant="subtle" onClick={closeShareBoardModal}>
                Cancel
              </Button>
              <Button onClick={handleShareBoard} loading={sharing} disabled={!newMemberEmail.trim()}>
                Share Board
              </Button>
            </Group>
          </Stack>
        </Modal>
        )}

        {/* Task Modal */}
        <TaskModal
            task={selectedTask}
            opened={taskModalOpened}
            onClose={handleCloseTaskModal}
            members={safeMembers}
            permissions={permissions}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            findMemberById={findMemberById}
        />

        {/* Permission Management Modal - Only show if user is owner */}
        {(permissions.isOwner || permissions.isAdmin) && (
            <PermissionManagementModal
                opened={permissionModalOpened}
                onClose={closePermissionModal}
                boardId={id!}
                members={safeMembers}
                onMembersUpdate={loadBoardData}
                isOwner={(permissions.isOwner || permissions.isAdmin)}
            />
        )}
      </AppShell>
  )
}
