import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useCreatePhase, useUpdatePhase, CreatePhaseData, ProjectPhase } from '@/hooks/usePhases';

const phaseFormSchema = z.object({
  name: z.string().min(3, 'Phase name must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type PhaseFormData = z.infer<typeof phaseFormSchema>;

interface PhaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingPhase?: ProjectPhase | null;
}

export function PhaseDrawer({ isOpen, onClose, projectId, editingPhase }: PhaseDrawerProps) {
  const createPhase = useCreatePhase();
  const updatePhase = useUpdatePhase();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const isEditing = !!editingPhase;

  const form = useForm<PhaseFormData>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      name: editingPhase?.name || '',
      description: editingPhase?.description || '',
      status: editingPhase?.status || 'not_started',
      start_date: editingPhase?.start_date || '',
      end_date: editingPhase?.end_date || '',
    },
  });

  // Reset form when editingPhase changes
  useEffect(() => {
    if (editingPhase) {
      form.reset({
        name: editingPhase.name,
        description: editingPhase.description || '',
        status: editingPhase.status,
        start_date: editingPhase.start_date || '',
        end_date: editingPhase.end_date || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        status: 'not_started',
        start_date: '',
        end_date: '',
      });
    }
  }, [editingPhase, form]);

  const handleSubmit = async (data: PhaseFormData) => {
    try {
      const phaseData: CreatePhaseData = {
        name: data.name,
        description: data.description || undefined,
        status: data.status,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
      };

      if (isEditing && editingPhase) {
        await updatePhase.mutateAsync({ 
          id: editingPhase.id,
          project_id: editingPhase.project_id,
          name: phaseData.name,
          description: phaseData.description,
          status: phaseData.status,
          start_date: phaseData.start_date,
          end_date: phaseData.end_date,
        });
      } else {
        await createPhase.mutateAsync({ projectId, data: phaseData });
      }
      
      form.reset();
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} phase:`, error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="max-w-md mx-auto">
        <div className="p-6">
          <DrawerHeader className="px-0 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>
                  {isEditing ? 'Edit Phase' : 'Create New Phase'}
                </DrawerTitle>
                <DrawerDescription>
                  {isEditing 
                    ? 'Update the phase details below.' 
                    : 'Add a new phase to organize your project work.'
                  }
                </DrawerDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Phase Name *</Label>
              <Input
                id="name"
                placeholder="Enter phase name"
                {...form.register('name')}
                className={form.formState.errors.name ? 'border-destructive' : ''}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter phase description (optional)"
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => 
                  form.setValue('status', value as CreatePhaseData['status'])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.watch('start_date') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('start_date') ? (
                        format(new Date(form.watch('start_date')), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('start_date') ? new Date(form.watch('start_date')) : undefined}
                      onSelect={(date) => {
                        form.setValue('start_date', date ? date.toISOString().split('T')[0] : '');
                        setStartDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.watch('end_date') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('end_date') ? (
                        format(new Date(form.watch('end_date')), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('end_date') ? new Date(form.watch('end_date')) : undefined}
                      onSelect={(date) => {
                        form.setValue('end_date', date ? date.toISOString().split('T')[0] : '');
                        setEndDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={(isEditing ? updatePhase.isPending : createPhase.isPending) || !form.formState.isValid}
                className="flex-1"
              >
                {isEditing 
                  ? (updatePhase.isPending ? 'Updating...' : 'Update Phase')
                  : (createPhase.isPending ? 'Creating...' : 'Create Phase')
                }
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}