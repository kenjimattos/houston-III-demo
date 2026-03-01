"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface BulkAction {
  key: string
  label: string
  icon: LucideIcon
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
  onClick: () => void | Promise<void>
  disabled?: boolean
  visible?: boolean
}

interface BulkActionsBarProps<T = any> {
  selectedItems: string[]
  items: T[]
  itemName: string
  itemNamePlural: string
  onClearSelection: () => void
  actions: BulkAction[]
  loading?: boolean
  className?: string
  bgColor?: string
  borderColor?: string
  textColor?: string
  extraContent?: React.ReactNode
}

export function BulkActionsBar<T extends { [key: string]: any }>({
  selectedItems,
  items,
  itemName,
  itemNamePlural,
  onClearSelection,
  actions,
  loading = false,
  className = "",
  bgColor = "bg-primary-50",
  borderColor = "border-primary-200",
  textColor = "text-primary-700",
  extraContent
}: BulkActionsBarProps<T>) {
  
  if (selectedItems.length === 0) return null

  const visibleActions = actions.filter(action => action.visible !== false)

  return (
    <div className={`mt-4 p-4 ${bgColor} border ${borderColor} rounded-lg flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-normal ${textColor}`}>
          {selectedItems.length} {selectedItems.length === 1 ? itemName : itemNamePlural} selecionada{selectedItems.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          className="h-7 text-xs"
          disabled={loading}
        >
          Limpar seleção
        </Button>
      </div>

      {extraContent && (
        <div className="flex-1 flex items-center justify-center">
          {extraContent}
        </div>
      )}

      <div className="flex items-center gap-2">
        {visibleActions.map((action) => {
          const IconComponent = action.icon
          
          return (
            <Button
              key={action.key}
              onClick={action.onClick}
              size="sm"
              variant={action.variant || "outline"}
              className={`h-8 ${action.className || ""}`}
              disabled={loading || action.disabled}
            >
              <IconComponent className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}