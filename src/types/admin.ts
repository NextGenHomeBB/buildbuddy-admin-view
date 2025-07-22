export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  end_date?: string;
  budget?: number;
  company_id: string;
  created_at: string;
  updated_at: string;
  project_phases?: ProjectPhase[];
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  start_date: string;
  end_date?: string;
  progress: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'project_manager' | 'developer' | 'client';
  status: 'active' | 'inactive' | 'pending';
  avatar_url?: string;
  company_id: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_users: number;
  active_users: number;
}