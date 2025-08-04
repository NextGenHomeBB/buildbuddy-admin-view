import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { ClientDetailsStep } from './ClientDetailsStep';
import { LineItemsStep } from './LineItemsStep';
import { ReviewStep } from './ReviewStep';
import { useDocuments, type Document } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';

interface QuotationWizardProps {
  projectId?: string;
  onComplete?: (document: Document) => void;
}

type WizardStep = 'client' | 'items' | 'review';

export const QuotationWizard: React.FC<QuotationWizardProps> = ({
  projectId,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('client');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { createDocument } = useDocuments();
  const { user } = useAuth();
  const navigate = useNavigate();

  const steps = [
    { id: 'client', title: 'Client Details', description: 'Enter client information' },
    { id: 'items', title: 'Line Items', description: 'Add materials and pricing' },
    { id: 'review', title: 'Review', description: 'Review and generate PDF' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleClientDetailsComplete = async (clientData: any) => {
    try {
      setIsProcessing(true);
      
      // Generate document number
      const documentNumber = `QUO-${Date.now()}`;
      
      const documentData = {
        document_type: 'quotation' as const,
        document_number: documentNumber,
        project_id: projectId,
        created_by: user?.id!,
        client_name: clientData.clientName,
        client_email: clientData.clientEmail,
        client_address: clientData.clientAddress,
        client_phone: clientData.clientPhone,
        valid_until: clientData.validUntil,
        notes: clientData.notes,
        terms_conditions: clientData.termsConditions,
        tax_rate: clientData.taxRate || 0,
      };
      
      const document = await createDocument(documentData);
      setDocumentId(document.id);
      setCurrentStep('items');
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLineItemsComplete = () => {
    setCurrentStep('review');
  };

  const handleReviewComplete = (document: Document) => {
    if (onComplete) {
      onComplete(document);
    } else {
      navigate('/admin/documents');
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'items':
        setCurrentStep('client');
        break;
      case 'review':
        setCurrentStep('items');
        break;
    }
  };

  const canGoBack = currentStep !== 'client';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Create Quotation</CardTitle>
              <p className="text-muted-foreground mt-1">
                {steps[currentStepIndex].description}
              </p>
            </div>
            {canGoBack && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    index < currentStepIndex
                      ? 'bg-primary border-primary text-primary-foreground'
                      : index === currentStepIndex
                      ? 'border-primary text-primary'
                      : 'border-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    index <= currentStepIndex
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-border mx-4" />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          {currentStep === 'client' && (
            <ClientDetailsStep
              onComplete={handleClientDetailsComplete}
              isProcessing={isProcessing}
            />
          )}
          
          {currentStep === 'items' && documentId && (
            <LineItemsStep
              documentId={documentId}
              onComplete={handleLineItemsComplete}
            />
          )}
          
          {currentStep === 'review' && documentId && (
            <ReviewStep
              documentId={documentId}
              onComplete={handleReviewComplete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};