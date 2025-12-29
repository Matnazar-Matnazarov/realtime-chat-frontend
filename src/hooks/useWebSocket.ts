import { useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import type { Message } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export function useWebSocket(
  onMessage: (message: Message) => void,
  onOnlineStatus?: (userId: string, isOnline: boolean) => void
) {
  const { user } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<number>()

  const connect = () => {
    if (!user?.id) return

    const accessToken = sessionStorage.getItem('access_token')
    if (!accessToken) return

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Connect to WebSocket
      const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://')
      const ws = new WebSocket(`${wsUrl}/api/v1/ws/${user.id}?token=${accessToken}`)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'message') {
            // Transform WebSocket message to Message type
            const message: Message = {
              id: data.id,
              content: data.content,
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              group_id: data.group_id,
              media_url: data.media_url,
              media_type: data.media_type,
              is_read: false,
              created_at: data.created_at,
              sender: data.sender,
            }
            onMessage(message)
          } else if (data.type === 'online_status' && onOnlineStatus) {
            onOnlineStatus(data.user_id, data.is_online)
          } else if (data.type === 'pong') {
            // Heartbeat response
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, 3000)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      connect()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [user?.id])

  const sendMessage = (type: string, data: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    }
  }

  return { isConnected, sendMessage }
}
