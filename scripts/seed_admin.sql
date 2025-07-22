-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'project_manager', 'developer', 'client')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  avatar_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12, 2),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_phases table
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  start_date DATE,
  end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admins can manage companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.company_id = users.company_id
    )
  );

CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = projects.company_id
    )
  );

CREATE POLICY "Admins can manage project phases" ON project_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN projects p ON p.company_id = u.company_id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND p.id = project_phases.project_id
    )
  );

-- Insert seed data
INSERT INTO companies (id, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'BuildBuddy Demo Company');

INSERT INTO users (id, email, full_name, role, status, company_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'admin@buildbuddy.com', 'Admin User', 'admin', 'active', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440002', 'manager@buildbuddy.com', 'Project Manager', 'project_manager', 'active', '550e8400-e29b-41d4-a716-446655440000');

INSERT INTO projects (id, name, description, status, priority, start_date, end_date, budget, company_id) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Website Redesign', 'Complete overhaul of company website with modern design', 'in_progress', 'high', '2024-01-15', '2024-04-15', 45000.00, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440011', 'Mobile App Development', 'Native iOS and Android application for customer portal', 'planning', 'medium', '2024-03-01', '2024-08-30', 120000.00, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440012', 'Database Migration', 'Migrate legacy database to modern cloud infrastructure', 'completed', 'urgent', '2023-11-01', '2024-01-31', 25000.00, '550e8400-e29b-41d4-a716-446655440000');

INSERT INTO project_phases (project_id, name, description, status, start_date, end_date, progress, order_index) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Discovery & Planning', 'Research and planning phase', 'completed', '2024-01-15', '2024-02-15', 100, 1),
('550e8400-e29b-41d4-a716-446655440010', 'Design & Prototyping', 'UI/UX design and prototyping', 'in_progress', '2024-02-16', '2024-03-15', 75, 2),
('550e8400-e29b-41d4-a716-446655440010', 'Development', 'Frontend and backend development', 'not_started', '2024-03-16', '2024-04-15', 0, 3),
('550e8400-e29b-41d4-a716-446655440011', 'Requirements Analysis', 'Define app requirements and features', 'not_started', '2024-03-01', '2024-03-31', 0, 1),
('550e8400-e29b-41d4-a716-446655440011', 'UI/UX Design', 'Design mobile app interface', 'not_started', '2024-04-01', '2024-05-31', 0, 2),
('550e8400-e29b-41d4-a716-446655440011', 'Development & Testing', 'Build and test mobile applications', 'not_started', '2024-06-01', '2024-08-30', 0, 3);