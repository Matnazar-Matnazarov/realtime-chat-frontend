import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: sessionStorage.getItem('access_token'),
  isAuthenticated: !!sessionStorage.getItem('access_token'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User
        accessToken: string
        refreshToken?: string // Not stored, only in HttpOnly cookie
      }>
    ) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = true

      // Store access token in sessionStorage for Bearer token usage
      // Refresh token is stored in HttpOnly cookie by backend
      sessionStorage.setItem('access_token', action.payload.accessToken)
    },
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.isAuthenticated = false

      // Clear sessionStorage
      // Cookies will be cleared by backend on logout
      sessionStorage.removeItem('access_token')
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload
      state.isAuthenticated = true
      sessionStorage.setItem('access_token', action.payload)
    },
  },
})

export const { setCredentials, logout, updateUser, setAccessToken } = authSlice.actions
export default authSlice.reducer
