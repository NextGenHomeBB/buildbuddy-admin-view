export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_prompt_templates: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role_scope: string | null
          template: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          role_scope?: string | null
          template: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role_scope?: string | null
          template?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          id: string
          label: string
          phase_template_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          phase_template_id?: string | null
          sort_order: number
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          phase_template_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_phase_template_id_fkey"
            columns: ["phase_template_id"]
            isOneToOne: false
            referencedRelation: "phase_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      daily_task_assignments: {
        Row: {
          assigned_date: string
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          project_id: string | null
          status: string | null
          task_template_id: string | null
          worker_id: string
        }
        Insert: {
          assigned_date: string
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          task_template_id?: string | null
          worker_id: string
        }
        Update: {
          assigned_date?: string
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          task_template_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_assignments_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_assignments_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "worker.my_tasks_view"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          id: string
          name: string | null
          sku: string | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          id?: string
          name?: string | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          id?: string
          name?: string | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      phase_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          work_role: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          work_role?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          work_role?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          id: string
          material_id: string | null
          project_id: string | null
          quantity: number | null
          total_cost: number | null
        }
        Insert: {
          id?: string
          material_id?: string | null
          project_id?: string | null
          quantity?: number | null
          total_cost?: number | null
        }
        Update: {
          id?: string
          material_id?: string | null
          project_id?: string | null
          quantity?: number | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          estimated_days: number | null
          id: string
          name: string | null
          progress: number | null
          project_id: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          estimated_days?: number | null
          id?: string
          name?: string | null
          progress?: number | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          estimated_days?: number | null
          id?: string
          name?: string | null
          progress?: number | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_workers: Json | null
          budget: number | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          progress: number | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          assigned_workers?: Json | null
          budget?: number | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          progress?: number | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          assigned_workers?: Json | null
          budget?: number | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          progress?: number | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          id: string
          operation: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          operation: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          operation?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      task_completion_history: {
        Row: {
          completed_at: string
          completion_date: string
          created_at: string | null
          daily_assignment_id: string | null
          id: string
          project_id: string | null
          task_description: string | null
          task_title: string
          worker_id: string
        }
        Insert: {
          completed_at: string
          completion_date: string
          created_at?: string | null
          daily_assignment_id?: string | null
          id?: string
          project_id?: string | null
          task_description?: string | null
          task_title: string
          worker_id: string
        }
        Update: {
          completed_at?: string
          completion_date?: string
          created_at?: string | null
          daily_assignment_id?: string | null
          id?: string
          project_id?: string | null
          task_description?: string | null
          task_title?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completion_history_daily_assignment_id_fkey"
            columns: ["daily_assignment_id"]
            isOneToOne: false
            referencedRelation: "daily_task_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_lists: {
        Row: {
          color_hex: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_relations: {
        Row: {
          created_at: string | null
          dest_task: string | null
          id: string
          relation: string | null
          src_task: string | null
        }
        Insert: {
          created_at?: string | null
          dest_task?: string | null
          id?: string
          relation?: string | null
          src_task?: string | null
        }
        Update: {
          created_at?: string | null
          dest_task?: string | null
          id?: string
          relation?: string | null
          src_task?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_relations_dest_task_fkey"
            columns: ["dest_task"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relations_dest_task_fkey"
            columns: ["dest_task"]
            isOneToOne: false
            referencedRelation: "worker.my_tasks_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relations_src_task_fkey"
            columns: ["src_task"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relations_src_task_fkey"
            columns: ["src_task"]
            isOneToOne: false
            referencedRelation: "worker.my_tasks_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          is_scheduled: boolean | null
          list_id: string | null
          phase_id: string | null
          position: number | null
          priority: string | null
          project_id: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_scheduled?: boolean | null
          list_id?: string | null
          phase_id?: string | null
          position?: number | null
          priority?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_scheduled?: boolean | null
          list_id?: string | null
          phase_id?: string | null
          position?: number | null
          priority?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_sheets: {
        Row: {
          created_at: string | null
          hours: number | null
          id: string
          note: string | null
          project_id: string | null
          user_id: string | null
          work_date: string | null
        }
        Insert: {
          created_at?: string | null
          hours?: number | null
          id?: string
          note?: string | null
          project_id?: string | null
          user_id?: string | null
          work_date?: string | null
        }
        Update: {
          created_at?: string | null
          hours?: number | null
          id?: string
          note?: string | null
          project_id?: string | null
          user_id?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_sheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          message: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          message?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          message?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_project_role: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_project_role_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_project_role_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string
          expense_date: string
          expense_type: string
          id: string
          project_id: string | null
          receipt_url: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description: string
          expense_date: string
          expense_type: string
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          expense_type?: string
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_worker_expenses_worker_id"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_payments: {
        Row: {
          bonuses: number | null
          created_at: string
          created_by: string | null
          deductions: number | null
          gross_pay: number | null
          hours_worked: number | null
          id: string
          net_pay: number | null
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          pay_period_end: string
          pay_period_start: string
          payment_date: string | null
          regular_pay: number | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          bonuses?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          gross_pay?: number | null
          hours_worked?: number | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          pay_period_end: string
          pay_period_start: string
          payment_date?: string | null
          regular_pay?: number | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          bonuses?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          gross_pay?: number | null
          hours_worked?: number | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string | null
          regular_pay?: number | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_worker_payments_worker_id"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          end_date: string | null
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          payment_type: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          payment_type?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          payment_type?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_worker_rates_worker_id"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      "worker.my_tasks_view": {
        Row: {
          assigned_worker_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          priority: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_worker_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: never
          id?: string | null
          priority?: string | null
          status?: never
          title?: string | null
          updated_at?: never
        }
        Update: {
          assigned_worker_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: never
          id?: string | null
          priority?: string | null
          status?: never
          title?: string | null
          updated_at?: never
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          operation_name: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      complete_daily_task: {
        Args: { assignment_id: string }
        Returns: Json
      }
      create_user_profile: {
        Args: { user_id: string; user_email?: string }
        Returns: Json
      }
      expire_old_daily_tasks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_tasks: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          assigned_worker_id: string
          due_date: string
          created_at: string
          updated_at: string
        }[]
      }
      setup_demo_data: {
        Args: { manager_id: string; worker_id: string }
        Returns: Json
      }
      update_phase_progress: {
        Args: { phase: string }
        Returns: undefined
      }
      update_project_progress: {
        Args: { proj: string }
        Returns: undefined
      }
      user_has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "worker"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "worker"],
    },
  },
} as const
