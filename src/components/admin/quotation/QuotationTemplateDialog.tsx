import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuotationTemplate, useCreateQuotationTemplate, useUpdateQuotationTemplate } from '@/hooks/useQuotationTemplates';
import { TemplateLineItemsManager } from './TemplateLineItemsManager';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  default_tax_rate: z.number().min(0).max(100).default(0),
  default_terms_conditions: z.string().optional(),
  default_notes: z.string().optional(),
  default_valid_days: z.number().min(1).default(30),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface QuotationTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string | null;
}

export function QuotationTemplateDialog({ open, onOpenChange, templateId }: QuotationTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: template } = useQuotationTemplate(templateId || '');
  const createTemplateMutation = useCreateQuotationTemplate();
  const updateTemplateMutation = useUpdateQuotationTemplate();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      default_tax_rate: 0,
      default_terms_conditions: '',
      default_notes: '',
      default_valid_days: 30,
    },
  });

  const isEditing = !!templateId;

  useEffect(() => {
    if (template && isEditing) {
      form.reset({
        name: template.name,
        description: template.description || '',
        category: template.category || '',
        default_tax_rate: template.default_tax_rate,
        default_terms_conditions: template.default_terms_conditions || '',
        default_notes: template.default_notes || '',
        default_valid_days: template.default_valid_days,
      });
    } else if (!isEditing) {
      form.reset({
        name: '',
        description: '',
        category: '',
        default_tax_rate: 0,
        default_terms_conditions: '',
        default_notes: '',
        default_valid_days: 30,
      });
    }
  }, [template, isEditing, form]);

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && templateId) {
        await updateTemplateMutation.mutateAsync({ id: templateId, updates: data });
      } else {
        const newTemplate = await createTemplateMutation.mutateAsync(data as any);
        // Switch to line items tab after creating template
        if (newTemplate) {
          setActiveTab('line-items');
        }
      }
      
      if (!isEditing) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setActiveTab('details');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Quotation Template' : 'Create Quotation Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the template details and line items.'
              : 'Create a reusable template for quotations with predefined line items.'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Template Details</TabsTrigger>
            <TabsTrigger value="line-items" disabled={!isEditing && !templateId}>
              Line Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Kitchen Renovation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Renovation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe this template..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_tax_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_valid_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Valid Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="30"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="default_terms_conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter default terms and conditions..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter default notes..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (isEditing ? 'Update Template' : 'Create Template')}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="line-items" className="flex-1 overflow-auto">
            {(isEditing && templateId) && (
              <TemplateLineItemsManager templateId={templateId} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}