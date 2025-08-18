export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      active_shifts: {
        Row: {
          break_start: string | null
          created_at: string
          id: string
          org_id: string | null
          project_id: string | null
          shift_start: string
          shift_type: string | null
          total_break_duration: number | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          break_start?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          project_id?: string | null
          shift_start?: string
          shift_type?: string | null
          total_break_duration?: number | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          break_start?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          project_id?: string | null
          shift_start?: string
          shift_type?: string | null
          total_break_duration?: number | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      apple_calendar_credentials: {
        Row: {
          access_count: number | null
          app_password: string
          caldav_url: string
          created_at: string
          credential_expires_at: string | null
          encrypted_app_password: string | null
          encrypted_password: string | null
          encryption_key_id: string | null
          encryption_version: number | null
          id: string
          key_derivation_salt: string | null
          last_accessed: string | null
          last_rotation_at: string | null
          rotation_required: boolean | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_count?: number | null
          app_password: string
          caldav_url?: string
          created_at?: string
          credential_expires_at?: string | null
          encrypted_app_password?: string | null
          encrypted_password?: string | null
          encryption_key_id?: string | null
          encryption_version?: number | null
          id?: string
          key_derivation_salt?: string | null
          last_accessed?: string | null
          last_rotation_at?: string | null
          rotation_required?: boolean | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_count?: number | null
          app_password?: string
          caldav_url?: string
          created_at?: string
          credential_expires_at?: string | null
          encrypted_app_password?: string | null
          encrypted_password?: string | null
          encryption_key_id?: string | null
          encryption_version?: number | null
          id?: string
          key_derivation_salt?: string | null
          last_accessed?: string | null
          last_rotation_at?: string | null
          rotation_required?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          ends_at: string
          external_id: string | null
          id: string
          last_synced: string | null
          location: string | null
          provider: string | null
          starts_at: string
          sync_error: string | null
          sync_status: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at: string
          external_id?: string | null
          id?: string
          last_synced?: string | null
          location?: string | null
          provider?: string | null
          starts_at: string
          sync_error?: string | null
          sync_status?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string
          external_id?: string | null
          id?: string
          last_synced?: string | null
          location?: string | null
          provider?: string | null
          starts_at?: string
          sync_error?: string | null
          sync_status?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_oauth_tokens: {
        Row: {
          access_level: string | null
          access_token: string | null
          created_at: string
          created_ip: string | null
          expires_at: string | null
          id: string
          last_ip: string | null
          last_rotation_at: string | null
          last_used: string | null
          provider: string
          refresh_token: string | null
          rotation_required: boolean | null
          scope: string | null
          suspicious_activity: boolean | null
          token_expires_at: string | null
          token_hash: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          access_token?: string | null
          created_at?: string
          created_ip?: string | null
          expires_at?: string | null
          id?: string
          last_ip?: string | null
          last_rotation_at?: string | null
          last_used?: string | null
          provider: string
          refresh_token?: string | null
          rotation_required?: boolean | null
          scope?: string | null
          suspicious_activity?: boolean | null
          token_expires_at?: string | null
          token_hash?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          access_token?: string | null
          created_at?: string
          created_ip?: string | null
          expires_at?: string | null
          id?: string
          last_ip?: string | null
          last_rotation_at?: string | null
          last_used?: string | null
          provider?: string
          refresh_token?: string | null
          rotation_required?: boolean | null
          scope?: string | null
          suspicious_activity?: boolean | null
          token_expires_at?: string | null
          token_hash?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_sync_settings: {
        Row: {
          apple_calendar_id: string | null
          apple_calendar_url: string | null
          apple_enabled: boolean | null
          apple_username: string | null
          auto_sync_enabled: boolean | null
          created_at: string
          google_calendar_id: string | null
          google_enabled: boolean | null
          id: string
          outlook_calendar_id: string | null
          outlook_enabled: boolean | null
          sync_direction: string | null
          sync_interval_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_calendar_id?: string | null
          apple_calendar_url?: string | null
          apple_enabled?: boolean | null
          apple_username?: string | null
          auto_sync_enabled?: boolean | null
          created_at?: string
          google_calendar_id?: string | null
          google_enabled?: boolean | null
          id?: string
          outlook_calendar_id?: string | null
          outlook_enabled?: boolean | null
          sync_direction?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_calendar_id?: string | null
          apple_calendar_url?: string | null
          apple_enabled?: boolean | null
          apple_username?: string | null
          auto_sync_enabled?: boolean | null
          created_at?: string
          google_calendar_id?: string | null
          google_enabled?: boolean | null
          id?: string
          outlook_calendar_id?: string | null
          outlook_enabled?: boolean | null
          sync_direction?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string
          user_id?: string
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
      credential_access_log: {
        Row: {
          access_granted: boolean | null
          access_reason: string | null
          access_type: string
          additional_context: Json | null
          credential_id: string
          credential_type: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          risk_score: number | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_granted?: boolean | null
          access_reason?: string | null
          access_type: string
          additional_context?: Json | null
          credential_id: string
          credential_type: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          risk_score?: number | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_granted?: boolean | null
          access_reason?: string | null
          access_type?: string
          additional_context?: Json | null
          credential_id?: string
          credential_type?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          risk_score?: number | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credential_rotation_policies: {
        Row: {
          auto_rotation_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          credential_type: string
          id: string
          mandatory_rotation: boolean | null
          max_age_days: number
          max_failed_attempts: number | null
          risk_based_rotation: boolean | null
          updated_at: string | null
          warning_days_before_expiry: number | null
        }
        Insert: {
          auto_rotation_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          credential_type: string
          id?: string
          mandatory_rotation?: boolean | null
          max_age_days?: number
          max_failed_attempts?: number | null
          risk_based_rotation?: boolean | null
          updated_at?: string | null
          warning_days_before_expiry?: number | null
        }
        Update: {
          auto_rotation_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          credential_type?: string
          id?: string
          mandatory_rotation?: boolean | null
          max_age_days?: number
          max_failed_attempts?: number | null
          risk_based_rotation?: boolean | null
          updated_at?: string | null
          warning_days_before_expiry?: number | null
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
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
          },
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
        ]
      }
      document_lines: {
        Row: {
          created_at: string
          document_id: string
          id: string
          line_total: number
          material_description: string | null
          material_name: string
          material_sku: string | null
          material_unit: string | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          line_total?: number
          material_description?: string | null
          material_name: string
          material_sku?: string | null
          material_unit?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          line_total?: number
          material_description?: string | null
          material_name?: string
          material_sku?: string | null
          material_unit?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          document_id: string
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          document_id: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          document_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          created_at: string
          current_number: number
          document_type: string
          id: string
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          current_number?: number
          document_type: string
          id?: string
          prefix: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          current_number?: number
          document_type?: string
          id?: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          acceptance_ip: string | null
          acceptance_note: string | null
          acceptance_token: string
          accepted_at: string | null
          accepted_by_email: string | null
          accepted_by_name: string | null
          amount_paid: number
          client_address: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string
          document_number: string
          document_type: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: string | null
          payment_url: string | null
          pdf_url: string | null
          project_id: string | null
          source_document_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms_conditions: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          acceptance_ip?: string | null
          acceptance_note?: string | null
          acceptance_token?: string
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          amount_paid?: number
          client_address?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by: string
          document_number: string
          document_type: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string | null
          payment_url?: string | null
          pdf_url?: string | null
          project_id?: string | null
          source_document_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          acceptance_ip?: string | null
          acceptance_note?: string | null
          acceptance_token?: string
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          amount_paid?: number
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string
          document_number?: string
          document_type?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string | null
          payment_url?: string | null
          pdf_url?: string | null
          project_id?: string | null
          source_document_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan_data: Json
          prompt: string
          total_area: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan_data: Json
          prompt: string
          total_area?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan_data?: Json
          prompt?: string
          total_area?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          org_id: string
          role: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_estimates: {
        Row: {
          created_at: string | null
          currency: string | null
          estimate_data: Json
          id: string
          plan_id: string
          style_id: string | null
          total_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          estimate_data: Json
          id?: string
          plan_id: string
          style_id?: string | null
          total_cost: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          estimate_data?: Json
          id?: string
          plan_id?: string
          style_id?: string | null
          total_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_estimates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_estimates_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "plan_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          article_nr: string | null
          brand: string | null
          category: string | null
          ean: string | null
          id: string
          name: string | null
          org_id: string | null
          price_ex_vat: number | null
          sku: string | null
          specs: Json | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
          url: string | null
        }
        Insert: {
          article_nr?: string | null
          brand?: string | null
          category?: string | null
          ean?: string | null
          id?: string
          name?: string | null
          org_id?: string | null
          price_ex_vat?: number | null
          sku?: string | null
          specs?: Json | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          url?: string | null
        }
        Update: {
          article_nr?: string | null
          brand?: string | null
          category?: string | null
          ean?: string | null
          id?: string
          name?: string | null
          org_id?: string | null
          price_ex_vat?: number | null
          sku?: string | null
          specs?: Json | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_runs: {
        Row: {
          auto_generated: boolean | null
          created_at: string
          created_by: string | null
          execution_time_ms: number | null
          id: string
          optimization_score: number | null
          run_date: string
          total_shifts_confirmed: number | null
          total_shifts_proposed: number | null
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          execution_time_ms?: number | null
          id?: string
          optimization_score?: number | null
          run_date: string
          total_shifts_confirmed?: number | null
          total_shifts_proposed?: number | null
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          execution_time_ms?: number | null
          id?: string
          optimization_score?: number | null
          run_date?: string
          total_shifts_confirmed?: number | null
          total_shifts_proposed?: number | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          expires_at: string | null
          org_id: string
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          org_id: string
          role: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          org_id?: string
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      phase_expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          expense_type: string
          id: string
          org_id: string | null
          phase_id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          expense_type: string
          id?: string
          org_id?: string | null
          phase_id: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          expense_type?: string
          id?: string
          org_id?: string | null
          phase_id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_labor_costs: {
        Row: {
          created_at: string
          description: string | null
          hourly_rate: number
          hours_actual: number | null
          hours_planned: number | null
          id: string
          phase_id: string
          total_actual_cost: number
          total_planned_cost: number
          updated_at: string
          work_date: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hourly_rate?: number
          hours_actual?: number | null
          hours_planned?: number | null
          id?: string
          phase_id: string
          total_actual_cost?: number
          total_planned_cost?: number
          updated_at?: string
          work_date?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hourly_rate?: number
          hours_actual?: number | null
          hours_planned?: number | null
          id?: string
          phase_id?: string
          total_actual_cost?: number
          total_planned_cost?: number
          updated_at?: string
          work_date?: string | null
          worker_id?: string
        }
        Relationships: []
      }
      phase_material_costs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string | null
          material_name: string
          material_sku: string | null
          notes: string | null
          phase_id: string
          quantity: number
          status: string | null
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string | null
          material_name: string
          material_sku?: string | null
          notes?: string | null
          phase_id: string
          quantity?: number
          status?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string | null
          material_name?: string
          material_sku?: string | null
          notes?: string | null
          phase_id?: string
          quantity?: number
          status?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      phase_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
          template_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order: number
          template_type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_type?: string
        }
        Relationships: []
      }
      plan_styles: {
        Row: {
          created_at: string | null
          id: string
          mood_images: string[] | null
          name: string
          palette: Json
          plan_id: string
          prompt: string
          textures: Json | null
          theme: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mood_images?: string[] | null
          name: string
          palette: Json
          plan_id: string
          prompt: string
          textures?: Json | null
          theme: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mood_images?: string[] | null
          name?: string
          palette?: Json
          plan_id?: string
          prompt?: string
          textures?: Json | null
          theme?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_styles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_id: string | null
          created_at: string | null
          default_org_id: string | null
          full_name: string | null
          id: string
          work_role: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string | null
          default_org_id?: string | null
          full_name?: string | null
          id: string
          work_role?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string | null
          default_org_id?: string | null
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
          {
            foreignKeyName: "profiles_default_org_id_fkey"
            columns: ["default_org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_org_id_fkey"
            columns: ["default_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          id: string
          material_id: string | null
          planned_qty: number | null
          project_id: string | null
          quantity: number | null
          task_id: string | null
          total_cost: number | null
          used_flag: boolean | null
        }
        Insert: {
          id?: string
          material_id?: string | null
          planned_qty?: number | null
          project_id?: string | null
          quantity?: number | null
          task_id?: string | null
          total_cost?: number | null
          used_flag?: boolean | null
        }
        Update: {
          id?: string
          material_id?: string | null
          planned_qty?: number | null
          project_id?: string | null
          quantity?: number | null
          task_id?: string | null
          total_cost?: number | null
          used_flag?: boolean | null
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
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          budget: number | null
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
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
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
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
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
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
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
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
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
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_template_lines: {
        Row: {
          category: string | null
          default_quantity: number
          default_unit_price: number
          id: string
          is_optional: boolean | null
          material_description: string | null
          material_name: string
          material_sku: string | null
          material_unit: string | null
          sort_order: number
          template_id: string
        }
        Insert: {
          category?: string | null
          default_quantity: number
          default_unit_price: number
          id?: string
          is_optional?: boolean | null
          material_description?: string | null
          material_name: string
          material_sku?: string | null
          material_unit?: string | null
          sort_order: number
          template_id: string
        }
        Update: {
          category?: string | null
          default_quantity?: number
          default_unit_price?: number
          id?: string
          is_optional?: boolean | null
          material_description?: string | null
          material_name?: string
          material_sku?: string | null
          material_unit?: string | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quotation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          default_notes: string | null
          default_tax_rate: number | null
          default_terms_conditions: string | null
          default_valid_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          default_notes?: string | null
          default_tax_rate?: number | null
          default_terms_conditions?: string | null
          default_valid_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          default_notes?: string | null
          default_tax_rate?: number | null
          default_terms_conditions?: string | null
          default_valid_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          id: string
          ip_address: string | null
          operation: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          operation: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          operation?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      scheduler_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          notification_type?: string
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
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
      security_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      sensitive_operation_audit: {
        Row: {
          id: string
          ip_address: string | null
          operation_data: Json | null
          operation_type: string
          record_id: string | null
          risk_score: number | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          operation_data?: Json | null
          operation_type: string
          record_id?: string | null
          risk_score?: number | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          operation_data?: Json | null
          operation_type?: string
          record_id?: string | null
          risk_score?: number | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          confidence_score: number | null
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          notes: string | null
          org_id: string | null
          project_id: string | null
          start_time: string
          status: string
          task_id: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          notes?: string | null
          org_id?: string | null
          project_id?: string | null
          start_time: string
          status?: string
          task_id?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          org_id?: string | null
          project_id?: string | null
          start_time?: string
          status?: string
          task_id?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shifts_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_shifts_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shifts_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shifts_worker_id"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "task_relations_src_task_fkey"
            columns: ["src_task"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          completed_at: string | null
          created_at: string | null
          crew_max: number | null
          crew_min: number | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          is_scheduled: boolean | null
          list_id: string | null
          org_id: string | null
          phase_id: string | null
          position: number | null
          priority: string | null
          project_id: string | null
          required_roles: Json | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string | null
          crew_max?: number | null
          crew_min?: number | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_scheduled?: boolean | null
          list_id?: string | null
          org_id?: string | null
          phase_id?: string | null
          position?: number | null
          priority?: string | null
          project_id?: string | null
          required_roles?: Json | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string | null
          crew_max?: number | null
          crew_min?: number | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_scheduled?: boolean | null
          list_id?: string | null
          org_id?: string | null
          phase_id?: string | null
          position?: number | null
          priority?: string | null
          project_id?: string | null
          required_roles?: Json | null
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
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
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
      time_logs: {
        Row: {
          created_at: string
          description: string | null
          end_at: string | null
          id: string
          org_id: string | null
          project_id: string | null
          shift_id: string | null
          start_at: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          org_id?: string | null
          project_id?: string | null
          shift_id?: string | null
          start_at?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          org_id?: string | null
          project_id?: string | null
          shift_id?: string | null
          start_at?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "active_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_sheets: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          break_duration: number | null
          created_at: string | null
          hours: number | null
          id: string
          location: string | null
          note: string | null
          org_id: string | null
          project_id: string | null
          rejection_reason: string | null
          shift_type: string | null
          sync_error: string | null
          sync_status: string | null
          synced_at: string | null
          updated_at: string | null
          user_id: string | null
          work_date: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          break_duration?: number | null
          created_at?: string | null
          hours?: number | null
          id?: string
          location?: string | null
          note?: string | null
          org_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          shift_type?: string | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_date?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          break_duration?: number | null
          created_at?: string | null
          hours?: number | null
          id?: string
          location?: string | null
          note?: string | null
          org_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          shift_type?: string | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
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
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_role_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "my_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          is_available: boolean
          max_hours: number | null
          start_time: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          is_available?: boolean
          max_hours?: number | null
          start_time?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_available?: boolean
          max_hours?: number | null
          start_time?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_date_availability: {
        Row: {
          created_at: string
          date: string
          id: string
          is_available: boolean
          note: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_available?: boolean
          note?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_available?: boolean
          note?: string | null
          updated_at?: string
          worker_id?: string
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
            referencedRelation: "project_costs_vw"
            referencedColumns: ["project_id"]
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
      my_organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          name: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      project_costs_vw: {
        Row: {
          budget: number | null
          expense_cost: number | null
          forecast: number | null
          labor_cost: number | null
          last_updated: string | null
          material_cost: number | null
          project_created_at: string | null
          project_id: string | null
          project_name: string | null
          project_status: string | null
          total_committed: number | null
          total_hours: number | null
          variance: number | null
        }
        Relationships: []
      }
      security_metrics_summary: {
        Row: {
          metric_name: string | null
          metric_value: number | null
          threat_level: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite: {
        Args: { p_token: string }
        Returns: Json
      }
      accept_quotation_by_token: {
        Args: {
          p_email: string
          p_ip: string
          p_name: string
          p_note: string
          p_token: string
        }
        Returns: Json
      }
      assign_multiple_workers_to_project: {
        Args: { p_project_id: string; p_role?: string; p_user_ids: string[] }
        Returns: Json
      }
      assign_multiple_workers_to_project_simple: {
        Args: { p_project_id: string; p_role?: string; p_user_ids: string[] }
        Returns: Json
      }
      assign_project_workers: {
        Args: { p_project: string; p_user_ids: string[] }
        Returns: undefined
      }
      assign_worker_bypass_rls: {
        Args: { p_project_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      assign_worker_simple: {
        Args: { p_project_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      assign_worker_to_project: {
        Args: { p_project_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      assign_worker_to_project_simple: {
        Args: { p_project_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      audit_guard_blocked: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      audit_guard_off: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      audit_guard_on: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      audit_sensitive_operation: {
        Args: {
          operation_type: string
          record_id: string
          sensitive_data_accessed?: string[]
          table_name: string
        }
        Returns: undefined
      }
      can_access_project: {
        Args: { project_uuid: string; user_uuid: string }
        Returns: boolean
      }
      can_access_project_assignments: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      can_access_project_financial_data: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      can_access_security_monitor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_assign_to_project: {
        Args: { p_assigner_id: string; p_project_id: string }
        Returns: boolean
      }
      check_credential_rotation_required: {
        Args: { p_credential_id: string; p_credential_type: string }
        Returns: Json
      }
      check_customer_data_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_project_worker_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_workers_count: number
          is_consistent: boolean
          project_id: string
          project_name: string
          user_project_role_count: number
        }[]
      }
      check_rate_limit: {
        Args: {
          max_attempts?: number
          operation_name: string
          window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_enhanced: {
        Args: {
          max_attempts?: number
          operation_name: string
          window_minutes?: number
        }
        Returns: boolean
      }
      check_security_configuration: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_value: string
          recommended_value: string
          security_risk: string
          setting_name: string
        }[]
      }
      check_shift_overlap: {
        Args: {
          p_end_time: string
          p_exclude_shift_id?: string
          p_start_time: string
          p_worker_id: string
        }
        Returns: boolean
      }
      check_timer_overlap: {
        Args: {
          p_exclude_id?: string
          p_start_time?: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_worker_compensation_status: {
        Args: { p_worker_id: string }
        Returns: {
          effective_from: string
          has_compensation: boolean
          is_current: boolean
          payment_type: string
        }[]
      }
      check_worker_data_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_workers_count: number
          project_id: string
          project_name: string
          status: string
          user_project_role_count: number
        }[]
      }
      cleanup_old_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_daily_task: {
        Args: { assignment_id: string }
        Returns: Json
      }
      create_user_profile: {
        Args: { user_email: string; user_id: string }
        Returns: undefined
      }
      debug_auth_state: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      delete_apple_credentials_secure: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      ensure_default_membership: {
        Args: { p_user?: string }
        Returns: undefined
      }
      expire_old_daily_tasks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      financial_data_security_notice: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fn_is_member: {
        Args: { p_org: string }
        Returns: boolean
      }
      fn_role_in_org: {
        Args: { p_org: string }
        Returns: string
      }
      get_apple_credentials_secure: {
        Args: { p_user_id?: string }
        Returns: {
          access_count: number
          app_password: string
          caldav_url: string
          created_at: string
          id: string
          last_accessed: string
          username: string
        }[]
      }
      get_audit_trail_secure: {
        Args:
          | {
              p_action?: string
              p_end_date?: string
              p_limit?: number
              p_start_date?: string
              p_user_id?: string
            }
          | {
              p_action_filter?: string
              p_hours_back?: number
              p_user_id?: string
            }
        Returns: {
          audit_id: string
          event_action: string
          event_details: Json
          event_ip_address: string
          event_severity: string
          event_table_name: string
          event_timestamp: string
          event_user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role_enhanced: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_data_secure: {
        Args: {
          p_document_type?: string
          p_include_payment_data?: boolean
          p_project_id?: string
        }
        Returns: {
          amount_paid: number
          client_address: string
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          document_number: string
          document_type: string
          id: string
          payment_status: string
          project_id: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }[]
      }
      get_document_public: {
        Args: { p_token: string }
        Returns: {
          client_name: string
          document_number: string
          document_type: string
          notes: string
          status: string
          total_amount: number
          valid_until: string
        }[]
      }
      get_document_secure: {
        Args: { p_document_id: string; p_include_payment_data?: boolean }
        Returns: {
          acceptance_token: string
          accepted_by_email: string
          accepted_by_name: string
          amount_paid: number
          client_address: string
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          document_number: string
          document_type: string
          id: string
          payment_status: string
          payment_url: string
          project_id: string
          status: string
          stripe_payment_intent_id: string
          stripe_session_id: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }[]
      }
      get_employee_profile_hr_secure: {
        Args: {
          p_business_purpose?: string
          p_employee_id: string
          p_justification: string
        }
        Returns: {
          avatar_url: string
          bio: string
          company_id: string
          created_at: string
          default_org_id: string
          full_name: string
          id: string
          work_role: Json
        }[]
      }
      get_financial_summary_secure: {
        Args: { p_project_id?: string }
        Returns: {
          access_level: string
          budget_variance: number
          completion_percentage: number
          project_id: string
          project_name: string
          total_budget: number
          total_spent: number
        }[]
      }
      get_financial_summary_secure_enhanced: {
        Args: { p_project_id?: string; p_summary_level?: string }
        Returns: {
          budget_utilization_percent: number
          last_updated: string
          phases_count: number
          project_id: string
          project_name: string
          total_budget: number
          total_committed: number
          total_spent: number
          total_variance: number
        }[]
      }
      get_my_current_rate_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          effective_date: string
          hourly_rate: number
          monthly_salary: number
          payment_type: string
        }[]
      }
      get_my_tasks: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_worker_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_my_tasks_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_worker_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_org_scoped_data: {
        Args: {
          additional_filters?: Json
          org_id_param: string
          table_name: string
        }
        Returns: Json
      }
      get_payroll_data_secure: {
        Args: { p_date_from?: string; p_date_to?: string; p_worker_id?: string }
        Returns: {
          amount: number
          hourly_rate: number
          hours_worked: number
          masked_worker_name: string
          payment_date: string
          payment_type: string
          project_name: string
          worker_id: string
        }[]
      }
      get_phase_costs_secure: {
        Args: { p_project_id?: string }
        Returns: {
          budget: number
          expense_cost: number
          forecast: number
          labor_cost_actual: number
          labor_cost_planned: number
          last_updated: string
          material_cost: number
          phase_id: string
          phase_name: string
          project_id: string
          total_committed: number
          variance: number
        }[]
      }
      get_phase_costs_secure_enhanced: {
        Args: {
          p_include_detailed_breakdown?: boolean
          p_phase_id?: string
          p_project_id?: string
        }
        Returns: {
          budget: number
          expense_cost: number
          forecast: number
          labor_cost_actual: number
          labor_cost_planned: number
          last_updated: string
          material_cost: number
          phase_id: string
          phase_name: string
          project_id: string
          total_committed: number
          variance: number
        }[]
      }
      get_phase_costs_summary: {
        Args: { p_project_id?: string }
        Returns: {
          budget: number
          expense_cost: number
          forecast: number
          labor_cost_actual: number
          labor_cost_planned: number
          last_updated: string
          material_cost: number
          phase_id: string
          phase_name: string
          project_id: string
          total_committed: number
          variance: number
        }[]
      }
      get_profile_secure: {
        Args: { p_user_id?: string }
        Returns: {
          avatar_url: string
          bio: string
          company_id: string
          created_at: string
          default_org_id: string
          full_name: string
          id: string
          work_role: Json
        }[]
      }
      get_project_costs_secure: {
        Args: { p_project_id?: string }
        Returns: {
          budget: number
          budget_variance: number
          project_id: string
          project_name: string
          total_cost: number
          total_expense_cost: number
          total_labor_cost: number
          total_material_cost: number
        }[]
      }
      get_project_worker_basic_info: {
        Args: { p_worker_id: string }
        Returns: {
          full_name: string
          id: string
          work_role: Json
        }[]
      }
      get_public_profile_info: {
        Args: { p_user_id: string }
        Returns: {
          display_name: string
          id: string
          work_role: Json
        }[]
      }
      get_quotation_public_secure: {
        Args: { p_token: string }
        Returns: {
          client_email: string
          client_name: string
          client_phone: string
          document_number: string
          document_type: string
          notes: string
          status: string
          total_amount: number
          valid_until: string
        }[]
      }
      get_secure_customer_data: {
        Args: { p_document_type?: string; p_project_id?: string }
        Returns: {
          amount_paid: number
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          document_number: string
          document_type: string
          id: string
          project_id: string
          status: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_security_alerts: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_id: string
          details: Json
          event_timestamp: string
          event_type: string
          ip_address: string
          severity: string
          user_id: string
        }[]
      }
      get_security_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_description: string
          metric_name: string
          metric_value: number
          threat_level: string
        }[]
      }
      get_security_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_violations: number
          critical_alerts: number
          failed_attempts: number
          rate_violations: number
          recent_logins: number
          total_events: number
        }[]
      }
      get_security_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_description: string
          metric_name: string
          metric_value: number
          threat_level: string
        }[]
      }
      get_security_monitor_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          event_category: string
          event_timestamp: string
          id: string
          ip_address: string
          severity_level: string
          table_name: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_org_role: {
        Args: { p_org_id: string }
        Returns: string
      }
      get_user_role_secure: {
        Args: { p_user_id?: string }
        Returns: string
      }
      get_worker_rate_metadata: {
        Args: { p_worker_id?: string }
        Returns: {
          effective_date: string
          end_date: string
          has_active_rate: boolean
          id: string
          is_current: boolean
          payment_type: string
        }[]
      }
      get_worker_rates_masked: {
        Args: { p_worker_id?: string }
        Returns: {
          effective_date: string
          end_date: string
          hourly_rate: number
          id: string
          monthly_salary: number
          payment_type: string
          worker_id: string
          worker_name: string
        }[]
      }
      get_worker_rates_secure: {
        Args:
          | { p_effective_date?: string; p_worker_id?: string }
          | { p_include_salary_details?: boolean; p_worker_id?: string }
        Returns: {
          created_at: string
          effective_date: string
          end_date: string
          hourly_rate: number
          id: string
          monthly_salary: number
          payment_type: string
          updated_at: string
          worker_id: string
        }[]
      }
      get_worker_salary_hr_secure: {
        Args: { p_justification?: string; p_worker_id: string }
        Returns: {
          created_at: string
          created_by: string
          effective_date: string
          end_date: string
          hourly_rate: number
          id: string
          monthly_salary: number
          payment_type: string
          worker_id: string
        }[]
      }
      invite_user: {
        Args: {
          p_email: string
          p_expires_at?: string
          p_org_id: string
          p_role: string
        }
        Returns: Json
      }
      is_authorized_for_personal_data: {
        Args: { access_reason?: string }
        Returns: boolean
      }
      is_hr_administrator: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_org_member: {
        Args: { org_uuid: string }
        Returns: boolean
      }
      log_credential_access: {
        Args: {
          p_access_reason?: string
          p_access_type: string
          p_additional_context?: Json
          p_credential_id: string
          p_credential_type: string
        }
        Returns: string
      }
      log_critical_security_event: {
        Args:
          | {
              auto_response?: string
              details?: Json
              event_type: string
              threat_level?: string
            }
          | { details?: Json; event_type: string; severity?: string }
        Returns: undefined
      }
      log_high_risk_activity: {
        Args: { details?: Json; event_type: string; risk_level?: string }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; severity?: string }
        Returns: undefined
      }
      log_sensitive_operation: {
        Args: {
          p_operation_data?: Json
          p_operation_type: string
          p_record_id?: string
          p_risk_score?: number
          p_table_name: string
        }
        Returns: undefined
      }
      manage_worker_rates_secure: {
        Args: {
          p_effective_date?: string
          p_end_date?: string
          p_hourly_rate?: number
          p_monthly_salary?: number
          p_operation: string
          p_payment_type?: string
          p_rate_id?: string
          p_worker_id?: string
        }
        Returns: Json
      }
      missing_project_access: {
        Args: { p_project: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      next_document_number: {
        Args: { doc_type: string }
        Returns: string
      }
      notify_shift_proposals: {
        Args: { proposal_count: number; target_date: string }
        Returns: undefined
      }
      refresh_document_payment_status: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      repair_assigned_workers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      repair_project_worker_assignments: {
        Args: Record<PropertyKey, never>
        Returns: {
          repaired_projects: number
          total_projects: number
        }[]
      }
      rotate_security_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      safe_log_security_event: {
        Args: { details?: Json; event_type: string; severity?: string }
        Returns: boolean
      }
      secure_credential_operation: {
        Args: {
          credential_data?: Json
          credential_type: string
          operation_type: string
        }
        Returns: Json
      }
      secure_customer_data_with_audit: {
        Args: {
          p_access_reason?: string
          p_document_type?: string
          p_project_id?: string
        }
        Returns: {
          amount_paid: number
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          document_number: string
          document_type: string
          id: string
          project_id: string
          status: string
          total_amount: number
          updated_at: string
        }[]
      }
      secure_refresh_phase_costs_view: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_demo_data: {
        Args: { manager_id: string; worker_id: string }
        Returns: Json
      }
      store_apple_credentials_secure: {
        Args: {
          p_app_password: string
          p_caldav_url?: string
          p_username: string
        }
        Returns: Json
      }
      update_apple_credentials_secure: {
        Args: {
          p_app_password: string
          p_caldav_url?: string
          p_username: string
        }
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
      user_can_manage_project_assignments: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_has_project_role: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_is_global_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_apple_credential_security: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_user_profile_exists: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      verify_data_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          details: Json
          issue_count: number
          status: string
        }[]
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
