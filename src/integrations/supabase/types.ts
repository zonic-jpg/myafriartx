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
      admin_access_requests: {
        Row: {
          app: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          id: string
          identity: string | null
          note: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          app?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          id?: string
          identity?: string | null
          note?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          app?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          id?: string
          identity?: string | null
          note?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
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
      artists: {
        Row: {
          alma_mater: string | null
          bio: string | null
          content_source: string
          country: string | null
          created_at: string
          date_of_birth: string | null
          domicile_city: string | null
          era: string | null
          exhibition_interest: boolean
          exhibition_notes: string | null
          gender: string | null
          id: string
          name: string
          outreach_note: string | null
          outreach_source: string | null
          outreach_status: string | null
          portrait_url: string | null
          primary_medium: string | null
          profile_status: string
          short_code: string | null
          updated_at: string
          view_count: number
          website: string | null
        }
        Insert: {
          alma_mater?: string | null
          bio?: string | null
          content_source?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          domicile_city?: string | null
          era?: string | null
          exhibition_interest?: boolean
          exhibition_notes?: string | null
          gender?: string | null
          id?: string
          name: string
          outreach_note?: string | null
          outreach_source?: string | null
          outreach_status?: string | null
          portrait_url?: string | null
          primary_medium?: string | null
          profile_status?: string
          short_code?: string | null
          updated_at?: string
          view_count?: number
          website?: string | null
        }
        Update: {
          alma_mater?: string | null
          bio?: string | null
          content_source?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          domicile_city?: string | null
          era?: string | null
          exhibition_interest?: boolean
          exhibition_notes?: string | null
          gender?: string | null
          id?: string
          name?: string
          outreach_note?: string | null
          outreach_source?: string | null
          outreach_status?: string | null
          portrait_url?: string | null
          primary_medium?: string | null
          profile_status?: string
          short_code?: string | null
          updated_at?: string
          view_count?: number
          website?: string | null
        }
        Relationships: []
      }
      artwork_submissions: {
        Row: {
          artist_name: string
          artwork_id: string | null
          category: string | null
          context: string | null
          country_of_origin: string | null
          created_at: string
          depth_cm: number | null
          height_cm: number | null
          id: string
          image_path: string | null
          image_url: string
          medium: string | null
          price_amount: number | null
          price_currency: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_text: string | null
          status: string
          submitted_by: string | null
          submitter_email: string | null
          submitter_name: string | null
          title: string
          updated_at: string
          width_cm: number | null
          year_created: string | null
        }
        Insert: {
          artist_name: string
          artwork_id?: string | null
          category?: string | null
          context?: string | null
          country_of_origin?: string | null
          created_at?: string
          depth_cm?: number | null
          height_cm?: number | null
          id?: string
          image_path?: string | null
          image_url: string
          medium?: string | null
          price_amount?: number | null
          price_currency?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_text?: string | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          title: string
          updated_at?: string
          width_cm?: number | null
          year_created?: string | null
        }
        Update: {
          artist_name?: string
          artwork_id?: string | null
          category?: string | null
          context?: string | null
          country_of_origin?: string | null
          created_at?: string
          depth_cm?: number | null
          height_cm?: number | null
          id?: string
          image_path?: string | null
          image_url?: string
          medium?: string | null
          price_amount?: number | null
          price_currency?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_text?: string | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          title?: string
          updated_at?: string
          width_cm?: number | null
          year_created?: string | null
        }
        Relationships: []
      }
      artworks: {
        Row: {
          artist_id: string | null
          content_source: string
          created_at: string
          currency: string
          default_frame: string | null
          depth_cm: number | null
          description: string | null
          dominant_palette: string[] | null
          height_cm: number | null
          id: string
          image_url: string
          is_active: boolean
          is_pledged: boolean
          lifecycle_status: string
          medium: Database["public"]["Enums"]["art_medium"]
          origin: string | null
          pledge_id: string | null
          price: number | null
          short_code: string | null
          size_text: string | null
          submission_id: string | null
          title: string
          updated_at: string
          view_count: number
          width_cm: number | null
          year: string | null
        }
        Insert: {
          artist_id?: string | null
          content_source?: string
          created_at?: string
          currency?: string
          default_frame?: string | null
          depth_cm?: number | null
          description?: string | null
          dominant_palette?: string[] | null
          height_cm?: number | null
          id?: string
          image_url: string
          is_active?: boolean
          is_pledged?: boolean
          lifecycle_status?: string
          medium: Database["public"]["Enums"]["art_medium"]
          origin?: string | null
          pledge_id?: string | null
          price?: number | null
          short_code?: string | null
          size_text?: string | null
          submission_id?: string | null
          title: string
          updated_at?: string
          view_count?: number
          width_cm?: number | null
          year?: string | null
        }
        Update: {
          artist_id?: string | null
          content_source?: string
          created_at?: string
          currency?: string
          default_frame?: string | null
          depth_cm?: number | null
          description?: string | null
          dominant_palette?: string[] | null
          height_cm?: number | null
          id?: string
          image_url?: string
          is_active?: boolean
          is_pledged?: boolean
          lifecycle_status?: string
          medium?: Database["public"]["Enums"]["art_medium"]
          origin?: string | null
          pledge_id?: string | null
          price?: number | null
          short_code?: string | null
          size_text?: string | null
          submission_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          width_cm?: number | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_pledge_id_fkey"
            columns: ["pledge_id"]
            isOneToOne: false
            referencedRelation: "collateral_pledges"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          amount: number
          bidder: string | null
          created_at: string | null
          id: string
          lot_id: string | null
        }
        Insert: {
          amount: number
          bidder?: string | null
          created_at?: string | null
          id?: string
          lot_id?: string | null
        }
        Update: {
          amount?: number
          bidder?: string | null
          created_at?: string | null
          id?: string
          lot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "auction_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_lots: {
        Row: {
          artist: string | null
          artwork_id: string | null
          bid_count: number
          code: string | null
          created_at: string | null
          current_bid: number
          description: string | null
          ends_at: string | null
          estimate_high: number | null
          estimate_low: number | null
          id: string
          image_url: string | null
          leading_bidder: string | null
          medium: string | null
          payment_due_at: string | null
          payment_id: string | null
          reserve: number
          starting_bid: number
          status: string
          title: string
        }
        Insert: {
          artist?: string | null
          artwork_id?: string | null
          bid_count?: number
          code?: string | null
          created_at?: string | null
          current_bid?: number
          description?: string | null
          ends_at?: string | null
          estimate_high?: number | null
          estimate_low?: number | null
          id?: string
          image_url?: string | null
          leading_bidder?: string | null
          medium?: string | null
          payment_due_at?: string | null
          payment_id?: string | null
          reserve?: number
          starting_bid?: number
          status?: string
          title: string
        }
        Update: {
          artist?: string | null
          artwork_id?: string | null
          bid_count?: number
          code?: string | null
          created_at?: string | null
          current_bid?: number
          description?: string | null
          ends_at?: string | null
          estimate_high?: number | null
          estimate_low?: number | null
          id?: string
          image_url?: string | null
          leading_bidder?: string | null
          medium?: string | null
          payment_due_at?: string | null
          payment_id?: string | null
          reserve?: number
          starting_bid?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_lots_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_requests: {
        Row: {
          admin_notes: string | null
          carrier: string | null
          certificate_url: string | null
          content_source: string
          created_at: string
          currency: string
          delivered_at: string | null
          delivery_notes: string | null
          fee_amount: number | null
          fee_percent: number | null
          id: string
          listing_id: string
          requester_id: string
          short_code: string | null
          status: Database["public"]["Enums"]["broker_status"]
          thread_id: string
          tracking_ref: string | null
          transaction_amount: number | null
          updated_at: string
          verification_notes: string | null
          verifier_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          carrier?: string | null
          certificate_url?: string | null
          content_source?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          id?: string
          listing_id: string
          requester_id: string
          short_code?: string | null
          status?: Database["public"]["Enums"]["broker_status"]
          thread_id: string
          tracking_ref?: string | null
          transaction_amount?: number | null
          updated_at?: string
          verification_notes?: string | null
          verifier_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          carrier?: string | null
          certificate_url?: string | null
          content_source?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          id?: string
          listing_id?: string
          requester_id?: string
          short_code?: string | null
          status?: Database["public"]["Enums"]["broker_status"]
          thread_id?: string
          tracking_ref?: string | null
          transaction_amount?: number | null
          updated_at?: string
          verification_notes?: string | null
          verifier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_allocations_artists: {
        Row: {
          country: string
          percent: number
          updated_at: string
        }
        Insert: {
          country: string
          percent: number
          updated_at?: string
        }
        Update: {
          country?: string
          percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalogue_allocations_pieces: {
        Row: {
          country: string
          percent: number
          updated_at: string
        }
        Insert: {
          country: string
          percent: number
          updated_at?: string
        }
        Update: {
          country?: string
          percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      certificate_registry: {
        Row: {
          artist_name: string | null
          artwork_id: string | null
          broker_request_id: string | null
          certificate_url: string | null
          id: string
          issued_at: string
          metadata: Json
          owner_name: string | null
          revoked_at: string | null
          title: string
          verify_code: string
        }
        Insert: {
          artist_name?: string | null
          artwork_id?: string | null
          broker_request_id?: string | null
          certificate_url?: string | null
          id?: string
          issued_at?: string
          metadata?: Json
          owner_name?: string | null
          revoked_at?: string | null
          title: string
          verify_code: string
        }
        Update: {
          artist_name?: string | null
          artwork_id?: string | null
          broker_request_id?: string | null
          certificate_url?: string | null
          id?: string
          issued_at?: string
          metadata?: Json
          owner_name?: string | null
          revoked_at?: string | null
          title?: string
          verify_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_registry_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_registry_broker_request_id_fkey"
            columns: ["broker_request_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_registry_broker_request_id_fkey"
            columns: ["broker_request_id"]
            isOneToOne: false
            referencedRelation: "broker_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      collateral_pledges: {
        Row: {
          appraised_value_ngn: number
          artwork_id: string | null
          authentication_notes: string | null
          broker_request_id: string | null
          certificate_url: string | null
          created_at: string
          id: string
          loan_amount_ngn: number
          released_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appraised_value_ngn: number
          artwork_id?: string | null
          authentication_notes?: string | null
          broker_request_id?: string | null
          certificate_url?: string | null
          created_at?: string
          id?: string
          loan_amount_ngn: number
          released_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appraised_value_ngn?: number
          artwork_id?: string | null
          authentication_notes?: string | null
          broker_request_id?: string | null
          certificate_url?: string | null
          created_at?: string
          id?: string
          loan_amount_ngn?: number
          released_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collateral_pledges_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collateral_pledges_broker_request_id_fkey"
            columns: ["broker_request_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collateral_pledges_broker_request_id_fkey"
            columns: ["broker_request_id"]
            isOneToOne: false
            referencedRelation: "broker_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      content_staging: {
        Row: {
          artist_id: string | null
          attributes: Json
          category: string | null
          confidence: number | null
          created_at: string
          cultural_tags: string[]
          description: string | null
          id: string
          image_hash: string | null
          image_url: string | null
          medium: Database["public"]["Enums"]["art_medium"] | null
          needs_vetting: boolean
          origin: string | null
          price_band: string | null
          source_name: string | null
          staged_by: string | null
          status: string
          subcategory: string | null
          title: string
          year: string | null
        }
        Insert: {
          artist_id?: string | null
          attributes?: Json
          category?: string | null
          confidence?: number | null
          created_at?: string
          cultural_tags?: string[]
          description?: string | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          medium?: Database["public"]["Enums"]["art_medium"] | null
          needs_vetting?: boolean
          origin?: string | null
          price_band?: string | null
          source_name?: string | null
          staged_by?: string | null
          status?: string
          subcategory?: string | null
          title: string
          year?: string | null
        }
        Update: {
          artist_id?: string | null
          attributes?: Json
          category?: string | null
          confidence?: number | null
          created_at?: string
          cultural_tags?: string[]
          description?: string | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          medium?: Database["public"]["Enums"]["art_medium"] | null
          needs_vetting?: boolean
          origin?: string | null
          price_band?: string | null
          source_name?: string | null
          staged_by?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_staging_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_clicks: {
        Row: {
          created_at: string
          entry_point: string
          id: string
          location: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entry_point: string
          id?: string
          location: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entry_point?: string
          id?: string
          location?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      escrow_holds: {
        Row: {
          amount_ngn: number
          buyer_id: string
          created_at: string
          id: string
          listing_id: string | null
          payment_id: string | null
          release_reason: string | null
          released_at: string | null
          seller_id: string
          status: string
          thread_id: string | null
        }
        Insert: {
          amount_ngn: number
          buyer_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          payment_id?: string | null
          release_reason?: string | null
          released_at?: string | null
          seller_id: string
          status?: string
          thread_id?: string | null
        }
        Update: {
          amount_ngn?: number
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          payment_id?: string | null
          release_reason?: string | null
          released_at?: string | null
          seller_id?: string
          status?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_holds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_holds_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_panes: {
        Row: {
          content_source: string
          created_at: string
          id: string
          image_url: string | null
          image_url_mobile: string | null
          is_active: boolean
          kicker: string
          pane_id: string
          reveal: string
          sort_order: number
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          content_source?: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_url_mobile?: string | null
          is_active?: boolean
          kicker: string
          pane_id: string
          reveal?: string
          sort_order?: number
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          content_source?: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_url_mobile?: string | null
          is_active?: boolean
          kicker?: string
          pane_id?: string
          reveal?: string
          sort_order?: number
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      legacy_myafriart_artists: {
        Row: {
          about: string | null
          address: string | null
          claimed_at: string | null
          claimed_profile_id: string | null
          consent_note: string | null
          consent_status: string
          consent_updated_at: string | null
          consent_updated_by: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          last_name: string | null
          legacy_activation_status: string | null
          legacy_artist_id: number
          legacy_artworks_count: number
          legacy_date_registered: string | null
          matched_artist_id: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          address?: string | null
          claimed_at?: string | null
          claimed_profile_id?: string | null
          consent_note?: string | null
          consent_status?: string
          consent_updated_at?: string | null
          consent_updated_by?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          legacy_activation_status?: string | null
          legacy_artist_id: number
          legacy_artworks_count?: number
          legacy_date_registered?: string | null
          matched_artist_id?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          address?: string | null
          claimed_at?: string | null
          claimed_profile_id?: string | null
          consent_note?: string | null
          consent_status?: string
          consent_updated_at?: string | null
          consent_updated_by?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          legacy_activation_status?: string | null
          legacy_artist_id?: number
          legacy_artworks_count?: number
          legacy_date_registered?: string | null
          matched_artist_id?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_myafriart_artists_claimed_profile_id_fkey"
            columns: ["claimed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_myafriart_artists_matched_artist_id_fkey"
            columns: ["matched_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      letters_sent: {
        Row: {
          audience: string
          body_html: string | null
          created_at: string
          error_message: string | null
          id: string
          provider_id: string | null
          recipient_brand: string
          recipient_email: string
          sent_by: string | null
          sent_by_email: string | null
          status: string
          subject: string
        }
        Insert: {
          audience: string
          body_html?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider_id?: string | null
          recipient_brand: string
          recipient_email: string
          sent_by?: string | null
          sent_by_email?: string | null
          status?: string
          subject: string
        }
        Update: {
          audience?: string
          body_html?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider_id?: string | null
          recipient_brand?: string
          recipient_email?: string
          sent_by?: string | null
          sent_by_email?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          artwork_id: string | null
          content_source: string
          created_at: string
          currency: string
          id: string
          image_url: string | null
          medium: string | null
          member_id: string
          notes: string | null
          price: number | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
        }
        Insert: {
          artwork_id?: string | null
          content_source?: string
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          medium?: string | null
          member_id: string
          notes?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
        }
        Update: {
          artwork_id?: string | null
          content_source?: string
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          medium?: string | null
          member_id?: string
          notes?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_events: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          detail_image_url: string | null
          detail_text: string | null
          detail_video_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          starts_at: string
          status: string
          tags: string[]
          ticket_url: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          detail_image_url?: string | null
          detail_text?: string | null
          detail_video_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at: string
          status?: string
          tags?: string[]
          ticket_url?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          detail_image_url?: string | null
          detail_text?: string | null
          detail_video_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string
          status?: string
          tags?: string[]
          ticket_url?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      member_verifications: {
        Row: {
          document_path: string | null
          full_name: string | null
          id_reference: string | null
          id_type: string | null
          notes: string | null
          rejected_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_path?: string | null
          full_name?: string | null
          id_reference?: string | null
          id_type?: string | null
          notes?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_path?: string | null
          full_name?: string | null
          id_reference?: string | null
          id_type?: string | null
          notes?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_preferences: {
        Row: {
          artist_age_max: number | null
          artist_age_min: number | null
          categories: Database["public"]["Enums"]["art_medium"][]
          countries: string[]
          created_at: string
          currency: string
          enabled: boolean
          frequency_per_week: number
          genders: string[]
          price_max: number | null
          price_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_age_max?: number | null
          artist_age_min?: number | null
          categories?: Database["public"]["Enums"]["art_medium"][]
          countries?: string[]
          created_at?: string
          currency?: string
          enabled?: boolean
          frequency_per_week?: number
          genders?: string[]
          price_max?: number | null
          price_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_age_max?: number | null
          artist_age_min?: number | null
          categories?: Database["public"]["Enums"]["art_medium"][]
          countries?: string[]
          created_at?: string
          currency?: string
          enabled?: boolean
          frequency_per_week?: number
          genders?: string[]
          price_max?: number | null
          price_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notify_reel_panes: {
        Row: {
          artwork_id: string | null
          created_at: string
          id: string
          kind: string
          position: number
          reel_id: string
          sponsor_pane_id: string | null
        }
        Insert: {
          artwork_id?: string | null
          created_at?: string
          id?: string
          kind: string
          position: number
          reel_id: string
          sponsor_pane_id?: string | null
        }
        Update: {
          artwork_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          position?: number
          reel_id?: string
          sponsor_pane_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notify_reel_panes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "notify_reels"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_reels: {
        Row: {
          created_at: string
          delivered_at: string | null
          email_sent_at: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email_sent_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email_sent_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      outreach_works: {
        Row: {
          artist_id: string | null
          artist_short_code: string
          created_at: string
          id: string
          image_url: string | null
          slot: number
          source_url: string | null
          title: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_short_code: string
          created_at?: string
          id?: string
          image_url?: string | null
          slot: number
          source_url?: string | null
          title?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_short_code?: string
          created_at?: string
          id?: string
          image_url?: string | null
          slot?: number
          source_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_works_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      pane_views: {
        Row: {
          created_at: string
          id: string
          pane_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pane_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pane_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_disputes: {
        Row: {
          created_at: string
          escrow_hold_id: string | null
          id: string
          opened_by: string
          payment_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escrow_hold_id?: string | null
          id?: string
          opened_by: string
          payment_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escrow_hold_id?: string | null
          id?: string
          opened_by?: string
          payment_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_escrow_hold_id_fkey"
            columns: ["escrow_hold_id"]
            isOneToOne: false
            referencedRelation: "escrow_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          event_id: string
          id: string
          payload: Json
          processed_at: string
          provider: string
          reference: string | null
        }
        Insert: {
          event_id: string
          id?: string
          payload?: Json
          processed_at?: string
          provider: string
          reference?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string
          provider?: string
          reference?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ngn: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          provider: string
          provider_ref: string | null
          purpose: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_ngn: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_ref?: string | null
          purpose: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_ngn?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_ref?: string | null
          purpose?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          external_source: string | null
          external_user_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          external_source?: string | null
          external_user_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          external_source?: string | null
          external_user_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provenance_events: {
        Row: {
          amount_ngn: number | null
          artwork_id: string | null
          created_at: string
          event_type: string
          from_party: string | null
          id: string
          listing_id: string | null
          notes: string | null
          recorded_by: string | null
          to_party: string | null
        }
        Insert: {
          amount_ngn?: number | null
          artwork_id?: string | null
          created_at?: string
          event_type: string
          from_party?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          recorded_by?: string | null
          to_party?: string | null
        }
        Update: {
          amount_ngn?: number | null
          artwork_id?: string | null
          created_at?: string
          event_type?: string
          from_party?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          recorded_by?: string | null
          to_party?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provenance_events_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provenance_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      renders: {
        Row: {
          artwork_ids: string[]
          created_at: string
          error_message: string | null
          id: string
          is_featured: boolean
          media_filter: Database["public"]["Enums"]["art_medium"][]
          prompt: string | null
          result_image_url: string | null
          source_image_url: string
          status: Database["public"]["Enums"]["render_status"]
          style_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artwork_ids?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          is_featured?: boolean
          media_filter?: Database["public"]["Enums"]["art_medium"][]
          prompt?: string | null
          result_image_url?: string | null
          source_image_url: string
          status?: Database["public"]["Enums"]["render_status"]
          style_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artwork_ids?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          is_featured?: boolean
          media_filter?: Database["public"]["Enums"]["art_medium"][]
          prompt?: string | null
          result_image_url?: string | null
          source_image_url?: string
          status?: Database["public"]["Enums"]["render_status"]
          style_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renders_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_panes: {
        Row: {
          created_at: string
          headline: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          headline?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      styles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          prompt_fragment: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt_fragment: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt_fragment?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      threads: {
        Row: {
          buyer_id: string
          content_source: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          content_source?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          content_source?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      admin_transactions: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          fee_amount: number | null
          fee_percent: number | null
          id: string | null
          is_sale: boolean | null
          listing_id: string | null
          listing_title: string | null
          requester_id: string | null
          seller_id: string | null
          short_code: string | null
          status: Database["public"]["Enums"]["broker_status"] | null
          thread_id: string | null
          transaction_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_access_status: { Args: { p_email: string }; Returns: string }
      claim_legacy_artist_by_email: {
        Args: { _profile_id: string }
        Returns: string
      }
      fulfill_payment_record: {
        Args: { p_payment_id: string; p_reference: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view: {
        Args: { target_id: string; target_table: string }
        Returns: undefined
      }
      is_member_verified: { Args: { p_user_id: string }; Returns: boolean }
      list_admin_access_queue: {
        Args: { p_orbit_password: string }
        Returns: {
          app: string
          decided_at: string
          decided_by: string
          email: string
          id: string
          identity: string
          requested_at: string
          status: string
        }[]
      }
      list_artwork_submissions_queue: {
        Args: { p_orbit_password: string; p_status?: string }
        Returns: {
          artist_name: string
          artwork_id: string | null
          category: string | null
          context: string | null
          country_of_origin: string | null
          created_at: string
          depth_cm: number | null
          height_cm: number | null
          id: string
          image_path: string | null
          image_url: string
          medium: string | null
          price_amount: number | null
          price_currency: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_text: string | null
          status: string
          submitted_by: string | null
          submitter_email: string | null
          submitter_name: string | null
          title: string
          updated_at: string
          width_cm: number | null
          year_created: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "artwork_submissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      place_bid: {
        Args: { p_amount: number; p_lot: string }
        Returns: {
          artist: string | null
          artwork_id: string | null
          bid_count: number
          code: string | null
          created_at: string | null
          current_bid: number
          description: string | null
          ends_at: string | null
          estimate_high: number | null
          estimate_low: number | null
          id: string
          image_url: string | null
          leading_bidder: string | null
          medium: string | null
          payment_due_at: string | null
          payment_id: string | null
          reserve: number
          starting_bid: number
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "auction_lots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_certificate: {
        Args: {
          p_artist: string
          p_artwork_id?: string
          p_broker_id: string
          p_owner: string
          p_title: string
          p_url: string
        }
        Returns: string
      }
      resolve_payment_dispute: {
        Args: {
          p_admin_id: string
          p_dispute_id: string
          p_outcome: string
          p_refund_escrow: boolean
          p_resolution: string
        }
        Returns: Json
      }
      settle_expired_auction_lots: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      art_medium:
        | "oil"
        | "watercolor"
        | "pastel"
        | "sculpture"
        | "photograph"
        | "print"
        | "mixed_media"
        | "acrylic"
        | "drawing"
      broker_status:
        | "requested"
        | "accepted"
        | "rejected"
        | "verified"
        | "in_transit"
        | "delivered"
        | "certified"
        | "closed"
      listing_status: "open" | "closed"
      listing_type: "sell" | "buy"
      render_status: "pending" | "processing" | "completed" | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
} as const
