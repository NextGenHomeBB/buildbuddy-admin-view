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
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
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
            referencedRelation: "project_summary_view"
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
            referencedRelation: "project_summary_view"
            referencedColumns: ["id"]
          },
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
      tasks: {
        Row: {
          assignee: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          phase_id: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          phase_id?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          phase_id?: string | null
          priority?: string | null
          project_id?: string | null
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
            referencedRelation: "project_summary_view"
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
            referencedRelation: "project_summary_view"
            referencedColumns: ["id"]
          },
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
      user_project_role: {
        Row: {
          id: string
          project_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
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
            referencedRelation: "project_summary_view"
            referencedColumns: ["id"]
          },
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
    }
    Views: {
      project_summary_view: {
        Row: {
          budget: number | null
          company_name: string | null
          id: string | null
          name: string | null
          progress: number | null
          start_date: string | null
          status: string | null
        }
        Relationships: []
      }
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
      create_user_profile: {
        Args: { user_id: string; user_email?: string }
        Returns: Json
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
