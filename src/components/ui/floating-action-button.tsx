import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const fabVariants = cva(
  "fixed z-50 rounded-full shadow-lg transition-all duration-200 active:scale-95 hover:shadow-xl",
  {
    variants: {
      size: {
        default: "h-14 w-14",
        sm: "h-12 w-12",
        lg: "h-16 w-16",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        accent: "bg-accent text-accent-foreground hover:bg-accent/80",
      },
      position: {
        "bottom-right": "bottom-20 right-4 md:bottom-6 md:right-6",
        "bottom-left": "bottom-20 left-4 md:bottom-6 md:left-6", 
        "bottom-center": "bottom-20 left-1/2 transform -translate-x-1/2 md:bottom-6",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      position: "bottom-right",
    },
  }
)

export interface FloatingActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fabVariants> {}

const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(({ className, size, variant, position, ...props }, ref) => {
  return (
    <button
      className={cn(fabVariants({ size, variant, position, className }))}
      ref={ref}
      {...props}
    />
  )
})
FloatingActionButton.displayName = "FloatingActionButton"

export { FloatingActionButton, fabVariants }