import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { plan_id, style_id } = await req.json()
    
    if (!plan_id) {
      throw new Error('plan_id is required')
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Create a comprehensive prompt for material calculation
    const prompt = `As a Dutch construction materials calculator, provide a detailed estimate for construction materials based on the following:

Plan ID: ${plan_id}
${style_id ? `Style ID: ${style_id}` : ''}

Generate a comprehensive material list for a typical Dutch home renovation/construction project. Include:

1. Structural materials (concrete, steel, wood framing)
2. Insulation materials (glaswol, PIR, EPS)
3. Roofing materials (dakpannen, onderlaag, goten)
4. Flooring materials (tegels, laminaat, screed)
5. Wall finishing (gipsplaten, stuc, verf)
6. Electrical materials (kabels, schakelmateriaal, armaturen)
7. Plumbing materials (leidingen, fittingen, sanitair)
8. Windows and doors (kozijnen, glas, beslag)

For each material, provide:
- Name in Dutch
- Realistic quantity for a medium-sized Dutch home
- Unit of measurement (m², stuks, meter, kg, etc.)
- Current market price per unit in EUR
- Category classification

Return ONLY a JSON object in this exact format:
{
  "materials": [
    {
      "name": "Material name in Dutch",
      "quantity": 50,
      "unit": "m²",
      "unitCost": 25.50,
      "totalCost": 1275.00,
      "category": "structural"
    }
  ],
  "totalCost": 50000,
  "breakdown": {
    "structural": {
      "items": [...],
      "subtotal": 15000
    },
    "insulation": {
      "items": [...],
      "subtotal": 8000
    }
  },
  "currency": "EUR"
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Dutch construction materials calculator. Always respond with valid JSON only. Use current Dutch market prices and realistic quantities for construction materials.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No response from OpenAI')
    }

    let content = data.choices[0].message.content.trim()
    
    // Clean the content - remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let result
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Content:', content)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate the response structure
    if (!result.materials || !Array.isArray(result.materials)) {
      throw new Error('Invalid response structure: missing materials array')
    }

    if (!result.breakdown || typeof result.breakdown !== 'object') {
      throw new Error('Invalid response structure: missing breakdown object')
    }

    // Ensure totalCost is calculated correctly
    result.totalCost = result.materials.reduce((sum, material) => sum + (material.totalCost || 0), 0)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})