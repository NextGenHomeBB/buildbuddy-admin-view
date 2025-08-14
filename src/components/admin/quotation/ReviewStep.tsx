import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  Mail, 
  Download, 
  Check,
  Building,
  User,
  Calendar,
  Package
} from 'lucide-react';
import { useDocumentLines, useDocuments, type Document } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReviewStepProps {
  documentId: string;
  onComplete: (document: Document) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  documentId,
  onComplete
}) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { lines } = useDocumentLines(documentId);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const { data, error } = await supabase.rpc('get_document_secure', {
          p_document_id: documentId,
          p_include_payment_data: false
        });
        
        const documentData = data?.[0]; // Function returns array
        
        if (error) throw error;
        if (documentData) {
          setDocument(documentData as unknown as Document);
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        toast({
          title: "Error",
          description: "Failed to fetch document details",
          variant: "destructive",
        });
      }
    };

    fetchDocument();
  }, [documentId, toast]);

  const handleGeneratePDF = async () => {
    if (!document) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('doc-pdf', {
        body: { 
          documentId,
          sendEmail 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "PDF generated successfully",
      });

      // Fetch updated document using secure function
      const { data: updatedData, error: fetchError } = await supabase.rpc('get_document_secure', {
        p_document_id: documentId,
        p_include_payment_data: false
      });

      if (!fetchError && updatedData?.[0]) {
        onComplete(updatedData[0] as unknown as Document);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!document) {
    return <div>Loading...</div>;
  }

  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
  const taxAmount = subtotal * (document.tax_rate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-6">
      {/* Document Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-medium">{document.client_name}</div>
              {document.client_email && (
                <div className="text-sm text-muted-foreground">{document.client_email}</div>
              )}
              {document.client_phone && (
                <div className="text-sm text-muted-foreground">{document.client_phone}</div>
              )}
            </div>
            {document.client_address && (
              <div className="text-sm text-muted-foreground whitespace-pre-line">
                {document.client_address}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Document Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="secondary">{document.document_type.toUpperCase()}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Number:</span>
              <span className="font-medium">{document.document_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(document.created_at), 'MMM d, yyyy')}</span>
            </div>
            {document.valid_until && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until:</span>
                <span>{format(new Date(document.valid_until), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax Rate:</span>
              <span>{document.tax_rate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Line Items ({lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {line.material_description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.quantity} {line.material_unit}
                  </TableCell>
                  <TableCell className="text-right">
                    ${line.unit_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${line.line_total.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {document.tax_rate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({document.tax_rate}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-medium">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Terms */}
      {(document.notes || document.terms_conditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {document.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {document.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {document.terms_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {document.terms_conditions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Generate PDF Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Generate PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {document.client_email && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
              />
              <label htmlFor="send-email" className="text-sm font-medium">
                Send PDF via email to {document.client_email}
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={isGenerating}
            >
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate PDF Only'}
            </Button>
            
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="min-w-[140px]"
            >
              {isGenerating ? (
                'Processing...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {sendEmail ? 'Generate & Send' : 'Complete'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};