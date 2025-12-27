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
          image_url: string | null
          image_prompt: string | null
          content_category: string | null
          moderation_status: string | null
          flagged_at: string | null
          flagged_by: string | null
          moderation_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          flag_reason: string | null
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
          image_url?: string | null
          image_prompt?: string | null
          content_category?: string | null
          moderation_status?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          moderation_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          flag_reason?: string | null
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
          image_url?: string | null
          image_prompt?: string | null
          content_category?: string | null
          moderation_status?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          moderation_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          flag_reason?: string | null
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
      blog_content: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          search_query: string | null
          category: string | null
          author: string | null
          image_url: string | null
          image_prompt: string | null
          tags: string[] | null
          read_time: string | null
          view_count: number | null
          is_published: boolean | null
          ai_provider: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          search_query?: string | null
          category?: string | null
          author?: string | null
          image_url?: string | null
          image_prompt?: string | null
          tags?: string[] | null
          read_time?: string | null
          view_count?: number | null
          is_published?: boolean | null
          ai_provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          search_query?: string | null
          category?: string | null
          author?: string | null
          image_url?: string | null
          image_prompt?: string | null
          tags?: string[] | null
          read_time?: string | null
          view_count?: number | null
          is_published?: boolean | null
          ai_provider?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          is_admin: boolean
          bio: string | null
          avatar_url: string | null
          twitter_url: string | null
          linkedin_url: string | null
          github_url: string | null
          website_url: string | null
          location: string | null
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          is_admin?: boolean
          bio?: string | null
          avatar_url?: string | null
          twitter_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          website_url?: string | null
          location?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_admin?: boolean
          bio?: string | null
          avatar_url?: string | null
          twitter_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          website_url?: string | null
          location?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          position_applied: string
          cover_letter: string | null
          resume_url: string | null
          phone_number: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          years_experience: string | null
          status: string
          submitted_at: string
          ai_analysis: Json | null
          analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          position_applied: string
          cover_letter?: string | null
          resume_url?: string | null
          phone_number?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          years_experience?: string | null
          status?: string
          submitted_at?: string
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          position_applied?: string
          cover_letter?: string | null
          resume_url?: string | null
          phone_number?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          years_experience?: string | null
          status?: string
          submitted_at?: string
          ai_analysis?: Json | null
          analyzed_at?: string | null
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
