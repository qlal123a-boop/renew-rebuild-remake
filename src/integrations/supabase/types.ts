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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string
          id: string
          name: string
          provider: string
          subject: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          provider?: string
          subject: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          provider?: string
          subject?: string
          url?: string
        }
        Relationships: []
      }
      course_completions: {
        Row: {
          certificate_theme: string | null
          completed_at: string
          course_id: string
          user_id: string
        }
        Insert: {
          certificate_theme?: string | null
          completed_at?: string
          course_id: string
          user_id: string
        }
        Update: {
          certificate_theme?: string | null
          completed_at?: string
          course_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          lesson_id: string
          position: number
        }
        Insert: {
          course_id: string
          created_at?: string
          lesson_id: string
          position?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          lesson_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string
          course_id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          auto_certificate_theme: boolean
          certificate_theme: string | null
          created_at: string
          description: string
          grade_id: number | null
          id: string
          subject: string
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          auto_certificate_theme?: boolean
          certificate_theme?: string | null
          created_at?: string
          description?: string
          grade_id?: number | null
          id?: string
          subject: string
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          auto_certificate_theme?: boolean
          certificate_theme?: string | null
          created_at?: string
          description?: string
          grade_id?: number | null
          id?: string
          subject?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      custom_subjects: {
        Row: {
          created_at: string
          grade_id: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          grade_id: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          grade_id?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          game: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          description: string
          grade_id: number
          id: string
          semester: number
          subject: string
          title: string
          video_url: string
          worksheet_name: string | null
          worksheet_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          grade_id: number
          id?: string
          semester: number
          subject: string
          title: string
          video_url?: string
          worksheet_name?: string | null
          worksheet_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          grade_id?: number
          id?: string
          semester?: number
          subject?: string
          title?: string
          video_url?: string
          worksheet_name?: string | null
          worksheet_url?: string | null
        }
        Relationships: []
      }
      library_books: {
        Row: {
          author: string | null
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          grade_id: number | null
          id: string
          pdf_url: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          grade_id?: number | null
          id?: string
          pdf_url: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          grade_id?: number | null
          id?: string
          pdf_url?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      moderator_requests: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          goal: string | null
          id: number
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          goal?: string | null
          id?: number
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          goal?: string | null
          id?: number
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          item_id: string
          price_paid: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          price_paid: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          price_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          lesson_topic: string
          questions: Json
          score: number
          total: number
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_topic: string
          questions?: Json
          score?: number
          total?: number
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_topic?: string
          questions?: Json
          score?: number
          total?: number
          user_id?: string | null
        }
        Relationships: []
      }
      site_admins: {
        Row: {
          created_at: string | null
          email: string
          id: number
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          role?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      store_items: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          kind: string
          payload_url: string | null
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind: string
          payload_url?: string | null
          price: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          payload_url?: string | null
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          content: string
          created_at: string
          file_url: string | null
          grade_id: number
          id: string
          subject: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_url?: string | null
          grade_id: number
          id?: string
          subject: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          file_url?: string | null
          grade_id?: number
          id?: string
          subject?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worksheets: {
        Row: {
          created_at: string
          grade_id: number
          id: string
          source: string | null
          subject: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          grade_id: number
          id?: string
          source?: string | null
          subject: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          grade_id?: number
          id?: string
          source?: string | null
          subject?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_registered_user_count: { Args: never; Returns: number }
      get_user_points: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_visitor_count: { Args: never; Returns: number }
      is_super_admin: { Args: never; Returns: boolean }
      list_registered_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      redeem_store_item: { Args: { _item_id: string }; Returns: Json }
      remove_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target: string
        }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
