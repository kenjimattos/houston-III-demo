import React from "react"
import { TableHead } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SortDirection } from "@/types"


interface SortableTableHeadProps<T extends string = string> {
  children: React.ReactNode
  sortKey?: T
  currentSort?: { key: T; direction: SortDirection } | null
  onSort?: (key: T) => void
  className?: string
  align?: "left" | "center" | "right"
}

export function SortableTableHead<T extends string = string>({
  children,
  sortKey,
  currentSort,
  onSort,
  className,
  align = "left",
}: SortableTableHeadProps<T>) {
  const isSortable = sortKey && onSort
  const isActive = currentSort?.key === sortKey
  const direction = isActive ? currentSort?.direction : null

  const handleClick = () => {
    if (isSortable) {
      onSort(sortKey)
    }
  }

  const getSortIcon = () => {
    if (!isSortable) return null
    
    if (direction === SortDirection.ASC) {
      return <ArrowUp className="h-4 w-4" />
    } else if (direction === SortDirection.DESC) {
      return <ArrowDown className="h-4 w-4" />
    } else {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />
    }
  }

  const alignClass = {
    left: "justify-start",
    center: "justify-center", 
    right: "justify-end"
  }[align]

  if (isSortable) {
    return (
      <TableHead className={cn("p-0", className)}>
        <Button
          variant="ghost"
          onClick={handleClick}
          className={cn(
            "h-12 px-4 font-normal text-muted-foreground hover:text-foreground w-full",
            alignClass,
            isActive && "text-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            {children}
            {getSortIcon()}
          </span>
        </Button>
      </TableHead>
    )
  }

  return (
    <TableHead className={cn(className, {
      "text-center": align === "center",
      "text-right": align === "right"
    })}>
      {children}
    </TableHead>
  )
} 