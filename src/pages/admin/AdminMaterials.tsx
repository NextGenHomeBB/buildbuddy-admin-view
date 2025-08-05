import { useState } from 'react';
import { Plus, Upload, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaterials } from '@/hooks/useMaterials';
import { MaterialsTable } from '@/components/admin/materials/MaterialsTable';
import { MaterialDialog } from '@/components/admin/materials/MaterialDialog';
import { MaterialImportDialog } from '@/components/admin/materials/MaterialImportDialog';

export default function AdminMaterials() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const { materials, loading } = useMaterials();

  // Get unique categories and suppliers for filters
  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));
  const suppliers = Array.from(new Set(materials.map(m => m.supplier).filter(Boolean)));

  // Filter materials based on search and filters
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = !searchQuery || 
      material.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || material.supplier === supplierFilter;
    
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Materials Database</h1>
          <p className="text-muted-foreground">
            Manage your company's materials inventory and database
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category!}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier} value={supplier!}>
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Materials Table */}
      <MaterialsTable materials={filteredMaterials} loading={loading} />

      {/* Dialogs */}
      <MaterialDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <MaterialImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </div>
  );
}