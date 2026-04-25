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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analysis_embeddings: {
        Row: {
          analysis_id: string
          content: string
          content_type: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          analysis_id: string
          content: string
          content_type: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          analysis_id?: string
          content?: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_embeddings_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "job_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          analysis_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          analysis_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          analysis_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "job_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_flows: {
        Row: {
          analysis_id: string
          answer_1: string | null
          answer_2: string | null
          answer_3: string | null
          created_at: string
          id: string
          question_1: string | null
          question_2: string | null
          question_3: string | null
        }
        Insert: {
          analysis_id: string
          answer_1?: string | null
          answer_2?: string | null
          answer_3?: string | null
          created_at?: string
          id?: string
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
        }
        Update: {
          analysis_id?: string
          answer_1?: string | null
          answer_2?: string | null
          answer_3?: string | null
          created_at?: string
          id?: string
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_flows_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "job_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_analyses: {
        Row: {
          analysis_json: Json
          career_asset_score: number | null
          company: string
          confidence: number | null
          created_at: string
          id: string
          normalized_company: string
          normalized_role: string
          one_line_verdict: string | null
          rating: string | null
          role: string
          ticker: string | null
          updated_at: string
          would_buy: string | null
        }
        Insert: {
          analysis_json: Json
          career_asset_score?: number | null
          company: string
          confidence?: number | null
          created_at?: string
          id?: string
          normalized_company: string
          normalized_role: string
          one_line_verdict?: string | null
          rating?: string | null
          role: string
          ticker?: string | null
          updated_at?: string
          would_buy?: string | null
        }
        Update: {
          analysis_json?: Json
          career_asset_score?: number | null
          company?: string
          confidence?: number | null
          created_at?: string
          id?: string
          normalized_company?: string
          normalized_role?: string
          one_line_verdict?: string | null
          rating?: string | null
          role?: string
          ticker?: string | null
          updated_at?: string
          would_buy?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          analysis_id: string
          created_at: string
          decision_flow_id: string | null
          id: string
          recommendation_json: Json
        }
        Insert: {
          analysis_id: string
          created_at?: string
          decision_flow_id?: string | null
          id?: string
          recommendation_json: Json
        }
        Update: {
          analysis_id?: string
          created_at?: string
          decision_flow_id?: string | null
          id?: string
          recommendation_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "job_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_decision_flow_id_fkey"
            columns: ["decision_flow_id"]
            isOneToOne: false
            referencedRelation: "decision_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          analysis_id: string
          content_summary: string | null
          created_at: string
          id: string
          raw_content: string | null
          snippet: string | null
          source_type: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          analysis_id: string
          content_summary?: string | null
          created_at?: string
          id?: string
          raw_content?: string | null
          snippet?: string | null
          source_type?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          analysis_id?: string
          content_summary?: string | null
          created_at?: string
          id?: string
          raw_content?: string | null
          snippet?: string | null
          source_type?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "job_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_analysis_embeddings: {
        Args: {
          match_analysis_id: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          analysis_id: string
          content: string
          content_type: string
          id: string
          metadata: Json
          similarity: number
        }[]
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
