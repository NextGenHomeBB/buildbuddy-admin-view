import { useMemo } from 'react';
import { FilterState } from '@/components/lists/AdvancedFilter';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
  project_id?: string;
  project?: { name: string };
  assignee_profile?: { full_name: string; avatar_url?: string };
}

export function useTaskFiltering(tasks: Task[], filters: FilterState) {
  return useMemo(() => {
    if (!tasks) return [];

    return tasks.filter(task => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(searchLower);
        const matchesProject = task.project?.name?.toLowerCase().includes(searchLower);
        const matchesAssignee = task.assignee_profile?.full_name?.toLowerCase().includes(searchLower);
        
        if (!matchesTitle && !matchesProject && !matchesAssignee) {
          return false;
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Assignee filter
      if (filters.assignee.length > 0 && task.assignee && !filters.assignee.includes(task.assignee)) {
        return false;
      }

      // Project filter
      if (filters.project.length > 0 && task.project_id && !filters.project.includes(task.project_id)) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);
}