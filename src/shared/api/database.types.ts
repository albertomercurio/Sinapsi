export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_run_events: {
        Row: {
          created_at: string
          encoding: string
          expires_at: string | null
          org_id: string
          payload: string
          pinned: boolean
          run_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          encoding?: string
          expires_at?: string | null
          org_id: string
          payload: string
          pinned?: boolean
          run_id: string
        }
        Update: {
          created_at?: string
          encoding?: string
          expires_at?: string | null
          org_id?: string
          payload?: string
          pinned?: boolean
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_run_events_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_run_events_run_id_fkey'
            columns: ['run_id']
            isOneToOne: true
            referencedRelation: 'activity_runs'
            referencedColumns: ['id']
          },
        ]
      }
      activity_runs: {
        Row: {
          activity_id: string
          activity_version: number
          config: NonNullable<Json>
          created_at: string
          created_by: string | null
          device: NonNullable<Json>
          difficulty: number
          duration_ms: number
          id: string
          metrics: NonNullable<Json>
          mode: Database['public']['Enums']['session_mode']
          org_id: string
          patient_id: string
          performance: number | null
          quality_flags: string[]
          rating_after: number | null
          rating_before: number | null
          rd_after: number | null
          score: number | null
          scoring_version: number
          seed: number
          session_id: string | null
          session_item_id: string | null
          started_at: string
        }
        ComputedFields: never
        Insert: {
          activity_id: string
          activity_version: number
          config?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          device?: NonNullable<Json>
          difficulty: number
          duration_ms: number
          id?: string
          metrics?: NonNullable<Json>
          mode?: Database['public']['Enums']['session_mode']
          org_id: string
          patient_id: string
          performance?: number | null
          quality_flags?: string[]
          rating_after?: number | null
          rating_before?: number | null
          rd_after?: number | null
          score?: number | null
          scoring_version: number
          seed: number
          session_id?: string | null
          session_item_id?: string | null
          started_at: string
        }
        Update: {
          activity_id?: string
          activity_version?: number
          config?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          device?: NonNullable<Json>
          difficulty?: number
          duration_ms?: number
          id?: string
          metrics?: NonNullable<Json>
          mode?: Database['public']['Enums']['session_mode']
          org_id?: string
          patient_id?: string
          performance?: number | null
          quality_flags?: string[]
          rating_after?: number | null
          rating_before?: number | null
          rd_after?: number | null
          score?: number | null
          scoring_version?: number
          seed?: number
          session_id?: string | null
          session_item_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_runs_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_runs_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_runs_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_runs_session_item_id_fkey'
            columns: ['session_item_id']
            isOneToOne: false
            referencedRelation: 'session_items'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          details: NonNullable<Json>
          entity: string
          entity_id: string | null
          id: number
          org_id: string | null
        }
        ComputedFields: never
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          details?: NonNullable<Json>
          entity: string
          entity_id?: string | null
          id?: never
          org_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          details?: NonNullable<Json>
          entity?: string
          entity_id?: string | null
          id?: never
          org_id?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          org_id: string
          role: Database['public']['Enums']['org_role']
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          org_id: string
          role?: Database['public']['Enums']['org_role']
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database['public']['Enums']['org_role']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          idle_timeout_min: number
          name: string
          name_key: Json | null
          patient_code_prefix: string
          raw_retention_months: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          idle_timeout_min?: number
          name: string
          name_key?: Json | null
          patient_code_prefix?: string
          raw_retention_months?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          idle_timeout_min?: number
          name?: string
          name_key?: Json | null
          patient_code_prefix?: string
          raw_retention_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      patient_ability: {
        Row: {
          activity_id: string
          last_run_at: string | null
          locked: boolean
          locked_difficulty: number | null
          n_runs: number
          org_id: string
          patient_id: string
          rating: number
          rd: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          activity_id: string
          last_run_at?: string | null
          locked?: boolean
          locked_difficulty?: number | null
          n_runs?: number
          org_id: string
          patient_id: string
          rating: number
          rd: number
          updated_at?: string
        }
        Update: {
          activity_id?: string
          last_run_at?: string | null
          locked?: boolean
          locked_difficulty?: number | null
          n_runs?: number
          org_id?: string
          patient_id?: string
          rating?: number
          rd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_ability_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_ability_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patient_conditions: {
        Row: {
          category: string
          created_at: string
          icd11_code: string | null
          id: string
          notes: string | null
          onset_year: number | null
          org_id: string
          patient_id: string
        }
        ComputedFields: never
        Insert: {
          category: string
          created_at?: string
          icd11_code?: string | null
          id?: string
          notes?: string | null
          onset_year?: number | null
          org_id: string
          patient_id: string
        }
        Update: {
          category?: string
          created_at?: string
          icd11_code?: string | null
          id?: string
          notes?: string | null
          onset_year?: number | null
          org_id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_conditions_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_conditions_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patients: {
        Row: {
          archived_at: string | null
          birth_year: number | null
          code: string
          content_locale: string
          created_at: string
          created_by: string | null
          education_years: number | null
          handedness: string | null
          id: string
          name_enc: string | null
          notes: string | null
          org_id: string
          sex: string | null
          target_success: number
          ui_prefs: NonNullable<Json>
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          birth_year?: number | null
          code: string
          content_locale?: string
          created_at?: string
          created_by?: string | null
          education_years?: number | null
          handedness?: string | null
          id?: string
          name_enc?: string | null
          notes?: string | null
          org_id: string
          sex?: string | null
          target_success?: number
          ui_prefs?: NonNullable<Json>
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          birth_year?: number | null
          code?: string
          content_locale?: string
          created_at?: string
          created_by?: string | null
          education_years?: number | null
          handedness?: string | null
          id?: string
          name_enc?: string | null
          notes?: string | null
          org_id?: string
          sex?: string | null
          target_success?: number
          ui_prefs?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patients_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          ui_locale: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          display_name?: string | null
          ui_locale?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          ui_locale?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_items: {
        Row: {
          activity_id: string
          config: NonNullable<Json>
          created_at: string
          difficulty: number | null
          id: string
          locked: boolean
          org_id: string
          position: number
          session_id: string
        }
        ComputedFields: never
        Insert: {
          activity_id: string
          config?: NonNullable<Json>
          created_at?: string
          difficulty?: number | null
          id?: string
          locked?: boolean
          org_id: string
          position: number
          session_id: string
        }
        Update: {
          activity_id?: string
          config?: NonNullable<Json>
          created_at?: string
          difficulty?: number | null
          id?: string
          locked?: boolean
          org_id?: string
          position?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_items_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_items_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
      session_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          items: NonNullable<Json>
          org_id: string
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: NonNullable<Json>
          org_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: NonNullable<Json>
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_templates_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          mode: Database['public']['Enums']['session_mode']
          notes: string | null
          org_id: string
          patient_id: string
          scheduled_for: string
          started_at: string | null
          status: Database['public']['Enums']['session_status']
          template_id: string | null
          title: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: Database['public']['Enums']['session_mode']
          notes?: string | null
          org_id: string
          patient_id: string
          scheduled_for?: string
          started_at?: string | null
          status?: Database['public']['Enums']['session_status']
          template_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: Database['public']['Enums']['session_mode']
          notes?: string | null
          org_id?: string
          patient_id?: string
          scheduled_for?: string
          started_at?: string | null
          status?: Database['public']['Enums']['session_status']
          template_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'session_templates'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          last_run_at: string
          members: number
          name: string
          org_id: string
          patients: number
          raw_event_bytes: number
          runs: number
        }[]
      }
      admin_storage: {
        Args: Record<PropertyKey, never>
        Returns: {
          database_bytes: number
          raw_event_bytes: number
          runs: number
        }[]
      }
      admin_user_id_by_email: { Args: { p_email: string }; Returns: string }
      create_session: {
        Args: {
          p_date?: string
          p_items: Json
          p_mode?: Database['public']['Enums']['session_mode']
          p_patient: string
          p_template?: string
          p_title?: string
        }
        Returns: string
      }
      delete_patient: { Args: { p_confirm_code: string; p_patient: string }; Returns: undefined }
      log_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity: string
          p_entity_id?: string
          p_org: string
        }
        Returns: undefined
      }
      my_context: { Args: Record<PropertyKey, never>; Returns: Json }
      org_members: {
        Args: { p_org: string }
        Returns: {
          display_name: string
          email: string
          joined_at: string
          last_sign_in_at: string
          mfa_enrolled: boolean
          role: Database['public']['Enums']['org_role']
          user_id: string
        }[]
      }
      ping: { Args: Record<PropertyKey, never>; Returns: string }
      record_activity_run: {
        Args: { p_ability?: Json; p_events?: string; p_run: Json }
        Returns: string
      }
      rekey_patient_names: {
        Args: { p_name_key: Json; p_names: Json; p_org: string }
        Returns: number
      }
      replace_session_items: { Args: { p_items: Json; p_session: string }; Returns: undefined }
      reset_patient_names: { Args: { p_org: string }; Returns: number }
      restore_rows: { Args: { p_org: string; p_rows: Json; p_table: string }; Returns: number }
    }
    Enums: {
      org_role: 'owner' | 'therapist'
      session_mode: 'clinic' | 'home'
      session_status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      org_role: ['owner', 'therapist'],
      session_mode: ['clinic', 'home'],
      session_status: ['planned', 'in_progress', 'completed', 'cancelled'],
    },
  },
} as const
