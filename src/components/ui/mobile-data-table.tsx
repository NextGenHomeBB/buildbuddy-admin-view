import { useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SwipeActionCard } from '@/components/ui/touch-card';
import { cn } from '@/lib/utils';

interface MobileDataTableProps<TData> {
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  renderCard: (item: TData, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  onRefresh?: () => Promise<void>;
  onEdit?: (item: TData) => void;
  onDelete?: (item: TData) => void;
  enableSwipeActions?: boolean;
  loading?: boolean;
}

export function MobileDataTable<TData>({
  data,
  searchKey = '',
  searchPlaceholder = 'Search...',
  renderCard,
  emptyMessage = 'No results found.',
  className,
  onRefresh,
  onEdit,
  onDelete,
  enableSwipeActions = false,
  loading = false,
}: MobileDataTableProps<TData>) {
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Simple search filter - in real implementation you'd want more sophisticated filtering
  const filteredData = data.filter((item: any) => {
    if (!searchValue) return true;
    return JSON.stringify(item).toLowerCase().includes(searchValue.toLowerCase());
  });

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const renderCardWithActions = (item: TData, index: number) => {
    if (!enableSwipeActions || (!onEdit && !onDelete)) {
      return renderCard(item, index);
    }

    return (
      <SwipeActionCard
        leftAction={onDelete ? {
          icon: <Trash2 className="h-5 w-5 text-white" />,
          color: "bg-destructive",
          onAction: () => onDelete(item)
        } : undefined}
        rightAction={onEdit ? {
          icon: <Edit className="h-5 w-5 text-white" />,
          color: "bg-primary",
          onAction: () => onEdit(item)
        } : undefined}
      >
        {renderCard(item, index)}
      </SwipeActionCard>
    );
  };

  const content = (
    <div className={cn("space-y-4", className)}>
      {/* Mobile Search Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 h-12 touch-manipulation"
              inputMode="search"
            />
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 h-12 touch-manipulation"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <h4 className="text-sm font-medium">Filters</h4>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Filter options will go here</p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredData.length} of ${data.length} results`}
          </span>
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchValue('')}
              className="text-xs touch-manipulation"
            >
              Clear search
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((item, index) => (
            <div key={index} className="animate-fade-in">
              {renderCardWithActions(item, index)}
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground">{emptyMessage}</p>
                {searchValue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchValue('')}
                    className="touch-manipulation"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return onRefresh ? (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      {content}
    </PullToRefresh>
  ) : content;
}