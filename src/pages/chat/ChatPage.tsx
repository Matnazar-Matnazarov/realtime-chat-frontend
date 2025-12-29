import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/chat/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { Header } from '@/components/layout/Header'
import api from '@/services/api'
import type { User, Message } from '@/types'

export function ChatPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    if (selectedUserId) {
      loadUser(selectedUserId)
    } else {
      setSelectedUser(null)
    }
  }, [selectedUserId])

  const loadUser = async (userId: string) => {
    try {
      const response = await api.get<User>(`/api/v1/users/${userId}`)
      setSelectedUser(response.data)
    } catch (error) {
      console.error('Failed to load user:', error)
      setSelectedUser(null)
    }
  }

  const handleMessageSent = (message: Message) => {
    // This will trigger sidebar update via WebSocket
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r bg-background">
          <Sidebar selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} />
        </div>
        <div className="flex-1 flex flex-col bg-background">
          <ChatWindow
            userId={selectedUserId}
            user={selectedUser || undefined}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>
    </div>
  )
}
