import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export interface FilterState {
  search: string;
  status: string[];
  priority: string[];
  assignee: string[];
  project: string[];
}

interface AdvancedFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableAssignees: Array<{ id: string; name: string }>;
  availableProjects: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}

export function AdvancedFilter({
  filters,
  onFiltersChange,
  availableAssignees,
  availableProjects,
  onClearFilters,
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleMultiSelectChange = (
    key: keyof FilterState,
    value: string,
    checked: boolean
  ) => {
    const currentValues = filters[key] as string[];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    onFiltersChange({ ...filters, [key]: newValues });
  };

  const getActiveFilterCount = () => {
    return (
      (filters.search ? 1 : 0) +
      filters.status.length +
      filters.priority.length +
      filters.assignee.length +
      filters.project.length
    );
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="space-y-2">
                {statusOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleMultiSelectChange('status', option.value, !!checked)
                      }
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="space-y-2">
                {priorityOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${option.value}`}
                      checked={filters.priority.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleMultiSelectChange('priority', option.value, !!checked)
                      }
                    />
                    <label
                      htmlFor={`priority-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            {availableAssignees.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Assignee</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableAssignees.map(assignee => (
                    <div key={assignee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`assignee-${assignee.id}`}
                        checked={filters.assignee.includes(assignee.id)}
                        onCheckedChange={(checked) =>
                          handleMultiSelectChange('assignee', assignee.id, !!checked)
                        }
                      />
                      <label
                        htmlFor={`assignee-${assignee.id}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {assignee.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Filter */}
            {availableProjects.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Project</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableProjects.map(project => (
                    <div key={project.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={filters.project.includes(project.id)}
                        onCheckedChange={(checked) =>
                          handleMultiSelectChange('project', project.id, !!checked)
                        }
                      />
                      <label
                        htmlFor={`project-${project.id}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {project.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}