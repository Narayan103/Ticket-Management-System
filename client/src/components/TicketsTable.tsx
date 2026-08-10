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
import { Button } from '@/components/ui/button'
import TableSkeleton from '@/components/TableSkeleton'
import EmptyState from '@/components/EmptyState'
import StatusDot from '@/components/StatusDot'
import { formatDateTime } from '@/lib/format-date'
import { isFresh } from '@/lib/is-fresh'
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
  updatedAt: string
}

type TicketsTableProps = {
  tickets: Ticket[]
  isPending: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

const columns: ColumnDef<Ticket>[] = [
  {
    id: 'id',
    header: 'ID',
    accessorKey: 'id',
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">#{row.original.id}</span>,
  },
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
        <span className="truncate text-xs text-muted-foreground">{row.original.fromEmail}</span>
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
        <span className="text-muted-foreground">Unclassified</span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <StatusDot
          status={row.original.status}
          isFresh={isFresh(row.original.createdAt, row.original.updatedAt)}
        />
        {TICKET_STATUS_LABELS[row.original.status]}
      </span>
    ),
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt',
    cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{formatDateTime(row.original.createdAt, 'medium')}</span>,
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
      <TableSkeleton
        header={
          <TableHeader>
            <TableRow>
              {headerGroup?.headers.map((header) => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
        }
        columnWidths={Array.from({ length: COLUMN_COUNT }, () => 'w-32')}
      />
    )
  }

  if (tickets.length === 0) {
    return <EmptyState message="No tickets found." />
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
                      {!sortDirection && <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />}
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
