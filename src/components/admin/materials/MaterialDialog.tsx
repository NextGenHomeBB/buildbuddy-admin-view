import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Material, MaterialFormData, useMaterials } from '@/hooks/useMaterials';

const materialSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, "Material name is required"),
  unit: z.string().optional(),
  category: z.string().optional(),
  unit_cost: z.number().min(0).optional(),
  supplier: z.string().optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialDialogProps {
  material?: Material | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialDialog({ material, open, onOpenChange }: MaterialDialogProps) {
  const [loading, setLoading] = useState(false);
  const { createMaterial, updateMaterial } = useMaterials();
  
  const isEditing = !!material;
  
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      sku: '',
      name: '',
      unit: '',
      category: '',
      unit_cost: undefined,
      supplier: '',
    },
  });

  useEffect(() => {
    if (material && open) {
      form.reset({
        sku: material.sku || '',
        name: material.name || '',
        unit: material.unit || '',
        category: material.category || '',
        unit_cost: material.unit_cost || undefined,
        supplier: material.supplier || '',
      });
    } else if (!material && open) {
      form.reset({
        sku: '',
        name: '',
        unit: '',
        category: '',
        unit_cost: undefined,
        supplier: '',
      });
    }
  }, [material, open, form]);

  const onSubmit = async (values: MaterialFormValues) => {
    setLoading(true);
    try {
      const materialData: MaterialFormData = {
        name: values.name,
        sku: values.sku || undefined,
        category: values.category || undefined,
        unit: values.unit || undefined,
        unit_cost: values.unit_cost || undefined,
        supplier: values.supplier || undefined,
      };

      if (isEditing) {
        await updateMaterial(material.id, materialData);
      } else {
        await createMaterial(materialData);
      }
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving material:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Material' : 'Add New Material'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the material information below.'
              : 'Enter the details for the new material.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter material name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter SKU" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Tools, Materials" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., pcs, kg, m" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Cost ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}