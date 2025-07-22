import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client if environment variables are missing
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          company_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: 'planning' | 'in_progress' | 'completed' | 'on_hold';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          company_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: 'planning' | 'in_progress' | 'completed' | 'on_hold';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          company_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
          start_date: string | null;
          end_date: string | null;
          progress: number;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          status?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
          start_date?: string | null;
          end_date?: string | null;
          progress?: number;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          status?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
          start_date?: string | null;
          end_date?: string | null;
          progress?: number;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'project_manager' | 'developer' | 'client';
          status: 'active' | 'inactive' | 'pending';
          avatar_url: string | null;
          company_id: string;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'project_manager' | 'developer' | 'client';
          status?: 'active' | 'inactive' | 'pending';
          avatar_url?: string | null;
          company_id: string;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'project_manager' | 'developer' | 'client';
          status?: 'active' | 'inactive' | 'pending';
          avatar_url?: string | null;
          company_id?: string;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};