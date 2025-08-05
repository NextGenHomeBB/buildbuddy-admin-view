-- Create floor_plans table for AI-generated layouts
CREATE TABLE public.floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  prompt text NOT NULL,
  plan_data jsonb NOT NULL,
  total_area numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create plan_styles table for AI-generated design palettes
CREATE TABLE public.plan_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.floor_plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  prompt text NOT NULL,
  palette jsonb NOT NULL,
  theme text NOT NULL,
  textures jsonb,
  mood_images text[],
  created_at timestamptz DEFAULT now()
);

-- Create material_estimates table for AI-generated material calculations
CREATE TABLE public.material_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.floor_plans(id) ON DELETE CASCADE NOT NULL,
  style_id uuid REFERENCES public.plan_styles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  estimate_data jsonb NOT NULL,
  total_cost numeric NOT NULL,
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_estimates ENABLE ROW LEVEL SECURITY;

-- RLS policies for floor_plans
CREATE POLICY "Users can manage their own floor plans" ON public.floor_plans
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all floor plans" ON public.floor_plans
  FOR ALL USING (get_current_user_role() = 'admin');

-- RLS policies for plan_styles
CREATE POLICY "Users can manage their own plan styles" ON public.plan_styles
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all plan styles" ON public.plan_styles
  FOR ALL USING (get_current_user_role() = 'admin');

-- RLS policies for material_estimates
CREATE POLICY "Users can manage their own material estimates" ON public.material_estimates
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all material estimates" ON public.material_estimates
  FOR ALL USING (get_current_user_role() = 'admin');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to floor_plans
CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();