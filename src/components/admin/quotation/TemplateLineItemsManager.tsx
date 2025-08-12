import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, GripVertical } from 'lucide-react';
import { useQuotationTemplateLines, useCreateQuotationTemplateLine, useUpdateQuotationTemplateLine, useDeleteQuotationTemplateLine } from '@/hooks/useQuotationTemplateLines';
import { useMaterialLookup } from '@/hooks/useDocuments';

const lineItemSchema = z.object({
  material_name: z.string().min(1, 'Material name is required'),
  material_sku: z.string().optional(),
  material_description: z.string().optional(),
  material_unit: z.string().default('pcs'),
  default_quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  default_unit_price: z.number().min(0, 'Price must be 0 or greater'),
  is_optional: z.boolean().default(false),
  category: z.string().optional(),
});

type LineItemFormData = z.infer<typeof lineItemSchema>;

interface TemplateLineItemsManagerProps {
  templateId: string;
}

export function TemplateLineItemsManager({ templateId }: TemplateLineItemsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  const { data: lineItems = [], isLoading } = useQuotationTemplateLines(templateId);
  const { searchMaterials } = useMaterialLookup();
  const createLineItemMutation = useCreateQuotationTemplateLine();
  const updateLineItemMutation = useUpdateQuotationTemplateLine();
  const deleteLineItemMutation = useDeleteQuotationTemplateLine();

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      material_name: '',
      material_sku: '',
      material_description: '',
      material_unit: 'pcs',
      default_quantity: 1,
      default_unit_price: 0,
      is_optional: false,
      category: '',
    },
  });

  const handleAddLineItem = () => {
    form.reset();
    setEditingLineId(null);
    setShowAddForm(true);
  };

  const handleEditLineItem = (lineItem: any) => {
    form.reset({
      material_name: lineItem.material_name,
      material_sku: lineItem.material_sku || '',
      material_description: lineItem.material_description || '',
      material_unit: lineItem.material_unit,
      default_quantity: lineItem.default_quantity,
      default_unit_price: lineItem.default_unit_price,
      is_optional: lineItem.is_optional,
      category: lineItem.category || '',
    });
    setEditingLineId(lineItem.id);
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingLineId(null);
    form.reset();
  };

  const onSubmit = async (data: LineItemFormData) => {
    try {
      if (editingLineId) {
        await updateLineItemMutation.mutateAsync({
          id: editingLineId,
          updates: data,
        });
      } else {
        await createLineItemMutation.mutateAsync({
          template_id: templateId,
          ...data,
        } as any);
      }
      handleCancelEdit();
    } catch (error) {
      console.error('Error saving line item:', error);
    }
  };

  const handleDeleteLineItem = (lineItemId: string) => {
    if (confirm('Are you sure you want to delete this line item?')) {
      deleteLineItemMutation.mutate(lineItemId);
    }
  };

  const handleMaterialSearch = async (query: string) => {
    setMaterialSearchQuery(query);
    if (query.length > 2) {
      try {
        await searchMaterials(query);
      } catch (error) {
        console.error('Error searching materials:', error);
      }
    }
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + (item.default_quantity * item.default_unit_price), 0);

  if (isLoading) {
    return <div>Loading line items...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Line Items</h3>
          <p className="text-sm text-muted-foreground">
            Manage the default line items for this template
          </p>
        </div>
        <Button onClick={handleAddLineItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Line Item
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingLineId ? 'Edit Line Item' : 'Add Line Item'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="material_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Premium Floor Tiles"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleMaterialSearch(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="material_sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., TILE-PREM-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="material_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the material or service..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="default_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="material_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="pcs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Materials" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_optional"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Optional Item</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Mark this item as optional in quotations
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingLineId ? 'Update' : 'Add'} Line Item
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {lineItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Line Items ({lineItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Optional</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.material_name}</div>
                        {item.material_sku && (
                          <div className="text-sm text-muted-foreground">SKU: {item.material_sku}</div>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="mt-1">{item.category}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.default_quantity} {item.material_unit}
                    </TableCell>
                    <TableCell>
                      €{item.default_unit_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      €{(item.default_quantity * item.default_unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.is_optional && <Badge variant="secondary">Optional</Badge>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditLineItem(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteLineItem(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-4 flex justify-end">
              <div className="text-lg font-semibold">
                Total: €{totalAmount.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold">No line items</h3>
                <p className="text-muted-foreground">
                  Add line items to this template to speed up quotation creation.
                </p>
              </div>
              <Button onClick={handleAddLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Line Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}