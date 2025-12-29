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
    // Only check auth once on mount if not authenticated
    if (!isAuthenticated && !user && !hasCheckedAuth.current) {
      hasCheckedAuth.current = true
      const checkAuth = async () => {
        try {
          const currentUser = await authService.getCurrentUser()
          // If we can get user, we're authenticated via cookies
          const token = sessionStorage.getItem('access_token')
          if (token) {
            dispatch(
              setCredentials({
                user: currentUser,
                accessToken: token,
              })
            )
          }
        } catch {
          // If we can't get user, silently fail - will redirect to login
          hasCheckedAuth.current = false
        }
      }
      checkAuth()
    }
  }, [isAuthenticated, user, dispatch])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
