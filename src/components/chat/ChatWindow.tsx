import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { chatService } from '@/services/chatService'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { User, Message } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface ChatWindowProps {
  userId: string | null
  user?: User
  onMessageSent?: (message: Message) => void
}

export function ChatWindow({ userId, user, onMessageSent }: ChatWindowProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // WebSocket connection
  const handleWebSocketMessage = (message: Message) => {
    // Only add message if it's for this chat
    if (
      (message.receiver_id === userId && message.sender_id === currentUser?.id) ||
      (message.sender_id === userId && message.receiver_id === currentUser?.id) ||
      (message.receiver_id === currentUser?.id && message.sender_id === userId)
    ) {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
      scrollToBottom()
    }
  }

  useWebSocket(handleWebSocketMessage)

  useEffect(() => {
    if (userId) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const loadedMessages = await chatService.getMessages(userId, 50, 0)
      setMessages(loadedMessages.reverse()) // Reverse to show oldest first
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !userId || isSending) return

    try {
      setIsSending(true)
      const newMessage = await chatService.sendMessage(messageText, userId)
      setMessages((prev) => [...prev, newMessage])
      setMessageText('')
      scrollToBottom()

      // Notify parent component
      if (onMessageSent) {
        onMessageSent(newMessage)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error(t('common.error'))
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (!userId || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">{t('chat.selectContact')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {user.username?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || '?'}
            </div>
            {user.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">{user.username || user.email}</p>
            <p className="text-sm text-muted-foreground">
              {user.is_online ? t('chat.online') : user.last_seen ? t('chat.lastSeen') : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">{t('common.loading')}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">{t('chat.noMessages')}</div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUser?.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {!isOwn && message.sender && (
                      <p className="text-xs font-semibold mb-1 opacity-80">
                        {message.sender.username || message.sender.email}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            placeholder={t('chat.typeMessage')}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            className="flex-1 bg-background border-border"
          />
          <Button
            onClick={sendMessage}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
