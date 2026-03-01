import { useState, useMemo } from "react"
import { SortDirection } from "@/types"

interface SortConfig {
  key: string
  direction: SortDirection
}

export function useTableSort<T>(data: T[], defaultSort?: { key: string; direction: SortDirection }) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    defaultSort ? { key: defaultSort.key, direction: defaultSort.direction } : null
  )

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) {
      return data
    }

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === SortDirection.ASC ? 1 : -1
      if (bValue == null) return sortConfig.direction === SortDirection.ASC ? -1 : 1

      // Handle different data types
      let comparison = 0
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue, "pt-BR", { numeric: true })
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        // Convert to string for comparison
        comparison = String(aValue).localeCompare(String(bValue), "pt-BR", { numeric: true })
      }

      return sortConfig.direction === SortDirection.ASC ? comparison : -comparison
    })
  }, [data, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (!prevConfig || prevConfig.key !== key) {
        return { key, direction: SortDirection.ASC }
      }

      if (prevConfig.direction === SortDirection.ASC) {
        return { key, direction: SortDirection.DESC }
      }
      
      // If already desc, remove sorting
      return null
    })
  }

  return {
    sortedData,
    sortConfig,
    handleSort,
  }
}

// Helper function to get nested object values using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
} 