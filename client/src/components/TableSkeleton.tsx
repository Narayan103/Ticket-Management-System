import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type TableSkeletonProps = { header: ReactNode; columnWidths: string[]; rows?: number }

function TableSkeleton({ header, columnWidths, rows = 5 }: TableSkeletonProps) {
  return (
    <Card className="mt-6 gap-0 p-0">
      <Table>
        {header}
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {columnWidths.map((width, j) => (
                <TableCell key={j}>
                  <Skeleton className={`h-4 ${width}`} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default TableSkeleton
