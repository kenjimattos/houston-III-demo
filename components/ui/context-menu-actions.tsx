"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EllipsisVertical, LucideIcon } from "lucide-react"

interface ContextAction {
  key: string
  label: string
  icon: LucideIcon
  onClick: (e: React.MouseEvent) => void | Promise<void>
  className?: string
  disabled?: boolean
  visible?: boolean
  separator?: boolean // Para adicionar separador antes da ação
}

interface ContextMenuActionsProps<T = any> {
  item: T
  actions: ContextAction[]
  disabled?: boolean
  triggerClassName?: string
  contentAlign?: "start" | "center" | "end"
  loading?: boolean
}

export function ContextMenuActions<T>({
  item,
  actions,
  disabled = false,
  triggerClassName = "h-6 w-6 p-0",
  contentAlign = "end",
  loading = false
}: ContextMenuActionsProps<T>) {
  
  const visibleActions = actions.filter(action => action.visible !== false)
  
  if (visibleActions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={triggerClassName}
          disabled={disabled || loading}
        >
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={contentAlign}>
        {visibleActions.map((action, index) => {
          const IconComponent = action.icon
          const isLastAction = index === visibleActions.length - 1
          const nextAction = visibleActions[index + 1]
          const shouldAddSeparator = nextAction?.separator
          
          return (
            <React.Fragment key={action.key}>
              {action.separator && index > 0 && (
                <div className="border-t my-1" />
              )}
              <DropdownMenuItem 
                onClick={action.onClick}
                className={action.className}
                disabled={action.disabled || loading}
              >
                <IconComponent className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
              {shouldAddSeparator && !isLastAction && (
                <div className="border-t my-1" />
              )}
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}