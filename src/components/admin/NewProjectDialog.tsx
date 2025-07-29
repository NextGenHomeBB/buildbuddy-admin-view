import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  budget: z.number().optional(),
  template_id: z.string().optional(),
  duplicate_from: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  phases: Array<{
    name: string;
    description: string;
    estimated_days: number;
  }>;
}

export function NewProjectDialog({ isOpen, onClose }: NewProjectDialogProps) {
  const [mode, setMode] = useState<'blank' | 'template' | 'duplicate'>('blank');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
    },
  });

  // Fetch project templates
  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: async (): Promise<ProjectTemplate[]> => {
      const { data } = await supabase
        .from('phase_templates')
        .select('*')
        .order('sort_order');
      
      // Group phases by project template (for demo, using a simple grouping)
      const grouped = data?.reduce((acc, phase) => {
        const templateName = 'Standard Construction';
        if (!acc[templateName]) {
          acc[templateName] = {
            id: 'standard',
            name: templateName,
            description: 'Standard construction project template with common phases',
            phases: []
          };
        }
        acc[templateName].phases.push({
          name: phase.name,
          description: phase.description || '',
          estimated_days: 7
        });
        return acc;
      }, {} as Record<string, ProjectTemplate>);
      
      return Object.values(grouped || {});
    },
  });

  // Fetch existing projects for duplication
  const { data: existingProjects = [] } = useQuery({
    queryKey: ['projects-for-duplication'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);
      
      return data || [];
    },
  });

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const projectData = {
        name: data.name,
        description: data.description,
        location: data.location,
        budget: data.budget,
        status: 'planning'
      };

      if (mode === 'duplicate' && data.duplicate_from) {
        // Use duplicate project edge function
        const { data: result, error } = await supabase.functions.invoke('duplicate_project', {
          body: { 
            originalProjectId: data.duplicate_from,
            newProjectData: projectData
          }
        });
        
        if (error) throw error;
        return result;
      } else {
        // Create new project
        const { data: project, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();

        if (error) throw error;

        // If using template, create phases
        if (mode === 'template' && data.template_id) {
          const template = templates.find(t => t.id === data.template_id);
          if (template) {
            const phases = template.phases.map((phase, index) => ({
              project_id: project.id,
              name: phase.name,
              description: phase.description,
              estimated_days: phase.estimated_days,
              sort_order: index
            }));

            await supabase
              .from('project_phases')
              .insert(phases);
          }
        }

        return project;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
      console.error('Error creating project:', error);
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProject.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setMode('blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Project
          </DialogTitle>
        </DialogHeader>

        {/* Project Creation Mode Selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card 
            className={`cursor-pointer transition-colors ${mode === 'blank' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setMode('blank')}
          >
            <CardHeader className="text-center pb-3">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <CardTitle className="text-sm">Blank Project</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-xs text-center">
                Start with an empty project
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${mode === 'template' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setMode('template')}
          >
            <CardHeader className="text-center pb-3">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <CardTitle className="text-sm">From Template</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-xs text-center">
                Use a predefined template
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${mode === 'duplicate' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setMode('duplicate')}
          >
            <CardHeader className="text-center pb-3">
              <Copy className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <CardTitle className="text-sm">Duplicate Project</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-xs text-center">
                Copy from existing project
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Selection */}
            {mode === 'template' && (
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Template</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {template.phases.length} phases
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Project to Duplicate */}
            {mode === 'duplicate' && (
              <FormField
                control={form.control}
                name="duplicate_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project to Duplicate</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project to duplicate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {existingProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div>
                              <div className="font-medium">{project.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {project.status}
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

            {/* Project Details */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Project description (optional)"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Project location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}