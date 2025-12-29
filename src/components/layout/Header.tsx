import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { LogOut } from 'lucide-react'

export function Header() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Chat App</h1>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.username || user.email}
            </span>
          )}
          <ThemeToggle />
          <LanguageSwitcher />
          {user && (
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">{t('common.logout')}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
