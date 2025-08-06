-- Add template_type and created_by fields to phase_templates table
ALTER TABLE public.phase_templates 
ADD COLUMN template_type TEXT NOT NULL DEFAULT 'default' CHECK (template_type IN ('default', 'custom')),
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update existing templates to be marked as 'default'
UPDATE public.phase_templates SET template_type = 'default' WHERE template_type IS NULL;

-- Create index for better performance
CREATE INDEX idx_phase_templates_type ON public.phase_templates(template_type);
CREATE INDEX idx_phase_templates_created_by ON public.phase_templates(created_by);