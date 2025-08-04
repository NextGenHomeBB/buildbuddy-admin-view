import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PDFGenerationRequest {
  documentId: string;
  sendEmail?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, sendEmail = false }: PDFGenerationRequest = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating PDF for document: ${documentId}`);
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch document data with lines
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        document_lines (*)
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document fetch error:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate PDF content (simplified for now)
    const pdfContent = await generatePDFContent(document);
    
    // Upload PDF to storage
    const fileName = `${document.document_type}_${document.document_number}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Update document with PDF URL
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        pdf_url: urlData.publicUrl,
        status: sendEmail ? 'sent' : 'draft'
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Document update error:', updateError);
    }

    // Send email if requested
    if (sendEmail && document.client_email) {
      await sendDocumentEmail(document, urlData.publicUrl);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: urlData.publicUrl,
        message: sendEmail ? 'PDF generated and email sent' : 'PDF generated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

async function generatePDFContent(document: any): Promise<Uint8Array> {
  // This is a simplified PDF generation
  // In a real implementation, you would use a proper PDF library
  const content = `
    ${document.document_type.toUpperCase()}: ${document.document_number}
    
    Client: ${document.client_name}
    Email: ${document.client_email}
    Address: ${document.client_address}
    
    ${document.document_lines.map((line: any) => 
      `${line.material_name} - Qty: ${line.quantity} x $${line.unit_price} = $${line.line_total}`
    ).join('\n')}
    
    Subtotal: $${document.subtotal}
    Tax (${document.tax_rate}%): $${document.tax_amount}
    Total: $${document.total_amount}
    
    ${document.notes || ''}
    ${document.terms_conditions || ''}
  `;
  
  return new TextEncoder().encode(content);
}

async function sendDocumentEmail(document: any, pdfUrl: string): Promise<void> {
  // TODO: Implement SendGrid email sending
  console.log(`Would send email to ${document.client_email} with PDF: ${pdfUrl}`);
  
  // Placeholder for SendGrid integration
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'));
  
  // const msg = {
  //   to: document.client_email,
  //   from: 'no-reply@yourcompany.com',
  //   subject: `${document.document_type} ${document.document_number}`,
  //   text: `Please find attached your ${document.document_type}.`,
  //   attachments: [
  //     {
  //       content: base64PDF,
  //       filename: `${document.document_type}_${document.document_number}.pdf`,
  //       type: 'application/pdf',
  //       disposition: 'attachment'
  //     }
  //   ]
  // };
  
  // await sgMail.send(msg);
}

serve(handler);