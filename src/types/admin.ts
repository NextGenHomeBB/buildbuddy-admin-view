export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date?: string;
  budget?: number;
  client_name?: string;
  team_size: number;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  start_date: string;
  end_date?: string;
  completion_percentage: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'project_manager' | 'developer' | 'client';
  avatar_url?: string;
  status: 'active' | 'inactive' | 'pending';
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