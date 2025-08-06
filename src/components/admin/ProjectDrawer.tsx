import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCreateProject, useUpdateProject, Project } from '@/hooks/useProjects';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

const projectSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  start_date: z.string().optional(),
  budget: z.coerce.number().optional(),
  location: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

export function ProjectDrawer({ isOpen, onClose, project }: ProjectDrawerProps) {
  logger.debug('ProjectDrawer component rendering', { isOpen, hasOnClose: !!onClose, hasProject: !!project });
  const isMobile = useIsMobile();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planning',
      start_date: '',
      budget: undefined,
      location: '',
    },
  });

  const statusValue = watch('status');

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
        start_date: project.start_date || '',
        budget: project.budget || undefined,
        location: project.location || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        status: 'planning',
        start_date: '',
        budget: undefined,
        location: '',
      });
    }
  }, [project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({ 
          id: project.id,
          name: data.name,
          description: data.description,
          status: data.status as any,
          start_date: data.start_date,
          budget: data.budget,
          location: data.location
        });
      } else {
        await createProject.mutateAsync({
          name: data.name,
          description: data.description,
          status: data.status as any,
          start_date: data.start_date,
          budget: data.budget,
          location: data.location
        });
      }
      reset();
      onClose();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className={cn(
        "w-full mx-auto",
        isMobile ? "max-w-full h-[90vh]" : "max-w-[400px] sm:max-w-[480px]"
      )}>
        <DrawerHeader className={cn(
          "flex items-center justify-between border-b border-border",
          isMobile ? "p-4 pb-3" : "pb-4"
        )}>
          <DrawerTitle className={cn(
            "font-semibold",
            isMobile ? "text-base" : "text-lg"
          )}>
            {isEditing ? 'Edit Project' : 'New Project'}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "p-0 touch-manipulation",
                isMobile ? "h-10 w-10" : "h-8 w-8"
              )}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className={cn(
            "space-y-6 overflow-y-auto",
            isMobile ? "p-4 flex-1" : "p-6"
          )}
        >
          <div className="space-y-2">
            <Label 
              htmlFor="name" 
              className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}
            >
              Name *
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter project name"
              className={cn(
                "touch-manipulation",
                isMobile ? "h-12 text-base" : "h-11"
              )}
              autoFocus={!isMobile}
              autoComplete="off"
              autoCapitalize="words"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="description" 
              className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}
            >
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter project description"
              className={cn(
                "resize-none touch-manipulation",
                isMobile ? "min-h-[120px] text-base" : "min-h-[80px]"
              )}
              autoComplete="off"
              autoCapitalize="sentences"
            />
          </div>

          <div className="space-y-2">
            <Label className={cn(
              "font-medium",
              isMobile ? "text-base" : "text-sm"
            )}>
              Status
            </Label>
            <Select value={statusValue} onValueChange={(value) => setValue('status', value as any)}>
              <SelectTrigger className={cn(
                "touch-manipulation",
                isMobile ? "h-12 text-base" : "h-11"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="start_date" 
              className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}
            >
              Start Date
            </Label>
            <Input
              id="start_date"
              type="date"
              {...register('start_date')}
              className={cn(
                "touch-manipulation",
                isMobile ? "h-12 text-base" : "h-11"
              )}
            />
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="budget" 
              className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}
            >
              Budget (€)
            </Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              {...register('budget')}
              placeholder="Enter budget amount"
              className={cn(
                "touch-manipulation",
                isMobile ? "h-12 text-base" : "h-11"
              )}
            />
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="location" 
              className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}
            >
              Location
            </Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Enter project location"
              className={cn(
                "touch-manipulation",
                isMobile ? "h-12 text-base" : "h-11"
              )}
              autoComplete="off"
              autoCapitalize="words"
            />
          </div>

          <div className={cn(
            "flex gap-3 pt-4",
            isMobile ? "justify-stretch" : "justify-end"
          )}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className={cn(
                "touch-manipulation",
                isMobile ? "flex-1 h-12 text-base" : "min-w-[80px]"
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "touch-manipulation",
                isMobile ? "flex-1 h-12 text-base" : "min-w-[80px]"
              )}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}