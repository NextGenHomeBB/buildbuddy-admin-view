import { useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface MobileDataTableProps<TData> {
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  renderCard: (item: TData, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function MobileDataTable<TData>({
  data,
  searchKey = '',
  searchPlaceholder = 'Search...',
  renderCard,
  emptyMessage = 'No results found.',
  className,
}: MobileDataTableProps<TData>) {
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Simple search filter - in real implementation you'd want more sophisticated filtering
  const filteredData = data.filter((item: any) => {
    if (!searchValue) return true;
    return JSON.stringify(item).toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
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
              className="pl-10 h-12"
            />
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 h-12"
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
                {/* Add filter controls here as needed */}
                <p className="text-sm text-muted-foreground">Filter options will go here</p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredData.length} of {data.length} results
          </span>
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchValue('')}
              className="text-xs"
            >
              Clear search
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3">
        {filteredData.length > 0 ? (
          filteredData.map((item, index) => (
            <div key={index} className="animate-fade-in">
              {renderCard(item, index)}
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground">{emptyMessage}</p>
                {searchValue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchValue('')}
                    className="mt-2"
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
}