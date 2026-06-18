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
      cost_estimation_adaptations: {
        Row: {
          addresses_rules: number[]
          cost_gbp: number
          difficulty: string
          duration_days: number
          field_patches: Json
          id: string
          label: string
          narrative: string | null
          plan_id: string
          position: number
          preconditions: string | null
          trades: string[]
          visual_evidence_confidence: number | null
        }
        Insert: {
          addresses_rules?: number[]
          cost_gbp: number
          difficulty: string
          duration_days: number
          field_patches?: Json
          id?: string
          label: string
          narrative?: string | null
          plan_id: string
          position: number
          preconditions?: string | null
          trades?: string[]
          visual_evidence_confidence?: number | null
        }
        Update: {
          addresses_rules?: number[]
          cost_gbp?: number
          difficulty?: string
          duration_days?: number
          field_patches?: Json
          id?: string
          label?: string
          narrative?: string | null
          plan_id?: string
          position?: number
          preconditions?: string | null
          trades?: string[]
          visual_evidence_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimation_adaptations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cost_estimation_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimation_plans: {
        Row: {
          budget_cap_gbp: number
          budget_gbp: number
          confidence: number
          current_band: string
          dropped_candidates: Json
          gemini_model: string
          generated_at: string
          id: string
          overall_difficulty: string
          overall_narrative: string
          potential_band: string
          rationale_if_not_band_a: string | null
          reaches_band_a_at_30k: boolean
          survey_id: number
          total_cost_gbp: number
          total_duration_days: number
          unavailable_reason: string | null
        }
        Insert: {
          budget_cap_gbp: number
          budget_gbp: number
          confidence?: number
          current_band: string
          dropped_candidates?: Json
          gemini_model: string
          generated_at?: string
          id?: string
          overall_difficulty: string
          overall_narrative?: string
          potential_band: string
          rationale_if_not_band_a?: string | null
          reaches_band_a_at_30k?: boolean
          survey_id: number
          total_cost_gbp?: number
          total_duration_days?: number
          unavailable_reason?: string | null
        }
        Update: {
          budget_cap_gbp?: number
          budget_gbp?: number
          confidence?: number
          current_band?: string
          dropped_candidates?: Json
          gemini_model?: string
          generated_at?: string
          id?: string
          overall_difficulty?: string
          overall_narrative?: string
          potential_band?: string
          rationale_if_not_band_a?: string | null
          reaches_band_a_at_30k?: boolean
          survey_id?: number
          total_cost_gbp?: number
          total_duration_days?: number
          unavailable_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimation_plans_survey_id_fkey"
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
          scale_confidence?: number | null
          scale_px_per_mm?: number | null
          survey_id?: number
          warnings?: Json | null
        }
        Relationships: [
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
          original_filename?: string | null
          processed_count?: number
          started_at?: string | null
          status?: string
          total_properties?: number
          updated_at?: string
          uploaded_file_url?: string | null
          user_id?: string
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
        Relationships: []
      }
      property_assessment_status: {
        Row: {
          assessment_readiness: string
          evidence_status: string
          missing_evidence: Json
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
          overall_confidence?: number | null
          property_id?: string
          question_mapping?: Json
          recommended_action?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
            foreignKeyName: "property_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          section?: string | null
          survey_id?: number | null
        }
        Relationships: [
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
          status: string | null
          stop_flag_internal_steps: boolean | null
          stop_flag_no_clearance_no_exit: boolean | null
          stop_flag_no_lift_or_ramp: boolean | null
          stop_flag_stair_width: boolean | null
          stop_flag_too_many_steps: boolean | null
          street: string | null
          street_number: string | null
          tenure_type: string | null
          through_floor_lift_dim_depth: number | null
          through_floor_lift_dim_width: number | null
          thumbnail_url: string | null
          toilet_count: number | null
          toilet_dim_depth: number | null
          toilet_dim_width: number | null
          toilet_lateral_space_cm: number | null
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
          status?: string | null
          stop_flag_internal_steps?: boolean | null
          stop_flag_no_clearance_no_exit?: boolean | null
          stop_flag_no_lift_or_ramp?: boolean | null
          stop_flag_stair_width?: boolean | null
          stop_flag_too_many_steps?: boolean | null
          street?: string | null
          street_number?: string | null
          tenure_type?: string | null
          through_floor_lift_dim_depth?: number | null
          through_floor_lift_dim_width?: number | null
          thumbnail_url?: string | null
          toilet_count?: number | null
          toilet_dim_depth?: number | null
          toilet_dim_width?: number | null
          toilet_lateral_space_cm?: number | null
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
          status?: string | null
          stop_flag_internal_steps?: boolean | null
          stop_flag_no_clearance_no_exit?: boolean | null
          stop_flag_no_lift_or_ramp?: boolean | null
          stop_flag_stair_width?: boolean | null
          stop_flag_too_many_steps?: boolean | null
          street?: string | null
          street_number?: string | null
          tenure_type?: string | null
          through_floor_lift_dim_depth?: number | null
          through_floor_lift_dim_width?: number | null
          thumbnail_url?: string | null
          toilet_count?: number | null
          toilet_dim_depth?: number | null
          toilet_dim_width?: number | null
          toilet_lateral_space_cm?: number | null
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
