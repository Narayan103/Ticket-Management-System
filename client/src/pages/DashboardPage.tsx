import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { formatDuration } from '@/lib/format-duration'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorMessage from '@/components/ErrorMessage'

type TicketsPerDay = { date: string; count: number }

type TicketStats = {
  totalTickets: number
  openTickets: number
  aiResolvedTickets: number
  averageResolutionSeconds: number | null
  ticketsPerDay: TicketsPerDay[]
}

const CHART_CONFIG: ChartConfig = {
  count: { label: 'Tickets', color: '#000000' },
}

function formatChartDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</p>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const {
    data: stats,
    isPending,
    error,
  } = useQuery({
    queryKey: ['tickets-stats'],
    queryFn: () => apiClient.get<TicketStats>('/api/tickets/stats').then((res) => res.data),
  })

  const errorMessage = getErrorMessage(error, 'Failed to load dashboard stats')

  const aiResolvedPercent =
    stats && stats.totalTickets > 0 ? Math.round((stats.aiResolvedTickets / stats.totalTickets) * 100) : 0

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Dashboard</h1>

      <ErrorMessage message={errorMessage} />
      {!errorMessage && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isPending || !stats ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="Total Tickets" value={stats.totalTickets.toString()} />
              <StatCard label="Open Tickets" value={stats.openTickets.toString()} />
              <StatCard label="Resolved by AI" value={stats.aiResolvedTickets.toString()} />
              <StatCard label="% Resolved by AI" value={`${aiResolvedPercent}%`} />
              <StatCard label="Avg. Resolution Time" value={formatDuration(stats.averageResolutionSeconds)} />
            </>
          )}
        </div>
      )}

      {!errorMessage && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tickets per Day (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending || !stats ? (
              <Skeleton className="aspect-video w-full" />
            ) : (
              <ChartContainer config={CHART_CONFIG} className="w-full">
                <BarChart data={stats.ticketsPerDay}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={formatChartDate}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent labelFormatter={(value) => formatChartDate(String(value))} />}
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default DashboardPage
