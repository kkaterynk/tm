"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  AppShell,
  Container,
  Title,
  Button,
  Grid,
  Card,
  Text,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Avatar,
  Menu,
  LoadingOverlay,
  Burger,
  Divider,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { IconPlus, IconTrash, IconLogout, IconUser } from "@tabler/icons-react"
import { useAuth } from "../contexts/AuthContext"
import { boardsApi } from "../services/api"
import { NotificationBell } from "../components/NotificationBell"
import { NotificationsList } from "../components/NotificationsList"

interface Board {
  _id: string
  title: string
  description?: string
  background: string
  createdAt: string
  owner: string
  isShared?: boolean
}

export const DashboardPage: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false)
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)
  const [newBoardTitle, setNewBoardTitle] = useState("")
  const [newBoardDescription, setNewBoardDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadBoards()
  }, [])

  const loadBoards = async () => {
    try {
      setLoading(true)
      const data = await boardsApi.getAll()
      console.log("Boards data received:", data)

      // Process the boards to mark shared ones
      const processedBoards = Array.isArray(data)
          ? data.map((board) => ({
            ...board,
            isShared: board.owner !== user?.id,
          }))
          : []

      setBoards(processedBoards)
    } catch (error) {
      console.error("Error loading boards:", error)
      notifications.show({
        title: "Error",
        message: "Failed to load boards",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return

    setCreating(true)
    try {
      const newBoard = await boardsApi.create({
        title: newBoardTitle,
        description: newBoardDescription,
      })
      setBoards([newBoard, ...boards])
      setNewBoardTitle("")
      setNewBoardDescription("")
      closeCreateModal()
      notifications.show({
        title: "Success",
        message: "Board created successfully",
        color: "green",
      })
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create board",
        color: "red",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    try {
      await boardsApi.delete(boardId)
      setBoards(boards.filter((b) => b._id !== boardId))
      notifications.show({
        title: "Success",
        message: "Board deleted successfully",
        color: "green",
      })
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete board",
        color: "red",
      })
    }
  }

  return (
      <AppShell
          header={{ height: 60 }}
          navbar={{
            width: 250,
            breakpoint: "sm",
            collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
          }}
          padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
              <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
              <Title order={3} c="blue">
                Task Manager
              </Title>
            </Group>
            <Group h="100%" px="md" justify="space-between" gap="xl" align="center">
            <NotificationBell/>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar color="blue" radius="xl" style={{ cursor: "pointer" }}>
                  {user?.name.charAt(0).toUpperCase()}
                </Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />}>{user?.name}</Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={logout}>
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal} fullWidth>
              Create Board
            </Button>
            <Title order={5}>Your Boards</Title>
            {boards.map((board) => (
                <Card
                    key={board._id}
                    padding="xs"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/board/${board._id}`)}
                >
                  <Text size="sm" fw={500}>
                    {board.title}
                  </Text>
                </Card>
            ))}
            <Divider my="sm" />

            <Title order={5}>Recent notifications</Title>
            <NotificationsList />
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
          <Container fluid>
            <LoadingOverlay visible={loading} />
            <Group justify="space-between" mb="xl">
              <Title order={2}>Your Boards</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                Create Board
              </Button>
            </Group>

            <Grid>
              {boards.map((board) => (
                  <Grid.Col key={board._id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                    <Card
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                        style={{
                          cursor: "pointer",
                          background: board.background || "#0079bf",
                          color: "white",
                          minHeight: 120,
                        }}
                    >
                      <Group justify="space-between" align="flex-start">
                        <div onClick={() => navigate(`/board/${board._id}`)} style={{ flex: 1 }}>
                          <Text fw={500} size="lg">
                            {board.title}
                            {board.isShared && (
                                <Text component="span" size="xs" ml={5} style={{ opacity: 0.8 }}>
                                  (Shared)
                                </Text>
                            )}
                          </Text>
                          {board.description && (
                              <Text size="sm" mt="xs" opacity={0.8}>
                                {board.description}
                              </Text>
                          )}
                        </div>
                        {!board.isShared && (
                        <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteBoard(board._id)
                            }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                            )}
                      </Group>
                    </Card>
                  </Grid.Col>
              ))}
            </Grid>

            {boards.length === 0 && !loading && (
                <Card withBorder p="xl" mt="xl">
                  <Stack align="center">
                    <Text size="lg" c="dimmed">
                      No boards yet
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Create your first board to get started with organizing your tasks
                    </Text>
                    <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                      Create Your First Board
                    </Button>
                  </Stack>
                </Card>
            )}
          </Container>
        </AppShell.Main>

        <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create New Board">
          <Stack>
            <TextInput
                label="Board Title"
                placeholder="Enter board title"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                required
            />
            <Textarea
                label="Description (Optional)"
                placeholder="Enter board description"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
                minRows={3}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button onClick={handleCreateBoard} loading={creating} disabled={!newBoardTitle.trim()}>
                Create Board
              </Button>
            </Group>
          </Stack>
        </Modal>
      </AppShell>
  )
}
