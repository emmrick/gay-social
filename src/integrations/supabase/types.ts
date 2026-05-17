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
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          reason: string | null
          requested_at: string
          scheduled_deletion_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_clicks: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_free_plans: {
        Row: {
          created_at: string
          credits_cost: number
          display_order: number | null
          duration_days: number
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          label: string
          tag: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_cost: number
          display_order?: number | null
          duration_days: number
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          label: string
          tag?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_cost?: number
          display_order?: number | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          label?: string
          tag?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_free_subscriptions: {
        Row: {
          created_at: string
          credits_paid: number
          expires_at: string
          id: string
          is_active: boolean | null
          payment_plan: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_paid?: number
          expires_at: string
          id?: string
          is_active?: boolean | null
          payment_plan?: string | null
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_paid?: number
          expires_at?: string
          id?: string
          is_active?: boolean | null
          payment_plan?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_impressions: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_popups: {
        Row: {
          button_action: string | null
          button_text: string | null
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_active: boolean
          message: string
          popup_type: string
          title: string
          updated_at: string
        }
        Insert: {
          button_action?: string | null
          button_text?: string | null
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_active?: boolean
          message: string
          popup_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          button_action?: string | null
          button_text?: string | null
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          message?: string
          popup_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          advertiser_email: string | null
          advertiser_name: string
          always_active: boolean
          budget_cents: number | null
          clicks_count: number | null
          cost_per_click_cents: number | null
          cost_per_mille_cents: number | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          geo_postal_codes: string[] | null
          geo_targeting: string
          id: string
          image_url: string | null
          impressions_count: number | null
          is_active: boolean | null
          link_url: string | null
          max_clicks: number | null
          max_impressions: number | null
          placement: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spent_cents: number | null
          starts_at: string | null
          status: string
          target_pages: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_email?: string | null
          advertiser_name: string
          always_active?: boolean
          budget_cents?: number | null
          clicks_count?: number | null
          cost_per_click_cents?: number | null
          cost_per_mille_cents?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          geo_postal_codes?: string[] | null
          geo_targeting?: string
          id?: string
          image_url?: string | null
          impressions_count?: number | null
          is_active?: boolean | null
          link_url?: string | null
          max_clicks?: number | null
          max_impressions?: number | null
          placement?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spent_cents?: number | null
          starts_at?: string | null
          status?: string
          target_pages?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_email?: string | null
          advertiser_name?: string
          always_active?: boolean
          budget_cents?: number | null
          clicks_count?: number | null
          cost_per_click_cents?: number | null
          cost_per_mille_cents?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          geo_postal_codes?: string[] | null
          geo_targeting?: string
          id?: string
          image_url?: string | null
          impressions_count?: number | null
          is_active?: boolean | null
          link_url?: string | null
          max_clicks?: number | null
          max_impressions?: number | null
          placement?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spent_cents?: number | null
          starts_at?: string | null
          status?: string
          target_pages?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      advertiser_deposits: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string | null
          processed_at: string | null
          status: string
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          processed_at?: string | null
          status?: string
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          processed_at?: string | null
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_deposits_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "advertiser_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_magic_links: {
        Row: {
          advertiser_email: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          advertiser_email: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          advertiser_email?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      advertiser_promo_codes: {
        Row: {
          bonus_cents: number
          bonus_percent: number
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          times_used: number
        }
        Insert: {
          bonus_cents?: number
          bonus_percent?: number
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Update: {
          bonus_cents?: number
          bonus_percent?: number
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Relationships: []
      }
      advertiser_promo_redemptions: {
        Row: {
          advertiser_email: string
          bonus_cents_applied: number
          code_id: string
          id: string
          redeemed_at: string
        }
        Insert: {
          advertiser_email: string
          bonus_cents_applied?: number
          code_id: string
          id?: string
          redeemed_at?: string
        }
        Update: {
          advertiser_email?: string
          bonus_cents_applied?: number
          code_id?: string
          id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_promo_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "advertiser_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_wallets: {
        Row: {
          advertiser_email: string
          advertiser_name: string
          balance_cents: number
          created_at: string
          id: string
          total_deposited_cents: number
          total_spent_cents: number
          updated_at: string
        }
        Insert: {
          advertiser_email: string
          advertiser_name?: string
          balance_cents?: number
          created_at?: string
          id?: string
          total_deposited_cents?: number
          total_spent_cents?: number
          updated_at?: string
        }
        Update: {
          advertiser_email?: string
          advertiser_name?: string
          balance_cents?: number
          created_at?: string
          id?: string
          total_deposited_cents?: number
          total_spent_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_moderation_reports: {
        Row: {
          ai_analysis: string
          ai_recommendation: string
          auto_suspended: boolean
          contacts_notified: boolean
          created_at: string
          id: string
          investigation_data: Json | null
          investigation_end: string | null
          investigation_start: string
          report_id: string | null
          reported_user_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity_score: number
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis: string
          ai_recommendation: string
          auto_suspended?: boolean
          contacts_notified?: boolean
          created_at?: string
          id?: string
          investigation_data?: Json | null
          investigation_end?: string | null
          investigation_start?: string
          report_id?: string | null
          reported_user_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity_score?: number
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: string
          ai_recommendation?: string
          auto_suspended?: boolean
          contacts_notified?: boolean
          created_at?: string
          id?: string
          investigation_data?: Json | null
          investigation_end?: string | null
          investigation_start?: string
          report_id?: string | null
          reported_user_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity_score?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_moderation_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      album_access_requests: {
        Row: {
          album_ids: string[]
          album_owner_id: string
          created_at: string | null
          duration: string | null
          id: string
          message_id: string | null
          requester_id: string
          responded_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          album_ids: string[]
          album_owner_id: string
          created_at?: string | null
          duration?: string | null
          id?: string
          message_id?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          album_ids?: string[]
          album_owner_id?: string
          created_at?: string | null
          duration?: string | null
          id?: string
          message_id?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      album_media: {
        Row: {
          album_id: string
          created_at: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_media_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "user_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      album_shares: {
        Row: {
          album_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          shared_by_user_id: string
          shared_with_user_id: string
          updated_at: string
        }
        Insert: {
          album_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          shared_by_user_id: string
          shared_with_user_id: string
          updated_at?: string
        }
        Update: {
          album_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          shared_by_user_id?: string
          shared_with_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_shares_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "user_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_gifts: {
        Row: {
          amount: number
          created_at: string
          gift_year: number
          id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          gift_year?: number
          id?: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gift_year?: number
          id?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      broadcast_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          failed_count: number | null
          id: string
          sent_by: string
          success_count: number | null
          target_region: string | null
          target_type: string
          title: string
          total_subscriptions: number | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          failed_count?: number | null
          id?: string
          sent_by: string
          success_count?: number | null
          target_region?: string | null
          target_type?: string
          title: string
          total_subscriptions?: number | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          failed_count?: number | null
          id?: string
          sent_by?: string
          success_count?: number | null
          target_region?: string | null
          target_type?: string
          title?: string
          total_subscriptions?: number | null
        }
        Relationships: []
      }
      chat_room_members: {
        Row: {
          chat_room_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          chat_room_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          chat_room_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          custom_name: string | null
          description: string | null
          id: string
          is_announcement: boolean | null
          is_custom: boolean
          region_code: string
          region_name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_name?: string | null
          description?: string | null
          id?: string
          is_announcement?: boolean | null
          is_custom?: boolean
          region_code: string
          region_name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_name?: string | null
          description?: string | null
          id?: string
          is_announcement?: boolean | null
          is_custom?: boolean
          region_code?: string
          region_name?: string
        }
        Relationships: []
      }
      chatbot_credit_claims: {
        Row: {
          created_at: string
          credits_given: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_given?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_given?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_age_exceptions: {
        Row: {
          allowed_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          allowed_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          allowed_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_age_preferences: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_age: number
          min_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_age?: number
          min_age?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_age?: number
          min_age?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_mute_preferences: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_muted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_muted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_muted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      couple_accounts: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          owner_user_id: string
          partner_user_id: string | null
          share_conversations: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          owner_user_id: string
          partner_user_id?: string | null
          share_conversations?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          owner_user_id?: string
          partner_user_id?: string | null
          share_conversations?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      couple_activity_log: {
        Row: {
          action: string
          couple_account_id: string
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          couple_account_id: string
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          couple_account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_activity_log_couple_account_id_fkey"
            columns: ["couple_account_id"]
            isOneToOne: false
            referencedRelation: "couple_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_invitations: {
        Row: {
          couple_account_id: string
          created_at: string
          expires_at: string
          id: string
          invitee_email: string | null
          inviter_user_id: string
          status: string
          token: string
        }
        Insert: {
          couple_account_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string | null
          inviter_user_id: string
          status?: string
          token?: string
        }
        Update: {
          couple_account_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string | null
          inviter_user_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_invitations_couple_account_id_fkey"
            columns: ["couple_account_id"]
            isOneToOne: false
            referencedRelation: "couple_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cost_audit_log: {
        Row: {
          changed_at: string
          changed_by: string
          cost_key: string
          credit_cost_id: string
          id: string
          new_value: number
          old_value: number
        }
        Insert: {
          changed_at?: string
          changed_by: string
          cost_key: string
          credit_cost_id: string
          id?: string
          new_value: number
          old_value: number
        }
        Update: {
          changed_at?: string
          changed_by?: string
          cost_key?: string
          credit_cost_id?: string
          id?: string
          new_value?: number
          old_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_cost_audit_log_credit_cost_id_fkey"
            columns: ["credit_cost_id"]
            isOneToOne: false
            referencedRelation: "credit_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_costs: {
        Row: {
          category: string
          cost_key: string
          cost_value: number
          created_at: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_key: string
          cost_value?: number
          created_at?: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_key?: string
          cost_value?: number
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_gifts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          message_id: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          message_id?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          message_id?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_gifts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_offers: {
        Row: {
          created_at: string
          credits: number
          discount_percent: number | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_highlighted: boolean | null
          label: string | null
          original_price_euros: number | null
          price_euros: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          label?: string | null
          original_price_euros?: number | null
          price_euros: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          label?: string | null
          original_price_euros?: number | null
          price_euros?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_promotions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number
          ends_at: string
          id: string
          is_active: boolean
          label: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent: number
          ends_at: string
          id?: string
          is_active?: boolean
          label: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          label?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_purchase_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          price_euros: number
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          price_euros: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          price_euros?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          credit_type: Database["public"]["Enums"]["credit_type"]
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_type: Database["public"]["Enums"]["credit_type"]
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"]
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      cron_run_log: {
        Row: {
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      dossier_access_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          revoked_at: string | null
          status: string
          target_user_id: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          revoked_at?: string | null
          status?: string
          target_user_id: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          revoked_at?: string | null
          status?: string
          target_user_id?: string
          ticket_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          clicked_count: number
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          last_event_at: string | null
          message_id: string | null
          metadata: Json | null
          opened_at: string | null
          opened_count: number
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          clicked_count?: number
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          last_event_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          clicked_count?: number
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          last_event_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      ephemeral_media: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_viewed: boolean | null
          media_type: string
          media_url: string
          message_id: string
          replay_count: number
          screenshot_detected: boolean
          screenshot_detected_at: string | null
          view_duration: number
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_viewed?: boolean | null
          media_type: string
          media_url: string
          message_id: string
          replay_count?: number
          screenshot_detected?: boolean
          screenshot_detected_at?: string | null
          view_duration?: number
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_viewed?: boolean | null
          media_type?: string
          media_url?: string
          message_id?: string
          replay_count?: number
          screenshot_detected?: boolean
          screenshot_detected_at?: string | null
          view_duration?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ephemeral_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_source: string | null
          error_stack: string | null
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          page_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_source?: string | null
          error_stack?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_source?: string | null
          error_stack?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      faq_articles: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string
          display_order: number
          id: string
          is_published: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          is_published?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          is_published?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_feedback: {
        Row: {
          article_id: string | null
          comment: string | null
          created_at: string
          id: string
          static_article_id: string | null
          updated_at: string
          user_id: string
          vote: string
        }
        Insert: {
          article_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          static_article_id?: string | null
          updated_at?: string
          user_id: string
          vote: string
        }
        Update: {
          article_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          static_article_id?: string | null
          updated_at?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "faq_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_regions: {
        Row: {
          created_at: string
          id: string
          region_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          region_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          region_code?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
          category: string
          description: string | null
          feature_key: string
          icon: string | null
          id: string
          is_enabled: boolean
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          feature_key: string
          icon?: string | null
          id?: string
          is_enabled?: boolean
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          feature_key?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      flyer_promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          credits_amount: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          credits_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          credits_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Relationships: []
      }
      flyer_promo_redemptions: {
        Row: {
          code_id: string
          credits_given: number
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          credits_given: number
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          credits_given?: number
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyer_promo_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "flyer_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      group_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
      }
      group_events: {
        Row: {
          chat_room_id: string
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          id: string
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chat_room_id: string
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chat_room_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_mute_preferences: {
        Row: {
          created_at: string
          id: string
          is_muted: boolean
          region_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_muted?: boolean
          region_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_muted?: boolean
          region_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      help_chatbot_nodes: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          faq_article_id: string | null
          id: string
          is_active: boolean
          is_root: boolean
          label: string
          parent_id: string | null
          response_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          faq_article_id?: string | null
          id?: string
          is_active?: boolean
          is_root?: boolean
          label: string
          parent_id?: string | null
          response_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          faq_article_id?: string | null
          id?: string
          is_active?: boolean
          is_root?: boolean
          label?: string
          parent_id?: string | null
          response_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_chatbot_nodes_faq_article_id_fkey"
            columns: ["faq_article_id"]
            isOneToOne: false
            referencedRelation: "faq_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_chatbot_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "help_chatbot_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      henry_conversations: {
        Row: {
          age_max: number | null
          age_min: number | null
          availability: string[]
          created_at: string
          current_step: string
          free_notes: Json
          height_max: number | null
          height_min: number | null
          id: string
          interests: string[] | null
          languages: string[]
          pending_message_count: number
          region: string | null
          rejected_reasons: Json
          relationship_goal: string | null
          setup_completed: boolean
          shown_profile_ids: string[]
          total_messages_sent: number
          tribes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          availability?: string[]
          created_at?: string
          current_step?: string
          free_notes?: Json
          height_max?: number | null
          height_min?: number | null
          id?: string
          interests?: string[] | null
          languages?: string[]
          pending_message_count?: number
          region?: string | null
          rejected_reasons?: Json
          relationship_goal?: string | null
          setup_completed?: boolean
          shown_profile_ids?: string[]
          total_messages_sent?: number
          tribes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          availability?: string[]
          created_at?: string
          current_step?: string
          free_notes?: Json
          height_max?: number | null
          height_min?: number | null
          id?: string
          interests?: string[] | null
          languages?: string[]
          pending_message_count?: number
          region?: string | null
          rejected_reasons?: Json
          relationship_goal?: string | null
          setup_completed?: boolean
          shown_profile_ids?: string[]
          total_messages_sent?: number
          tribes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      henry_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          payload: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "henry_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "henry_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          admin_screenshot_detected: boolean
          admin_viewed_at: string | null
          created_at: string
          documents_deleted: boolean
          id: string
          id_back_url: string | null
          id_front_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_screenshot_detected?: boolean
          admin_viewed_at?: string | null
          created_at?: string
          documents_deleted?: boolean
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_screenshot_detected?: boolean
          admin_viewed_at?: string | null
          created_at?: string
          documents_deleted?: boolean
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investigation_notifications: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          ai_report_id: string | null
          data_access_expires_at: string
          id: string
          notification_sent_at: string
          notified_user_id: string
          reported_user_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          ai_report_id?: string | null
          data_access_expires_at: string
          id?: string
          notification_sent_at?: string
          notified_user_id: string
          reported_user_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          ai_report_id?: string | null
          data_access_expires_at?: string
          id?: string
          notification_sent_at?: string
          notified_user_id?: string
          reported_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_notifications_ai_report_id_fkey"
            columns: ["ai_report_id"]
            isOneToOne: false
            referencedRelation: "ai_moderation_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      location_hide_periods: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_currently_hidden: boolean
          last_paused_at: string | null
          purchased_at: string
          remaining_seconds_when_paused: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_currently_hidden?: boolean
          last_paused_at?: string | null
          purchased_at?: string
          remaining_seconds_when_paused?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_currently_hidden?: boolean
          last_paused_at?: string | null
          purchased_at?: string
          remaining_seconds_when_paused?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_mode: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          estimated_end_at: string | null
          id: string
          is_active: boolean
          message: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          estimated_end_at?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          estimated_end_at?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_status: {
        Row: {
          conversation_partner_id: string
          created_at: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_partner_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_partner_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_room_id: string | null
          content: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_private: boolean | null
          message_type: string
          read_at: string | null
          recipient_id: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          chat_room_id?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_private?: boolean | null
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          chat_room_id?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_private?: boolean | null
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["moderation_action_type"]
          created_at: string
          details: string | null
          id: string
          metadata: Json | null
          performed_by: string
          target_user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["moderation_action_type"]
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          performed_by: string
          target_user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["moderation_action_type"]
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string
          target_user_id?: string
        }
        Relationships: []
      }
      moderation_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          offered_at: string | null
          offered_count: number
          offered_to: string | null
          priority_score: number
          refused_by: string[] | null
          reserved_at: string | null
          reserved_by: string | null
          reward_cents: number
          sms_notified: boolean
          sms_resent_at: string | null
          status: string
          target_entity_id: string | null
          target_user_id: string | null
          task_type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          offered_at?: string | null
          offered_count?: number
          offered_to?: string | null
          priority_score?: number
          refused_by?: string[] | null
          reserved_at?: string | null
          reserved_by?: string | null
          reward_cents?: number
          sms_notified?: boolean
          sms_resent_at?: string | null
          status?: string
          target_entity_id?: string | null
          target_user_id?: string | null
          task_type: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          offered_at?: string | null
          offered_count?: number
          offered_to?: string | null
          priority_score?: number
          refused_by?: string[] | null
          reserved_at?: string | null
          reserved_by?: string | null
          reward_cents?: number
          sms_notified?: boolean
          sms_resent_at?: string | null
          status?: string
          target_entity_id?: string | null
          target_user_id?: string | null
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      moderator_action_cooldowns: {
        Row: {
          action_count: number | null
          id: string
          last_action_at: string | null
          target_user_id: string
          task_type: Database["public"]["Enums"]["moderator_task_type"]
          user_id: string
        }
        Insert: {
          action_count?: number | null
          id?: string
          last_action_at?: string | null
          target_user_id: string
          task_type: Database["public"]["Enums"]["moderator_task_type"]
          user_id: string
        }
        Update: {
          action_count?: number | null
          id?: string
          last_action_at?: string | null
          target_user_id?: string
          task_type?: Database["public"]["Enums"]["moderator_task_type"]
          user_id?: string
        }
        Relationships: []
      }
      moderator_earnings: {
        Row: {
          amount_cents: number
          created_at: string | null
          description: string | null
          id: string
          target_entity_id: string | null
          target_user_id: string | null
          task_type: Database["public"]["Enums"]["moderator_task_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          description?: string | null
          id?: string
          target_entity_id?: string | null
          target_user_id?: string | null
          task_type: Database["public"]["Enums"]["moderator_task_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          description?: string | null
          id?: string
          target_entity_id?: string | null
          target_user_id?: string | null
          task_type?: Database["public"]["Enums"]["moderator_task_type"]
          user_id?: string
        }
        Relationships: []
      }
      moderator_permissions: {
        Row: {
          assigned_by: string | null
          can_ai_moderation: boolean | null
          can_broadcast: boolean | null
          can_manage_blocked: boolean | null
          can_manage_content: boolean | null
          can_manage_credits: boolean | null
          can_manage_faq: boolean | null
          can_manage_flyers: boolean | null
          can_manage_popups: boolean | null
          can_manage_promo: boolean | null
          can_manage_reports: boolean | null
          can_manage_users: boolean | null
          can_screenshot_sanctions: boolean | null
          can_verify_identity: boolean | null
          can_view_history: boolean | null
          can_view_logs: boolean | null
          can_view_stats: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          can_ai_moderation?: boolean | null
          can_broadcast?: boolean | null
          can_manage_blocked?: boolean | null
          can_manage_content?: boolean | null
          can_manage_credits?: boolean | null
          can_manage_faq?: boolean | null
          can_manage_flyers?: boolean | null
          can_manage_popups?: boolean | null
          can_manage_promo?: boolean | null
          can_manage_reports?: boolean | null
          can_manage_users?: boolean | null
          can_screenshot_sanctions?: boolean | null
          can_verify_identity?: boolean | null
          can_view_history?: boolean | null
          can_view_logs?: boolean | null
          can_view_stats?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          can_ai_moderation?: boolean | null
          can_broadcast?: boolean | null
          can_manage_blocked?: boolean | null
          can_manage_content?: boolean | null
          can_manage_credits?: boolean | null
          can_manage_faq?: boolean | null
          can_manage_flyers?: boolean | null
          can_manage_popups?: boolean | null
          can_manage_promo?: boolean | null
          can_manage_reports?: boolean | null
          can_manage_users?: boolean | null
          can_screenshot_sanctions?: boolean | null
          can_verify_identity?: boolean | null
          can_view_history?: boolean | null
          can_view_logs?: boolean | null
          can_view_stats?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderator_saved_replies: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderator_wallets: {
        Row: {
          balance_cents: number
          created_at: string | null
          id: string
          total_earned_cents: number
          total_withdrawn_cents: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string | null
          id?: string
          total_earned_cents?: number
          total_withdrawn_cents?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string | null
          id?: string
          total_earned_cents?: number
          total_withdrawn_cents?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nearby_profiles_unlock: {
        Row: {
          credits_spent: number
          expires_at: string
          id: string
          unlock_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          credits_spent: number
          expires_at: string
          id?: string
          unlock_type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          credits_spent?: number
          expires_at?: string
          id?: string
          unlock_type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          notification_sound: string | null
          push_album_shares: boolean
          push_announcements: boolean
          push_credits: boolean
          push_favorites: boolean
          push_group_messages: boolean
          push_matches: boolean
          push_mentions: boolean
          push_private_messages: boolean
          push_reactions: boolean
          push_verification: boolean
          sound_enabled: boolean
          suggestion_decisions_email: boolean
          suggestion_decisions_inapp: boolean
          suggestion_decisions_push: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_sound?: string | null
          push_album_shares?: boolean
          push_announcements?: boolean
          push_credits?: boolean
          push_favorites?: boolean
          push_group_messages?: boolean
          push_matches?: boolean
          push_mentions?: boolean
          push_private_messages?: boolean
          push_reactions?: boolean
          push_verification?: boolean
          sound_enabled?: boolean
          suggestion_decisions_email?: boolean
          suggestion_decisions_inapp?: boolean
          suggestion_decisions_push?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_sound?: string | null
          push_album_shares?: boolean
          push_announcements?: boolean
          push_credits?: boolean
          push_favorites?: boolean
          push_group_messages?: boolean
          push_matches?: boolean
          push_mentions?: boolean
          push_private_messages?: boolean
          push_reactions?: boolean
          push_verification?: boolean
          sound_enabled?: boolean
          suggestion_decisions_email?: boolean
          suggestion_decisions_inapp?: boolean
          suggestion_decisions_push?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paypal_orders: {
        Row: {
          captured_at: string | null
          created_at: string
          credits_amount: number
          id: string
          paypal_order_id: string
          price_euros: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          credits_amount: number
          id?: string
          paypal_order_id: string
          price_euros: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          credits_amount?: number
          id?: string
          paypal_order_id?: string
          price_euros?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_chatbot_nodes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_root: boolean
          label: string
          parent_id: string | null
          response_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_root?: boolean
          label: string
          parent_id?: string | null
          response_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_root?: boolean
          label?: string
          parent_id?: string | null
          response_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_chatbot_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "personal_chatbot_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_chatbot_pricing: {
        Row: {
          created_at: string
          extra_cost_per_node: number
          id: string
          node_count: number
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra_cost_per_node?: number
          id?: string
          node_count: number
          total_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra_cost_per_node?: number
          id?: string
          node_count?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      photo_exchange_photos: {
        Row: {
          created_at: string
          exchange_id: string
          id: string
          retry_count: number
          review_reason: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exchange_id: string
          id?: string
          retry_count?: number
          review_reason?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exchange_id?: string
          id?: string
          retry_count?: number
          review_reason?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_exchange_photos_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "photo_exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_exchanges: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          initiator_id: string
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          initiator_id: string
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          initiator_id?: string
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_exchanges_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "private_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          chat_room_id: string
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string
        }
        Insert: {
          chat_room_id: string
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by: string
        }
        Update: {
          chat_room_id?: string
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_messages: {
        Row: {
          chat_room_id: string
          created_at: string | null
          created_by: string
          id: string
          is_locked: boolean | null
          is_multiple_choice: boolean | null
          message_id: string
          question: string
          updated_at: string | null
        }
        Insert: {
          chat_room_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_locked?: boolean | null
          is_multiple_choice?: boolean | null
          message_id: string
          question: string
          updated_at?: string | null
        }
        Update: {
          chat_room_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_locked?: boolean | null
          is_multiple_choice?: boolean | null
          message_id?: string
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          option_text: string
          poll_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          option_text: string
          poll_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          option_text?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_subscriptions: {
        Row: {
          activated_at: string
          activated_by: string
          created_at: string
          expires_at: string
          id: string
          notes: string | null
          payment_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          activated_by: string
          created_at?: string
          expires_at: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          activated_by?: string
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      private_conversation_status: {
        Row: {
          auto_delete_mode: string
          conversation_id: string
          created_at: string
          id: string
          is_archived: boolean
          is_deleted: boolean
          messages_hidden_before: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_delete_mode?: string
          conversation_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          messages_hidden_before?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_delete_mode?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          messages_hidden_before?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_conversation_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "private_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      private_conversations: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      private_pinned_messages: {
        Row: {
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_boosts: {
        Row: {
          created_at: string
          credits_spent: number
          expires_at: string
          id: string
          max_views: number
          started_at: string
          user_id: string
          views_delivered: number
        }
        Insert: {
          created_at?: string
          credits_spent?: number
          expires_at?: string
          id?: string
          max_views?: number
          started_at?: string
          user_id: string
          views_delivered?: number
        }
        Update: {
          created_at?: string
          credits_spent?: number
          expires_at?: string
          id?: string
          max_views?: number
          started_at?: string
          user_id?: string
          views_delivered?: number
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          photo_url: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_url: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_url?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_seen: boolean
          profile_user_id: string
          reactor_user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          is_seen?: boolean
          profile_user_id: string
          reactor_user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_seen?: boolean
          profile_user_id?: string
          reactor_user_id?: string
        }
        Relationships: []
      }
      profile_view_credits: {
        Row: {
          credits_spent: number
          id: string
          viewed_at: string
          viewed_user_id: string
          viewer_user_id: string
        }
        Insert: {
          credits_spent: number
          id?: string
          viewed_at?: string
          viewed_user_id: string
          viewer_user_id: string
        }
        Update: {
          credits_spent?: number
          id?: string
          viewed_at?: string
          viewed_user_id?: string
          viewer_user_id?: string
        }
        Relationships: []
      }
      profile_visits: {
        Row: {
          id: string
          visited_at: string
          visited_user_id: string
          visitor_user_id: string
        }
        Insert: {
          id?: string
          visited_at?: string
          visited_user_id: string
          visitor_user_id: string
        }
        Update: {
          id?: string
          visited_at?: string
          visited_user_id?: string
          visitor_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_nsfw: boolean | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          body_type: string | null
          couple_account_id: string | null
          couple_role: string | null
          created_at: string
          endowment: string | null
          ethnicity: string | null
          first_name: string | null
          first_verified_at: string | null
          height: number | null
          hide_last_seen: boolean | null
          hide_online_status: boolean | null
          hiv_status: string | null
          id: string
          is_online: boolean | null
          is_premium: boolean | null
          is_verified: boolean
          last_name: string | null
          last_seen: string | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          looking_for: string[] | null
          phone_number: string | null
          position_detail: string | null
          region: string
          relationship_status: string | null
          sexual_position: string | null
          show_birthday: boolean | null
          show_face: boolean | null
          theme_preference: string | null
          tribes: string[] | null
          updated_at: string
          user_id: string
          username: string
          weight: number | null
        }
        Insert: {
          accepts_nsfw?: boolean | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          body_type?: string | null
          couple_account_id?: string | null
          couple_role?: string | null
          created_at?: string
          endowment?: string | null
          ethnicity?: string | null
          first_name?: string | null
          first_verified_at?: string | null
          height?: number | null
          hide_last_seen?: boolean | null
          hide_online_status?: boolean | null
          hiv_status?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean
          last_name?: string | null
          last_seen?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          looking_for?: string[] | null
          phone_number?: string | null
          position_detail?: string | null
          region: string
          relationship_status?: string | null
          sexual_position?: string | null
          show_birthday?: boolean | null
          show_face?: boolean | null
          theme_preference?: string | null
          tribes?: string[] | null
          updated_at?: string
          user_id: string
          username: string
          weight?: number | null
        }
        Update: {
          accepts_nsfw?: boolean | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          body_type?: string | null
          couple_account_id?: string | null
          couple_role?: string | null
          created_at?: string
          endowment?: string | null
          ethnicity?: string | null
          first_name?: string | null
          first_verified_at?: string | null
          height?: number | null
          hide_last_seen?: boolean | null
          hide_online_status?: boolean | null
          hiv_status?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean
          last_name?: string | null
          last_seen?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          looking_for?: string[] | null
          phone_number?: string | null
          position_detail?: string | null
          region?: string
          relationship_status?: string | null
          sexual_position?: string | null
          show_birthday?: boolean | null
          show_face?: boolean | null
          theme_preference?: string | null
          tribes?: string[] | null
          updated_at?: string
          user_id?: string
          username?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_account_id_fkey"
            columns: ["couple_account_id"]
            isOneToOne: false
            referencedRelation: "couple_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          is_blocked: boolean | null
          request_count: number | null
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          is_blocked?: boolean | null
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          is_blocked?: boolean | null
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          successful_referrals: number
          total_referrals: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          successful_referrals?: number
          total_referrals?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          successful_referrals?: number
          total_referrals?: number
          user_id?: string
        }
        Relationships: []
      }
      referral_milestones: {
        Row: {
          badge_emoji: string
          bonus_credits: number
          created_at: string
          description: string | null
          id: string
          label: string
          threshold: number
        }
        Insert: {
          badge_emoji?: string
          bonus_credits?: number
          created_at?: string
          description?: string | null
          id?: string
          label: string
          threshold: number
        }
        Update: {
          badge_emoji?: string
          bonus_credits?: number
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          threshold?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          consecutive_payments: number
          created_at: string
          expires_at: string
          id: string
          last_payment_at: string | null
          referral_code_id: string
          referred_reward_applied: boolean
          referred_reward_applied_at: string | null
          referred_user_id: string
          referrer_reward_applied: boolean
          referrer_reward_applied_at: string | null
          referrer_user_id: string
          status: string
        }
        Insert: {
          consecutive_payments?: number
          created_at?: string
          expires_at?: string
          id?: string
          last_payment_at?: string | null
          referral_code_id: string
          referred_reward_applied?: boolean
          referred_reward_applied_at?: string | null
          referred_user_id: string
          referrer_reward_applied?: boolean
          referrer_reward_applied_at?: string | null
          referrer_user_id: string
          status?: string
        }
        Update: {
          consecutive_payments?: number
          created_at?: string
          expires_at?: string
          id?: string
          last_payment_at?: string | null
          referral_code_id?: string
          referred_reward_applied?: boolean
          referred_reward_applied_at?: string | null
          referred_user_id?: string
          referrer_reward_applied?: boolean
          referrer_reward_applied_at?: string | null
          referrer_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          message_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          report_type: string
          reported_user_id: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          tween_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          message_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          report_type?: string
          reported_user_id: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          tween_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          message_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          tween_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tween_id_fkey"
            columns: ["tween_id"]
            isOneToOne: false
            referencedRelation: "tweens"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      screenshot_violations: {
        Row: {
          created_at: string
          id: string
          last_violation_at: string | null
          media_id: string | null
          suspended_until: string | null
          updated_at: string
          user_id: string
          violation_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_violation_at?: string | null
          media_id?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id: string
          violation_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_violation_at?: string | null
          media_id?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
          violation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_violations_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "ephemeral_media"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          is_blocked: boolean | null
          is_resolved: boolean | null
          metadata: Json | null
          page_url: string | null
          payload: string | null
          request_path: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_ip: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          is_blocked?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          page_url?: string | null
          payload?: string | null
          request_path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          is_blocked?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          page_url?: string | null
          payload?: string | null
          request_path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_updates: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          region_code: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url: string
          region_code?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          region_code?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          screenshot_detected: boolean
          story_id: string
          viewed_at: string
          viewer_user_id: string
        }
        Insert: {
          id?: string
          screenshot_detected?: boolean
          story_id: string
          viewed_at?: string
          viewer_user_id: string
        }
        Update: {
          id?: string
          screenshot_detected?: boolean
          story_id?: string
          viewed_at?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_moderation_logs: {
        Row: {
          action: string
          actor_id: string | null
          admin_notes: string | null
          created_at: string
          credits_awarded: number | null
          id: string
          new_status: string | null
          previous_status: string | null
          suggestion_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          admin_notes?: string | null
          created_at?: string
          credits_awarded?: number | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          suggestion_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          admin_notes?: string | null
          created_at?: string
          credits_awarded?: number | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_moderation_logs_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "user_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_notification_log: {
        Row: {
          channel: string
          id: string
          sent_at: string
          status: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          channel: string
          id?: string
          sent_at?: string
          status: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          channel?: string
          id?: string
          sent_at?: string
          status?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_votes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          updated_at: string
          vote_type: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          updated_at?: string
          vote_type: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          updated_at?: string
          vote_type?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "user_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_otp_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          interrupt_token: string | null
          interrupted_at: string | null
          ticket_id: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          interrupt_token?: string | null
          interrupted_at?: string | null
          ticket_id?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          interrupt_token?: string | null
          interrupted_at?: string | null
          ticket_id?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          chatbot_history: Json | null
          closed_at: string | null
          created_at: string
          id: string
          rated_at: string | null
          rating_comment: string | null
          rating_emoji: string | null
          status: string
          subject: string | null
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          chatbot_history?: Json | null
          closed_at?: string | null
          created_at?: string
          id?: string
          rated_at?: string | null
          rating_comment?: string | null
          rating_emoji?: string | null
          status?: string
          subject?: string | null
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          chatbot_history?: Json | null
          closed_at?: string | null
          created_at?: string
          id?: string
          rated_at?: string | null
          rating_comment?: string | null
          rating_emoji?: string | null
          status?: string
          subject?: string | null
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swipe_actions: {
        Row: {
          action_type: string
          created_at: string
          credits_spent: number
          expires_at: string | null
          id: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_spent?: number
          expires_at?: string | null
          id?: string
          target_user_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_spent?: number
          expires_at?: string | null
          id?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      task_rates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          rate_cents: number
          task_type: Database["public"]["Enums"]["moderator_task_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rate_cents: number
          task_type: Database["public"]["Enums"]["moderator_task_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rate_cents?: number
          task_type?: Database["public"]["Enums"]["moderator_task_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      tween_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tween_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "tween_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      tween_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number | null
          parent_comment_id: string | null
          tween_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          tween_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          tween_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tween_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "tween_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tween_comments_tween_id_fkey"
            columns: ["tween_id"]
            isOneToOne: false
            referencedRelation: "tweens"
            referencedColumns: ["id"]
          },
        ]
      }
      tween_favorites: {
        Row: {
          created_at: string
          id: string
          tween_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tween_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tween_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tween_favorites_tween_id_fkey"
            columns: ["tween_id"]
            isOneToOne: false
            referencedRelation: "tweens"
            referencedColumns: ["id"]
          },
        ]
      }
      tween_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      tween_likes: {
        Row: {
          created_at: string
          id: string
          tween_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tween_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tween_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tween_likes_tween_id_fkey"
            columns: ["tween_id"]
            isOneToOne: false
            referencedRelation: "tweens"
            referencedColumns: ["id"]
          },
        ]
      }
      tween_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          tween_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          tween_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          tween_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tween_poll_votes_tween_id_fkey"
            columns: ["tween_id"]
            isOneToOne: false
            referencedRelation: "tweens"
            referencedColumns: ["id"]
          },
        ]
      }
      tweens: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          edited_at: string | null
          has_poll: boolean | null
          id: string
          is_deleted: boolean | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          poll_ends_at: string | null
          poll_options: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          edited_at?: string | null
          has_poll?: boolean | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          poll_ends_at?: string | null
          poll_options?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          edited_at?: string | null
          has_poll?: boolean | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          poll_ends_at?: string | null
          poll_options?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          chat_room_id: string | null
          id: string
          started_at: string
          user_id: string
          username: string
        }
        Insert: {
          chat_room_id?: string | null
          id?: string
          started_at?: string
          user_id: string
          username: string
        }
        Update: {
          chat_room_id?: string | null
          id?: string
          started_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_conversations: {
        Row: {
          active_chat_room_id: string | null
          active_private_user_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_chat_room_id?: string | null
          active_private_user_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_chat_room_id?: string | null
          active_private_user_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_albums: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_at: string
          blocked_by: string
          id: string
          is_active: boolean
          reason: string | null
          suspension_duration: string | null
          suspension_ends_at: string | null
          suspension_type: string | null
          unblocked_at: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          id?: string
          is_active?: boolean
          reason?: string | null
          suspension_duration?: string | null
          suspension_ends_at?: string | null
          suspension_type?: string | null
          unblocked_at?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          suspension_duration?: string | null
          suspension_ends_at?: string | null
          suspension_type?: string | null
          unblocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_chatbot_config: {
        Row: {
          activation_paid: boolean
          created_at: string
          greeting_message: string | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_paid?: boolean
          created_at?: string
          greeting_message?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_paid?: boolean
          created_at?: string
          greeting_message?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          bonus_credits: number
          created_at: string
          daily_claims_used: number
          daily_credits: number
          daily_credits_last_reset: string | null
          highest_balance_ever: number
          last_daily_claim: string | null
          last_passive_credit_at: string | null
          lock_bonus: boolean
          lock_passive: boolean
          lock_purchased: boolean
          monthly_daily_credits_given: number | null
          monthly_reference_balance: number
          monthly_reference_date: string
          monthly_reset_date: string
          passive_credits: number | null
          purchased_credits: number
          updated_at: string
          user_id: string
          weekly_credits_given: number
          weekly_reset_date: string
        }
        Insert: {
          bonus_credits?: number
          created_at?: string
          daily_claims_used?: number
          daily_credits?: number
          daily_credits_last_reset?: string | null
          highest_balance_ever?: number
          last_daily_claim?: string | null
          last_passive_credit_at?: string | null
          lock_bonus?: boolean
          lock_passive?: boolean
          lock_purchased?: boolean
          monthly_daily_credits_given?: number | null
          monthly_reference_balance?: number
          monthly_reference_date?: string
          monthly_reset_date?: string
          passive_credits?: number | null
          purchased_credits?: number
          updated_at?: string
          user_id: string
          weekly_credits_given?: number
          weekly_reset_date?: string
        }
        Update: {
          bonus_credits?: number
          created_at?: string
          daily_claims_used?: number
          daily_credits?: number
          daily_credits_last_reset?: string | null
          highest_balance_ever?: number
          last_daily_claim?: string | null
          last_passive_credit_at?: string | null
          lock_bonus?: boolean
          lock_passive?: boolean
          lock_purchased?: boolean
          monthly_daily_credits_given?: number | null
          monthly_reference_balance?: number
          monthly_reference_date?: string
          monthly_reset_date?: string
          passive_credits?: number | null
          purchased_credits?: number
          updated_at?: string
          user_id?: string
          weekly_credits_given?: number
          weekly_reset_date?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          favorite_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorite_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_infractions: {
        Row: {
          context: string
          created_at: string
          detected_word: string
          id: string
          is_sanctioned: boolean
          message_content: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          support_ticket_id: string | null
          user_id: string
          warning_number: number
        }
        Insert: {
          context?: string
          created_at?: string
          detected_word: string
          id?: string
          is_sanctioned?: boolean
          message_content: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          support_ticket_id?: string | null
          user_id: string
          warning_number?: number
        }
        Update: {
          context?: string
          created_at?: string
          detected_word?: string
          id?: string
          is_sanctioned?: boolean
          message_content?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          support_ticket_id?: string | null
          user_id?: string
          warning_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_infractions_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_personal_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_referral_milestones: {
        Row: {
          bonus_credited: number
          id: string
          milestone_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          bonus_credited?: number
          id?: string
          milestone_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          bonus_credited?: number
          id?: string
          milestone_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_referral_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "referral_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_security_pins: {
        Row: {
          biometric_credential_id: string | null
          biometric_enabled: boolean | null
          created_at: string | null
          id: string
          pin_hash: string
          pin_salt: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          biometric_credential_id?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          id?: string
          pin_hash: string
          pin_salt: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          biometric_credential_id?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          id?: string
          pin_hash?: string
          pin_salt?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_suggestions: {
        Row: {
          admin_notes: string | null
          attachments: Json
          category: string
          created_at: string
          credits_awarded: number
          description: string
          examples: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json
          category?: string
          created_at?: string
          credits_awarded?: number
          description: string
          examples?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json
          category?: string
          created_at?: string
          credits_awarded?: number
          description?: string
          examples?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          albums_count: number
          conversations_last_reset: string | null
          conversations_started: number
          created_at: string
          ephemeral_media_count: number
          ephemeral_media_last_reset: string | null
          id: string
          nearby_profiles_last_reset: string | null
          nearby_profiles_viewed: number
          profile_photos_last_reset: string | null
          profile_photos_viewed: number
          saved_messages_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          albums_count?: number
          conversations_last_reset?: string | null
          conversations_started?: number
          created_at?: string
          ephemeral_media_count?: number
          ephemeral_media_last_reset?: string | null
          id?: string
          nearby_profiles_last_reset?: string | null
          nearby_profiles_viewed?: number
          profile_photos_last_reset?: string | null
          profile_photos_viewed?: number
          saved_messages_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          albums_count?: number
          conversations_last_reset?: string | null
          conversations_started?: number
          created_at?: string
          ephemeral_media_count?: number
          ephemeral_media_last_reset?: string | null
          id?: string
          nearby_profiles_last_reset?: string | null
          nearby_profiles_viewed?: number
          profile_photos_last_reset?: string | null
          profile_photos_viewed?: number
          saved_messages_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_support_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visitor_support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_support_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_digest_unsubscribes: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount_cents: number
          id: string
          payment_reference: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          id?: string
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          id?: string
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_chatbot: { Args: { _user_id: string }; Returns: Json }
      activate_premium: {
        Args: {
          _duration_days?: number
          _notes?: string
          _payment_reference?: string
          _target_user_id: string
        }
        Returns: Json
      }
      add_credits: {
        Args: {
          _amount: number
          _credit_type: Database["public"]["Enums"]["credit_type"]
          _description?: string
          _transaction_type: string
          _user_id: string
        }
        Returns: Json
      }
      add_verification_credits: { Args: { _user_id: string }; Returns: Json }
      apply_advertiser_promo: {
        Args: {
          _advertiser_email: string
          _bonus_cents: number
          _code_id: string
        }
        Returns: Json
      }
      auto_cancel_stale_photo_exchanges: { Args: never; Returns: undefined }
      backfill_welcome_emails: { Args: { _days_back?: number }; Returns: Json }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      can_earn_for_action: {
        Args: {
          _cooldown_minutes?: number
          _target_user_id: string
          _task_type: Database["public"]["Enums"]["moderator_task_type"]
          _user_id: string
        }
        Returns: boolean
      }
      can_manage_credits: { Args: { _user_id: string }; Returns: boolean }
      cast_suggestion_vote: {
        Args: { _suggestion_id: string; _vote_type: string }
        Returns: Json
      }
      check_stale_tasks_send_sms: { Args: never; Returns: undefined }
      check_sufficient_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: boolean
      }
      claim_referral_milestones: {
        Args: { _user_id: string }
        Returns: {
          badge_emoji: string
          bonus_credits: number
          label: string
          milestone_id: string
          threshold: number
        }[]
      }
      cleanup_expired_suspensions: { Args: never; Returns: number }
      cleanup_stale_online_profiles: { Args: never; Returns: number }
      complete_moderation_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: Json
      }
      compute_chatbot_node_cost: { Args: { _count: number }; Returns: number }
      compute_task_priority: {
        Args: {
          _created_at: string
          _refused_count: number
          _task_type: string
        }
        Returns: number
      }
      consume_advertiser_magic_link: {
        Args: { _token: string }
        Returns: string
      }
      deduct_credits: {
        Args: {
          _amount: number
          _description?: string
          _transaction_type: string
          _user_id: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      demote_moderator: { Args: { _target_user_id: string }; Returns: Json }
      dissolve_couple: { Args: { _couple_account_id: string }; Returns: Json }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_chatbot_config: { Args: { _user_id: string }; Returns: undefined }
      expire_stale_moderation_tasks: { Args: never; Returns: number }
      filter_suspended_or_blocked_users: {
        Args: { _user_ids: string[] }
        Returns: string[]
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_active_credit_promotion: {
        Args: never
        Returns: {
          description: string
          discount_percent: number
          ends_at: string
          id: string
          label: string
          starts_at: string
        }[]
      }
      get_advertiser_wallet: { Args: { _email: string }; Returns: Json }
      get_community_public_stats: {
        Args: never
        Returns: {
          online_members: number
          total_members: number
          total_rooms: number
          verified_members: number
        }[]
      }
      get_estimated_wait_time: { Args: { _entity_id: string }; Returns: Json }
      get_exclusive_next_task: {
        Args: { _offer_ttl_seconds?: number; _user_id: string }
        Returns: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          offered_at: string | null
          offered_count: number
          offered_to: string | null
          priority_score: number
          refused_by: string[] | null
          reserved_at: string | null
          reserved_by: string | null
          reward_cents: number
          sms_notified: boolean
          sms_resent_at: string | null
          status: string
          target_entity_id: string | null
          target_user_id: string | null
          task_type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "moderation_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_location_hide_status: { Args: { _user_id: string }; Returns: Json }
      get_my_last_weekly_digest_sent_at: { Args: never; Returns: string }
      get_nearby_profiles: {
        Args: {
          limit_count?: number
          max_distance_km?: number
          user_lat: number
          user_lon: number
        }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          distance_km: number
          id: string
          is_online: boolean
          last_seen: string
          region: string
          user_id: string
          username: string
        }[]
      }
      get_or_create_referral_code: {
        Args: { _user_id: string }
        Returns: string
      }
      get_photo_exchange_signed_url: {
        Args: { _photo_id: string }
        Returns: string
      }
      get_profile_map_coords: {
        Args: { _user_ids: string[] }
        Returns: {
          latitude: number
          longitude: number
          user_id: string
        }[]
      }
      get_public_profiles:
        | {
            Args: { _region?: string }
            Returns: {
              age: number
              avatar_url: string
              bio: string
              body_type: string
              created_at: string
              ethnicity: string
              height: number
              id: string
              is_online: boolean
              is_premium: boolean
              is_verified: boolean
              last_seen: string
              looking_for: string
              region: string
              relationship_status: string
              sexual_position: string
              show_face: boolean
              tribes: string[]
              user_id: string
              username: string
              weight: number
            }[]
          }
        | {
            Args: { _region?: string; _user_ids?: string[] }
            Returns: {
              age: number
              avatar_url: string
              bio: string
              body_type: string
              created_at: string
              ethnicity: string
              height: number
              id: string
              is_online: boolean
              is_premium: boolean
              is_verified: boolean
              last_seen: string
              looking_for: string
              region: string
              relationship_status: string
              sexual_position: string
              show_face: boolean
              tribes: string[]
              user_id: string
              username: string
              weight: number
            }[]
          }
      get_stale_tasks_for_resms: {
        Args: never
        Returns: {
          created_at: string
          id: string
          task_type: string
        }[]
      }
      get_user_credit_balance: { Args: { _user_id: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_visitor_support_messages: {
        Args: { _session_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
          session_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "visitor_support_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_active_premium: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      henry_add_shown_profiles: { Args: { _ids: string[] }; Returns: undefined }
      henry_clear_shown_profiles: { Args: never; Returns: undefined }
      henry_get_or_create_conversation: {
        Args: never
        Returns: {
          age_max: number | null
          age_min: number | null
          availability: string[]
          created_at: string
          current_step: string
          free_notes: Json
          height_max: number | null
          height_min: number | null
          id: string
          interests: string[] | null
          languages: string[]
          pending_message_count: number
          region: string | null
          rejected_reasons: Json
          relationship_goal: string | null
          setup_completed: boolean
          shown_profile_ids: string[]
          total_messages_sent: number
          tribes: string[] | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "henry_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      henry_record_reject_reason: {
        Args: { _reason: string }
        Returns: undefined
      }
      henry_reset_conversation: {
        Args: never
        Returns: {
          age_max: number | null
          age_min: number | null
          availability: string[]
          created_at: string
          current_step: string
          free_notes: Json
          height_max: number | null
          height_min: number | null
          id: string
          interests: string[] | null
          languages: string[]
          pending_message_count: number
          region: string | null
          rejected_reasons: Json
          relationship_goal: string | null
          setup_completed: boolean
          shown_profile_ids: string[]
          total_messages_sent: number
          tribes: string[] | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "henry_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      henry_save_bot_message: {
        Args: { _content: string; _payload?: Json }
        Returns: string
      }
      henry_send_user_message: {
        Args: { _content: string; _payload?: Json }
        Returns: Json
      }
      henry_update_criteria:
        | {
            Args: {
              _age_max?: number
              _age_min?: number
              _current_step?: string
              _interests?: string[]
              _region?: string
              _relationship_goal?: string
              _tribes?: string[]
            }
            Returns: {
              age_max: number | null
              age_min: number | null
              availability: string[]
              created_at: string
              current_step: string
              free_notes: Json
              height_max: number | null
              height_min: number | null
              id: string
              interests: string[] | null
              languages: string[]
              pending_message_count: number
              region: string | null
              rejected_reasons: Json
              relationship_goal: string | null
              setup_completed: boolean
              shown_profile_ids: string[]
              total_messages_sent: number
              tribes: string[] | null
              updated_at: string
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "henry_conversations"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _age_max?: number
              _age_min?: number
              _availability?: string[]
              _current_step?: string
              _free_note_step?: string
              _free_note_text?: string
              _height_max?: number
              _height_min?: number
              _interests?: string[]
              _languages?: string[]
              _region?: string
              _relationship_goal?: string
              _setup_completed?: boolean
              _tribes?: string[]
            }
            Returns: {
              age_max: number | null
              age_min: number | null
              availability: string[]
              created_at: string
              current_step: string
              free_notes: Json
              height_max: number | null
              height_min: number | null
              id: string
              interests: string[] | null
              languages: string[]
              pending_message_count: number
              region: string | null
              rejected_reasons: Json
              relationship_goal: string | null
              setup_completed: boolean
              shown_profile_ids: string[]
              total_messages_sent: number
              tribes: string[] | null
              updated_at: string
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "henry_conversations"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      hold_support_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: Json
      }
      increment_ad_clicks: { Args: { _ad_id: string }; Returns: undefined }
      increment_ad_impressions: { Args: { _ad_id: string }; Returns: undefined }
      is_group_admin: {
        Args: { _chat_room_id: string; _user_id: string }
        Returns: boolean
      }
      is_member_of_message_group: {
        Args: { _message_id: string; _user_id: string }
        Returns: boolean
      }
      is_photo_exchange_staff: { Args: { _uid: string }; Returns: boolean }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
      is_user_suspended_or_blocked: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_viewing_conversation: {
        Args: {
          _chat_room_id?: string
          _private_user_id?: string
          _target_user_id: string
        }
        Returns: boolean
      }
      join_couple_by_code: { Args: { _invite_code: string }; Returns: Json }
      mark_messages_as_read: {
        Args: { _sender_id: string; _user_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      process_referral_credits: {
        Args: { _referred_id: string; _referrer_id: string }
        Returns: Json
      }
      process_suggestion_decision: {
        Args: {
          p_admin_notes?: string
          p_credits_awarded?: number
          p_status: string
          p_suggestion_id: string
        }
        Returns: Json
      }
      promote_to_moderator: {
        Args: { _permissions?: Json; _target_user_id: string }
        Returns: Json
      }
      purchase_chatbot_node: { Args: { _user_id: string }; Returns: Json }
      purchase_location_hide: { Args: { _user_id: string }; Returns: Json }
      purge_old_cron_run_logs: { Args: never; Returns: undefined }
      purge_old_unread_ephemeral_media: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_moderator_earning: {
        Args: {
          _description?: string
          _target_entity_id?: string
          _target_user_id?: string
          _task_type: Database["public"]["Enums"]["moderator_task_type"]
          _user_id: string
        }
        Returns: boolean
      }
      record_user_infraction: {
        Args: {
          _context: string
          _detected_word: string
          _is_sanctioned: boolean
          _message_content: string
          _support_ticket_id?: string
          _user_id: string
          _warning_number: number
        }
        Returns: undefined
      }
      recycle_fully_refused_tasks: { Args: never; Returns: undefined }
      redeem_flyer_promo_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      refresh_monthly_credit_reference: {
        Args: { _user_id: string }
        Returns: number
      }
      refuse_moderation_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: Json
      }
      register_referral: {
        Args: { _referral_code: string; _referred_user_id: string }
        Returns: boolean
      }
      request_advertiser_magic_link: {
        Args: { _email: string }
        Returns: string
      }
      request_withdrawal: { Args: { _user_id: string }; Returns: Json }
      reserve_moderation_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: Json
      }
      review_photo_exchange_photo: {
        Args: { _decision: string; _photo_id: string; _reason?: string }
        Returns: Json
      }
      review_suggestion: {
        Args: {
          _admin_notes?: string
          _new_status: string
          _suggestion_id: string
        }
        Returns: Json
      }
      revoke_premium: { Args: { _target_user_id: string }; Returns: Json }
      send_credit_gift: {
        Args: {
          _amount: number
          _message_id?: string
          _recipient_id: string
          _sender_id: string
        }
        Returns: Json
      }
      subscribe_ad_free:
        | { Args: { _plan?: string; _user_id: string }; Returns: Json }
        | { Args: { _plan_id: string; _user_id: string }; Returns: Json }
      toggle_credit_lock: {
        Args: { _lock_type: string; _value: boolean }
        Returns: undefined
      }
      toggle_location_visibility: {
        Args: { _hide: boolean; _user_id: string }
        Returns: Json
      }
      update_successful_referrals: {
        Args: { _referral_code_id: string }
        Returns: undefined
      }
      validate_referral_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      credit_type: "daily" | "bonus" | "purchased" | "passive"
      moderation_action_type:
        | "user_suspended"
        | "user_unblocked"
        | "verification_approved"
        | "verification_rejected"
        | "verification_requested"
        | "report_resolved"
        | "report_dismissed"
        | "manual_verification"
      moderator_task_type:
        | "identity_verification"
        | "report_response"
        | "user_suspension"
        | "private_message_response"
        | "verification_request"
        | "credit_management"
        | "content_moderation"
        | "withdrawal_management"
        | "promo_validation"
        | "support_chat"
      report_reason:
        | "harassment"
        | "inappropriate_content"
        | "spam"
        | "fake_profile"
        | "underage"
        | "other"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
      verification_status: "pending" | "approved" | "rejected"
      withdrawal_status: "pending" | "approved" | "rejected" | "completed"
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
      app_role: ["admin", "moderator", "user"],
      credit_type: ["daily", "bonus", "purchased", "passive"],
      moderation_action_type: [
        "user_suspended",
        "user_unblocked",
        "verification_approved",
        "verification_rejected",
        "verification_requested",
        "report_resolved",
        "report_dismissed",
        "manual_verification",
      ],
      moderator_task_type: [
        "identity_verification",
        "report_response",
        "user_suspension",
        "private_message_response",
        "verification_request",
        "credit_management",
        "content_moderation",
        "withdrawal_management",
        "promo_validation",
        "support_chat",
      ],
      report_reason: [
        "harassment",
        "inappropriate_content",
        "spam",
        "fake_profile",
        "underage",
        "other",
      ],
      report_status: ["pending", "reviewed", "resolved", "dismissed"],
      verification_status: ["pending", "approved", "rejected"],
      withdrawal_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
