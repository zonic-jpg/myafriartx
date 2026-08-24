export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      artists: {
        Row: {
          alma_mater: string | null;
          bio: string | null;
          content_source: string;
          country: string | null;
          created_at: string;
          date_of_birth: string | null;
          domicile_city: string | null;
          era: string | null;
          gender: string | null;
          id: string;
          name: string;
          portrait_url: string | null;
          short_code: string | null;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          alma_mater?: string | null;
          bio?: string | null;
          content_source?: string;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          domicile_city?: string | null;
          era?: string | null;
          gender?: string | null;
          id?: string;
          name: string;
          portrait_url?: string | null;
          short_code?: string | null;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          alma_mater?: string | null;
          bio?: string | null;
          content_source?: string;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          domicile_city?: string | null;
          era?: string | null;
          gender?: string | null;
          id?: string;
          name?: string;
          portrait_url?: string | null;
          short_code?: string | null;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      artworks: {
        Row: {
          artist_id: string | null;
          content_source: string;
          created_at: string;
          currency: string;
          default_frame: string | null;
          description: string | null;
          dominant_palette: string[] | null;
          id: string;
          image_url: string;
          is_active: boolean;
          lifecycle_status: string;
          medium: Database["public"]["Enums"]["art_medium"];
          price: number | null;
          short_code: string | null;
          title: string;
          updated_at: string;
          view_count: number;
          year: string | null;
        };
        Insert: {
          artist_id?: string | null;
          content_source?: string;
          created_at?: string;
          currency?: string;
          default_frame?: string | null;
          description?: string | null;
          dominant_palette?: string[] | null;
          id?: string;
          image_url: string;
          is_active?: boolean;
          lifecycle_status?: string;
          medium: Database["public"]["Enums"]["art_medium"];
          price?: number | null;
          short_code?: string | null;
          title: string;
          updated_at?: string;
          view_count?: number;
          year?: string | null;
        };
        Update: {
          artist_id?: string | null;
          content_source?: string;
          created_at?: string;
          currency?: string;
          default_frame?: string | null;
          description?: string | null;
          dominant_palette?: string[] | null;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          lifecycle_status?: string;
          medium?: Database["public"]["Enums"]["art_medium"];
          price?: number | null;
          short_code?: string | null;
          title?: string;
          updated_at?: string;
          view_count?: number;
          year?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      broker_requests: {
        Row: {
          admin_notes: string | null;
          carrier: string | null;
          certificate_url: string | null;
          content_source: string;
          created_at: string;
          currency: string;
          delivered_at: string | null;
          delivery_notes: string | null;
          fee_amount: number | null;
          fee_percent: number | null;
          id: string;
          listing_id: string;
          requester_id: string;
          short_code: string | null;
          status: Database["public"]["Enums"]["broker_status"];
          thread_id: string;
          tracking_ref: string | null;
          transaction_amount: number | null;
          updated_at: string;
          verification_notes: string | null;
          verifier_name: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          carrier?: string | null;
          certificate_url?: string | null;
          content_source?: string;
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          delivery_notes?: string | null;
          fee_amount?: number | null;
          fee_percent?: number | null;
          id?: string;
          listing_id: string;
          requester_id: string;
          short_code?: string | null;
          status?: Database["public"]["Enums"]["broker_status"];
          thread_id: string;
          tracking_ref?: string | null;
          transaction_amount?: number | null;
          updated_at?: string;
          verification_notes?: string | null;
          verifier_name?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          carrier?: string | null;
          certificate_url?: string | null;
          content_source?: string;
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          delivery_notes?: string | null;
          fee_amount?: number | null;
          fee_percent?: number | null;
          id?: string;
          listing_id?: string;
          requester_id?: string;
          short_code?: string | null;
          status?: Database["public"]["Enums"]["broker_status"];
          thread_id?: string;
          tracking_ref?: string | null;
          transaction_amount?: number | null;
          updated_at?: string;
          verification_notes?: string | null;
          verifier_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "broker_requests_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "broker_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "broker_requests_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id"];
          },
        ];
      };
      catalogue_allocations_artists: {
        Row: {
          country: string;
          percent: number;
          updated_at: string;
        };
        Insert: {
          country: string;
          percent: number;
          updated_at?: string;
        };
        Update: {
          country?: string;
          percent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      catalogue_allocations_pieces: {
        Row: {
          country: string;
          percent: number;
          updated_at: string;
        };
        Insert: {
          country: string;
          percent: number;
          updated_at?: string;
        };
        Update: {
          country?: string;
          percent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      entry_clicks: {
        Row: {
          created_at: string;
          entry_point: string;
          id: string;
          location: string;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          entry_point: string;
          id?: string;
          location: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          entry_point?: string;
          id?: string;
          location?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      landing_panes: {
        Row: {
          content_source: string;
          created_at: string;
          id: string;
          image_url: string | null;
          image_url_mobile: string | null;
          is_active: boolean;
          kicker: string;
          pane_id: string;
          reveal: string;
          sort_order: number;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          content_source?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          image_url_mobile?: string | null;
          is_active?: boolean;
          kicker: string;
          pane_id: string;
          reveal?: string;
          sort_order?: number;
          status?: string;
          summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          content_source?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          image_url_mobile?: string | null;
          is_active?: boolean;
          kicker?: string;
          pane_id?: string;
          reveal?: string;
          sort_order?: number;
          status?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          content_source: string;
          created_at: string;
          currency: string;
          id: string;
          image_url: string | null;
          medium: string | null;
          member_id: string;
          notes: string | null;
          price: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at: string;
        };
        Insert: {
          content_source?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          image_url?: string | null;
          medium?: string | null;
          member_id: string;
          notes?: string | null;
          price?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
        };
        Update: {
          content_source?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          image_url?: string | null;
          medium?: string | null;
          member_id?: string;
          notes?: string | null;
          price?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          type?: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          sender_id: string;
          thread_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          sender_id: string;
          thread_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id"];
          },
        ];
      };
      notify_preferences: {
        Row: {
          artist_age_max: number | null;
          artist_age_min: number | null;
          categories: Database["public"]["Enums"]["art_medium"][];
          countries: string[];
          created_at: string;
          currency: string;
          enabled: boolean;
          frequency_per_week: number;
          genders: string[];
          price_max: number | null;
          price_min: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artist_age_max?: number | null;
          artist_age_min?: number | null;
          categories?: Database["public"]["Enums"]["art_medium"][];
          countries?: string[];
          created_at?: string;
          currency?: string;
          enabled?: boolean;
          frequency_per_week?: number;
          genders?: string[];
          price_max?: number | null;
          price_min?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          artist_age_max?: number | null;
          artist_age_min?: number | null;
          categories?: Database["public"]["Enums"]["art_medium"][];
          countries?: string[];
          created_at?: string;
          currency?: string;
          enabled?: boolean;
          frequency_per_week?: number;
          genders?: string[];
          price_max?: number | null;
          price_min?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notify_reel_panes: {
        Row: {
          artwork_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          position: number;
          reel_id: string;
          sponsor_pane_id: string | null;
        };
        Insert: {
          artwork_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          position: number;
          reel_id: string;
          sponsor_pane_id?: string | null;
        };
        Update: {
          artwork_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          position?: number;
          reel_id?: string;
          sponsor_pane_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notify_reel_panes_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "notify_reels";
            referencedColumns: ["id"];
          },
        ];
      };
      notify_reels: {
        Row: {
          created_at: string;
          delivered_at: string | null;
          email_sent_at: string | null;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
          viewed_at: string | null;
        };
        Insert: {
          created_at?: string;
          delivered_at?: string | null;
          email_sent_at?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          viewed_at?: string | null;
        };
        Update: {
          created_at?: string;
          delivered_at?: string | null;
          email_sent_at?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          viewed_at?: string | null;
        };
        Relationships: [];
      };
      pane_views: {
        Row: {
          created_at: string;
          id: string;
          pane_id: string;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          pane_id: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          pane_id?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          external_source: string | null;
          external_user_id: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          external_source?: string | null;
          external_user_id?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          external_source?: string | null;
          external_user_id?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      renders: {
        Row: {
          artwork_ids: string[];
          created_at: string;
          error_message: string | null;
          id: string;
          is_featured: boolean;
          media_filter: Database["public"]["Enums"]["art_medium"][];
          prompt: string | null;
          result_image_url: string | null;
          source_image_url: string;
          status: Database["public"]["Enums"]["render_status"];
          style_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artwork_ids?: string[];
          created_at?: string;
          error_message?: string | null;
          id?: string;
          is_featured?: boolean;
          media_filter?: Database["public"]["Enums"]["art_medium"][];
          prompt?: string | null;
          result_image_url?: string | null;
          source_image_url: string;
          status?: Database["public"]["Enums"]["render_status"];
          style_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          artwork_ids?: string[];
          created_at?: string;
          error_message?: string | null;
          id?: string;
          is_featured?: boolean;
          media_filter?: Database["public"]["Enums"]["art_medium"][];
          prompt?: string | null;
          result_image_url?: string | null;
          source_image_url?: string;
          status?: Database["public"]["Enums"]["render_status"];
          style_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "renders_style_id_fkey";
            columns: ["style_id"];
            isOneToOne: false;
            referencedRelation: "styles";
            referencedColumns: ["id"];
          },
        ];
      };
      sponsor_panes: {
        Row: {
          created_at: string;
          headline: string | null;
          id: string;
          image_url: string;
          is_active: boolean;
          link_url: string | null;
          sort_order: number;
          updated_at: string;
          weight: number;
        };
        Insert: {
          created_at?: string;
          headline?: string | null;
          id?: string;
          image_url: string;
          is_active?: boolean;
          link_url?: string | null;
          sort_order?: number;
          updated_at?: string;
          weight?: number;
        };
        Update: {
          created_at?: string;
          headline?: string | null;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          link_url?: string | null;
          sort_order?: number;
          updated_at?: string;
          weight?: number;
        };
        Relationships: [];
      };
      styles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          prompt_fragment: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          prompt_fragment: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          prompt_fragment?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      threads: {
        Row: {
          buyer_id: string;
          content_source: string;
          created_at: string;
          id: string;
          last_message_at: string;
          listing_id: string;
          seller_id: string;
        };
        Insert: {
          buyer_id: string;
          content_source?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          listing_id: string;
          seller_id: string;
        };
        Update: {
          buyer_id?: string;
          content_source?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          listing_id?: string;
          seller_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "threads_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      admin_transactions: {
        Row: {
          buyer_id: string | null;
          created_at: string | null;
          currency: string | null;
          delivered_at: string | null;
          fee_amount: number | null;
          fee_percent: number | null;
          id: string | null;
          is_sale: boolean | null;
          listing_id: string | null;
          listing_title: string | null;
          requester_id: string | null;
          seller_id: string | null;
          short_code: string | null;
          status: Database["public"]["Enums"]["broker_status"] | null;
          thread_id: string | null;
          transaction_amount: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "broker_requests_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "broker_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "broker_requests_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_view: {
        Args: { target_id: string; target_table: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      art_medium:
        | "oil"
        | "watercolor"
        | "pastel"
        | "sculpture"
        | "photograph"
        | "print"
        | "mixed_media"
        | "acrylic"
        | "drawing";
      broker_status:
        | "requested"
        | "accepted"
        | "rejected"
        | "verified"
        | "in_transit"
        | "delivered"
        | "certified"
        | "closed";
      listing_status: "open" | "closed";
      listing_type: "sell" | "buy";
      render_status: "pending" | "processing" | "completed" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      art_medium: [
        "oil",
        "watercolor",
        "pastel",
        "sculpture",
        "photograph",
        "print",
        "mixed_media",
        "acrylic",
        "drawing",
      ],
      broker_status: [
        "requested",
        "accepted",
        "rejected",
        "verified",
        "in_transit",
        "delivered",
        "certified",
        "closed",
      ],
      listing_status: ["open", "closed"],
      listing_type: ["sell", "buy"],
      render_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const;
