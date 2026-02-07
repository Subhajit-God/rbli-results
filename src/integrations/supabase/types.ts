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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      deployment_status: {
        Row: {
          all_marks_entered: boolean
          all_marks_locked: boolean
          all_ranks_finalized: boolean
          can_deploy: boolean
          exam_id: string
          full_marks_configured: boolean
          id: string
          no_conflicts: boolean
          updated_at: string
        }
        Insert: {
          all_marks_entered?: boolean
          all_marks_locked?: boolean
          all_ranks_finalized?: boolean
          can_deploy?: boolean
          exam_id: string
          full_marks_configured?: boolean
          id?: string
          no_conflicts?: boolean
          updated_at?: string
        }
        Update: {
          all_marks_entered?: boolean
          all_marks_locked?: boolean
          all_ranks_finalized?: boolean
          can_deploy?: boolean
          exam_id?: string
          full_marks_configured?: boolean
          id?: string
          no_conflicts?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_status_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string
          created_at: string
          deployed_at: string | null
          id: string
          is_deployed: boolean
          name: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          deployed_at?: string | null
          id?: string
          is_deployed?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          deployed_at?: string | null
          id?: string
          is_deployed?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      marks: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          is_locked: boolean
          marks_1: string | null
          marks_2: string | null
          marks_3: string | null
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          is_locked?: boolean
          marks_1?: string | null
          marks_2?: string | null
          marks_3?: string | null
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          is_locked?: boolean
          marks_1?: string | null
          marks_2?: string | null
          marks_3?: string | null
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_assets: {
        Row: {
          asset_type: string
          file_name: string
          file_url: string
          id: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          asset_type: string
          file_name: string
          file_url: string
          id?: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          asset_type?: string
          file_name?: string
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      ranks: {
        Row: {
          created_at: string
          exam_id: string
          grade: string
          has_conflict: boolean
          id: string
          is_passed: boolean
          percentage: number
          rank: number | null
          student_id: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          grade?: string
          has_conflict?: boolean
          id?: string
          is_passed?: boolean
          percentage?: number
          rank?: number | null
          student_id: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          grade?: string
          has_conflict?: boolean
          id?: string
          is_passed?: boolean
          percentage?: number
          rank?: number | null
          student_id?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year_id: string | null
          class_number: number
          created_at: string
          date_of_birth: string
          father_name: string
          id: string
          mother_name: string
          name: string
          roll_number: number
          section: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          class_number: number
          created_at?: string
          date_of_birth: string
          father_name: string
          id?: string
          mother_name: string
          name: string
          roll_number: number
          section: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          class_number?: number
          created_at?: string
          date_of_birth?: string
          father_name?: string
          id?: string
          mother_name?: string
          name?: string
          roll_number?: number
          section?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_number: number
          created_at: string
          display_order: number | null
          full_marks_1: number
          full_marks_2: number
          full_marks_3: number
          id: string
          name: string
        }
        Insert: {
          class_number: number
          created_at?: string
          display_order?: number | null
          full_marks_1?: number
          full_marks_2?: number
          full_marks_3?: number
          id?: string
          name: string
        }
        Update: {
          class_number?: number
          created_at?: string
          display_order?: number | null
          full_marks_1?: number
          full_marks_2?: number
          full_marks_3?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_role: "admin"
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
      admin_role: ["admin"],
    },
  },
} as const
