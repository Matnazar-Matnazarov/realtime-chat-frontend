import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { chatService } from '@/services/chatService'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { User, Message, Contact } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import api from '@/services/api'

interface ChatContact {
  id: string
  user: User
  lastMessage?: Message
  unreadCount: number
}

interface SidebarProps {
  selectedUserId: string | null
  onSelectUser: (userId: string) => void
}

export function Sidebar({ selectedUserId, onSelectUser }: SidebarProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Load contacts on mount
  useEffect(() => {
    loadContacts()
  }, [])

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }, [searchQuery])

  // WebSocket handlers
  const handleWebSocketMessage = (message: Message) => {
    // Update last message in contacts
    setContacts((prev) => {
      const contactId =
        message.sender_id === currentUser?.id ? message.receiver_id : message.sender_id

      if (!contactId) return prev

      return prev.map((contact) => {
        if (contact.id === contactId) {
          return {
            ...contact,
            lastMessage: message,
          }
        }
        return contact
      })
    })
  }

  const handleOnlineStatus = (userId: string, isOnline: boolean) => {
    setOnlineUsers((prev) => {
      const newSet = new Set(prev)
      if (isOnline) {
        newSet.add(userId)
      } else {
        newSet.delete(userId)
      }
      return newSet
    })

    // Update contact online status
    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.user.id === userId) {
          return {
            ...contact,
            user: {
              ...contact.user,
              is_online: isOnline,
            },
          }
        }
        return contact
      })
    )
  }

  useWebSocket(handleWebSocketMessage, handleOnlineStatus)

  const loadContacts = async () => {
    try {
      setIsLoading(true)
      const contactsResponse = await api.get<Contact[]>('/api/v1/contacts')
      const contactsData = contactsResponse.data

      // Transform contacts to ChatContact format and load last messages
      const chatContacts: ChatContact[] = await Promise.all(
        contactsData.map(async (contact) => {
          const contactUser = contact.contact || {
            id: contact.contact_id,
            email: '',
            username: '',
            is_active: true,
            is_verified: false,
            is_superuser: false,
            is_online: onlineUsers.has(contact.contact_id),
          }

          // Get last message
          let lastMessage: Message | undefined
          try {
            const messages = await chatService.getMessages(contact.contact_id, 1, 0)
            lastMessage = messages[0]
          } catch {
            // Ignore errors
          }

          return {
            id: contact.contact_id,
            user: contactUser,
            lastMessage,
            unreadCount: 0, // TODO: Calculate unread count
          }
        })
      )

      // Sort by last message time
      chatContacts.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return (
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
        )
      })

      setContacts(chatContacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
      toast.error(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    try {
      setIsSearching(true)
      const users = await chatService.searchUsers(query)
      setSearchResults(users)
    } catch (error) {
      console.error('Failed to search users:', error)
      toast.error(t('common.error'))
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId)
    setSearchQuery('')
    setSearchResults([])
  }

  const displayItems = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return searchResults.map((user) => ({
        id: user.id,
        user: {
          ...user,
          is_online: onlineUsers.has(user.id),
        },
        lastMessage: undefined,
        unreadCount: 0,
      }))
    }
    return contacts
  }, [searchQuery, searchResults, contacts, onlineUsers])

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Search Bar */}
      <div className="p-4 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
            disabled={isSearching}
          />
        </div>
      </div>

      {/* Contacts/Results List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : displayItems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? t('chat.noResults') : t('chat.noContacts')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayItems.map((item) => {
              const isSelected = selectedUserId === item.id
              const displayUser = item.user

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectUser(item.id)}
                  className={`w-full p-4 hover:bg-muted/50 transition-colors text-left ${
                    isSelected ? 'bg-muted' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {displayUser.username?.[0]?.toUpperCase() ||
                          displayUser.email[0]?.toUpperCase() ||
                          '?'}
                      </div>
                      {displayUser.is_online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate text-sm text-foreground">
                          {displayUser.username || displayUser.email}
                        </p>
                        {item.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {new Date(item.lastMessage.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      {item.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.lastMessage.content}
                        </p>
                      )}
                      {item.unreadCount > 0 && (
                        <div className="mt-1 flex justify-end">
                          <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                            {item.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
