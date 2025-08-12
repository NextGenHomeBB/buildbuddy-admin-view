-- Create quotation templates table
CREATE TABLE public.quotation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  default_tax_rate NUMERIC DEFAULT 0,
  default_terms_conditions TEXT,
  default_notes TEXT,
  default_valid_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  org_id UUID
);

-- Create quotation template lines table
CREATE TABLE public.quotation_template_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
  material_sku TEXT,
  material_name TEXT NOT NULL,
  material_description TEXT,
  material_unit TEXT DEFAULT 'pcs',
  default_quantity NUMERIC NOT NULL,
  default_unit_price NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  category TEXT
);

-- Enable RLS
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_template_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotation_templates
CREATE POLICY "Admins can manage all quotation templates"
ON public.quotation_templates
FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Managers can manage quotation templates for their projects"
ON public.quotation_templates
FOR ALL
USING (
  get_current_user_role() IN ('admin', 'manager') OR 
  created_by = auth.uid()
);

-- RLS Policies for quotation_template_lines
CREATE POLICY "Users can manage lines for accessible templates"
ON public.quotation_template_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.quotation_templates qt
    WHERE qt.id = quotation_template_lines.template_id
    AND (
      get_current_user_role() = 'admin' OR
      qt.created_by = auth.uid() OR
      get_current_user_role() IN ('admin', 'manager')
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_quotation_templates_updated_at
BEFORE UPDATE ON public.quotation_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_quotation_templates_created_by ON public.quotation_templates(created_by);
CREATE INDEX idx_quotation_templates_category ON public.quotation_templates(category);
CREATE INDEX idx_quotation_templates_is_active ON public.quotation_templates(is_active);
CREATE INDEX idx_quotation_template_lines_template_id ON public.quotation_template_lines(template_id);
CREATE INDEX idx_quotation_template_lines_sort_order ON public.quotation_template_lines(template_id, sort_order);