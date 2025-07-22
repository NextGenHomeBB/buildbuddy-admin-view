-- Create phase templates table
CREATE TABLE public.phase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create checklist templates table
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only access)
CREATE POLICY "Admin only access to phase_templates" 
ON public.phase_templates 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admin only access to checklist_templates" 
ON public.checklist_templates 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Insert default phase templates data
INSERT INTO public.phase_templates (name, description, sort_order) VALUES
('Excavation', 'Site preparation and excavation work', 1),
('Foundation', 'Foundation and concrete work', 2),
('Framing', 'Structural framing work', 3),
('Roofing', 'Roof installation and weatherproofing', 4),
('Plumbing', 'Rough and finish plumbing work', 5),
('Electrical', 'Electrical rough-in and finish work', 6),
('Insulation', 'Insulation and vapor barrier installation', 7),
('Drywall', 'Drywall installation and finishing', 8),
('Flooring', 'Floor installation and finishing', 9),
('Interior Trim', 'Interior trim and finish carpentry', 10),
('Painting', 'Interior and exterior painting', 11),
('Final Cleanup', 'Final inspection and cleanup', 12);

-- Insert checklist items for each phase
INSERT INTO public.checklist_templates (phase_template_id, label, sort_order) VALUES
-- Excavation
((SELECT id FROM public.phase_templates WHERE name = 'Excavation'), 'Stake out site boundaries', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Excavation'), 'Call utility marking service', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Excavation'), 'Dig foundation trenches', 3),
((SELECT id FROM public.phase_templates WHERE name = 'Excavation'), 'Grade and level excavation', 4),

-- Foundation
((SELECT id FROM public.phase_templates WHERE name = 'Foundation'), 'Install foundation forms', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Foundation'), 'Pour concrete footings', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Foundation'), 'Cure concrete (minimum 7 days)', 3),
((SELECT id FROM public.phase_templates WHERE name = 'Foundation'), 'Remove forms and backfill', 4),

-- Framing
((SELECT id FROM public.phase_templates WHERE name = 'Framing'), 'Install sill plates', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Framing'), 'Erect exterior walls', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Framing'), 'Install interior walls', 3),
((SELECT id FROM public.phase_templates WHERE name = 'Framing'), 'Set roof trusses', 4),
((SELECT id FROM public.phase_templates WHERE name = 'Framing'), 'Install subflooring', 5),

-- Roofing
((SELECT id FROM public.phase_templates WHERE name = 'Roofing'), 'Install roof sheathing', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Roofing'), 'Apply underlayment', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Roofing'), 'Install shingles or roofing material', 3),
((SELECT id FROM public.phase_templates WHERE name = 'Roofing'), 'Install gutters and downspouts', 4),

-- Plumbing
((SELECT id FROM public.phase_templates WHERE name = 'Plumbing'), 'Rough-in water supply lines', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Plumbing'), 'Rough-in drainage and waste lines', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Plumbing'), 'Pressure test all lines', 3),
((SELECT id FROM public.phase_templates WHERE name = 'Plumbing'), 'Install fixtures and finish work', 4),

-- Electrical
((SELECT id FROM public.phase_templates WHERE name = 'Electrical'), 'Run electrical rough-in wiring', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Electrical'), 'Install electrical panel', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Electrical'), 'Install outlets and switches', 3),
((SELECT id FROM public.phase_templates WHERE name = 'Electrical'), 'Install light fixtures', 4),

-- Insulation
((SELECT id FROM public.phase_templates WHERE name = 'Insulation'), 'Install wall insulation', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Insulation'), 'Install ceiling insulation', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Insulation'), 'Install vapor barriers', 3),

-- Drywall
((SELECT id FROM public.phase_templates WHERE name = 'Drywall'), 'Hang drywall sheets', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Drywall'), 'Apply joint compound and tape', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Drywall'), 'Sand and prime walls', 3),

-- Flooring
((SELECT id FROM public.phase_templates WHERE name = 'Flooring'), 'Prepare subfloor', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Flooring'), 'Install flooring material', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Flooring'), 'Install baseboards and trim', 3),

-- Interior Trim
((SELECT id FROM public.phase_templates WHERE name = 'Interior Trim'), 'Install door and window casings', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Interior Trim'), 'Install interior doors', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Interior Trim'), 'Install crown molding', 3),

-- Painting
((SELECT id FROM public.phase_templates WHERE name = 'Painting'), 'Prime all surfaces', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Painting'), 'Apply finish paint coats', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Painting'), 'Touch up and final inspection', 3),

-- Final Cleanup
((SELECT id FROM public.phase_templates WHERE name = 'Final Cleanup'), 'Clean all interior surfaces', 1),
((SELECT id FROM public.phase_templates WHERE name = 'Final Cleanup'), 'Final walkthrough inspection', 2),
((SELECT id FROM public.phase_templates WHERE name = 'Final Cleanup'), 'Complete project documentation', 3);