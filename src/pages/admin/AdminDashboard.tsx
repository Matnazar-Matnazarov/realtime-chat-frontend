import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Header } from '@/components/layout/Header'
import '@/lib/chart'

export const AdminDashboard = () => {
  const { t } = useTranslation()

  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: t('admin.users'),
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
    ],
  }

  const barData = {
    labels: [t('admin.messages'), t('admin.groups'), t('admin.users'), 'Contacts'],
    datasets: [
      {
        label: 'Count',
        data: [120, 19, 30, 45],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  }

  const doughnutData = {
    labels: ['Active', 'Inactive', 'Online'],
    datasets: [
      {
        data: [300, 50, 100],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          <p className="text-muted-foreground">{t('admin.statistics')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>Monthly user registration</CardDescription>
            </CardHeader>
            <CardContent>
              <Line data={lineData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.statistics')}</CardTitle>
              <CardDescription>Platform overview</CardDescription>
            </CardHeader>
            <CardContent>
              <Bar data={barData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
              <CardDescription>User activity distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <Doughnut data={doughnutData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
