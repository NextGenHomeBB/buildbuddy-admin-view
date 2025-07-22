import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';
import { mockProjects } from '@/lib/mockData';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) {
        // Return mock data when Supabase is not configured
        return mockProjects;
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    }
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!supabase) {
        // Return mock data when Supabase is not configured
        const project = mockProjects.find(p => p.id === id);
        if (!project) throw new Error('Project not found');
        return {
          ...project,
          project_phases: [
            {
              id: '1',
              project_id: id,
              name: 'Discovery & Planning',
              description: 'Research and planning phase',
              status: 'completed' as const,
              start_date: '2024-01-15',
              end_date: '2024-02-15',
              progress: 100,
              order_index: 1,
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z'
            },
            {
              id: '2',
              project_id: id,
              name: 'Design & Development',
              description: 'UI/UX design and development phase',
              status: 'in_progress' as const,
              start_date: '2024-02-16',
              end_date: '2024-04-15',
              progress: 65,
              order_index: 2,
              created_at: '2024-02-16T00:00:00Z',
              updated_at: '2024-02-16T00:00:00Z'
            }
          ]
        };
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_phases (*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'project_phases'>) => {
      if (!supabase) {
        // Mock success when Supabase is not configured
        return { ...project, id: Date.now().toString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      if (!supabase) {
        // Mock success when Supabase is not configured
        return { id, ...updates, updated_at: new Date().toISOString() };
      }
      
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
    }
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        // Mock success when Supabase is not configured
        return;
      }
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  });
}