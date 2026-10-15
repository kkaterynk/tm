export interface Board {
  _id: string
  title: string
  background: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface List {
  _id: string
  title: string
  boardId: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface Card {
  _id: string
  title: string
  description?: string
  listId: string
  position: number
  dueDate?: string
  labels?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateBoardDto {
  title: string
  background?: string
}

export interface CreateListDto {
  title: string
  boardId: string
}

export interface CreateCardDto {
  title: string
  description?: string
  listId: string
}

export interface MoveCardDto {
  listId: string
  position: number
}

export interface FileUploadResponse {
  success: boolean
  data: {
    url: string
    key: string
    name: string
    type: string
    size: number
    uploadedBy: string
    uploadedAt: string
  }
}

export interface FileDeleteResponse {
  success: boolean
  message: string
}

export interface SignedUrlResponse {
  success: boolean
  data: {
    url: string
  }
}

export interface ExtractUrlResponse {
  success: boolean
  data: {
    url: string
  }
}
