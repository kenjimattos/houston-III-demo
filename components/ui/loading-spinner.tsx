import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  message?: string
  className?: string
  size?: "sm" | "md" | "lg"
  showMessage?: boolean
}

export function LoadingSpinner({ 
  message = "Carregando dados...", 
  className,
  size = "md",
  showMessage = true
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  }

  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="text-center">
        <div className={cn(
          "animate-spin rounded-full border-b-2 border-primary mx-auto mb-2",
          sizeClasses[size]
        )}></div>
        {showMessage && (
          <p className="text-sm text-gray-500">{message}</p>
        )}
      </div>
    </div>
  )
}