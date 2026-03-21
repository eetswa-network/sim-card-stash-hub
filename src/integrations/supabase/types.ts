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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          login: string
          login_url: string | null
          password: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login: string
          login_url?: string | null
          password?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login?: string
          login_url?: string | null
          password?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          title: string
          update_type: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          title: string
          update_type?: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title?: string
          update_type?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      carriers: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          profile_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          profile_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          profile_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sim_card_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          event_type: string
          id: string
          new_user_id: string | null
          new_value: string | null
          notes: string | null
          old_value: string | null
          previous_user_id: string | null
          sim_card_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          event_type?: string
          id?: string
          new_user_id?: string | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          previous_user_id?: string | null
          sim_card_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          event_type?: string
          id?: string
          new_user_id?: string | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          previous_user_id?: string | null
          sim_card_id?: string
        }
        Relationships: []
      }
      sim_card_locations: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      sim_card_shares: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          owner_id: string
          shared_with_id: string
          sim_card_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          owner_id: string
          shared_with_id: string
          sim_card_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          owner_id?: string
          shared_with_id?: string
          sim_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_card_shares_sim_card_id_fkey"
            columns: ["sim_card_id"]
            isOneToOne: false
            referencedRelation: "sim_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_card_usage: {
        Row: {
          created_at: string
          id: string
          name: string
          sim_card_id: string
          updated_at: string
          use_purpose: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sim_card_id: string
          updated_at?: string
          use_purpose: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sim_card_id?: string
          updated_at?: string
          use_purpose?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_card_usage_sim_card_id_fkey"
            columns: ["sim_card_id"]
            isOneToOne: false
            referencedRelation: "sim_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_cards: {
        Row: {
          account_id: string | null
          activated_at: string | null
          carrier: string | null
          created_at: string
          id: string
          location: string | null
          login: string | null
          notes: string | null
          password: string | null
          phone_number: string
          profile_id: string | null
          sim_number: string
          sim_type: string
          status: string | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          account_id?: string | null
          activated_at?: string | null
          carrier?: string | null
          created_at?: string
          id?: string
          location?: string | null
          login?: string | null
          notes?: string | null
          password?: string | null
          phone_number: string
          profile_id?: string | null
          sim_number: string
          sim_type?: string
          status?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          account_id?: string | null
          activated_at?: string | null
          carrier?: string | null
          created_at?: string
          id?: string
          location?: string | null
          login?: string | null
          notes?: string | null
          password?: string | null
          phone_number?: string
          profile_id?: string | null
          sim_number?: string
          sim_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sim_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials: {
        Row: {
          backup_eligible: boolean
          backup_state: boolean
          counter: number
          created_at: string
          credential_id: string
          id: string
          last_used_at: string | null
          name: string | null
          public_key_jwk: Json
          user_id: string
        }
        Insert: {
          backup_eligible?: boolean
          backup_state?: boolean
          counter?: number
          created_at?: string
          credential_id: string
          id?: string
          last_used_at?: string | null
          name?: string | null
          public_key_jwk: Json
          user_id: string
        }
        Update: {
          backup_eligible?: boolean
          backup_state?: boolean
          counter?: number
          created_at?: string
          credential_id?: string
          id?: string
          last_used_at?: string | null
          name?: string | null
          public_key_jwk?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          backup_codes: string[] | null
          backup_codes_hashed: string[] | null
          created_at: string
          encryption_salt: string | null
          id: string
          is_enabled: boolean
          secret: string | null
          secret_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          backup_codes_hashed?: string[] | null
          created_at?: string
          encryption_salt?: string | null
          id?: string
          is_enabled?: boolean
          secret?: string | null
          secret_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          backup_codes_hashed?: string[] | null
          created_at?: string
          encryption_salt?: string | null
          id?: string
          is_enabled?: boolean
          secret?: string | null
          secret_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_backed_up: boolean
          credential_device_type: string
          credential_id: string
          credential_public_key: string
          id: string
          last_used_at: string | null
          nickname: string | null
          transports: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_backed_up?: boolean
          credential_device_type: string
          credential_id: string
          credential_public_key: string
          id?: string
          last_used_at?: string | null
          nickname?: string | null
          transports?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_backed_up?: boolean
          credential_device_type?: string
          credential_id?: string
          credential_public_key?: string
          id?: string
          last_used_at?: string | null
          nickname?: string | null
          transports?: string[] | null
          updated_at?: string
          user_id?: string
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
      user_update_views: {
        Row: {
          id: string
          update_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          update_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_update_views_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "app_updates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_email: {
        Args: { search_email: string }
        Returns: {
          email: string
          profile_name: string
          user_id: string
        }[]
      }
      generate_random_salt: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_account_password: {
        Args: { password_text: string }
        Returns: string
      }
      verify_account_password: {
        Args: { password_hash: string; password_text: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
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
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
