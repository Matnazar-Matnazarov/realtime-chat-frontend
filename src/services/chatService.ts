import api from './api'
import type { User, Message } from '@/types'

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
}
