import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  budget?: number;
  start_date?: string;
  location?: string;
  created_at: string;
  updated_at?: string;
  manager_id?: string;
  company_id?: string;
  project_phases?: Array<{ id: string }>;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
}

export interface UpdateProjectData extends CreateProjectData {
  id: string;
}

export function useProjects() {
  console.log('useProjects hook called');
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_phases:project_phases(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateProjectData): Promise<Project> => {
      const { data: project, error } = await supabase
        .from('projects')
        .insert([data])
        .select(`
          *,
          project_phases:project_phases(id)
        `)
        .single();

      if (error) throw error;
      return project;
    },
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);
      
      const optimisticProject: Project = {
        id: 'temp-' + Date.now(),
        ...newProject,
        progress: 0,
        created_at: new Date().toISOString(),
        project_phases: [],
      };

      queryClient.setQueryData<Project[]>(['projects'], (old = []) => 
        [optimisticProject, ...old]
      );

      return { previousProjects };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Project created",
        description: "New project has been created successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateProjectData): Promise<Project> => {
      const { data: project, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', data.id)
        .select(`
          *,
          project_phases:project_phases(id)
        `)
        .single();

      if (error) throw error;
      return project;
    },
    onMutate: async (updatedProject) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

      queryClient.setQueryData<Project[]>(['projects'], (old = []) =>
        old.map(project =>
          project.id === updatedProject.id
            ? { ...project, ...updatedProject }
            : project
        )
      );

      return { previousProjects };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Project updated",
        description: "Project has been updated successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

      queryClient.setQueryData<Project[]>(['projects'], (old = []) =>
        old.filter(project => project.id !== deletedId)
      );

      return { previousProjects };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });
}