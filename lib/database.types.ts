export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      content: {
        Row: {
          id: string
          title: string
          content_type: string
          content: string
          keywords: string[] | null
          sentiment: string | null
          project_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content_type: string
          content: string
          keywords?: string[] | null
          sentiment?: string | null
          project_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content_type?: string
          content?: string
          keywords?: string[] | null
          sentiment?: string | null
          project_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_type: string
          status: string
          started_at: string
          expires_at: string | null
          payment_id: string | null
          created_at: string
          updated_at: string
          paypal_subscription_id: string | null
          paypal_plan_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: string
          status: string
          started_at?: string
          expires_at?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string
          paypal_subscription_id?: string | null
          paypal_plan_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: string
          status?: string
          started_at?: string
          expires_at?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string
          paypal_subscription_id?: string | null
          paypal_plan_id?: string | null
        }
      }
      usage_limits: {
        Row: {
          id: string
          plan_type: string
          monthly_content_limit: number
          max_content_length: number
          sentiment_analysis_enabled: boolean
          keyword_extraction_enabled: boolean
          text_summarization_enabled: boolean
          api_access_enabled: boolean
        }
        Insert: {
          id?: string
          plan_type: string
          monthly_content_limit: number
          max_content_length: number
          sentiment_analysis_enabled?: boolean
          keyword_extraction_enabled?: boolean
          text_summarization_enabled?: boolean
          api_access_enabled?: boolean
        }
        Update: {
          id?: string
          plan_type?: string
          monthly_content_limit?: number
          max_content_length?: number
          sentiment_analysis_enabled?: boolean
          keyword_extraction_enabled?: boolean
          text_summarization_enabled?: boolean
          api_access_enabled?: boolean
        }
      }
      usage_stats: {
        Row: {
          id: string
          user_id: string
          content_generated: number
          sentiment_analysis_used: number
          keyword_extraction_used: number
          text_summarization_used: number
          api_calls: number
          month: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_generated?: number
          sentiment_analysis_used?: number
          keyword_extraction_used?: number
          text_summarization_used?: number
          api_calls?: number
          month: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_generated?: number
          sentiment_analysis_used?: number
          keyword_extraction_used?: number
          text_summarization_used?: number
          api_calls?: number
          month?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
  auth: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
        }
      }
    }
  }
}
