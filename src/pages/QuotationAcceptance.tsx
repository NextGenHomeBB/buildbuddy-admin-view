import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, FileText, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

const acceptanceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  note: z.string().optional(),
});

type AcceptanceFormData = z.infer<typeof acceptanceSchema>;

interface PublicDocument {
  document_number: string;
  client_name: string;
  total_amount: number;
  notes?: string;
  status: string;
  document_type: string;
  valid_until?: string;
}

const QuotationAcceptance: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [document, setDocument] = useState<PublicDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptanceFormData>({
    resolver: zodResolver(acceptanceSchema),
  });

  useEffect(() => {
    const fetchDocument = async () => {
      if (!token) {
        setError('Invalid quotation link');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_document_public', {
          p_token: token,
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setError('Quotation not found or expired');
          setLoading(false);
          return;
        }

        const docData = data[0];
        setDocument(docData);

        if (docData.status === 'accepted') {
          setAccepted(true);
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        setError('Failed to load quotation');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [token]);

  const onSubmit = async (data: AcceptanceFormData) => {
    if (!token) return;

    try {
      const { data: result, error } = await supabase.rpc('accept_quotation_by_token', {
        p_token: token,
        p_name: data.name,
        p_email: data.email,
        p_note: data.note || '',
        p_ip: '', // Could get IP from a service
      });

      if (error) throw error;

      if ((result as any).success) {
        setAccepted(true);
        setDocument(prev => prev ? { ...prev, status: 'accepted' } : null);
      } else {
        setError((result as any).error || 'Failed to accept quotation');
      }
    } catch (error) {
      console.error('Error accepting quotation:', error);
      setError('Failed to accept quotation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-lg font-semibold mb-2">Quotation Not Found</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-lg font-semibold">Quotation not found</h1>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-lg font-semibold mb-2">Quotation Accepted!</h1>
            <p className="text-muted-foreground mb-4">
              Thank you for accepting quotation {document.document_number}.
            </p>
            <p className="text-sm text-muted-foreground">
              We will contact you shortly to proceed with the project.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Quotation {document.document_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <User className="h-4 w-4 text-muted-foreground mr-2" />
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{document.client_name}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                <div>
                  <div className="text-sm text-muted-foreground">Valid Until</div>
                  <div className="font-medium">
                    {document.valid_until 
                      ? format(new Date(document.valid_until), 'MMM d, yyyy')
                      : 'No expiry'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-3xl font-bold">${document.total_amount.toFixed(2)}</div>
            </div>

            {/* Notes */}
            {document.notes && (
              <div>
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {document.notes}
                </p>
              </div>
            )}

            {/* Acceptance Form */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Accept This Quotation</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="note">Additional Notes (Optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Any additional comments or requirements"
                    {...register('note')}
                  />
                </div>

                <Alert>
                  <AlertDescription>
                    By accepting this quotation, you agree to the terms and conditions 
                    outlined in the proposal. This constitutes a binding agreement.
                  </AlertDescription>
                </Alert>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Accepting...' : 'Accept Quotation'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuotationAcceptance;