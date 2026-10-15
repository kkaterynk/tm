"use client"

import type React from "react"
import { Navigate } from "react-router-dom"
import { LoadingOverlay } from "@mantine/core"
import { useAuth } from "../contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingOverlay visible />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
