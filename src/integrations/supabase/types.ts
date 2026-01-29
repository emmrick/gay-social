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
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          region_code: string
          region_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          region_code: string
          region_name: string
        }
        Update: {
          created_at?: string
          id?: string
          region_code?: string
          region_name?: string
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
          id: string
          is_private: boolean | null
          message_type: string
          recipient_id: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          chat_room_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_private?: boolean | null
          message_type?: string
          recipient_id?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          chat_room_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_private?: boolean | null
          message_type?: string
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
      profile_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          photo_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_nsfw: boolean | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          body_type: string | null
          created_at: string
          endowment: string | null
          ethnicity: string | null
          height: number | null
          hiv_status: string | null
          id: string
          is_online: boolean | null
          is_premium: boolean | null
          is_verified: boolean
          last_seen: string | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          looking_for: string[] | null
          position_detail: string | null
          region: string
          relationship_status: string | null
          sexual_position: string | null
          show_face: boolean | null
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
          body_type?: string | null
          created_at?: string
          endowment?: string | null
          ethnicity?: string | null
          height?: number | null
          hiv_status?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean
          last_seen?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          looking_for?: string[] | null
          position_detail?: string | null
          region: string
          relationship_status?: string | null
          sexual_position?: string | null
          show_face?: boolean | null
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
          body_type?: string | null
          created_at?: string
          endowment?: string | null
          ethnicity?: string | null
          height?: number | null
          hiv_status?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean
          last_seen?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          looking_for?: string[] | null
          position_detail?: string | null
          region?: string
          relationship_status?: string | null
          sexual_position?: string | null
          show_face?: boolean | null
          tribes?: string[] | null
          updated_at?: string
          user_id?: string
          username?: string
          weight?: number | null
        }
        Relationships: []
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
          suspension_duration: unknown
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
          suspension_duration?: unknown
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
          suspension_duration?: unknown
          suspension_ends_at?: string | null
          suspension_type?: string | null
          unblocked_at?: string | null
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      report_reason:
        | "harassment"
        | "inappropriate_content"
        | "spam"
        | "fake_profile"
        | "underage"
        | "other"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
      verification_status: "pending" | "approved" | "rejected"
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
    },
  },
} as const
