"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import type { DropResult } from "react-beautiful-dnd"

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
}

interface UseDragAndDropProps {
    columns: Column[]
    tasks: Task[]
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
    onColumnReorder: (boardId: string, columnIds: string[]) => Promise<void>
    onTaskMove: (taskId: string, data: { columnId: string; position: number }) => Promise<void>
    boardId: string
}

export const useDragAndDrop = ({
                                   columns,
                                   tasks,
                                   setColumns,
                                   setTasks,
                                   onColumnReorder,
                                   onTaskMove,
                                   boardId,
                               }: UseDragAndDropProps) => {
    const [isDragging, setIsDragging] = useState(false)
    const draggedItemRef = useRef<string | null>(null)

    const handleDragStart = useCallback((start: any) => {
        setIsDragging(true)
        draggedItemRef.current = start.draggableId
        console.log("Drag started:", start.draggableId)
    }, [])

    const handleDragEnd = useCallback(
        async (result: DropResult) => {
            setIsDragging(false)
            draggedItemRef.current = null

            const { destination, source, type, draggableId } = result

            console.log("Drag end result:", {
                destination,
                source,
                type,
                draggableId,
                availableColumns: columns.map((c) => c._id),
                availableTasks: tasks.map((t) => t._id),
            })

            // If there's no destination or the item was dropped in the same place, do nothing
            if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
                console.log("No destination or same position, ignoring")
                return
            }

            try {
                if (type === "column") {
                    console.log("Handling column reorder")

                    // Verify the column exists
                    const columnExists = columns.find((c) => c._id === draggableId)
                    if (!columnExists) {
                        console.error("Column not found:", draggableId)
                        return
                    }

                    // Create a new array with reordered columns
                    const reorderedColumns = Array.from(columns)
                    const [movedColumn] = reorderedColumns.splice(source.index, 1)
                    reorderedColumns.splice(destination.index, 0, movedColumn)

                    // Update positions
                    const updatedColumns = reorderedColumns.map((col, index) => ({
                        ...col,
                        position: index,
                    }))

                    // Optimistically update UI
                    setColumns(updatedColumns)

                    // Send update to server
                    await onColumnReorder(
                        boardId,
                        updatedColumns.map((col) => col._id),
                    )
                    console.log("Column reorder successful")
                } else if (type === "task") {
                    console.log("Handling task move")

                    // Verify the task exists
                    const taskExists = tasks.find((t) => t._id === draggableId)
                    if (!taskExists) {
                        console.error("Task not found:", draggableId)
                        return
                    }

                    // Verify the destination column exists
                    const destinationColumnExists = columns.find((c) => c._id === destination.droppableId)
                    if (!destinationColumnExists) {
                        console.error("Destination column not found:", destination.droppableId)
                        return
                    }

                    const sourceColumnId = source.droppableId
                    const destinationColumnId = destination.droppableId

                    // Create a copy of tasks
                    const tasksCopy = [...tasks]

                    // Find and remove the task being moved
                    const taskIndex = tasksCopy.findIndex((t) => t._id === draggableId)
                    if (taskIndex === -1) {
                        console.error("Task index not found")
                        return
                    }

                    const [movedTask] = tasksCopy.splice(taskIndex, 1)

                    // Update the task's column
                    const updatedTask = {
                        ...movedTask,
                        columnId: destinationColumnId,
                    }

                    // Get tasks in the destination column (excluding the moved task)
                    const destinationTasks = tasksCopy
                        .filter((t) => t.columnId === destinationColumnId)
                        .sort((a, b) => a.position - b.position)

                    // Insert the moved task at the new position
                    destinationTasks.splice(destination.index, 0, updatedTask)

                    // Update positions for all tasks in the destination column
                    destinationTasks.forEach((task, index) => {
                        task.position = index
                    })

                    // If moving within the same column, we need to update positions for source column too
                    if (sourceColumnId === destinationColumnId) {
                        // Already handled above
                    } else {
                        // Update positions for source column
                        const sourceTasks = tasksCopy
                            .filter((t) => t.columnId === sourceColumnId)
                            .sort((a, b) => a.position - b.position)

                        sourceTasks.forEach((task, index) => {
                            task.position = index
                        })
                    }

                    // Combine all tasks
                    const otherTasks = tasksCopy.filter(
                        (t) => t.columnId !== destinationColumnId && t.columnId !== sourceColumnId,
                    )
                    const finalTasks = [...otherTasks, ...destinationTasks]

                    if (sourceColumnId !== destinationColumnId) {
                        const sourceTasks = tasksCopy.filter((t) => t.columnId === sourceColumnId)
                        finalTasks.push(...sourceTasks)
                    }

                    // Optimistically update UI
                    setTasks(finalTasks)

                    // Send update to server
                    await onTaskMove(draggableId, {
                        columnId: destinationColumnId,
                        position: destination.index,
                    })
                    console.log("Task move successful")
                }
            } catch (error) {
                console.error("Drag and drop operation failed:", error)
                // Don't reload data here, let the parent component handle it
                throw error
            }
        },
        [columns, tasks, setColumns, setTasks, onColumnReorder, onTaskMove, boardId],
    )

    return {
        isDragging,
        handleDragStart,
        handleDragEnd,
    }
}
