import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { chatService } from '@/services/chatService'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { User, Message } from '@/types'
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
  onChatListUpdate?: () => void
}

export function Sidebar({ selectedUserId, onSelectUser, onChatListUpdate }: SidebarProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Load contacts on mount and periodically refresh to sync with backend
  useEffect(() => {
    loadContacts()
    
    // Refresh chat list every 30 seconds to sync with backend (fallback for missed WebSocket messages)
    const refreshInterval = setInterval(() => {
      loadContacts()
    }, 30000)
    
    return () => clearInterval(refreshInterval)
  }, [])

  // Clear unread count when chat is selected
  useEffect(() => {
    if (selectedUserId) {
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === selectedUserId
            ? { ...contact, unreadCount: 0 }
            : contact
        )
      )
    }
  }, [selectedUserId])

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
    console.log('📬 Sidebar received WebSocket message:', {
      messageId: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      currentUserId: currentUser?.id,
      isRead: message.is_read,
      content: message.content,
    })
    
    // Determine contact ID (the other user in the conversation)
    const contactId =
      message.sender_id === currentUser?.id ? message.receiver_id : message.sender_id

    if (!contactId) {
      console.log('⚠️ No contactId found, skipping')
      return
    }

    setContacts((prev) => {
      // Check if contact already exists
      const existingContactIndex = prev.findIndex((contact) => contact.id === contactId)

      if (existingContactIndex >= 0) {
        // Update existing contact with new last message
        const updated = [...prev]
        const existingContact = updated[existingContactIndex]
        const isUnread = message.sender_id !== currentUser?.id && !message.is_read
        const isSelected = selectedUserId === contactId
        
        // Check if this message is newer than the current last message
        const currentLastMessageTime = existingContact.lastMessage
          ? new Date(existingContact.lastMessage.created_at).getTime()
          : 0
        const newMessageTime = new Date(message.created_at).getTime()
        const isNewerMessage = newMessageTime >= currentLastMessageTime
        
        console.log('📊 Updating contact:', {
          contactId,
          isUnread,
          isSelected,
          isNewerMessage,
          currentUnreadCount: existingContact.unreadCount,
          currentLastMessage: existingContact.lastMessage?.content,
          newMessage: message.content,
        })
        
        // Always update last message if this is newer or equal (to handle same timestamp)
        if (isNewerMessage || newMessageTime === currentLastMessageTime) {
          updated[existingContactIndex] = {
            ...updated[existingContactIndex],
            lastMessage: message,
            // Update unread count if message is not from current user and not selected
            unreadCount:
              isUnread && !isSelected
                ? existingContact.unreadCount + 1
                : isSelected
                ? 0 // Clear unread count when chat is selected
                : existingContact.unreadCount,
          }
          console.log('✅ Updated contact with new last message:', {
            contactId,
            newLastMessage: message.content,
            newUnreadCount: updated[existingContactIndex].unreadCount,
          })
        } else {
          // Message is older, but still update unread count if needed
          if (isUnread && !isSelected) {
            updated[existingContactIndex] = {
              ...updated[existingContactIndex],
              unreadCount: existingContact.unreadCount + 1,
            }
            console.log('✅ Updated unread count for older message:', {
              contactId,
              newUnreadCount: updated[existingContactIndex].unreadCount,
            })
          } else {
            console.log('⚠️ Skipping update - message is older and not unread')
          }
        }
        
        // Sort by last message time (most recent first)
        return updated.sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0
          if (!a.lastMessage) return 1
          if (!b.lastMessage) return -1
          return (
            new Date(b.lastMessage.created_at).getTime() -
            new Date(a.lastMessage.created_at).getTime()
          )
        })
      } else {
        // New contact - create entry with sender info from message
        // Determine which user info to use (sender or receiver)
        const otherUserInfo =
          message.sender_id === currentUser?.id
            ? null // We need to fetch receiver info
            : message.sender || {
                id: message.sender_id,
                email: '',
                username: '',
                is_active: true,
                is_verified: false,
                is_superuser: false,
              }

        // If we don't have user info, fetch it asynchronously
        if (!otherUserInfo) {
          // Fetch user info in background
          api
            .get<User>(`/api/v1/users/${contactId}`)
            .then((response) => {
              const fetchedUser = response.data
              setContacts((prevContacts) => {
                const existingIndex = prevContacts.findIndex((c) => c.id === contactId)
                if (existingIndex >= 0) {
                  // Update existing contact with fetched user info
                  const updated = [...prevContacts]
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    user: {
                      ...fetchedUser,
                      is_online: onlineUsers.has(contactId),
                    },
                  }
                  return updated
                }
                return prevContacts
              })
            })
            .catch((error) => {
              console.error('Failed to fetch user info:', error)
            })
        }

        const isUnread = message.sender_id !== currentUser?.id && !message.is_read
        const isSelected = selectedUserId === contactId
        
        console.log('➕ Creating new contact:', {
          contactId,
          isUnread,
          isSelected,
          hasUserInfo: !!otherUserInfo,
        })
        
        const newContact: ChatContact = {
          id: contactId,
          user: otherUserInfo
            ? {
                ...otherUserInfo,
                is_online: onlineUsers.has(contactId),
              }
            : {
                id: contactId,
                email: '',
                username: '',
                is_active: true,
                is_verified: false,
                is_superuser: false,
                is_online: onlineUsers.has(contactId),
              },
          lastMessage: message,
          unreadCount: isUnread && !isSelected ? 1 : 0,
        }
        // Add new contact and sort
        const updated = [...prev, newContact]
        return updated.sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0
          if (!a.lastMessage) return 1
          if (!b.lastMessage) return -1
          return (
            new Date(b.lastMessage.created_at).getTime() -
            new Date(a.lastMessage.created_at).getTime()
          )
        })
      }
    })
    
    // Force a re-render by updating state
    console.log('✅ Sidebar updated with new message')
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
      // Use chat list endpoint which returns all users with messages (Telegram-like)
      const chatList = await chatService.getChatList()
      
      // Update online status for users
      const chatContacts: ChatContact[] = chatList.map((item) => ({
        ...item,
        user: {
          ...item.user,
          is_online: onlineUsers.has(item.id),
        },
      }))

      setContacts(chatContacts)
      // Notify parent if callback provided
      if (onChatListUpdate) {
        onChatListUpdate()
      }
    } catch (error) {
      console.error('Failed to load chat list:', error)
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

  const handleSelectUser = async (userId: string) => {
    // If user is from search results, try to add to contacts (but don't block if it fails)
    // This allows messaging without requiring contact first (Telegram-like)
    if (searchQuery.trim().length > 0) {
      const isExistingContact = contacts.some((contact) => contact.id === userId)
      if (!isExistingContact) {
        try {
          await chatService.addContact(userId)
          // Reload chat list to show the new contact
          await loadContacts()
        } catch (error: any) {
          // Silently continue - contact will be auto-created when message is sent
          console.log('Contact not added yet, will be created on first message')
        }
      }
    }
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
                      <div className="flex items-center justify-between">
                      <div className="flex items-center justify-between w-full">
                        {item.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate flex-1 mr-2">
                            {item.lastMessage.media_url
                              ? item.lastMessage.media_type?.startsWith('image/')
                                ? '📷 Photo'
                                : item.lastMessage.media_type?.startsWith('video/')
                                ? '🎥 Video'
                                : '📎 File'
                              : item.lastMessage.content}
                          </p>
                        )}
                        {item.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0">
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                          </span>
                        )}
                      </div>
                      </div>
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
