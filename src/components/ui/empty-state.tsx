import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 min-h-[400px]",
      className
    )}>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <div className="mt-6 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {description}
        </p>
      </div>
      
      {action && (
        <Button 
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface EmptyStateCardProps extends EmptyStateProps {
  compact?: boolean;
}

export function EmptyStateCard({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  compact = false,
  className 
}: EmptyStateCardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-muted/20",
      compact ? "min-h-[200px]" : "min-h-[300px]",
      className
    )}>
      <div className={cn(
        "mx-auto flex items-center justify-center rounded-full bg-background border",
        compact ? "h-12 w-12" : "h-16 w-16"
      )}>
        <Icon className={cn(
          "text-muted-foreground",
          compact ? "h-6 w-6" : "h-8 w-8"
        )} />
      </div>
      
      <div className={cn("space-y-1", compact ? "mt-3" : "mt-4")}>
        <h3 className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-base"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-muted-foreground max-w-sm",
          compact ? "text-xs" : "text-sm"
        )}>
          {description}
        </p>
      </div>
      
      {action && (
        <Button 
          onClick={action.onClick}
          className={compact ? "mt-3" : "mt-4"}
          size={compact ? "sm" : "default"}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}