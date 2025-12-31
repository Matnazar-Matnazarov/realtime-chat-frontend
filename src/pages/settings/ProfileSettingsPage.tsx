import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import { toast } from 'sonner'
import { updateUser } from '@/store/slices/authSlice'
import { useAppDispatch } from '@/store/hooks'

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

export const ProfileSettingsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user, refreshUser } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      avatar_url: user?.avatar_url || '',
    },
  })

  useEffect(() => {
    if (user) {
      reset({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        avatar_url: user.avatar_url || '',
      })
    }
  }, [user, reset])

  const onSubmit = async (data: ProfileForm) => {
    try {
      const updatedUser = await authService.updateUser({
        username: data.username,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        avatar_url: data.avatar_url || undefined,
      })
      dispatch(updateUser(updatedUser))
      await refreshUser()
      toast.success(t('profile.updateSuccess'))
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(t('profile.updateError'))
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <div className="flex-1 container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.title')}</CardTitle>
            <CardDescription>{t('profile.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">{t('profile.emailCannotChange')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t('common.username')}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('common.username')}
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t('common.firstName')}</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder={t('common.firstName')}
                    {...register('first_name')}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">{t('common.lastName')}</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder={t('common.lastName')}
                    {...register('last_name')}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">{t('profile.avatarUrl')}</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  {...register('avatar_url')}
                />
                {errors.avatar_url && (
                  <p className="text-sm text-destructive">{errors.avatar_url.message}</p>
                )}
                {user.avatar_url && (
                  <div className="mt-2">
                    <img
                      src={user.avatar_url}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('common.loading') : t('common.save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/chat')}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
