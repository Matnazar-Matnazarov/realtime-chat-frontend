import api from './api'
import type { AuthResponse, User } from '@/types'

export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', {
      username,
      password,
    })
    // Tokens are set in HttpOnly cookies by backend
    // Response also contains tokens for Bearer token usage
    return response.data
  },

  register: async (data: {
    email: string
    username: string
    password: string
    first_name?: string
    last_name?: string
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/register', data)
    return response.data
  },

  refreshToken: async (): Promise<{ access_token: string; refresh_token: string }> => {
    // Refresh token is in HttpOnly cookie, no need to send it
    const response = await api.post<{ access_token: string; refresh_token: string }>(
      '/api/v1/auth/refresh',
      {}
    )
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/v1/auth/logout')
    // Backend clears cookies
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/users/me')
    return response.data
  },

  updateUser: async (data: {
    username?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
  }): Promise<User> => {
    const response = await api.patch<User>('/api/v1/users/me', data)
    return response.data
  },
}
