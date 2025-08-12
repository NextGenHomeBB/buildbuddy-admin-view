import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { QuotationWizard } from '@/components/admin/quotation/QuotationWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Plus, 
  FileText, 
  Mail, 
  Download, 
  Eye,
  Calendar,
  User,
  X,
  DollarSign,
  Link,
  Trash2
} from 'lucide-react';
import { useDocuments, type Document } from '@/hooks/useDocuments';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentDialog } from '@/components/admin/quotation/PaymentDialog';
import { DeleteDocumentDialog } from '@/components/admin/DeleteDocumentDialog';

const AdminQuotations: React.FC = () => {
  console.log('AdminQuotations component loading...');
  const [searchParams] = useSearchParams();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDocument, setPaymentDocument] = useState<Document | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null);
  const { documents, loading, fetchDocuments, convertToInvoice, deleteDocument: removeDocument, getSignedPdfUrl } = useDocuments();
  const navigate = useNavigate();

  const projectId = searchParams.get('project');

  useEffect(() => {
    fetchDocuments(projectId || undefined);
  }, [projectId]);

  const handleCreateQuotation = () => {
    setShowWizard(true);
  };

  const handleWizardComplete = (document: Document) => {
    setShowWizard(false);
    fetchDocuments(projectId || undefined);
  };

  const handleConvertToInvoice = async (quotationId: string) => {
    try {
      await convertToInvoice(quotationId);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleRecordPayment = (document: Document) => {
    setPaymentDocument(document);
    setShowPaymentDialog(true);
  };

  const handlePaymentAdded = () => {
    fetchDocuments(projectId || undefined);
  };

  const handleDelete = (document: Document) => {
    setDeleteDocument(document);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async (id: string) => {
    await removeDocument(id);
    fetchDocuments(projectId || undefined);
  };

  const handleDownloadPdf = async (document: Document) => {
    const signedUrl = await getSignedPdfUrl(document);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const getAcceptanceUrl = (document: Document) => {
    return `${window.location.origin}/quotation/${document.acceptance_token}`;
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };

  if (showWizard) {
    return (
      <QuotationWizard
        projectId={projectId || undefined}
        onComplete={handleWizardComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quotations</h1>
            <p className="text-muted-foreground">
              Create and manage project quotations
              {projectId && ' for this project'}
            </p>
          </div>
          <Button onClick={handleCreateQuotation}>
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold">
                    {documents.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Quotations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.status === 'sent').length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sent
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.status === 'accepted').length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accepted
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold">
                    ${documents
                      .filter(d => d.status === 'accepted')
                      .reduce((sum, d) => sum + d.total_amount, 0)
                      .toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Value
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quotations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading quotations...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quotations found. Create your first quotation to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {document.document_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{document.client_name}</div>
                          {document.client_email && (
                            <div className="text-sm text-muted-foreground">
                              {document.client_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${document.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {document.document_type === 'invoice' ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              ${document.amount_paid.toFixed(2)} / ${document.total_amount.toFixed(2)}
                            </div>
                            <Badge 
                              variant={
                                document.payment_status === 'paid' ? 'default' :
                                document.payment_status === 'partial' ? 'secondary' : 'outline'
                              }
                            >
                              {document.payment_status}
                            </Badge>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(document.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {document.valid_until
                          ? format(new Date(document.valid_until), 'MMM d, yyyy')
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => setSelectedDocument(document)}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           {document.pdf_url && (
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => handleDownloadPdf(document)}
                             >
                               <Download className="h-4 w-4" />
                             </Button>
                           )}
                          {document.document_type === 'quotation' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(getAcceptanceUrl(document))}
                              title="Copy acceptance link"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          )}
                          {document.document_type === 'invoice' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRecordPayment(document)}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          {document.status === 'accepted' && !document.converted_to_invoice_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvertToInvoice(document.id)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Convert to Invoice
                            </Button>
                          )}
                           {document.converted_to_invoice_id && (
                             <Badge variant="secondary">
                               Converted
                             </Badge>
                           )}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDelete(document)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quotation Detail Modal */}
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Quotation Details</DialogTitle>
            </DialogHeader>
            {selectedDocument && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Quotation Number</h3>
                    <p className="text-lg font-semibold">{selectedDocument.document_number}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                    <Badge variant={getStatusColor(selectedDocument.status)} className="mt-1">
                      {selectedDocument.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Client Name</h3>
                    <p>{selectedDocument.client_name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Email</h3>
                    <p>{selectedDocument.client_email || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Total Amount</h3>
                    <p className="text-2xl font-bold">${selectedDocument.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Valid Until</h3>
                    <p>{selectedDocument.valid_until ? format(new Date(selectedDocument.valid_until), 'MMM d, yyyy') : '—'}</p>
                  </div>
                </div>

                {selectedDocument.notes && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Notes</h3>
                    <p className="text-sm">{selectedDocument.notes}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                   {selectedDocument.pdf_url && (
                     <Button 
                       variant="outline"
                       onClick={() => handleDownloadPdf(selectedDocument)}
                     >
                       <Download className="h-4 w-4 mr-2" />
                       Download PDF
                     </Button>
                   )}
                  <Button onClick={() => setSelectedDocument(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        {paymentDocument && (
          <PaymentDialog
            documentId={paymentDocument.id}
            totalAmount={paymentDocument.total_amount}
            amountPaid={paymentDocument.amount_paid}
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            onPaymentAdded={handlePaymentAdded}
          />
        )}

        {/* Delete Dialog */}
        {deleteDocument && (
          <DeleteDocumentDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            documentId={deleteDocument.id}
            documentNumber={deleteDocument.document_number}
            onDelete={confirmDelete}
          />
        )}
      </div>
  );
};

console.log('AdminQuotations component defined successfully');
export default AdminQuotations;