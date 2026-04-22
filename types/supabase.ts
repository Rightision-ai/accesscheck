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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

