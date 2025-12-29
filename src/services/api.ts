import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: enables cookie handling
})

// Request interceptor for adding auth token from cookie or Bearer header
api.interceptors.request.use(
  (config) => {
    // Tokens are stored in HttpOnly cookies, but we can also use Bearer token
    // The backend will check both cookie and Authorization header
    // If you have a token in memory (from login response), use it as Bearer token
    const token = sessionStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors and token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Try to refresh token using cookie (refresh_token is in HttpOnly cookie)
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true, // Send cookies
          }
        )

        const { access_token } = response.data

        // Store access token in sessionStorage for Bearer token usage
        // The refresh token remains in HttpOnly cookie
        sessionStorage.setItem('access_token', access_token)

        // Process queued requests
        processQueue(null, access_token)

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, process queue with error
        processQueue(refreshError, null)

        // Clear session and redirect to login
        sessionStorage.removeItem('access_token')
        
        // Only redirect if we're not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
