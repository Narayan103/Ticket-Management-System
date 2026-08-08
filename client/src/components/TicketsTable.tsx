import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
} from '@tanstack/react-table'
import { ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon } from 'lucide-react'
import { Link } from '@/components/ui/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'

export type Ticket = {
  id: number
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  fromEmail: string
  fromName: string
  createdAt: string
}

type TicketsTableProps = {
  tickets: Ticket[]
  isPending: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'font-medium text-purple-600 dark:text-purple-400',
  RESOLVED: 'font-medium text-green-600 dark:text-green-400',
  CLOSED: 'text-neutral-500 dark:text-neutral-500',
}

const columns: ColumnDef<Ticket>[] = [
  {
    id: 'subject',
    header: 'Subject',
    accessorKey: 'subject',
    cell: ({ row }) => (
      <Link to={`/tickets/${row.original.id}`} className="block max-w-70 truncate" title={row.original.subject}>
        {row.original.subject}
      </Link>
    ),
  },
  {
    id: 'fromName',
    header: 'From',
    accessorKey: 'fromName',
    cell: ({ row }) => (
      <div className="flex max-w-45 flex-col">
        <span className="truncate">{row.original.fromName}</span>
        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{row.original.fromEmail}</span>
      </div>
    ),
  },
  {
    id: 'category',
    header: 'Category',
    accessorKey: 'category',
    cell: ({ row }) =>
      row.original.category ? (
        TICKET_CATEGORY_LABELS[row.original.category]
      ) : (
        <span className="text-neutral-500 dark:text-neutral-400">Unclassified</span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <span className={STATUS_STYLES[row.original.status]}>{TICKET_STATUS_LABELS[row.original.status]}</span>
    ),
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt',
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
  },
]

const COLUMN_COUNT = columns.length

function TicketsTable({ tickets, isPending, sorting, onSortingChange }: TicketsTableProps) {
  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  })

  const headerGroup = table.getHeaderGroups()[0]

  if (isPending) {
    return (
      <Card className="mt-6 gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {headerGroup?.headers.map((header) => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  if (tickets.length === 0) {
    return <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No tickets found.</p>
  }

  return (
    <Card className="mt-6 gap-0 p-0">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sortDirection = header.column.getIsSorted()
                return (
                  <TableHead key={header.id}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-auto gap-1 px-2 py-1"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortDirection === 'asc' && <ArrowUpIcon className="size-3.5" />}
                      {sortDirection === 'desc' && <ArrowDownIcon className="size-3.5" />}
                      {!sortDirection && <ArrowUpDownIcon className="size-3.5 text-neutral-400" />}
                    </Button>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default TicketsTable
