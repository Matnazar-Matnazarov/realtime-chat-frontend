import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { authService } from '@/services/authService'
import { setCredentials } from '@/store/slices/authSlice'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)
  const hasCheckedAuth = useRef(false)

  useEffect(() => {
    // Check auth if user is not loaded (even if isAuthenticated is true)
    if (!user && !hasCheckedAuth.current) {
      hasCheckedAuth.current = true
      const checkAuth = async () => {
        try {
          // First try to get current user
          let currentUser
          let token = sessionStorage.getItem('access_token')
          
          try {
            currentUser = await authService.getCurrentUser()
          } catch (error) {
            // If getCurrentUser fails, try to refresh token
            console.log('🔄 getCurrentUser failed, trying to refresh token...')
            try {
              const refreshResponse = await authService.refreshToken()
              token = refreshResponse.access_token
              sessionStorage.setItem('access_token', token)
              // Try again with new token
              currentUser = await authService.getCurrentUser()
            } catch (refreshError) {
              console.error('❌ Failed to refresh token:', refreshError)
              hasCheckedAuth.current = false
              return
            }
          }
          
          // If we have user, set credentials
          if (currentUser) {
            const finalToken = token || sessionStorage.getItem('access_token')
            if (finalToken) {
              dispatch(
                setCredentials({
                  user: currentUser,
                  accessToken: finalToken,
                })
              )
              console.log('✅ User loaded in ProtectedRoute:', currentUser.id)
            }
          }
        } catch (error) {
          console.error('❌ Failed to load user in ProtectedRoute:', error)
          // If we can't get user, silently fail - will redirect to login
          hasCheckedAuth.current = false
        }
      }
      void checkAuth()
    }
  }, [isAuthenticated, user, dispatch])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
