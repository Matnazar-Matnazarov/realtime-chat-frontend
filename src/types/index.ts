export interface User {
  id: string
  email: string
  username: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  is_online?: boolean
  last_seen?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id?: string
  group_id?: string
  media_url?: string
  media_type?: string
  is_read: boolean
  created_at: string
  sender?: User
}

export interface Contact {
  id: string
  user_id: string
  contact_id: string
  nickname?: string
  contact?: User
}
