import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";

interface Document {
  id: string;
  document_number: string;
  client_name: string;
  client_email?: string;
  total_amount: number;
}

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onEmailSent?: () => void;
}

export function SendEmailDialog({ open, onOpenChange, document, onEmailSent }: SendEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!document) return;

    const email = recipientEmail || document.client_email;
    if (!email) {
      toast({
        title: "Error",
        description: "Please provide a recipient email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          documentId: document.id,
          recipientEmail: email,
          subject: subject || undefined,
          message: message || undefined,
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Quotation email sent successfully to ${email}`,
      });

      onEmailSent?.();
      onOpenChange(false);
      
      // Reset form
      setRecipientEmail("");
      setSubject("");
      setMessage("");
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set default values when dialog opens
  React.useEffect(() => {
    if (open && document) {
      setRecipientEmail(document.client_email || "");
      setSubject(`Quotation ${document.document_number} - ${document.client_name}`);
      setMessage(`Dear ${document.client_name},\n\nPlease find your quotation attached. You can view and accept it online using the link in this email.\n\nBest regards`);
    }
  }, [open, document]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Quotation Email
          </DialogTitle>
          <DialogDescription>
            Send the quotation {document?.document_number} via email with an acceptance link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message"
              rows={4}
            />
          </div>

          {document && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <div className="font-medium">Quotation Preview:</div>
              <div>Number: {document.document_number}</div>
              <div>Client: {document.client_name}</div>
              <div>Amount: €{document.total_amount}</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={loading}>
            {loading ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}