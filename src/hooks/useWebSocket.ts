import { useEffect, useRef, useState, useCallback } from 'react'
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
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Store callbacks in refs to avoid reconnection on callback changes
  const onMessageRef = useRef(onMessage)
  const onOnlineStatusRef = useRef(onOnlineStatus)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onOnlineStatusRef.current = onOnlineStatus
  }, [onMessage, onOnlineStatus])

  const connect = useCallback(() => {
    console.log('🔌 WebSocket connect attempt:', {
      hasUser: !!user,
      userId: user?.id,
      isAuthenticated: !!user?.id,
    })

    if (!user?.id) {
      console.warn('❌ No user ID, cannot connect WebSocket')
      return
    }

    const accessToken = sessionStorage.getItem('access_token')
    if (!accessToken) {
      console.warn('❌ No access token found, cannot connect WebSocket')
      return
    }

    console.log('✅ User and token available, connecting...')

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      // Connect to WebSocket
      const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://')
      const wsEndpoint = `${wsUrl}/api/v1/ws/${user.id}?token=${accessToken}`
      console.log('🔌 Attempting WebSocket connection:', {
        endpoint: `${wsUrl}/api/v1/ws/${user.id}?token=***`,
        userId: user.id,
        hasToken: !!accessToken,
      })
      const ws = new WebSocket(wsEndpoint)

      ws.onopen = () => {
        console.log('✅ WebSocket connected for user:', user.id)
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        // Clear any pending reconnection
        if (reconnectTimeoutRef.current !== undefined) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = undefined
        }

        // Start heartbeat
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
            console.log('💓 Heartbeat sent')
          } else {
            clearInterval(heartbeatInterval)
          }
        }, 30000) // Send ping every 30 seconds

        // Store interval ID for cleanup
        ;(ws as any).heartbeatInterval = heartbeatInterval
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 WebSocket message received:', data.type, data)

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
            console.log('💬 Processing message:', message.id, 'from', message.sender_id, 'to', message.receiver_id)
            onMessageRef.current(message)
          } else if (data.type === 'online_status' && onOnlineStatusRef.current) {
            console.log('🟢 Online status update:', data.user_id, data.is_online)
            onOnlineStatusRef.current(data.user_id, data.is_online)
          } else if (data.type === 'pong') {
            console.log('💓 Heartbeat response received')
          } else if (data.type === 'error') {
            console.error('❌ WebSocket error from server:', data.message)
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error, event.data)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        console.error('WebSocket URL:', `${wsUrl}/api/v1/ws/${user.id}?token=${accessToken.substring(0, 20)}...`)
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        })
        setIsConnected(false)

        // Clear heartbeat interval
        if ((ws as any).heartbeatInterval) {
          clearInterval((ws as any).heartbeatInterval)
        }

        // Only reconnect if not a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(3000 * reconnectAttemptsRef.current, 30000) // Exponential backoff, max 30s
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setIsConnected(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Starting WebSocket connection for user:', user.id)
      connect()
    }
    // Silently skip if user is not loaded yet (will retry when user loads)
    // This is normal during initial render

    return () => {
      console.log('🧹 Cleaning up WebSocket connection')
      if (wsRef.current) {
        // Clear heartbeat interval
        if ((wsRef.current as any).heartbeatInterval) {
          clearInterval((wsRef.current as any).heartbeatInterval)
        }
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current !== undefined) {
        clearTimeout(reconnectTimeoutRef.current)       
        reconnectTimeoutRef.current = undefined
      }
    }
  }, [user?.id, connect])

  const sendMessage = useCallback((type: string, data: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    } else {
      console.warn('WebSocket is not connected, cannot send message')
    }
  }, [])

  return { isConnected, sendMessage }
}
