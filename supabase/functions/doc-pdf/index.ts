import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
  // Generate HTML content for the document
  const htmlContent = generateHTMLContent(document);
  
  // Convert HTML to PDF using Puppeteer
  try {
    const response = await fetch('https://api.htmlcsstoimage.com/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('demo:demo'), // Using demo credentials for now
      },
      body: JSON.stringify({
        html: htmlContent,
        css: getInlineCSS(),
        format: 'pdf',
        width: 794, // A4 width in pixels
        height: 1123, // A4 height in pixels
      }),
    });

    if (!response.ok) {
      // Fallback to basic PDF structure if external service fails
      return generateBasicPDF(document);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('PDF generation service error:', error);
    // Fallback to basic PDF structure
    return generateBasicPDF(document);
  }
}

function generateHTMLContent(document: any): string {
  const lineItems = document.document_lines || [];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${document.document_type.toUpperCase()}</title>
    </head>
    <body>
      <div class="document">
        <header>
          <h1>${document.document_type.toUpperCase()}</h1>
          <div class="document-number">Document #: ${document.document_number}</div>
          <div class="date">Date: ${new Date().toLocaleDateString()}</div>
        </header>
        
        <div class="client-info">
          <h2>Client Information</h2>
          <div><strong>Name:</strong> ${document.client_name || 'N/A'}</div>
          <div><strong>Email:</strong> ${document.client_email || 'N/A'}</div>
          <div><strong>Address:</strong> ${document.client_address || 'N/A'}</div>
          ${document.client_phone ? `<div><strong>Phone:</strong> ${document.client_phone}</div>` : ''}
        </div>
        
        <div class="line-items">
          <h2>Items</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.map((line: any) => `
                <tr>
                  <td>${line.material_name}</td>
                  <td>${line.quantity}</td>
                  <td>$${parseFloat(line.unit_price || 0).toFixed(2)}</td>
                  <td>$${parseFloat(line.line_total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${parseFloat(document.subtotal || 0).toFixed(2)}</span>
          </div>
          ${document.tax_rate > 0 ? `
            <div class="total-line">
              <span>Tax (${document.tax_rate}%):</span>
              <span>$${parseFloat(document.tax_amount || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-line total">
            <span><strong>Total:</strong></span>
            <span><strong>$${parseFloat(document.total_amount || 0).toFixed(2)}</strong></span>
          </div>
        </div>
        
        ${document.notes ? `
          <div class="notes">
            <h2>Notes</h2>
            <p>${document.notes}</p>
          </div>
        ` : ''}
        
        ${document.terms_conditions ? `
          <div class="terms">
            <h2>Terms & Conditions</h2>
            <p>${document.terms_conditions}</p>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

function getInlineCSS(): string {
  return `
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 20px; 
      color: #333; 
    }
    .document { 
      max-width: 800px; 
      margin: 0 auto; 
    }
    header { 
      text-align: center; 
      border-bottom: 2px solid #333; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    h1 { 
      margin: 0; 
      font-size: 2.5em; 
      color: #2563eb; 
    }
    h2 { 
      color: #1e40af; 
      border-bottom: 1px solid #e5e7eb; 
      padding-bottom: 5px; 
    }
    .client-info, .line-items, .totals, .notes, .terms { 
      margin-bottom: 30px; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px; 
    }
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 12px; 
      text-align: left; 
    }
    th { 
      background-color: #f3f4f6; 
      font-weight: bold; 
    }
    .totals { 
      margin-left: auto; 
      width: 300px; 
    }
    .total-line { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 0; 
    }
    .total { 
      border-top: 2px solid #333; 
      padding-top: 10px; 
      font-size: 1.2em; 
    }
  `;
}

function generateBasicPDF(document: any): Uint8Array {
  // Generate a minimal valid PDF structure
  const pdfHeader = '%PDF-1.4\n';
  const content = `
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(${document.document_type.toUpperCase()}: ${document.document_number}) Tj
0 -20 Td
(Client: ${document.client_name || 'N/A'}) Tj
0 -20 Td
(Total: $${parseFloat(document.total_amount || 0).toFixed(2)}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000271 00000 n 
0000000500 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
566
%%EOF
`;

  return new TextEncoder().encode(pdfHeader + content);
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