import { ReactNode, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  pressable?: boolean;
  swipeable?: boolean;
}

export function TouchCard({ 
  children, 
  onClick, 
  onSwipeLeft, 
  onSwipeRight, 
  className, 
  pressable = true,
  swipeable = false 
}: TouchCardProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [pressed, setPressed] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    if (pressable) setPressed(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pressable) setPressed(false);
    
    if (!swipeable) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  };

  const handleClick = () => {
    if (onClick && !swipeable) {
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 cursor-pointer select-none",
        pressable && "active:scale-[0.98] hover:shadow-lg",
        pressed && "scale-[0.98] shadow-lg",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
    </Card>
  );
}

interface SwipeActionProps {
  children: ReactNode;
  leftAction?: {
    icon: ReactNode;
    color: string;
    onAction: () => void;
  };
  rightAction?: {
    icon: ReactNode;
    color: string;
    onAction: () => void;
  };
  className?: string;
}

export function SwipeActionCard({ 
  children, 
  leftAction, 
  rightAction, 
  className 
}: SwipeActionProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = touch.clientX - rect.left - rect.width / 2;
    
    // Limit swipe distance
    const maxSwipe = 120;
    const clampedX = Math.max(-maxSwipe, Math.min(maxSwipe, x));
    setSwipeX(clampedX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Trigger action if swiped far enough
    if (Math.abs(swipeX) > 80) {
      if (swipeX > 0 && rightAction) {
        rightAction.onAction();
      } else if (swipeX < 0 && leftAction) {
        leftAction.onAction();
      }
    }
    
    // Reset position
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Left Action */}
        {leftAction && (
          <div 
            className={cn(
              "flex-1 flex items-center justify-start pl-6",
              leftAction.color
            )}
          >
            {leftAction.icon}
          </div>
        )}
        
        {/* Right Action */}
        {rightAction && (
          <div 
            className={cn(
              "flex-1 flex items-center justify-end pr-6",
              rightAction.color
            )}
          >
            {rightAction.icon}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "relative bg-background transition-transform duration-200 ease-out",
          className
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}