import { useState, useEffect, useRef, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/utils/logger';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleTouchStart = (e: TouchEvent) => {
    if (isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isRefreshing || startY === 0) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (isRefreshing || startY === 0) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        logger.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setStartY(0);
    setPullDistance(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, threshold, isRefreshing, isMobile]);

  // Only enable pull-to-refresh on mobile devices
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{
        transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull to refresh indicator */}
      {showIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background/80 backdrop-blur-sm border-b z-10"
          style={{
            height: `${isRefreshing ? threshold : pullDistance}px`,
            transform: `translateY(-${isRefreshing ? threshold : pullDistance}px)`
          }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw 
              className={cn(
                "h-4 w-4 transition-transform",
                isRefreshing ? "animate-spin" : ""
              )}
              style={{
                transform: `rotate(${pullProgress * 360}deg)`
              }}
            />
            <span>
              {isRefreshing 
                ? "Refreshing..." 
                : pullDistance >= threshold 
                  ? "Release to refresh" 
                  : "Pull to refresh"
              }
            </span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}