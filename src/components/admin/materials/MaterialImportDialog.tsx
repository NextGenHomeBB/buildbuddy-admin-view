import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaterialFormData, useMaterials } from '@/hooks/useMaterials';

interface MaterialImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialImportDialog({ open, onOpenChange }: MaterialImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { bulkImportMaterials } = useMaterials();

  const downloadTemplate = () => {
    const csvContent = 'name,sku,category,unit,unit_cost,supplier\n' +
      'Example Material,EX001,Tools,pcs,25.50,Example Supplier\n' +
      'Sample Item,SA002,Materials,kg,15.75,Sample Co';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materials_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): MaterialFormData[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const materials: MaterialFormData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
      }
      
      const material: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        if (value && value !== '') {
          if (header === 'unit_cost') {
            const cost = parseFloat(value);
            if (!isNaN(cost)) material[header] = cost;
          } else {
            material[header] = value;
          }
        }
      });
      
      if (material.name) {
        materials.push(material);
      }
    }
    
    return materials;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const materials = parseCSV(text);
      
      if (materials.length === 0) {
        throw new Error('No valid materials found in CSV');
      }

      await bulkImportMaterials(materials);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import materials');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Materials</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import materials to your database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">CSV Format</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Your CSV should include the following columns:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>name</strong> (required) - Material name</li>
                <li>• <strong>sku</strong> (optional) - Stock Keeping Unit</li>
                <li>• <strong>category</strong> (optional) - Material category</li>
                <li>• <strong>unit</strong> (optional) - Unit of measurement</li>
                <li>• <strong>unit_cost</strong> (optional) - Cost per unit</li>
                <li>• <strong>supplier</strong> (optional) - Supplier name</li>
              </ul>
            </div>
            
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            
            <div className="border-2 border-dashed border-border rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    {loading ? 'Importing...' : 'Choose CSV File'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Select a CSV file to upload
                  </p>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}