import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, X, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { chatService } from '@/services/chatService'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { User, Message } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebSocket connection
  const handleWebSocketMessage = (message: Message) => {
    console.log('📬 ChatWindow received WebSocket message:', {
      messageId: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      currentUserId: currentUser?.id,
      selectedUserId: userId,
    })

    // Only add message if it's for this chat
    // Check if message is between current user and selected user
    const isForThisChat =
      userId &&
      ((message.receiver_id === userId && message.sender_id === currentUser?.id) ||
        (message.sender_id === userId && message.receiver_id === currentUser?.id))

    console.log('🔍 Is message for this chat?', isForThisChat)

    if (isForThisChat) {
      setMessages((prev) => {
        // Avoid duplicates by checking message ID
        if (prev.some((m) => m.id === message.id)) {
          console.log('⚠️ Duplicate message detected, skipping:', message.id)
          return prev
        }
        console.log('✅ Adding new message to chat:', message.id)
        // Insert message in correct position (sorted by created_at)
        const newMessages = [...prev, message].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        return newMessages
      })
      scrollToBottom()

      // Notify parent component about new message
      if (onMessageSent) {
        onMessageSent(message)
      }
    } else {
      console.log('❌ Message not for this chat, ignoring')
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('chat.invalidFileType'))
      return
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error(t('chat.fileTooLarge'))
      return
    }

    setSelectedFile(file)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !userId || isSending || isUploading) return

    const messageContent = messageText.trim() || ''
    setMessageText('') // Clear input immediately for better UX

    let mediaUrl: string | undefined
    let mediaType: string | undefined

    try {
      setIsSending(true)

      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true)
        try {
          const uploadResult = await chatService.uploadFile(selectedFile)
          mediaUrl = uploadResult.url
          mediaType = uploadResult.content_type
          removeSelectedFile()
        } catch (error) {
          console.error('Failed to upload file:', error)
          toast.error(t('chat.uploadFailed'))
          setIsUploading(false)
          setIsSending(false)
          return
        } finally {
          setIsUploading(false)
        }
      }

      // Optimistic update - add message immediately
      const tempId = `temp-${Date.now()}`
      const optimisticMessage: Message = {
        id: tempId,
        content: messageContent || (mediaUrl ? (mediaType?.startsWith('image/') ? '📷 Image' : '🎥 Video') : ''),
        sender_id: currentUser?.id || '',
        receiver_id: userId,
        group_id: undefined,
        media_url: mediaUrl,
        media_type: mediaType,
        is_read: false,
        created_at: new Date().toISOString(),
        sender: currentUser || undefined,
      }

      // Add optimistic message
      setMessages((prev) => {
        if (prev.some((m) => m.id === tempId)) {
          return prev
        }
        return [...prev, optimisticMessage]
      })
      scrollToBottom()

      // Send message to server
      const newMessage = mediaUrl
        ? await chatService.sendMessageWithMedia(messageContent, mediaUrl, mediaType!, userId)
        : await chatService.sendMessage(messageContent, userId)

      // Replace optimistic message with real message from server
      setMessages((prev) => {
        // Remove optimistic message
        const withoutTemp = prev.filter((m) => m.id !== tempId)
        // Add real message if not already present (WebSocket might have added it)
        if (!withoutTemp.some((m) => m.id === newMessage.id)) {
          return [...withoutTemp, newMessage].sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }
        return withoutTemp
      })

      // Notify parent component
      if (onMessageSent) {
        onMessageSent(newMessage)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error(t('common.error'))
      // Restore message text on error
      setMessageText(messageContent)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')))
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
                    {/* Media display */}
                    {message.media_url && (
                      <div className="mb-2 rounded-lg overflow-hidden max-w-full">
                        {message.media_type?.startsWith('image/') ? (
                          <img
                            src={`${API_BASE_URL}${message.media_url}`}
                            alt={message.content || 'Image'}
                            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedMedia({
                                url: `${API_BASE_URL}${message.media_url}`,
                                type: message.media_type || 'image',
                              })
                              setMediaModalOpen(true)
                            }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : message.media_type?.startsWith('video/') ? (
                          <div className="relative">
                            <video
                              src={`${API_BASE_URL}${message.media_url}`}
                              controls
                              className="max-w-full h-auto rounded-lg"
                              style={{ maxHeight: '400px' }}
                              onDoubleClick={() => {
                                setSelectedMedia({
                                  url: `${API_BASE_URL}${message.media_url}`,
                                  type: message.media_type || 'video',
                                })
                                setMediaModalOpen(true)
                              }}
                            >
                              {t('chat.videoNotSupported')}
                            </video>
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                              {t('chat.doubleClickForFullscreen')}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
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

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t bg-muted/20 flex-shrink-0">
          <div className="flex items-center gap-2 p-2 bg-background rounded-lg border border-border">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeSelectedFile}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            placeholder={t('chat.typeMessage')}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending || isUploading}
            className="flex-1 bg-background border-border"
          />
          <Button
            onClick={sendMessage}
            disabled={(!messageText.trim() && !selectedFile) || isSending || isUploading}
            size="icon"
            className="flex-shrink-0"
          >
            {isUploading ? (
              <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Media Modal */}
      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] p-0 bg-transparent border-0 shadow-none">
          <VisuallyHidden>
            <DialogTitle>
              {selectedMedia?.type.startsWith('image/') ? 'Image preview' : 'Video preview'}
            </DialogTitle>
          </VisuallyHidden>
          <DialogDescription className="sr-only">
            {selectedMedia?.type.startsWith('image/') ? 'Image preview' : 'Video preview'}
          </DialogDescription>
          {selectedMedia && (
            <div className="relative w-full h-full flex items-center justify-center bg-black/95 rounded-lg overflow-hidden">
              {selectedMedia.type.startsWith('image/') ? (
                <img
                  src={selectedMedia.url}
                  alt="Preview"
                  className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
                  onClick={(e) => e.stopPropagation()}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : selectedMedia.type.startsWith('video/') ? (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[95vh] w-auto h-auto"
                  onClick={(e) => e.stopPropagation()}
                  onError={(e) => {
                    console.error('Video load error:', e)
                  }}
                >
                  {t('chat.videoNotSupported')}
                </video>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
