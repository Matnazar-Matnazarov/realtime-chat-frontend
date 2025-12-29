import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCredentials, logout, updateUser } from '@/store/slices/authSlice'
import { authService } from '@/services/authService'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

export const useAuth = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password)
      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.access_token,
          // refreshToken is in HttpOnly cookie, not stored in state
        })
      )
      toast.success('Login successful!')
      navigate('/chat')
      return response
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string }>
      toast.error(axiosError.response?.data?.detail || 'Login failed')
      throw error
    }
  }

  const register = async (data: {
    email: string
    username: string
    password: string
    first_name?: string
    last_name?: string
  }) => {
    try {
      const response = await authService.register(data)
      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.access_token,
        })
      )
      toast.success('Registration successful!')
      navigate('/chat')
      return response
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string }>
      toast.error(axiosError.response?.data?.detail || 'Registration failed')
      throw error
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore logout errors
    } finally {
      dispatch(logout())
      navigate('/login')
      toast.success('Logged out successfully')
    }
  }

  const refreshUser = async () => {
    try {
      const user = await authService.getCurrentUser()
      dispatch(updateUser(user))
      return user
    } catch (error) {
      dispatch(logout())
      navigate('/login')
      throw error
    }
  }

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout: handleLogout,
    refreshUser,
  }
}
