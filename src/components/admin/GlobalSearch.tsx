import { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText, User, Calendar, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'project' | 'task' | 'user' | 'phase';
  description?: string;
  status?: string;
  project_name?: string;
  url: string;
  icon: typeof FolderOpen;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Fetch search data
  const { data: searchData = [] } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];

      const results: SearchResult[] = [];
      const searchTerm = `%${query.toLowerCase()}%`;

      // Search projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, description, status')
        .ilike('name', searchTerm)
        .limit(5);

      if (projects) {
        projects.forEach(project => {
          results.push({
            id: project.id,
            title: project.name,
            type: 'project',
            description: project.description,
            status: project.status,
            url: `/admin/projects/${project.id}`,
            icon: FolderOpen
          });
        });
      }

      // Search tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, status, project_id, projects(name)')
        .ilike('title', searchTerm)
        .limit(5);

      if (tasks) {
        tasks.forEach(task => {
          results.push({
            id: task.id,
            title: task.title,
            type: 'task',
            description: task.description,
            status: task.status,
            project_name: task.projects?.name,
            url: `/admin/projects/${task.project_id}?tab=tasks`,
            icon: FileText
          });
        });
      }

      // Search users/profiles
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', searchTerm)
        .limit(5);

      if (users) {
        users.forEach(user => {
          results.push({
            id: user.id,
            title: user.full_name || 'Unnamed User',
            type: 'user',
            url: `/admin/users/${user.id}`,
            icon: User
          });
        });
      }

      // Search phases
      const { data: phases } = await supabase
        .from('project_phases')
        .select('id, name, description, status, project_id, projects(name)')
        .ilike('name', searchTerm)
        .limit(5);

      if (phases) {
        phases.forEach(phase => {
          results.push({
            id: phase.id,
            title: phase.name,
            type: 'phase',
            description: phase.description,
            status: phase.status,
            project_name: phase.projects?.name,
            url: `/admin/projects/${phase.project_id}?tab=phases`,
            icon: Calendar
          });
        });
      }

      return results;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Filter and group results
  const groupedResults = useMemo(() => {
    const groups = {
      projects: searchData.filter(r => r.type === 'project'),
      tasks: searchData.filter(r => r.type === 'task'),
      users: searchData.filter(r => r.type === 'user'),
      phases: searchData.filter(r => r.type === 'phase'),
    };
    return groups;
  }, [searchData]);

  const flatResults = useMemo(() => {
    return [
      ...groupedResults.projects,
      ...groupedResults.tasks,
      ...groupedResults.users,
      ...groupedResults.phases,
    ];
  }, [groupedResults]);

  // Keyboard navigation
  useKeyboardShortcuts([
    {
      key: 'ArrowDown',
      action: () => {
        setSelectedIndex(prev => (prev + 1) % flatResults.length);
      },
      description: 'Navigate down'
    },
    {
      key: 'ArrowUp',
      action: () => {
        setSelectedIndex(prev => prev === 0 ? flatResults.length - 1 : prev - 1);
      },
      description: 'Navigate up'
    },
    {
      key: 'Enter',
      action: () => {
        if (flatResults[selectedIndex]) {
          handleResultClick(flatResults[selectedIndex]);
        }
      },
      description: 'Select result'
    },
    {
      key: 'Escape',
      action: onClose,
      description: 'Close search'
    }
  ]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onClose();
    setQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return FolderOpen;
      case 'task': return FileText;
      case 'user': return User;
      case 'phase': return Calendar;
      default: return FileText;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      project: 'default',
      task: 'secondary',
      user: 'outline',
      phase: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'} className="text-xs">
        {type}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Global Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, tasks, users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {query.length < 2 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              Type at least 2 characters to search
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="pb-4">
              {Object.entries(groupedResults).map(([type, results]) => {
                if (results.length === 0) return null;
                
                return (
                  <div key={type}>
                    <div className="px-6 py-2 text-sm font-medium text-muted-foreground capitalize">
                      {type} ({results.length})
                    </div>
                    {results.map((result, index) => {
                      const globalIndex = flatResults.findIndex(r => r.id === result.id);
                      const Icon = getTypeIcon(result.type);
                      
                      return (
                        <button
                          key={result.id}
                          className={cn(
                            "w-full px-6 py-3 text-left hover:bg-muted/50 transition-colors",
                            globalIndex === selectedIndex && "bg-muted"
                          )}
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{result.title}</span>
                                {getTypeBadge(result.type)}
                                {result.status && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.status.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                              {result.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {result.description}
                                </p>
                              )}
                              {result.project_name && (
                                <p className="text-xs text-muted-foreground">
                                  Project: {result.project_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <Separator className="my-2" />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-3 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <span>{flatResults.length} results</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}