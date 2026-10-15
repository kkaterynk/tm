import axios from "axios"
import {ExtractUrlResponse, FileDeleteResponse, FileUploadResponse, SignedUrlResponse} from "../types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data)
      return config
    },
    (error) => {
      console.error("Request interceptor error:", error)
      return Promise.reject(error)
    },
)

// Handle auth errors
api.interceptors.response.use(
    (response) => {
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
      return response
    },
    (error) => {
      console.error("API Error:", error.response?.data || error.message)
      if (error.response?.status === 401) {
        localStorage.removeItem("token")
        window.location.href = "/login"
      }
      return Promise.reject(error)
    },
)

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password })
    localStorage.setItem("token", response.data.access_token)
    return response.data
  },
  register: async (name: string, email: string, password: string) => {
    const response = await api.post("/auth/register", { name, email, password })
    return response.data
  },
  logout: async() => {
    const response = await api.post("/auth/logout")
    localStorage.removeItem("token")
    return response.data

  },
  getProfile: async () => {
    const response = await api.get("/users/profile")
    return response.data
  },
}

// Boards API
export const boardsApi = {
  getAll: async () => {
    const response = await api.get("/boards")
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/boards/${id}`)
    return response.data
  },
  create: async (data: { title: string; description?: string, background?: string }) => {
    const response = await api.post("/boards", data)
    return response.data
  },
  update: async (id: string, data: { title?: string; description?:string, background?: string }) => {
    const response = await api.patch(`/boards/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/boards/${id}`)
    return response.data
  },
}

// Columns API
export const columnsApi = {
  getByBoard: async (boardId: string) => {
    const response = await api.get(`/columns?boardId=${boardId}`)
    return response.data
  },
  create: async (data: { title: string; boardId: string }) => {
    const response = await api.post("/columns", data)
    return response.data
  },
  update: async (id: string, data: { title: string }) => {
    const response = await api.patch(`/columns/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/columns/${id}`)
    return response.data
  },
  reorder: async (data: { boardId: string; columnIds: string[] }) => {
    const response = await api.patch("/columns/reorder", data)
    return response.data
  },
}

// Tasks API
export const tasksApi = {
  getByColumn: async (columnId: string) => {
    const response = await api.get(`/tasks?columnId=${columnId}`)
    return response.data
  },
  getByBoard: async (boardId: string) => {
    const response = await api.get(`/tasks?boardId=${boardId}`)
    return response.data
  },
  create: async (data: { title: string; description?: string; columnId: string }) => {
    const response = await api.post("/tasks", data)
    return response.data
  },
  update: async (id: string, data: { title?: string; description?: string }) => {
    const response = await api.patch(`/tasks/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`)
    return response.data
  },
  move: async (id: string, data: { columnId: string; position: number }) => {
    const response = await api.patch(`/tasks/${id}/move`, data)
    return response.data
  },
}

export const boardMembersApi = {
  getBoardMembers: async (boardId: string) => {
    try {
      const response = await api.get(`/boards/${boardId}/members`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error("Failed to get board members:", error)
      return [] // Return empty array on error
    }
  },
  shareBoard: async (boardId: string, email: string) => {
    const response = await api.post(`/boards/${boardId}/share`, {email})
    return response.data
  },
  removeMember: async (boardId: string, memberId: string) => {
    const response = await api.delete(`/boards/${boardId}/members/${memberId}`)
    return response.data
  },
  leaveBoard: async (boardId: string) => {
    const response = await api.post(`/boards/${boardId}/leave`)
    return response.data
  },
  getBoardPermissions: async (boardId: string) => {
    const response = await api.get(`/boards/${boardId}/permissions`)
    return response.data
  },

  async updateMemberPermissions(boardId: string, memberId: string, permissions: string[]) {
    const response = await api.patch(`/boards/${boardId}/members/${memberId}/permissions`, {
      permissions,
    })
    return response.data
  },

  async getMemberPermissions(boardId: string, memberId: string) {
    const response = await api.get(`/boards/${boardId}/members/${memberId}/permissions`)
    return response.data
  },
}

export const notificationsApi = {
  async getAll(limit = 20) {
    const response = await api.get(`/notifications?limit=${limit}`)
    return response.data
  },

  async getUnreadCount() {
    const response = await api.get(`/notifications/unread-count`)
    return response.data
  },

  async markAsRead(id: string) {
    const response = await api.patch(`/notifications/${id}/read`)
    return response.data
  },

  async markAllAsRead() {
    const response = await api.patch(`/notifications/mark-all-read`)
    return response.data
  },
}

export const filesApi = {
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<FileUploadResponse["data"]> {
    try {
      // Convert file to base64
      const fileData = await this.fileToBase64(file)

      // Simulate progress for base64 conversion
      if (onProgress) {
        onProgress(50)
      }

      const response = await api.post<FileUploadResponse>("/files/upload", {
        fileName: file.name,
        contentType: file.type,
        fileData: fileData.split(",")[1], // Remove data:mime;base64, prefix
        folder: "attachments",
      })

      if (onProgress) {
        onProgress(100)
      }

      if (!response.data.success) {
        throw new Error("Upload failed")
      }

      return response.data.data
    } catch (error: any) {
      console.error("File upload error:", error)
      throw new Error(error.response?.data?.message || "File upload failed")
    }
  },

  async uploadBackground(file: File, onProgress?: (progress: number) => void): Promise<FileUploadResponse["data"]> {
    try {
      // Validate file type on frontend
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed")
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit")
      }

      // Convert file to base64
      const fileData = await this.fileToBase64(file)

      // Simulate progress for base64 conversion
      if (onProgress) {
        onProgress(50)
      }

      const response = await api.post<FileUploadResponse>("/files/upload", {
        fileName: file.name,
        contentType: file.type,
        fileData: fileData.split(",")[1], // Remove data:mime;base64, prefix
        folder: "backgrounds",
      })

      if (onProgress) {
        onProgress(100)
      }

      if (!response.data.success) {
        throw new Error("Background upload failed")
      }

      return response.data.data
    } catch (error: any) {
      console.error("Background upload error:", error)
      throw new Error(error.response?.data?.message || "Background upload failed")
    }
  },

  async deleteFileByKey(key: string): Promise<void> {
    try {
      const response = await api.delete<FileDeleteResponse>(`/files/key/${encodeURIComponent(key)}`)

      if (!response.data.success) {
        throw new Error("File deletion failed")
      }
    } catch (error: any) {
      console.error("File deletion by key error:", error)
      throw new Error(error.response?.data?.message || "File deletion failed")
    }
  },

  async deleteFileByUrl(url: string): Promise<void> {
    try {
      const response = await api.delete<FileDeleteResponse>("/files/url", {
        data: { url },
      })

      if (!response.data.success) {
        throw new Error("File deletion failed")
      }
    } catch (error: any) {
      console.error("File deletion by URL error:", error)
      throw new Error(error.response?.data?.message || "File deletion failed")
    }
  },

  async getSignedUrl(url: string): Promise<string> {
    try {
      const response = await api.post<SignedUrlResponse>("/files/signed-url", {
        url,
      })

      if (!response.data.success) {
        throw new Error("Failed to get signed URL")
      }

      return response.data.data.url
    } catch (error: any) {
      console.error("Get signed URL error:", error)
      throw new Error(error.response?.data?.message || "Failed to get signed URL")
    }
  },

  async extractUnsignedUrl(signedUrl: string): Promise<string> {
    try {
      const response = await api.post<ExtractUrlResponse>("/files/extract-unsigned-url", {
        signedUrl,
      })

      if (!response.data.success) {
        throw new Error("Failed to extract unsigned URL")
      }

      return response.data.data.url
    } catch (error: any) {
      console.error("Extract unsigned URL error:", error)
      throw new Error(error.response?.data?.message || "Failed to extract unsigned URL")
    }
  },

  // Helper function to check if URL is signed
  isSignedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.searchParams.has("X-Amz-Signature") || urlObj.searchParams.has("Signature")
    } catch {
      return false
    }
  },

  // Helper function to convert file to base64
  fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  },
}
export default api
