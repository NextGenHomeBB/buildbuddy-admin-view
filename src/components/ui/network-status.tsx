import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { Alert, AlertDescription } from "./alert"
import { cn } from "@/lib/utils"

interface NetworkStatusProps {
  className?: string
  showWhenOnline?: boolean
}

export function NetworkStatus({ className, showWhenOnline = false }: NetworkStatusProps) {
  const { isOnline, isSlowConnection } = useNetworkStatus()

  if (isOnline && !isSlowConnection && !showWhenOnline) {
    return null
  }

  return (
    <Alert className={cn(
      "border-l-4 rounded-lg",
      !isOnline 
        ? "border-l-destructive bg-destructive/10" 
        : isSlowConnection 
          ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
          : "border-l-green-500 bg-green-50 dark:bg-green-950/20",
      className
    )}>
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <WifiOff className="h-4 w-4 text-destructive" />
        ) : isSlowConnection ? (
          <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
        ) : (
          <Wifi className="h-4 w-4 text-green-600" />
        )}
        
        <AlertDescription className="text-sm">
          {!isOnline 
            ? "You're offline. Some features may not work."
            : isSlowConnection 
              ? "Slow connection detected. Loading may take longer."
              : "Connected"
          }
        </AlertDescription>
      </div>
    </Alert>
  )
}