import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  Search,
  Package
} from 'lucide-react';
import { useDocumentLines, useMaterialLookup, type Material } from '@/hooks/useDocuments';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface LineItemsStepProps {
  documentId: string;
  onComplete: () => void;
}

interface LineItem {
  id?: string;
  material_sku?: string;
  material_name: string;
  material_description?: string;
  material_unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export const LineItemsStep: React.FC<LineItemsStepProps> = ({
  documentId,
  onComplete
}) => {
  const { lines, addLine, updateLine, deleteLine, loading } = useDocumentLines(documentId);
  const { searchMaterials } = useMaterialLookup();
  
  const [newItem, setNewItem] = useState<Partial<LineItem>>({
    material_name: '',
    material_unit: 'pcs',
    quantity: 1,
    unit_price: 0,
    line_total: 0,
    sort_order: 0,
  });
  
  const [materialSearch, setMaterialSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Search materials when search term changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (materialSearch.length >= 2) {
        setIsSearching(true);
        const results = await searchMaterials(materialSearch);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [materialSearch, searchMaterials]);

  // Calculate line total when quantity or price changes
  useEffect(() => {
    if (newItem.quantity && newItem.unit_price) {
      setNewItem(prev => ({
        ...prev,
        line_total: prev.quantity! * prev.unit_price!
      }));
    }
  }, [newItem.quantity, newItem.unit_price]);

  const handleMaterialSelect = (material: Material) => {
    setNewItem(prev => ({
      ...prev,
      material_sku: material.sku,
      material_name: material.name,
      material_description: material.description,
      material_unit: material.unit,
      unit_price: material.price,
      line_total: (prev.quantity || 1) * material.price,
    }));
    setMaterialSearch(material.name);
    setSearchOpen(false);
  };

  const handleAddItem = async () => {
    if (!newItem.material_name || !newItem.quantity || !newItem.unit_price) {
      return;
    }

    try {
      await addLine({
        document_id: documentId,
        material_sku: newItem.material_sku,
        material_name: newItem.material_name,
        material_description: newItem.material_description,
        material_unit: newItem.material_unit || 'pcs',
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        line_total: newItem.line_total || 0,
        sort_order: lines.length,
      });

      // Reset form
      setNewItem({
        material_name: '',
        material_unit: 'pcs',
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        sort_order: 0,
      });
      setMaterialSearch('');
    } catch (error) {
      console.error('Error adding line item:', error);
    }
  };

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    const line = lines.find(l => l.id === id);
    if (line) {
      const line_total = quantity * line.unit_price;
      await updateLine(id, { quantity, line_total });
    }
  };

  const handleUpdatePrice = async (id: string, unit_price: number) => {
    const line = lines.find(l => l.id === id);
    if (line) {
      const line_total = line.quantity * unit_price;
      await updateLine(id, { unit_price, line_total });
    }
  };

  const totalAmount = lines.reduce((sum, line) => sum + line.line_total, 0);

  return (
    <div className="space-y-6">
      {/* Add New Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Add Line Item
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Material Search</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between"
                  >
                    <div className="flex items-center">
                      <Search className="mr-2 h-4 w-4" />
                      {materialSearch || "Search materials..."}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search materials..."
                      value={materialSearch}
                      onValueChange={setMaterialSearch}
                    />
                    <CommandList>
                      {isSearching && (
                        <CommandEmpty>Searching...</CommandEmpty>
                      )}
                      {!isSearching && searchResults.length === 0 && materialSearch.length >= 2 && (
                        <CommandEmpty>No materials found.</CommandEmpty>
                      )}
                      {searchResults.length > 0 && (
                        <CommandGroup>
                          {searchResults.map((material) => (
                            <CommandItem
                              key={material.sku}
                              onSelect={() => handleMaterialSelect(material)}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium">{material.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {material.sku} • {material.supplier}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">${material.price}</div>
                                <div className="text-sm text-muted-foreground">
                                  per {material.unit}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={newItem.quantity || ''}
                onChange={(e) => setNewItem(prev => ({
                  ...prev,
                  quantity: parseFloat(e.target.value) || 0
                }))}
                placeholder="1"
              />
            </div>

            <div>
              <Label>Unit Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newItem.unit_price || ''}
                onChange={(e) => setNewItem(prev => ({
                  ...prev,
                  unit_price: parseFloat(e.target.value) || 0
                }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Description</Label>
              <Input
                value={newItem.material_description || ''}
                onChange={(e) => setNewItem(prev => ({
                  ...prev,
                  material_description: e.target.value
                }))}
                placeholder="Material description"
              />
            </div>

            <div>
              <Label>Unit</Label>
              <Input
                value={newItem.material_unit || 'pcs'}
                onChange={(e) => setNewItem(prev => ({
                  ...prev,
                  material_unit: e.target.value
                }))}
                placeholder="pcs"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleAddItem}
                disabled={!newItem.material_name || !newItem.quantity || !newItem.unit_price}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item (${newItem.line_total?.toFixed(2) || '0.00'})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Line Items ({lines.length})
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Total: ${totalAmount.toFixed(2)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items added yet. Add your first item above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{line.material_name}</div>
                        {line.material_sku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {line.material_sku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {line.material_description || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => handleUpdateQuantity(line.id, parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>{line.material_unit}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => handleUpdatePrice(line.id, parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ${line.line_total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLine(line.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={onComplete}
          disabled={lines.length === 0}
          className="min-w-[120px]"
        >
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};