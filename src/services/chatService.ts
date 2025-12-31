import api from './api'
import type { User, Message } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export interface ChatContact {
  id: string
  user: User
  lastMessage?: Message
  unreadCount: number
}

export const chatService = {
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await api.get<{ users: User[]; total: number }>(
      `/api/v1/users/search?query=${encodeURIComponent(query)}`
    )
    return response.data.users
  },

  getContacts: async (): Promise<ChatContact[]> => {
    const response = await api.get<ChatContact[]>('/api/v1/contacts')
    return response.data
  },

  getMessages: async (receiverId?: string, limit = 50, offset = 0): Promise<Message[]> => {
    const params = new URLSearchParams()
    if (receiverId) params.append('receiver_id', receiverId)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())

    const response = await api.get<Message[]>(`/api/v1/messages?${params.toString()}`)
    return response.data
  },

  sendMessage: async (
    content: string,
    receiverId?: string,
    groupId?: string
  ): Promise<Message> => {
    const response = await api.post<Message>('/api/v1/messages', {
      content,
      receiver_id: receiverId,
      group_id: groupId,
    })
    return response.data
  },

  markAsRead: async (messageId: string): Promise<void> => {
    await api.patch(`/api/v1/messages/${messageId}/read`)
  },

  addContact: async (contactId: string, nickname?: string): Promise<void> => {
    await api.post('/api/v1/contacts', {
      contact_id: contactId,
      nickname: nickname || null,
    })
  },

  uploadFile: async (file: File): Promise<{ url: string; filename: string; content_type: string; size: number }> => {
    const formData = new FormData()
    formData.append('file', file)

    // Use axios directly for file upload to avoid JSON content-type header
    const axios = (await import('axios')).default
    const token = sessionStorage.getItem('access_token')
    
    const response = await axios.post<{ url: string; filename: string; content_type: string; size: number }>(
      `${API_BASE_URL}/api/v1/upload`,
      formData,
      {
        headers: {
          // Don't set Content-Type manually - axios will set it with boundary
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      }
    )
    return response.data
  },

  sendMessageWithMedia: async (
    content: string,
    mediaUrl: string,
    mediaType: string,
    receiverId?: string,
    groupId?: string
  ): Promise<Message> => {
    const response = await api.post<Message>('/api/v1/messages', {
      content,
      receiver_id: receiverId,
      group_id: groupId,
      media_url: mediaUrl,
      media_type: mediaType,
    })
    return response.data
  },
}
