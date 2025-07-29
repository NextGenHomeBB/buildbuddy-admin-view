import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyComponentProps {
  factory: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

export function LazyLoader({ factory, fallback, ...props }: LazyComponentProps) {
  const LazyComponent = lazy(factory);
  
  const defaultFallback = (
    <div className="animate-pulse space-y-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Common lazy loading wrappers
export const LazyDataTable = (props: any) => (
  <LazyLoader 
    factory={() => import('@/components/admin/DataTable')}
    fallback={<div className="lazy-loading h-96 rounded-lg" />}
    {...props} 
  />
);

export const LazyCalendar = (props: any) => (
  <LazyLoader 
    factory={() => import('@/components/calendar/CalendarView')}
    fallback={<div className="lazy-loading h-96 rounded-lg" />}
    {...props} 
  />
);