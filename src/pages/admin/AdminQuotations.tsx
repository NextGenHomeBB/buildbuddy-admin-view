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
  User
} from 'lucide-react';
import { useDocuments, type Document } from '@/hooks/useDocuments';
import { format } from 'date-fns';

const AdminQuotations: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showWizard, setShowWizard] = useState(false);
  const { documents, loading, fetchDocuments } = useDocuments();
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {document.pdf_url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(document.pdf_url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default AdminQuotations;