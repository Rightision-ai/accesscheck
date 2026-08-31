export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      adaptation_plan_lines: {
        Row: {
          addresses_rules: number[]
          candidate_id: string
          confidence: number
          confidence_basis: string
          cost_basis: Json
          cost_expected_gbp: number
          cost_high_gbp: number
          cost_low_gbp: number
          depends_on: string[]
          difficulty: string
          duration_days: number
          feasibility: string
          field_patches: Json
          id: string
          is_inherited: boolean
          label: string
          narrative: string | null
          plan_id: string
          position: number
          preconditions: string | null
          selection_reason: string
          source: string
          trades: string[]
          verify_note: string | null
          verify_on_site: boolean
        }
        Insert: {
          addresses_rules?: number[]
          candidate_id: string
          confidence: number
          confidence_basis?: string
          cost_basis?: Json
          cost_expected_gbp: number
          cost_high_gbp: number
          cost_low_gbp: number
          depends_on?: string[]
          difficulty: string
          duration_days: number
          feasibility?: string
          field_patches?: Json
          id?: string
          is_inherited?: boolean
          label: string
          narrative?: string | null
          plan_id: string
          position: number
          preconditions?: string | null
          selection_reason?: string
          source?: string
          trades?: string[]
          verify_note?: string | null
          verify_on_site?: boolean
        }
        Update: {
          addresses_rules?: number[]
          candidate_id?: string
          confidence?: number
          confidence_basis?: string
          cost_basis?: Json
          cost_expected_gbp?: number
          cost_high_gbp?: number
          cost_low_gbp?: number
          depends_on?: string[]
          difficulty?: string
          duration_days?: number
          feasibility?: string
          field_patches?: Json
          id?: string
          is_inherited?: boolean
          label?: string
          narrative?: string | null
          plan_id?: string
          position?: number
          preconditions?: string | null
          selection_reason?: string
          source?: string
          trades?: string[]
          verify_note?: string | null
          verify_on_site?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "adaptation_plan_lines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "adaptation_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptation_plans: {
        Row: {
          additional_works: Json
          budget_cap_gbp: number
          budget_gbp: number
          current_band: string
          dropped_candidates: Json
          engine_model: string
          generated_at: string
          id: string
          organisation_id: string | null
          overall_difficulty: string
          overall_narrative: string
          potential_band: string
          rate_card_effective_from: string | null
          rate_card_id: string | null
          rate_card_label: string
          rationale_if_not_band_a: string | null
          reaches_band_a_at_30k: boolean
          rules_cleared: number[]
          rules_remaining: number[]
          survey_id: number
          total_cost_expected_gbp: number
          total_cost_high_gbp: number
          total_cost_low_gbp: number
          total_duration_days: number
          unavailable_reason: string | null
        }
        Insert: {
          additional_works?: Json
          budget_cap_gbp: number
          budget_gbp: number
          current_band: string
          dropped_candidates?: Json
          engine_model: string
          generated_at?: string
          id?: string
          organisation_id?: string | null
          overall_difficulty: string
          overall_narrative?: string
          potential_band: string
          rate_card_effective_from?: string | null
          rate_card_id?: string | null
          rate_card_label?: string
          rationale_if_not_band_a?: string | null
          reaches_band_a_at_30k?: boolean
          rules_cleared?: number[]
          rules_remaining?: number[]
          survey_id: number
          total_cost_expected_gbp?: number
          total_cost_high_gbp?: number
          total_cost_low_gbp?: number
          total_duration_days?: number
          unavailable_reason?: string | null
        }
        Update: {
          additional_works?: Json
          budget_cap_gbp?: number
          budget_gbp?: number
          current_band?: string
          dropped_candidates?: Json
          engine_model?: string
          generated_at?: string
          id?: string
          organisation_id?: string | null
          overall_difficulty?: string
          overall_narrative?: string
          potential_band?: string
          rate_card_effective_from?: string | null
          rate_card_id?: string | null
          rate_card_label?: string
          rationale_if_not_band_a?: string | null
          reaches_band_a_at_30k?: boolean
          rules_cleared?: number[]
          rules_remaining?: number[]
          survey_id?: number
          total_cost_expected_gbp?: number
          total_cost_high_gbp?: number
          total_cost_low_gbp?: number
          total_duration_days?: number
          unavailable_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptation_plans_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_plans_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_plans_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      address_geocodes: {
        Row: {
          address_key: string
          created_at: string
          formatted_address: string | null
          id: string
          latitude: number | null
          longitude: number | null
          precision: string | null
          source: string
        }
        Insert: {
          address_key: string
          created_at?: string
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          precision?: string | null
          source?: string
        }
        Update: {
          address_key?: string
          created_at?: string
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          precision?: string | null
          source?: string
        }
        Relationships: []
      }
      assessment_status_events: {
        Row: {
          actor_user_id: string
          created_at: string
          from_status: string | null
          id: string
          organisation_id: string
          reason: string | null
          survey_id: number
          to_status: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          organisation_id: string
          reason?: string | null
          survey_id: number
          to_status: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          organisation_id?: string
          reason?: string | null
          survey_id?: number
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_status_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_status_events_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      council_portals: {
        Row: {
          base_url: string
          created_at: string
          enabled: boolean
          id: string
          lpa_code: string | null
          lpa_name: string
          notes: string | null
          search_path: string
          software: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          enabled?: boolean
          id?: string
          lpa_code?: string | null
          lpa_name: string
          notes?: string | null
          search_path?: string
          software: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          lpa_code?: string | null
          lpa_name?: string
          notes?: string | null
          search_path?: string
          software?: string
          updated_at?: string
        }
        Relationships: []
      }
      evidence_sources: {
        Row: {
          confidence: number | null
          created_at: string
          external_reference: string | null
          id: string
          organisation_id: string | null
          property_id: string
          raw_metadata_json: Json
          source_date: string | null
          source_name: string | null
          source_type: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          external_reference?: string | null
          id?: string
          organisation_id?: string | null
          property_id: string
          raw_metadata_json?: Json
          source_date?: string | null
          source_name?: string | null
          source_type: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          external_reference?: string | null
          id?: string
          organisation_id?: string | null
          property_id?: string
          raw_metadata_json?: Json
          source_date?: string | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_sources_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_sources_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_detections: {
        Row: {
          created_at: string | null
          detection: Json
          id: string
          image_id: string | null
          image_url: string
          organisation_id: string | null
          scale_confidence: number | null
          scale_px_per_mm: number | null
          survey_id: number
          warnings: Json | null
        }
        Insert: {
          created_at?: string | null
          detection: Json
          id?: string
          image_id?: string | null
          image_url: string
          organisation_id?: string | null
          scale_confidence?: number | null
          scale_px_per_mm?: number | null
          survey_id: number
          warnings?: Json | null
        }
        Update: {
          created_at?: string | null
          detection?: Json
          id?: string
          image_id?: string | null
          image_url?: string
          organisation_id?: string | null
          scale_confidence?: number | null
          scale_px_per_mm?: number | null
          survey_id?: number
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_detections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_detections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_job_items: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          organisation_id: string | null
          property_id: string | null
          row_number: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          organisation_id?: string | null
          property_id?: string | null
          row_number?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          organisation_id?: string | null
          property_id?: string | null
          row_number?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "harvest_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_job_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_job_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_jobs: {
        Row: {
          column_mapping: Json
          council_id: string | null
          created_at: string
          error_log: Json
          failed_count: number
          finished_at: string | null
          id: string
          job_status: Json | null
          organisation_id: string | null
          original_filename: string | null
          processed_count: number
          started_at: string | null
          status: string
          total_properties: number
          updated_at: string
          uploaded_file_url: string | null
          user_id: string
        }
        Insert: {
          column_mapping?: Json
          council_id?: string | null
          created_at?: string
          error_log?: Json
          failed_count?: number
          finished_at?: string | null
          id?: string
          job_status?: Json | null
          organisation_id?: string | null
          original_filename?: string | null
          processed_count?: number
          started_at?: string | null
          status?: string
          total_properties?: number
          updated_at?: string
          uploaded_file_url?: string | null
          user_id: string
        }
        Update: {
          column_mapping?: Json
          council_id?: string | null
          created_at?: string
          error_log?: Json
          failed_count?: number
          finished_at?: string | null
          id?: string
          job_status?: Json | null
          organisation_id?: string | null
          original_filename?: string | null
          processed_count?: number
          started_at?: string | null
          status?: string
          total_properties?: number
          updated_at?: string
          uploaded_file_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_jobs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          organisation_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          organisation_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_audit_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organisation_id: string
          permissions: string[]
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organisation_id: string
          permissions?: string[]
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organisation_id?: string
          permissions?: string[]
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_member_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          member_id: string
          permission: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          member_id: string
          permission: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          member_id?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_member_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organisation_members"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_active_at: string | null
          last_name: string | null
          organisation_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_active_at?: string | null
          last_name?: string | null
          organisation_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_active_at?: string | null
          last_name?: string | null
          organisation_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          account_type: string
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_name: string | null
          contract_start_date: string | null
          created_at: string
          id: string
          locale: string
          logo_url: string | null
          name: string
          postcode: string | null
          region: string | null
          slug: string
          status: string
          support_email: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_name?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          postcode?: string | null
          region?: string | null
          slug: string
          status?: string
          support_email?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_name?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          postcode?: string | null
          region?: string | null
          slug?: string
          status?: string
          support_email?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      planning_application_documents: {
        Row: {
          application_id: string
          created_at: string
          description: string | null
          doc_kind: string | null
          doc_url: string
          id: string
          stored_path: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          description?: string | null
          doc_kind?: string | null
          doc_url: string
          id?: string
          stored_path?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string | null
          doc_kind?: string | null
          doc_url?: string
          id?: string
          stored_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_applications: {
        Row: {
          address: string | null
          app_type: string | null
          application_url: string | null
          council: string | null
          description: string | null
          docs_url: string | null
          first_seen_at: string
          id: string
          last_checked_at: string
          lpa_code: string | null
          n_documents: number | null
          postcode_normalised: string | null
          raw: Json
          reference: string
          software: string | null
        }
        Insert: {
          address?: string | null
          app_type?: string | null
          application_url?: string | null
          council?: string | null
          description?: string | null
          docs_url?: string | null
          first_seen_at?: string
          id?: string
          last_checked_at?: string
          lpa_code?: string | null
          n_documents?: number | null
          postcode_normalised?: string | null
          raw?: Json
          reference: string
          software?: string | null
        }
        Update: {
          address?: string | null
          app_type?: string | null
          application_url?: string | null
          council?: string | null
          description?: string | null
          docs_url?: string | null
          first_seen_at?: string
          id?: string
          last_checked_at?: string
          lpa_code?: string | null
          n_documents?: number | null
          postcode_normalised?: string | null
          raw?: Json
          reference?: string
          software?: string | null
        }
        Relationships: []
      }
      planning_searches: {
        Row: {
          address_key: string
          application_count: number
          error: string | null
          id: string
          lpa_code: string | null
          postcode_normalised: string
          searched_at: string
          source: string
          status: string
        }
        Insert: {
          address_key: string
          application_count?: number
          error?: string | null
          id?: string
          lpa_code?: string | null
          postcode_normalised: string
          searched_at?: string
          source: string
          status: string
        }
        Update: {
          address_key?: string
          application_count?: number
          error?: string | null
          id?: string
          lpa_code?: string | null
          postcode_normalised?: string
          searched_at?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          address_latitude: number | null
          address_longitude: number | null
          bedrooms: number | null
          council_id: string | null
          created_at: string
          floor_level: string | null
          geocode_precision: string | null
          geocode_source: string | null
          id: string
          known_adaptations: string | null
          latitude: number | null
          local_authority: string | null
          local_authority_code: string | null
          longitude: number | null
          map_image_path: string | null
          organisation_id: string | null
          postcode: string
          postcode_normalised: string | null
          property_ref: string | null
          property_type: string | null
          region: string | null
          street_view_image_path: string | null
          updated_at: string
          uprn: string | null
          uprn_source: string | null
          user_id: string
          ward: string | null
        }
        Insert: {
          address: string
          address_latitude?: number | null
          address_longitude?: number | null
          bedrooms?: number | null
          council_id?: string | null
          created_at?: string
          floor_level?: string | null
          geocode_precision?: string | null
          geocode_source?: string | null
          id?: string
          known_adaptations?: string | null
          latitude?: number | null
          local_authority?: string | null
          local_authority_code?: string | null
          longitude?: number | null
          map_image_path?: string | null
          organisation_id?: string | null
          postcode: string
          postcode_normalised?: string | null
          property_ref?: string | null
          property_type?: string | null
          region?: string | null
          street_view_image_path?: string | null
          updated_at?: string
          uprn?: string | null
          uprn_source?: string | null
          user_id: string
          ward?: string | null
        }
        Update: {
          address?: string
          address_latitude?: number | null
          address_longitude?: number | null
          bedrooms?: number | null
          council_id?: string | null
          created_at?: string
          floor_level?: string | null
          geocode_precision?: string | null
          geocode_source?: string | null
          id?: string
          known_adaptations?: string | null
          latitude?: number | null
          local_authority?: string | null
          local_authority_code?: string | null
          longitude?: number | null
          map_image_path?: string | null
          organisation_id?: string | null
          postcode?: string
          postcode_normalised?: string | null
          property_ref?: string | null
          property_type?: string | null
          region?: string | null
          street_view_image_path?: string | null
          updated_at?: string
          uprn?: string | null
          uprn_source?: string | null
          user_id?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_assessment_status: {
        Row: {
          assessment_readiness: string
          evidence_status: string
          missing_evidence: Json
          organisation_id: string | null
          overall_confidence: number | null
          property_id: string
          question_mapping: Json
          recommended_action: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_readiness: string
          evidence_status: string
          missing_evidence?: Json
          organisation_id?: string | null
          overall_confidence?: number | null
          property_id: string
          question_mapping?: Json
          recommended_action?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_readiness?: string
          evidence_status?: string
          missing_evidence?: Json
          organisation_id?: string | null
          overall_confidence?: number | null
          property_id?: string
          question_mapping?: Json
          recommended_action?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_assessment_status_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_assessment_status_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_features: {
        Row: {
          confidence: number | null
          created_at: string
          evidence_source_id: string | null
          feature_name: string
          feature_value: Json
          id: string
          inferred: boolean
          justification: string | null
          organisation_id: string | null
          property_id: string
          source_type: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence_source_id?: string | null
          feature_name: string
          feature_value: Json
          id?: string
          inferred?: boolean
          justification?: string | null
          organisation_id?: string | null
          property_id: string
          source_type?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence_source_id?: string | null
          feature_name?: string
          feature_value?: Json
          id?: string
          inferred?: boolean
          justification?: string | null
          organisation_id?: string | null
          property_id?: string
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_features_evidence_source_id_fkey"
            columns: ["evidence_source_id"]
            isOneToOne: false
            referencedRelation: "evidence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_features_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          created_at: string
          event_date: string | null
          evidence_source_id: string | null
          id: string
          listing_type: string
          organisation_id: string | null
          price_gbp: number | null
          property_id: string
          raw_metadata: Json
          source_name: string | null
          source_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          evidence_source_id?: string | null
          id?: string
          listing_type: string
          organisation_id?: string | null
          price_gbp?: number | null
          property_id: string
          raw_metadata?: Json
          source_name?: string | null
          source_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          evidence_source_id?: string | null
          id?: string
          listing_type?: string
          organisation_id?: string | null
          price_gbp?: number | null
          property_id?: string
          raw_metadata?: Json
          source_name?: string | null
          source_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_evidence_source_id_fkey"
            columns: ["evidence_source_id"]
            isOneToOne: false
            referencedRelation: "evidence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_card_items: {
        Row: {
          addresses_rule_numbers: number[]
          created_at: string
          description: string
          difficulty: string
          duration_days_expected: number
          duration_days_high: number
          duration_days_low: number
          field_patches: Json
          id: string
          is_active: boolean
          preconditions: string | null
          priority_hint: number
          rate_card_id: string
          rate_expected_gbp: number
          rate_high_gbp: number
          rate_low_gbp: number
          source_label: string
          trades: string[]
          unit: string
          updated_at: string
          work_item_code: string
        }
        Insert: {
          addresses_rule_numbers?: number[]
          created_at?: string
          description: string
          difficulty: string
          duration_days_expected?: number
          duration_days_high?: number
          duration_days_low?: number
          field_patches?: Json
          id?: string
          is_active?: boolean
          preconditions?: string | null
          priority_hint?: number
          rate_card_id: string
          rate_expected_gbp: number
          rate_high_gbp: number
          rate_low_gbp: number
          source_label?: string
          trades?: string[]
          unit?: string
          updated_at?: string
          work_item_code: string
        }
        Update: {
          addresses_rule_numbers?: number[]
          created_at?: string
          description?: string
          difficulty?: string
          duration_days_expected?: number
          duration_days_high?: number
          duration_days_low?: number
          field_patches?: Json
          id?: string
          is_active?: boolean
          preconditions?: string | null
          priority_hint?: number
          rate_card_id?: string
          rate_expected_gbp?: number
          rate_high_gbp?: number
          rate_low_gbp?: number
          source_label?: string
          trades?: string[]
          unit?: string
          updated_at?: string
          work_item_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_card_items_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          label: string
          organisation_id: string | null
          region: string | null
          region_multiplier: number
          source_csv: string | null
          source_filename: string | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          label: string
          organisation_id?: string | null
          region?: string | null
          region_multiplier?: number
          source_csv?: string | null
          source_filename?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          label?: string
          organisation_id?: string | null
          region?: string | null
          region_multiplier?: number
          source_csv?: string | null
          source_filename?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_annotations: {
        Row: {
          bbox: Json
          color: string | null
          confidence: number
          created_at: string
          criterion_id: string | null
          evidence_id: string | null
          id: string
          image_kind: string
          label: string
          object_class: string
          polygon: Json | null
          source: string
          survey_id: number
          value_text: string | null
        }
        Insert: {
          bbox: Json
          color?: string | null
          confidence: number
          created_at?: string
          criterion_id?: string | null
          evidence_id?: string | null
          id?: string
          image_kind: string
          label: string
          object_class: string
          polygon?: Json | null
          source: string
          survey_id: number
          value_text?: string | null
        }
        Update: {
          bbox?: Json
          color?: string | null
          confidence?: number
          created_at?: string
          criterion_id?: string | null
          evidence_id?: string | null
          id?: string
          image_kind?: string
          label?: string
          object_class?: string
          polygon?: Json | null
          source?: string
          survey_id?: number
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_annotations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "survey_evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_annotations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_evidences: {
        Row: {
          caption: string | null
          created_at: string | null
          field_reference: string | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          mime_type: string
          organisation_id: string | null
          section: string | null
          survey_id: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          field_reference?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          mime_type: string
          organisation_id?: string | null
          section?: string | null
          survey_id?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          field_reference?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          mime_type?: string
          organisation_id?: string | null
          section?: string | null
          survey_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_evidences_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_evidences_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          above_bathroom_no_toilet: boolean | null
          above_bed1: boolean | null
          above_bed2: boolean | null
          above_combined_bath_toilet: boolean | null
          above_kitchen: boolean | null
          above_living_room: boolean | null
          above_other: boolean | null
          above_separate_toilet: boolean | null
          access_bathroom_no_toilet: boolean | null
          access_bed1: boolean | null
          access_bed2: boolean | null
          access_combined_bath_toilet: boolean | null
          access_kitchen: boolean | null
          access_living_room: boolean | null
          access_other: boolean | null
          access_separate_toilet: boolean | null
          ai_confidence: number | null
          ai_field_provenance: Json
          assessment_completion_percent: number
          assessment_readiness: string
          balcony_steps_count: number | null
          bathroom_dim_depth: number | null
          bathroom_dim_width: number | null
          bathroom_has_bath: boolean | null
          bathroom_has_la_shower_and_bath: boolean | null
          bathroom_has_level_access_shower: boolean | null
          bathroom_next_to_toilet: boolean | null
          bathroom_toilet_lateral_space: number | null
          bathroom_turning_150x150: boolean | null
          below_bathroom_no_toilet: boolean | null
          below_bed1: boolean | null
          below_bed2: boolean | null
          below_combined_bath_toilet: boolean | null
          below_kitchen: boolean | null
          below_living_room: boolean | null
          below_other: boolean | null
          below_separate_toilet: boolean | null
          building_name: string | null
          can_be_adapted: boolean | null
          comments: string | null
          communal_door_opening_width: number | null
          communal_door_steps_count: number | null
          communal_door_threshold_height: string | null
          communal_lift_count_in_block: number | null
          communal_lift_dim_depth: number | null
          communal_lift_dim_width: number | null
          communal_lift_door_width: number | null
          communal_lift_id: string | null
          communal_ramp_adequate_platform: boolean | null
          communal_ramp_ah: number | null
          communal_ramp_al: number | null
          communal_ramp_bh: number | null
          communal_ramp_bl: number | null
          communal_ramp_type: string | null
          completed_at: string | null
          compliance_score: number | null
          cost_estimation_status: Json | null
          created_at: string | null
          door_number: string | null
          door_width_balcony: number | null
          door_width_bathroom: number | null
          door_width_bed1: number | null
          door_width_bed2: number | null
          door_width_bed3: number | null
          door_width_kitchen: number | null
          door_width_living_room: number | null
          door_width_separate_toilet: number | null
          entrance_floor_level: number | null
          entrance_level: string | null
          garden_steps_count: number | null
          hallway_width_head_on_cm: number | null
          hallway_width_turn_cm: number | null
          has_balcony: boolean | null
          has_carport_next_to_property: boolean | null
          has_ceiling_track_hoist: boolean | null
          has_communal_front_door: boolean | null
          has_communal_lift: boolean | null
          has_communal_ramp: boolean | null
          has_covered_carport_or_garage: boolean | null
          has_curved_stairs: boolean | null
          has_designated_parking_bay: boolean | null
          has_internal_stairs: boolean | null
          has_level_access_shower: boolean | null
          has_platform_stair_lift: boolean | null
          has_private_garden: boolean | null
          has_property_front_door: boolean | null
          has_property_ramp: boolean | null
          has_ramped_second_exit: boolean | null
          has_second_exit: boolean | null
          has_separate_toilet: boolean | null
          has_stair_lift: boolean | null
          has_step_lift: boolean | null
          has_straight_stairs: boolean | null
          has_through_floor_lift: boolean | null
          has_wheelchair_storage: boolean | null
          housing_association_name: string | null
          id: number
          inspection_date: string | null
          inspector_name: string | null
          inspector_phone: string | null
          internal_steps_count: number | null
          is_multiple_properties: boolean | null
          kitchen_separate_from_living: boolean | null
          kitchen_turning_150x150: boolean | null
          kitchen_turning_170x140: boolean | null
          kitchen_wheelchair_accessible: boolean | null
          known_hazards: string | null
          num_bed_spaces: number | null
          num_bedrooms: number | null
          num_lifts_dwelling: number | null
          organisation_id: string | null
          overall_grade: string | null
          postcode: string | null
          property_door_opening_width: number | null
          property_door_steps_count: number | null
          property_door_threshold_height: string | null
          property_ramp_adequate_platform: boolean | null
          property_ramp_ah: number | null
          property_ramp_al: number | null
          property_ramp_bh: number | null
          property_ramp_bl: number | null
          property_ramp_type: string | null
          property_type: string | null
          raw_ai_data: Json | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          second_exit_door_width: number | null
          second_exit_ramp_ah: number | null
          second_exit_ramp_al: number | null
          second_exit_ramp_bh: number | null
          second_exit_ramp_bl: number | null
          second_exit_ramp_platform: boolean | null
          second_exit_ramp_type: string | null
          second_exit_steps_count: number | null
          second_exit_threshold_height: string | null
          second_exit_to_street: boolean | null
          shops_within_100m: boolean | null
          stair_70cm_clearance: boolean | null
          stair_width_cm: number | null
          status: string
          stop_flag_internal_steps: boolean | null
          stop_flag_no_clearance_no_exit: boolean | null
          stop_flag_no_lift_or_ramp: boolean | null
          stop_flag_stair_width: boolean | null
          stop_flag_too_many_steps: boolean | null
          street: string | null
          street_number: string | null
          submitted_at: string | null
          submitted_by: string | null
          tenure_type: string | null
          through_floor_lift_dim_depth: number | null
          through_floor_lift_dim_width: number | null
          thumbnail_url: string | null
          toilet_count: number | null
          toilet_dim_depth: number | null
          toilet_dim_width: number | null
          toilet_lateral_space_cm: number | null
          transition_reason: string | null
          transport_bus: boolean | null
          transport_dlr: boolean | null
          transport_train: boolean | null
          transport_tube: boolean | null
          transport_within_100m: boolean | null
          updated_at: string | null
          uprn: string | null
          user_id: string
          wheelchair_charging_socket: boolean | null
          wheelchair_storage_dim_depth: number | null
          wheelchair_storage_dim_width: number | null
        }
        Insert: {
          above_bathroom_no_toilet?: boolean | null
          above_bed1?: boolean | null
          above_bed2?: boolean | null
          above_combined_bath_toilet?: boolean | null
          above_kitchen?: boolean | null
          above_living_room?: boolean | null
          above_other?: boolean | null
          above_separate_toilet?: boolean | null
          access_bathroom_no_toilet?: boolean | null
          access_bed1?: boolean | null
          access_bed2?: boolean | null
          access_combined_bath_toilet?: boolean | null
          access_kitchen?: boolean | null
          access_living_room?: boolean | null
          access_other?: boolean | null
          access_separate_toilet?: boolean | null
          ai_confidence?: number | null
          ai_field_provenance?: Json
          assessment_completion_percent?: number
          assessment_readiness?: string
          balcony_steps_count?: number | null
          bathroom_dim_depth?: number | null
          bathroom_dim_width?: number | null
          bathroom_has_bath?: boolean | null
          bathroom_has_la_shower_and_bath?: boolean | null
          bathroom_has_level_access_shower?: boolean | null
          bathroom_next_to_toilet?: boolean | null
          bathroom_toilet_lateral_space?: number | null
          bathroom_turning_150x150?: boolean | null
          below_bathroom_no_toilet?: boolean | null
          below_bed1?: boolean | null
          below_bed2?: boolean | null
          below_combined_bath_toilet?: boolean | null
          below_kitchen?: boolean | null
          below_living_room?: boolean | null
          below_other?: boolean | null
          below_separate_toilet?: boolean | null
          building_name?: string | null
          can_be_adapted?: boolean | null
          comments?: string | null
          communal_door_opening_width?: number | null
          communal_door_steps_count?: number | null
          communal_door_threshold_height?: string | null
          communal_lift_count_in_block?: number | null
          communal_lift_dim_depth?: number | null
          communal_lift_dim_width?: number | null
          communal_lift_door_width?: number | null
          communal_lift_id?: string | null
          communal_ramp_adequate_platform?: boolean | null
          communal_ramp_ah?: number | null
          communal_ramp_al?: number | null
          communal_ramp_bh?: number | null
          communal_ramp_bl?: number | null
          communal_ramp_type?: string | null
          completed_at?: string | null
          compliance_score?: number | null
          cost_estimation_status?: Json | null
          created_at?: string | null
          door_number?: string | null
          door_width_balcony?: number | null
          door_width_bathroom?: number | null
          door_width_bed1?: number | null
          door_width_bed2?: number | null
          door_width_bed3?: number | null
          door_width_kitchen?: number | null
          door_width_living_room?: number | null
          door_width_separate_toilet?: number | null
          entrance_floor_level?: number | null
          entrance_level?: string | null
          garden_steps_count?: number | null
          hallway_width_head_on_cm?: number | null
          hallway_width_turn_cm?: number | null
          has_balcony?: boolean | null
          has_carport_next_to_property?: boolean | null
          has_ceiling_track_hoist?: boolean | null
          has_communal_front_door?: boolean | null
          has_communal_lift?: boolean | null
          has_communal_ramp?: boolean | null
          has_covered_carport_or_garage?: boolean | null
          has_curved_stairs?: boolean | null
          has_designated_parking_bay?: boolean | null
          has_internal_stairs?: boolean | null
          has_level_access_shower?: boolean | null
          has_platform_stair_lift?: boolean | null
          has_private_garden?: boolean | null
          has_property_front_door?: boolean | null
          has_property_ramp?: boolean | null
          has_ramped_second_exit?: boolean | null
          has_second_exit?: boolean | null
          has_separate_toilet?: boolean | null
          has_stair_lift?: boolean | null
          has_step_lift?: boolean | null
          has_straight_stairs?: boolean | null
          has_through_floor_lift?: boolean | null
          has_wheelchair_storage?: boolean | null
          housing_association_name?: string | null
          id?: number
          inspection_date?: string | null
          inspector_name?: string | null
          inspector_phone?: string | null
          internal_steps_count?: number | null
          is_multiple_properties?: boolean | null
          kitchen_separate_from_living?: boolean | null
          kitchen_turning_150x150?: boolean | null
          kitchen_turning_170x140?: boolean | null
          kitchen_wheelchair_accessible?: boolean | null
          known_hazards?: string | null
          num_bed_spaces?: number | null
          num_bedrooms?: number | null
          num_lifts_dwelling?: number | null
          organisation_id?: string | null
          overall_grade?: string | null
          postcode?: string | null
          property_door_opening_width?: number | null
          property_door_steps_count?: number | null
          property_door_threshold_height?: string | null
          property_ramp_adequate_platform?: boolean | null
          property_ramp_ah?: number | null
          property_ramp_al?: number | null
          property_ramp_bh?: number | null
          property_ramp_bl?: number | null
          property_ramp_type?: string | null
          property_type?: string | null
          raw_ai_data?: Json | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          second_exit_door_width?: number | null
          second_exit_ramp_ah?: number | null
          second_exit_ramp_al?: number | null
          second_exit_ramp_bh?: number | null
          second_exit_ramp_bl?: number | null
          second_exit_ramp_platform?: boolean | null
          second_exit_ramp_type?: string | null
          second_exit_steps_count?: number | null
          second_exit_threshold_height?: string | null
          second_exit_to_street?: boolean | null
          shops_within_100m?: boolean | null
          stair_70cm_clearance?: boolean | null
          stair_width_cm?: number | null
          status?: string
          stop_flag_internal_steps?: boolean | null
          stop_flag_no_clearance_no_exit?: boolean | null
          stop_flag_no_lift_or_ramp?: boolean | null
          stop_flag_stair_width?: boolean | null
          stop_flag_too_many_steps?: boolean | null
          street?: string | null
          street_number?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tenure_type?: string | null
          through_floor_lift_dim_depth?: number | null
          through_floor_lift_dim_width?: number | null
          thumbnail_url?: string | null
          toilet_count?: number | null
          toilet_dim_depth?: number | null
          toilet_dim_width?: number | null
          toilet_lateral_space_cm?: number | null
          transition_reason?: string | null
          transport_bus?: boolean | null
          transport_dlr?: boolean | null
          transport_train?: boolean | null
          transport_tube?: boolean | null
          transport_within_100m?: boolean | null
          updated_at?: string | null
          uprn?: string | null
          user_id: string
          wheelchair_charging_socket?: boolean | null
          wheelchair_storage_dim_depth?: number | null
          wheelchair_storage_dim_width?: number | null
        }
        Update: {
          above_bathroom_no_toilet?: boolean | null
          above_bed1?: boolean | null
          above_bed2?: boolean | null
          above_combined_bath_toilet?: boolean | null
          above_kitchen?: boolean | null
          above_living_room?: boolean | null
          above_other?: boolean | null
          above_separate_toilet?: boolean | null
          access_bathroom_no_toilet?: boolean | null
          access_bed1?: boolean | null
          access_bed2?: boolean | null
          access_combined_bath_toilet?: boolean | null
          access_kitchen?: boolean | null
          access_living_room?: boolean | null
          access_other?: boolean | null
          access_separate_toilet?: boolean | null
          ai_confidence?: number | null
          ai_field_provenance?: Json
          assessment_completion_percent?: number
          assessment_readiness?: string
          balcony_steps_count?: number | null
          bathroom_dim_depth?: number | null
          bathroom_dim_width?: number | null
          bathroom_has_bath?: boolean | null
          bathroom_has_la_shower_and_bath?: boolean | null
          bathroom_has_level_access_shower?: boolean | null
          bathroom_next_to_toilet?: boolean | null
          bathroom_toilet_lateral_space?: number | null
          bathroom_turning_150x150?: boolean | null
          below_bathroom_no_toilet?: boolean | null
          below_bed1?: boolean | null
          below_bed2?: boolean | null
          below_combined_bath_toilet?: boolean | null
          below_kitchen?: boolean | null
          below_living_room?: boolean | null
          below_other?: boolean | null
          below_separate_toilet?: boolean | null
          building_name?: string | null
          can_be_adapted?: boolean | null
          comments?: string | null
          communal_door_opening_width?: number | null
          communal_door_steps_count?: number | null
          communal_door_threshold_height?: string | null
          communal_lift_count_in_block?: number | null
          communal_lift_dim_depth?: number | null
          communal_lift_dim_width?: number | null
          communal_lift_door_width?: number | null
          communal_lift_id?: string | null
          communal_ramp_adequate_platform?: boolean | null
          communal_ramp_ah?: number | null
          communal_ramp_al?: number | null
          communal_ramp_bh?: number | null
          communal_ramp_bl?: number | null
          communal_ramp_type?: string | null
          completed_at?: string | null
          compliance_score?: number | null
          cost_estimation_status?: Json | null
          created_at?: string | null
          door_number?: string | null
          door_width_balcony?: number | null
          door_width_bathroom?: number | null
          door_width_bed1?: number | null
          door_width_bed2?: number | null
          door_width_bed3?: number | null
          door_width_kitchen?: number | null
          door_width_living_room?: number | null
          door_width_separate_toilet?: number | null
          entrance_floor_level?: number | null
          entrance_level?: string | null
          garden_steps_count?: number | null
          hallway_width_head_on_cm?: number | null
          hallway_width_turn_cm?: number | null
          has_balcony?: boolean | null
          has_carport_next_to_property?: boolean | null
          has_ceiling_track_hoist?: boolean | null
          has_communal_front_door?: boolean | null
          has_communal_lift?: boolean | null
          has_communal_ramp?: boolean | null
          has_covered_carport_or_garage?: boolean | null
          has_curved_stairs?: boolean | null
          has_designated_parking_bay?: boolean | null
          has_internal_stairs?: boolean | null
          has_level_access_shower?: boolean | null
          has_platform_stair_lift?: boolean | null
          has_private_garden?: boolean | null
          has_property_front_door?: boolean | null
          has_property_ramp?: boolean | null
          has_ramped_second_exit?: boolean | null
          has_second_exit?: boolean | null
          has_separate_toilet?: boolean | null
          has_stair_lift?: boolean | null
          has_step_lift?: boolean | null
          has_straight_stairs?: boolean | null
          has_through_floor_lift?: boolean | null
          has_wheelchair_storage?: boolean | null
          housing_association_name?: string | null
          id?: number
          inspection_date?: string | null
          inspector_name?: string | null
          inspector_phone?: string | null
          internal_steps_count?: number | null
          is_multiple_properties?: boolean | null
          kitchen_separate_from_living?: boolean | null
          kitchen_turning_150x150?: boolean | null
          kitchen_turning_170x140?: boolean | null
          kitchen_wheelchair_accessible?: boolean | null
          known_hazards?: string | null
          num_bed_spaces?: number | null
          num_bedrooms?: number | null
          num_lifts_dwelling?: number | null
          organisation_id?: string | null
          overall_grade?: string | null
          postcode?: string | null
          property_door_opening_width?: number | null
          property_door_steps_count?: number | null
          property_door_threshold_height?: string | null
          property_ramp_adequate_platform?: boolean | null
          property_ramp_ah?: number | null
          property_ramp_al?: number | null
          property_ramp_bh?: number | null
          property_ramp_bl?: number | null
          property_ramp_type?: string | null
          property_type?: string | null
          raw_ai_data?: Json | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          second_exit_door_width?: number | null
          second_exit_ramp_ah?: number | null
          second_exit_ramp_al?: number | null
          second_exit_ramp_bh?: number | null
          second_exit_ramp_bl?: number | null
          second_exit_ramp_platform?: boolean | null
          second_exit_ramp_type?: string | null
          second_exit_steps_count?: number | null
          second_exit_threshold_height?: string | null
          second_exit_to_street?: boolean | null
          shops_within_100m?: boolean | null
          stair_70cm_clearance?: boolean | null
          stair_width_cm?: number | null
          status?: string
          stop_flag_internal_steps?: boolean | null
          stop_flag_no_clearance_no_exit?: boolean | null
          stop_flag_no_lift_or_ramp?: boolean | null
          stop_flag_stair_width?: boolean | null
          stop_flag_too_many_steps?: boolean | null
          street?: string | null
          street_number?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tenure_type?: string | null
          through_floor_lift_dim_depth?: number | null
          through_floor_lift_dim_width?: number | null
          thumbnail_url?: string | null
          toilet_count?: number | null
          toilet_dim_depth?: number | null
          toilet_dim_width?: number | null
          toilet_lateral_space_cm?: number | null
          transition_reason?: string | null
          transport_bus?: boolean | null
          transport_dlr?: boolean | null
          transport_train?: boolean | null
          transport_tube?: boolean | null
          transport_within_100m?: boolean | null
          updated_at?: string | null
          uprn?: string | null
          user_id?: string
          wheelchair_charging_socket?: boolean | null
          wheelchair_storage_dim_depth?: number | null
          wheelchair_storage_dim_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_rate_card_version: {
        Args: { target_card_id: string }
        Returns: Json
      }
      attach_accesscheck_initial_administrator: {
        Args: { target_email: string; target_user_id: string }
        Returns: undefined
      }
      commit_rate_card_version: {
        Args: {
          card_code: string
          card_effective_from: string
          card_label: string
          card_region_multiplier: number
          card_source_csv: string
          card_source_filename: string
          payload: Json
          target_organisation_id: string
        }
        Returns: Json
      }
      has_organisation_permission: {
        Args: { target_organisation_id: string; target_permission: string }
        Returns: boolean
      }
      is_organisation_member: {
        Args: { target_organisation_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      replace_adaptation_plan: {
        Args: {
          payload: Json
          target_organisation_id: string
          target_survey_id: number
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

