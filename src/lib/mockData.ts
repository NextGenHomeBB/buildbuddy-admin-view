import { Project, ProjectPhase, User, AdminStats } from '@/types/admin';

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'E-commerce Platform Redesign',
    description: 'Complete redesign of the existing e-commerce platform with modern UI/UX',
    status: 'active',
    priority: 'high',
    start_date: '2024-01-15',
    end_date: '2024-06-30',
    budget: 150000,
    client_name: 'TechCorp Inc.',
    team_size: 8,
    completion_percentage: 65,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z'
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Native iOS and Android app for customer engagement',
    status: 'planning',
    priority: 'medium',
    start_date: '2024-03-01',
    end_date: '2024-08-15',
    budget: 200000,
    client_name: 'StartupXYZ',
    team_size: 6,
    completion_percentage: 15,
    created_at: '2024-01-05T09:00:00Z',
    updated_at: '2024-01-18T11:20:00Z'
  },
  {
    id: '3',
    name: 'Data Analytics Dashboard',
    description: 'Real-time analytics dashboard for business intelligence',
    status: 'completed',
    priority: 'medium',
    start_date: '2023-09-01',
    end_date: '2023-12-31',
    budget: 80000,
    client_name: 'DataCorp',
    team_size: 4,
    completion_percentage: 100,
    created_at: '2023-08-20T14:00:00Z',
    updated_at: '2024-01-02T16:45:00Z'
  },
  {
    id: '4',
    name: 'API Integration Project',
    description: 'Integration of third-party APIs for enhanced functionality',
    status: 'on_hold',
    priority: 'low',
    start_date: '2024-02-01',
    budget: 45000,
    client_name: 'ServiceHub',
    team_size: 3,
    completion_percentage: 30,
    created_at: '2024-01-12T08:30:00Z',
    updated_at: '2024-01-19T13:15:00Z'
  }
];

export const mockProjectPhases: Record<string, ProjectPhase[]> = {
  '1': [
    {
      id: 'p1-1',
      project_id: '1',
      name: 'Discovery & Planning',
      description: 'Requirements gathering and project planning',
      status: 'completed',
      start_date: '2024-01-15',
      end_date: '2024-02-15',
      completion_percentage: 100,
      order: 1,
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-02-15T17:00:00Z'
    },
    {
      id: 'p1-2',
      project_id: '1',
      name: 'UI/UX Design',
      description: 'Design mockups and user experience optimization',
      status: 'in_progress',
      start_date: '2024-02-16',
      end_date: '2024-04-15',
      completion_percentage: 75,
      order: 2,
      created_at: '2024-02-16T09:00:00Z',
      updated_at: '2024-03-20T14:30:00Z'
    },
    {
      id: 'p1-3',
      project_id: '1',
      name: 'Frontend Development',
      description: 'Implementation of the new design',
      status: 'in_progress',
      start_date: '2024-03-01',
      end_date: '2024-05-30',
      completion_percentage: 45,
      order: 3,
      created_at: '2024-03-01T09:00:00Z',
      updated_at: '2024-03-25T16:20:00Z'
    },
    {
      id: 'p1-4',
      project_id: '1',
      name: 'Testing & Deployment',
      description: 'Quality assurance and production deployment',
      status: 'not_started',
      start_date: '2024-06-01',
      end_date: '2024-06-30',
      completion_percentage: 0,
      order: 4,
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z'
    }
  ]
};

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@buildbuddy.com',
    full_name: 'Sarah Johnson',
    role: 'admin',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b152890a?w=100&h=100&fit=crop&crop=face',
    status: 'active',
    last_login: '2024-01-22T09:30:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-22T09:30:00Z'
  },
  {
    id: '2',
    email: 'pm.mike@buildbuddy.com',
    full_name: 'Mike Chen',
    role: 'project_manager',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    status: 'active',
    last_login: '2024-01-21T16:45:00Z',
    created_at: '2023-02-15T00:00:00Z',
    updated_at: '2024-01-21T16:45:00Z'
  },
  {
    id: '3',
    email: 'dev.emma@buildbuddy.com',
    full_name: 'Emma Rodriguez',
    role: 'developer',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    status: 'active',
    last_login: '2024-01-22T08:15:00Z',
    created_at: '2023-03-10T00:00:00Z',
    updated_at: '2024-01-22T08:15:00Z'
  },
  {
    id: '4',
    email: 'client@techcorp.com',
    full_name: 'David Wilson',
    role: 'client',
    status: 'pending',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  }
];

export const mockStats: AdminStats = {
  total_projects: 4,
  active_projects: 1,
  completed_projects: 1,
  total_users: 4,
  active_users: 3
};