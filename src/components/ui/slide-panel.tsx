import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  position?: "left" | "right"
  className?: string
}

export function SlidePanel({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  position = "right",
  className 
}: SlidePanelProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={cn(
        "fixed top-0 z-50 h-full w-80 max-w-[85vw] bg-background border-l transform transition-transform duration-300 ease-in-out md:hidden",
        position === "right" ? "right-0" : "left-0 border-r border-l-0",
        isOpen 
          ? "translate-x-0" 
          : position === "right" 
            ? "translate-x-full" 
            : "-translate-x-full",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </>
  )
}