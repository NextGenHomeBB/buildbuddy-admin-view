import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  documentId: string;
  recipientEmail?: string;
  subject?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      supabaseClient.auth.setSession({
        access_token: authHeader.replace("Bearer ", ""),
        refresh_token: "",
      });
    }

    const { documentId, recipientEmail, subject, message }: EmailRequest = await req.json();

    // Fetch document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Use provided email or document client email
    const toEmail = recipientEmail || document.client_email;
    if (!toEmail) {
      throw new Error('No recipient email provided');
    }

    // Generate acceptance link
    const acceptanceUrl = `${Deno.env.get('SUPABASE_URL')}/quotation/${document.acceptance_token}`;

    // Create email content
    const emailSubject = subject || `Quotation ${document.document_number} - ${document.client_name}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Quotation ${document.document_number}</h2>
        
        <p>Dear ${document.client_name},</p>
        
        <p>${message || 'Please find your quotation details below:'}</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Quotation Details</h3>
          <p><strong>Document Number:</strong> ${document.document_number}</p>
          <p><strong>Total Amount:</strong> €${document.total_amount}</p>
          ${document.valid_until ? `<p><strong>Valid Until:</strong> ${new Date(document.valid_until).toLocaleDateString()}</p>` : ''}
          ${document.notes ? `<p><strong>Notes:</strong> ${document.notes}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptanceUrl}" 
             style="background: #3478F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View & Accept Quotation
          </a>
        </div>
        
        <p>You can view the full quotation and accept it online using the link above.</p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>Your Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This quotation was sent automatically. If you received this by mistake, please ignore this email.
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Quotations <onboarding@resend.dev>",
      to: [toEmail],
      subject: emailSubject,
      html: emailBody,
    });

    console.log("Quotation email sent successfully:", emailResponse);

    // Update document to mark as sent
    await supabaseClient
      .from('documents')
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "Quotation email sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending quotation email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);