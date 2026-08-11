import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { InboxIcon, PercentIcon, SparklesIcon, TicketIcon, TimerIcon, type LucideIcon } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { formatDuration } from '@/lib/format-duration'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import ErrorMessage from '@/components/ErrorMessage'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'

type TicketsPerDay = { date: string; count: number }
type CategoryBreakdown = { category: TicketCategory | 'UNCLASSIFIED'; count: number; percentage: number }

type TicketStats = {
  totalTickets: number
  openTickets: number
  aiResolvedTickets: number
  averageResolutionSeconds: number | null
  ticketsPerDay: TicketsPerDay[]
  categoryBreakdown: CategoryBreakdown[]
}

const CATEGORY_BREAKDOWN_LABELS: Record<CategoryBreakdown['category'], string> = {
  UNCLASSIFIED: 'Unclassified',
  ...TICKET_CATEGORY_LABELS,
}

const CATEGORY_BREAKDOWN_ACCENTS: Record<CategoryBreakdown['category'], string> = {
  GENERAL_QUESTION: 'text-signal-open',
  TECHNICAL_QUESTION: 'text-signal-processing',
  REFUND_REQUEST: 'text-destructive',
  UNCLASSIFIED: 'text-muted-foreground',
}

const CHART_CONFIG: ChartConfig = {
  count: { label: 'Tickets', color: 'var(--primary)' },
}

function formatChartDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: LucideIcon
  accent: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className={cn('flex size-8 items-center justify-center rounded-md', accent)}>
          <Icon className="size-4" />
        </div>
        <CardTitle className="mt-2 text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="mt-2 h-4 w-24" />
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
    <main className="max-w-6xl px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live view of ticket volume and AI resolution performance.</p>

      <ErrorMessage message={errorMessage} />
      {!errorMessage && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isPending || !stats ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="Total Tickets" value={stats.totalTickets.toString()} icon={TicketIcon} accent="bg-primary/10 text-primary" />
              <StatCard label="Open Tickets" value={stats.openTickets.toString()} icon={InboxIcon} accent="bg-signal-open/10 text-signal-open" />
              <StatCard label="Resolved by AI" value={stats.aiResolvedTickets.toString()} icon={SparklesIcon} accent="bg-signal-resolved/10 text-signal-resolved" />
              <StatCard label="% Resolved by AI" value={`${aiResolvedPercent}%`} icon={PercentIcon} accent="bg-ring/10 text-ring" />
              <StatCard label="Avg. Resolution Time" value={formatDuration(stats.averageResolutionSeconds)} icon={TimerIcon} accent="bg-muted text-muted-foreground" />
            </>
          )}
        </div>
      )}

      {!errorMessage && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
            <CardDescription>Share of tickets in each category</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {isPending || !stats
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                ))
              : stats.categoryBreakdown.map((entry) => (
                  <div key={entry.category}>
                    <p className={cn('text-xs font-medium', CATEGORY_BREAKDOWN_ACCENTS[entry.category])}>
                      {CATEGORY_BREAKDOWN_LABELS[entry.category].toUpperCase()}
                    </p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                      {entry.percentage}%
                    </p>
                  </div>
                ))}
          </CardContent>
        </Card>
      )}

      {!errorMessage && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tickets per Day (Last 30 Days)</CardTitle>
            <CardDescription>Volume of new tickets received, by day</CardDescription>
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
