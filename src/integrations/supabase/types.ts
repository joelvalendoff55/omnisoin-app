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
      aci_indicators: {
        Row: {
          category: string
          created_at: string
          current_value: number
          description: string | null
          id: string
          name: string
          status: string
          structure_id: string
          target_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          name: string
          status?: string
          structure_id: string
          target_value: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          name?: string
          status?: string
          structure_id?: string
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          patient_id: string | null
          structure_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          structure_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "activity_logs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string
          id: string
          is_pdsa: boolean | null
          location: string | null
          notes: string | null
          patient_id: string | null
          practitioner_id: string
          reason_id: string | null
          reminder_sent: boolean | null
          start_time: string
          status: string | null
          structure_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          appointment_type?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          is_pdsa?: boolean | null
          location?: string | null
          notes?: string | null
          patient_id?: string | null
          practitioner_id: string
          reason_id?: string | null
          reminder_sent?: boolean | null
          start_time: string
          status?: string | null
          structure_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          appointment_type?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          is_pdsa?: boolean | null
          location?: string | null
          notes?: string | null
          patient_id?: string | null
          practitioner_id?: string
          reason_id?: string | null
          reminder_sent?: boolean | null
          start_time?: string
          status?: string | null
          structure_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "consultation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "appointments_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          context_type: string
          created_at: string
          id: string
          patient_id: string | null
          structure_id: string
          title: string | null
          transcript_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type: string
          created_at?: string
          id?: string
          patient_id?: string | null
          structure_id: string
          title?: string | null
          transcript_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?: string
          created_at?: string
          id?: string
          patient_id?: string | null
          structure_id?: string
          title?: string | null
          transcript_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "assistant_conversations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "assistant_conversations_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "patient_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          page_url: string
          screenshot_url: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          page_url: string
          screenshot_url?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          page_url?: string
          screenshot_url?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          quick_questions: Json | null
          structure_id: string
          system_prompt: string | null
          updated_at: string
          updated_by: string | null
          welcome_message: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          quick_questions?: Json | null
          structure_id: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
          welcome_message?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          quick_questions?: Json | null
          structure_id?: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: true
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "chatbot_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: true
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: true
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      complementary_exams: {
        Row: {
          category: string | null
          code: string
          contraindications: string[] | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          indications: string[] | null
          is_active: boolean
          name: string
          preparation_instructions: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          contraindications?: string[] | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          indications?: string[] | null
          is_active?: boolean
          name: string
          preparation_instructions?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          contraindications?: string[] | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          indications?: string[] | null
          is_active?: boolean
          name?: string
          preparation_instructions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consent_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          changed_by_role: Database["public"]["Enums"]["app_role"]
          consent_id: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_status: Database["public"]["Enums"]["consent_status"] | null
          patient_id: string
          previous_status: Database["public"]["Enums"]["consent_status"] | null
          reason: string | null
          structure_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by: string
          changed_by_role: Database["public"]["Enums"]["app_role"]
          consent_id: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["consent_status"] | null
          patient_id: string
          previous_status?: Database["public"]["Enums"]["consent_status"] | null
          reason?: string | null
          structure_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          changed_by_role?: Database["public"]["Enums"]["app_role"]
          consent_id?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["consent_status"] | null
          patient_id?: string
          previous_status?: Database["public"]["Enums"]["consent_status"] | null
          reason?: string | null
          structure_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_audit_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "patient_consents"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_templates: {
        Row: {
          consent_type: Database["public"]["Enums"]["patient_consent_type"]
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          legal_references: string[] | null
          required_for_care: boolean
          structure_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["patient_consent_type"]
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          legal_references?: string[] | null
          required_for_care?: boolean
          structure_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["patient_consent_type"]
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          legal_references?: string[] | null
          required_for_care?: boolean
          structure_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      consultation_anamnesis: {
        Row: {
          assistant_summary: Json | null
          confidence_score: number | null
          consultation_id: string | null
          created_at: string
          created_by: string | null
          doctor_summary: Json | null
          error_message: string | null
          id: string
          model_used: string | null
          patient_id: string
          processing_time_ms: number | null
          status: string
          structure_id: string
          structured_data: Json | null
          transcript_id: string
          updated_at: string
        }
        Insert: {
          assistant_summary?: Json | null
          confidence_score?: number | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_summary?: Json | null
          error_message?: string | null
          id?: string
          model_used?: string | null
          patient_id: string
          processing_time_ms?: number | null
          status?: string
          structure_id: string
          structured_data?: Json | null
          transcript_id: string
          updated_at?: string
        }
        Update: {
          assistant_summary?: Json | null
          confidence_score?: number | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_summary?: Json | null
          error_message?: string | null
          id?: string
          model_used?: string | null
          patient_id?: string
          processing_time_ms?: number | null
          status?: string
          structure_id?: string
          structured_data?: Json | null
          transcript_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_anamnesis_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_anamnesis_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_anamnesis_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_anamnesis_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultation_anamnesis_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_anamnesis_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultation_anamnesis_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "patient_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_field_audit: {
        Row: {
          changed_at: string
          changed_by: string
          changed_by_role: Database["public"]["Enums"]["app_role"]
          consultation_id: string
          field_name: string
          id: string
          ip_address: unknown
          is_medical_decision: boolean | null
          new_value: string | null
          old_value: string | null
          structure_id: string
          user_agent: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changed_by_role: Database["public"]["Enums"]["app_role"]
          consultation_id: string
          field_name: string
          id?: string
          ip_address?: unknown
          is_medical_decision?: boolean | null
          new_value?: string | null
          old_value?: string | null
          structure_id: string
          user_agent?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changed_by_role?: Database["public"]["Enums"]["app_role"]
          consultation_id?: string
          field_name?: string
          id?: string
          ip_address?: unknown
          is_medical_decision?: boolean | null
          new_value?: string | null
          old_value?: string | null
          structure_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_field_audit_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_field_permissions: {
        Row: {
          can_approve: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          created_at: string | null
          description: string | null
          field_name: string
          id: string
          is_medical_decision: boolean | null
          requires_signature: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          table_name: string
        }
        Insert: {
          can_approve?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          description?: string | null
          field_name: string
          id?: string
          is_medical_decision?: boolean | null
          requires_signature?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          table_name: string
        }
        Update: {
          can_approve?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          description?: string | null
          field_name?: string
          id?: string
          is_medical_decision?: boolean | null
          requires_signature?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          table_name?: string
        }
        Relationships: []
      }
      consultation_observations: {
        Row: {
          author_id: string
          author_role: string
          consultation_id: string | null
          content: string
          created_at: string
          id: string
          patient_id: string
          structure_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_role: string
          consultation_id?: string | null
          content: string
          created_at?: string
          id?: string
          patient_id: string
          structure_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_role?: string
          consultation_id?: string | null
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_observations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_observations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_observations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_observations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultation_observations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_observations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      consultation_reasons: {
        Row: {
          category: string
          code: string
          color: string | null
          created_at: string | null
          default_duration: number | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          structure_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          color?: string | null
          created_at?: string | null
          default_duration?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          structure_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          color?: string | null
          created_at?: string | null
          default_duration?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          structure_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_reasons_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultation_reasons_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_reasons_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      consultation_validations: {
        Row: {
          consultation_id: string
          content_hash: string
          id: string
          ip_address: string | null
          patient_id: string
          signature_hash: string
          structure_id: string
          user_agent: string | null
          validated_at: string
          validated_content: Json
          validation_statement: string
          validator_name: string
          validator_role: string
          validator_user_id: string
          version: number
        }
        Insert: {
          consultation_id: string
          content_hash: string
          id?: string
          ip_address?: string | null
          patient_id: string
          signature_hash?: string
          structure_id: string
          user_agent?: string | null
          validated_at?: string
          validated_content: Json
          validation_statement?: string
          validator_name: string
          validator_role: string
          validator_user_id: string
          version?: number
        }
        Update: {
          consultation_id?: string
          content_hash?: string
          id?: string
          ip_address?: string | null
          patient_id?: string
          signature_hash?: string
          structure_id?: string
          user_agent?: string | null
          validated_at?: string
          validated_content?: Json
          validation_statement?: string
          validator_name?: string
          validator_role?: string
          validator_user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultation_validations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_validations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_validations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_validations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultation_validations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_validations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      consultations: {
        Row: {
          conclusion: string | null
          consultation_date: string
          created_at: string
          created_by: string
          examen_clinique: string | null
          id: string
          motif: string | null
          notes_cliniques: string | null
          patient_id: string
          practitioner_id: string
          structure_id: string
          transcript_id: string | null
          updated_at: string
        }
        Insert: {
          conclusion?: string | null
          consultation_date?: string
          created_at?: string
          created_by: string
          examen_clinique?: string | null
          id?: string
          motif?: string | null
          notes_cliniques?: string | null
          patient_id: string
          practitioner_id: string
          structure_id: string
          transcript_id?: string | null
          updated_at?: string
        }
        Update: {
          conclusion?: string | null
          consultation_date?: string
          created_at?: string
          created_by?: string
          examen_clinique?: string | null
          id?: string
          motif?: string | null
          notes_cliniques?: string | null
          patient_id?: string
          practitioner_id?: string
          structure_id?: string
          transcript_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "consultations_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "patient_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_authorship_log: {
        Row: {
          actor_name: string | null
          actor_role: string | null
          actor_user_id: string | null
          ai_confidence: number | null
          ai_model: string | null
          content_hash: string | null
          content_snapshot: string | null
          created_at: string
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          patient_id: string | null
          source_type: string
          structure_id: string
          version_number: number
        }
        Insert: {
          actor_name?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          ai_confidence?: number | null
          ai_model?: string | null
          content_hash?: string | null
          content_snapshot?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          patient_id?: string | null
          source_type: string
          structure_id: string
          version_number?: number
        }
        Update: {
          actor_name?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          ai_confidence?: number | null
          ai_model?: string | null
          content_hash?: string | null
          content_snapshot?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          patient_id?: string | null
          source_type?: string
          structure_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_authorship_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_authorship_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_authorship_log_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "content_authorship_log_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_authorship_log_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      data_access_log: {
        Row: {
          access_reason: string
          access_reason_category: string
          accessed_at: string
          action_type: Database["public"]["Enums"]["data_access_action"]
          fields_accessed: string[]
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string
          resource_type: string
          structure_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_reason: string
          access_reason_category?: string
          accessed_at?: string
          action_type: Database["public"]["Enums"]["data_access_action"]
          fields_accessed?: string[]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id: string
          resource_type: string
          structure_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_reason?: string
          access_reason_category?: string
          accessed_at?: string
          action_type?: Database["public"]["Enums"]["data_access_action"]
          fields_accessed?: string[]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string
          resource_type?: string
          structure_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_log_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "data_access_log_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_log_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      document_ocr: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string
          extracted_data: Json | null
          id: string
          processed_at: string | null
          raw_text: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id: string
          extracted_data?: Json | null
          id?: string
          processed_at?: string | null
          raw_text?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string
          extracted_data?: Json | null
          id?: string
          processed_at?: string | null
          raw_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_ocr_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          mime_type: string | null
          patient_id: string
          source: string | null
          status: string | null
          structure_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          patient_id: string
          source?: string | null
          status?: string | null
          structure_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          patient_id?: string
          source?: string | null
          status?: string | null
          structure_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      encounter_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          encounter_id: string
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["encounter_status"]
          previous_status:
            | Database["public"]["Enums"]["encounter_status"]
            | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          encounter_id: string
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["encounter_status"]
          previous_status?:
            | Database["public"]["Enums"]["encounter_status"]
            | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          encounter_id?: string
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["encounter_status"]
          previous_status?:
            | Database["public"]["Enums"]["encounter_status"]
            | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encounter_status_history_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string | null
          assigned_assistant_id: string | null
          assigned_practitioner_id: string | null
          completed_at: string | null
          consultation_id: string | null
          consultation_started_at: string | null
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          mode: Database["public"]["Enums"]["encounter_mode"]
          notes: string | null
          patient_id: string
          preconsult_completed_at: string | null
          preconsultation_id: string | null
          queue_entry_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["encounter_status"]
          structure_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          assigned_assistant_id?: string | null
          assigned_practitioner_id?: string | null
          completed_at?: string | null
          consultation_id?: string | null
          consultation_started_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          mode?: Database["public"]["Enums"]["encounter_mode"]
          notes?: string | null
          patient_id: string
          preconsult_completed_at?: string | null
          preconsultation_id?: string | null
          queue_entry_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["encounter_status"]
          structure_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          assigned_assistant_id?: string | null
          assigned_practitioner_id?: string | null
          completed_at?: string | null
          consultation_id?: string | null
          consultation_started_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          mode?: Database["public"]["Enums"]["encounter_mode"]
          notes?: string | null
          patient_id?: string
          preconsult_completed_at?: string | null
          preconsultation_id?: string | null
          queue_entry_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["encounter_status"]
          structure_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_assigned_assistant_id_fkey"
            columns: ["assigned_assistant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_assigned_practitioner_id_fkey"
            columns: ["assigned_practitioner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_preconsultation_id_fkey"
            columns: ["preconsultation_id"]
            isOneToOne: false
            referencedRelation: "preconsultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "encounters_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      encrypted_fields_registry: {
        Row: {
          column_name: string
          created_at: string
          encryption_key_purpose: Database["public"]["Enums"]["encryption_key_purpose"]
          id: string
          is_encrypted: boolean
          requires_justification: boolean
          sensitivity_level: string
          table_name: string
          updated_at: string
        }
        Insert: {
          column_name: string
          created_at?: string
          encryption_key_purpose: Database["public"]["Enums"]["encryption_key_purpose"]
          id?: string
          is_encrypted?: boolean
          requires_justification?: boolean
          sensitivity_level?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          column_name?: string
          created_at?: string
          encryption_key_purpose?: Database["public"]["Enums"]["encryption_key_purpose"]
          id?: string
          is_encrypted?: boolean
          requires_justification?: boolean
          sensitivity_level?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string
          created_by: string
          encrypted_key: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_purpose: Database["public"]["Enums"]["encryption_key_purpose"]
          key_version: number
          rotated_from: string | null
          structure_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          encrypted_key: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_purpose: Database["public"]["Enums"]["encryption_key_purpose"]
          key_version?: number
          rotated_from?: string | null
          structure_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          encrypted_key?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_purpose?: Database["public"]["Enums"]["encryption_key_purpose"]
          key_version?: number
          rotated_from?: string | null
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encryption_keys_rotated_from_fkey"
            columns: ["rotated_from"]
            isOneToOne: false
            referencedRelation: "encryption_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encryption_keys_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "encryption_keys_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encryption_keys_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      exam_prescriptions: {
        Row: {
          completed_date: string | null
          consultation_id: string | null
          created_at: string
          exam_id: string
          id: string
          indication: string
          notes: string | null
          patient_id: string
          prescribed_by: string
          priority: string | null
          results: string | null
          scheduled_date: string | null
          status: string | null
          structure_id: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          consultation_id?: string | null
          created_at?: string
          exam_id: string
          id?: string
          indication: string
          notes?: string | null
          patient_id: string
          prescribed_by: string
          priority?: string | null
          results?: string | null
          scheduled_date?: string | null
          status?: string | null
          structure_id: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          consultation_id?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          indication?: string
          notes?: string | null
          patient_id?: string
          prescribed_by?: string
          priority?: string | null
          results?: string | null
          scheduled_date?: string | null
          status?: string | null
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_prescriptions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "complementary_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_prescriptions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "exam_prescriptions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_prescriptions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          error_message: string | null
          expiration_date: string | null
          export_format: Database["public"]["Enums"]["export_format"]
          export_type: Database["public"]["Enums"]["export_type"]
          file_hash: string | null
          file_url: string | null
          id: string
          justification: string
          legal_basis: string
          patient_id: string | null
          requester_id: string
          status: Database["public"]["Enums"]["export_status"]
          structure_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          error_message?: string | null
          expiration_date?: string | null
          export_format?: Database["public"]["Enums"]["export_format"]
          export_type: Database["public"]["Enums"]["export_type"]
          file_hash?: string | null
          file_url?: string | null
          id?: string
          justification: string
          legal_basis: string
          patient_id?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["export_status"]
          structure_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          error_message?: string | null
          expiration_date?: string | null
          export_format?: Database["public"]["Enums"]["export_format"]
          export_type?: Database["public"]["Enums"]["export_type"]
          file_hash?: string | null
          file_url?: string | null
          id?: string
          justification?: string
          legal_basis?: string
          patient_id?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["export_status"]
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_name: string
          id: string
          is_enabled: boolean
          structure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_name: string
          id?: string
          is_enabled?: boolean
          structure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_name?: string
          id?: string
          is_enabled?: boolean
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "feature_flags_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      gdpr_audit_logs: {
        Row: {
          action_type: string
          actor_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          patient_uuid: string | null
          structure_id: string
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          patient_uuid?: string | null
          structure_id: string
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          patient_uuid?: string | null
          structure_id?: string
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      hospital_passages: {
        Row: {
          created_at: string
          created_by: string
          diagnostics: string | null
          etablissement: string
          examens_cles: string | null
          id: string
          motif: string | null
          notes: string | null
          passage_date: string
          passage_type: string
          patient_id: string
          risk_level: string
          structure_id: string
          suivi_recommande: string | null
          taches_ville: Json | null
          traitements: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          diagnostics?: string | null
          etablissement: string
          examens_cles?: string | null
          id?: string
          motif?: string | null
          notes?: string | null
          passage_date?: string
          passage_type: string
          patient_id: string
          risk_level?: string
          structure_id: string
          suivi_recommande?: string | null
          taches_ville?: Json | null
          traitements?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          diagnostics?: string | null
          etablissement?: string
          examens_cles?: string | null
          id?: string
          motif?: string | null
          notes?: string | null
          passage_date?: string
          passage_type?: string
          patient_id?: string
          risk_level?: string
          structure_id?: string
          suivi_recommande?: string | null
          taches_ville?: Json | null
          traitements?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      identities_vault: {
        Row: {
          created_at: string
          created_by: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          nir: string | null
          patient_uuid: string
          phone: string | null
          structure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          nir?: string | null
          patient_uuid: string
          phone?: string | null
          structure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          nir?: string | null
          patient_uuid?: string
          phone?: string | null
          structure_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      immutable_audit_log: {
        Row: {
          action: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          hash_chain: string
          id: string
          ip_address: unknown
          log_timestamp: string
          new_value: Json | null
          previous_value: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          structure_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          hash_chain: string
          id?: string
          ip_address?: unknown
          log_timestamp?: string
          new_value?: Json | null
          previous_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          structure_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          hash_chain?: string
          id?: string
          ip_address?: unknown
          log_timestamp?: string
          new_value?: Json | null
          previous_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          structure_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immutable_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          channel: string
          created_at: string
          external_conversation_id: string | null
          external_message_id: string | null
          id: string
          media_mime: string | null
          media_url: string | null
          message_type: string
          patient_id: string | null
          sender_phone: string | null
          status: string
          structure_id: string
          text_body: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          external_conversation_id?: string | null
          external_message_id?: string | null
          id?: string
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          patient_id?: string | null
          sender_phone?: string | null
          status?: string
          structure_id: string
          text_body?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          external_conversation_id?: string | null
          external_message_id?: string | null
          id?: string
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          patient_id?: string | null
          sender_phone?: string | null
          status?: string
          structure_id?: string
          text_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "inbox_messages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          created_at: string
          diagnosis: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string
          prescription: string | null
          record_date: string
          symptoms: string[] | null
          treatment: string | null
          updated_at: string
          user_id: string
          vital_signs: Json | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescription?: string | null
          record_date?: string
          symptoms?: string[] | null
          treatment?: string | null
          updated_at?: string
          user_id: string
          vital_signs?: Json | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          record_date?: string
          symptoms?: string[] | null
          treatment?: string | null
          updated_at?: string
          user_id?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string | null
          delivered_at: string | null
          destination: string | null
          dispatch_id: string
          error: string | null
          id: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_id: string | null
          recipient_type: string | null
          sent_at: string | null
          status: string | null
          structure_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          destination?: string | null
          dispatch_id: string
          error?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          structure_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          destination?: string | null
          dispatch_id?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "notification_dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatches: {
        Row: {
          created_at: string | null
          event_key: string
          id: string
          payload: Json | null
          source_id: string | null
          source_type: string | null
          structure_id: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          event_key: string
          id?: string
          payload?: Json | null
          source_id?: string | null
          source_type?: string | null
          structure_id: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          event_key?: string
          id?: string
          payload?: Json | null
          source_id?: string | null
          source_type?: string | null
          structure_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatches_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "notification_dispatches_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatches_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      notification_event_definitions: {
        Row: {
          allow_structure_target: boolean | null
          allow_team_target: boolean | null
          allow_user_target: boolean | null
          created_at: string | null
          default_severity: string | null
          description: string | null
          event_key: string
        }
        Insert: {
          allow_structure_target?: boolean | null
          allow_team_target?: boolean | null
          allow_user_target?: boolean | null
          created_at?: string | null
          default_severity?: string | null
          description?: string | null
          event_key: string
        }
        Update: {
          allow_structure_target?: boolean | null
          allow_team_target?: boolean | null
          allow_user_target?: boolean | null
          created_at?: string | null
          default_severity?: string | null
          description?: string | null
          event_key?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string
          structure_id: string
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          structure_id: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          structure_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          channel: string
          created_at: string | null
          event_key: string
          id: string
          is_enabled: boolean | null
          structure_id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          event_key: string
          id?: string
          is_enabled?: boolean | null
          structure_id: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          event_key?: string
          id?: string
          is_enabled?: boolean | null
          structure_id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "notification_recipients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          channel: string
          created_at: string | null
          dynamic_key: string | null
          enabled: boolean | null
          event_key: string
          id: string
          priority: number | null
          scope_id: string | null
          scope_type: string
          structure_id: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          dynamic_key?: string | null
          enabled?: boolean | null
          event_key: string
          id?: string
          priority?: number | null
          scope_id?: string | null
          scope_type: string
          structure_id: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          dynamic_key?: string | null
          enabled?: boolean | null
          event_key?: string
          id?: string
          priority?: number | null
          scope_id?: string | null
          scope_type?: string
          structure_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "notification_rules_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          created_by: string | null
          event_key: string
          id: string
          is_active: boolean | null
          structure_id: string
          subject: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          created_by?: string | null
          event_key: string
          id?: string
          is_active?: boolean | null
          structure_id: string
          subject?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          event_key?: string
          id?: string
          is_active?: boolean | null
          structure_id?: string
          subject?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "notification_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean | null
          read_at: string | null
          structure_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          read_at?: string | null
          structure_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          read_at?: string | null
          structure_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "notifications_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      ocr_import_history: {
        Row: {
          antecedent_ids: string[]
          diagnoses_count: number
          document_id: string | null
          document_title: string | null
          id: string
          imported_at: string
          imported_by: string
          medications_count: number
          patient_id: string
          procedures_count: number
          reverted_at: string | null
          reverted_by: string | null
          status: string
          structure_id: string
        }
        Insert: {
          antecedent_ids?: string[]
          diagnoses_count?: number
          document_id?: string | null
          document_title?: string | null
          id?: string
          imported_at?: string
          imported_by: string
          medications_count?: number
          patient_id: string
          procedures_count?: number
          reverted_at?: string | null
          reverted_by?: string | null
          status?: string
          structure_id: string
        }
        Update: {
          antecedent_ids?: string[]
          diagnoses_count?: number
          document_id?: string | null
          document_title?: string | null
          id?: string
          imported_at?: string
          imported_by?: string
          medications_count?: number
          patient_id?: string
          procedures_count?: number
          reverted_at?: string | null
          reverted_by?: string | null
          status?: string
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_import_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_import_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_import_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_import_history_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "ocr_import_history_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_import_history_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      org_members: {
        Row: {
          accepted_at: string | null
          archived_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          org_role: Database["public"]["Enums"]["org_role"]
          site_id: string | null
          structure_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          org_role?: Database["public"]["Enums"]["org_role"]
          site_id?: string | null
          structure_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          org_role?: Database["public"]["Enums"]["org_role"]
          site_id?: string | null
          structure_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "org_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      org_members_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          org_member_id: string
          structure_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          org_member_id: string
          structure_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          org_member_id?: string
          structure_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_accounts: {
        Row: {
          access_code: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          patient_id: string
        }
        Insert: {
          access_code: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          patient_id: string
        }
        Update: {
          access_code?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_accounts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_accounts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_antecedents: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string
          date_debut: string | null
          date_fin: string | null
          description: string
          id: string
          notes: string | null
          patient_id: string
          severity: Database["public"]["Enums"]["antecedent_severity"] | null
          structure_id: string
          type: Database["public"]["Enums"]["antecedent_type"]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by: string
          date_debut?: string | null
          date_fin?: string | null
          description: string
          id?: string
          notes?: string | null
          patient_id: string
          severity?: Database["public"]["Enums"]["antecedent_severity"] | null
          structure_id: string
          type: Database["public"]["Enums"]["antecedent_type"]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string
          id?: string
          notes?: string | null
          patient_id?: string
          severity?: Database["public"]["Enums"]["antecedent_severity"] | null
          structure_id?: string
          type?: Database["public"]["Enums"]["antecedent_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_antecedents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_antecedents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_antecedents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_antecedents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_antecedents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          checkbox_confirmed: boolean | null
          consent_type: Database["public"]["Enums"]["patient_consent_type"]
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          obtained_at: string | null
          obtained_by: string | null
          patient_id: string
          refused_at: string | null
          refused_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          scroll_completed: boolean | null
          signature_data: string | null
          signed_document_url: string | null
          status: Database["public"]["Enums"]["consent_status"]
          structure_id: string
          template_id: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          checkbox_confirmed?: boolean | null
          consent_type: Database["public"]["Enums"]["patient_consent_type"]
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          obtained_at?: string | null
          obtained_by?: string | null
          patient_id: string
          refused_at?: string | null
          refused_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          scroll_completed?: boolean | null
          signature_data?: string | null
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          structure_id: string
          template_id?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          checkbox_confirmed?: boolean | null
          consent_type?: Database["public"]["Enums"]["patient_consent_type"]
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          obtained_at?: string | null
          obtained_by?: string | null
          patient_id?: string
          refused_at?: string | null
          refused_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          scroll_completed?: boolean | null
          signature_data?: string | null
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          structure_id?: string
          template_id?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          patient_id: string
          structure_id: string | null
          title: string
          type: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          patient_id: string
          structure_id?: string | null
          title: string
          type: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          patient_id?: string
          structure_id?: string | null
          title?: string
          type?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patient_journey_steps: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          performed_by: string | null
          queue_entry_id: string
          step_at: string
          step_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          queue_entry_id: string
          step_at?: string
          step_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          queue_entry_id?: string
          step_at?: string
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_journey_steps_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_messages: {
        Row: {
          content: string
          created_at: string
          direction: string
          id: string
          is_read: boolean
          patient_id: string
          practitioner_id: string | null
          read_at: string | null
          structure_id: string | null
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          direction: string
          id?: string
          is_read?: boolean
          patient_id: string
          practitioner_id?: string | null
          read_at?: string | null
          structure_id?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean
          patient_id?: string
          practitioner_id?: string | null
          read_at?: string | null
          structure_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_messages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patient_queue: {
        Row: {
          appointment_id: string | null
          arrival_time: string | null
          assigned_to: string | null
          assistant_notes: string | null
          billing_status: string | null
          called_at: string | null
          checked_in_at: string | null
          closed_at: string | null
          closed_by: string | null
          closure_reason: string | null
          completed_at: string | null
          consultation_id: string | null
          created_at: string | null
          deletion_prevented: boolean | null
          id: string
          is_archived: boolean | null
          manual_order: number | null
          notes: string | null
          patient_id: string
          previous_status: string | null
          priority: number | null
          ready_at: string | null
          reason: string | null
          reason_id: string | null
          started_at: string | null
          status: string | null
          status_change_reason: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          structure_id: string
          updated_at: string | null
          vitals_data: Json | null
        }
        Insert: {
          appointment_id?: string | null
          arrival_time?: string | null
          assigned_to?: string | null
          assistant_notes?: string | null
          billing_status?: string | null
          called_at?: string | null
          checked_in_at?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_reason?: string | null
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string | null
          deletion_prevented?: boolean | null
          id?: string
          is_archived?: boolean | null
          manual_order?: number | null
          notes?: string | null
          patient_id: string
          previous_status?: string | null
          priority?: number | null
          ready_at?: string | null
          reason?: string | null
          reason_id?: string | null
          started_at?: string | null
          status?: string | null
          status_change_reason?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          structure_id: string
          updated_at?: string | null
          vitals_data?: Json | null
        }
        Update: {
          appointment_id?: string | null
          arrival_time?: string | null
          assigned_to?: string | null
          assistant_notes?: string | null
          billing_status?: string | null
          called_at?: string | null
          checked_in_at?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_reason?: string | null
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string | null
          deletion_prevented?: boolean | null
          id?: string
          is_archived?: boolean | null
          manual_order?: number | null
          notes?: string | null
          patient_id?: string
          previous_status?: string | null
          priority?: number | null
          ready_at?: string | null
          reason?: string | null
          reason_id?: string | null
          started_at?: string | null
          status?: string | null
          status_change_reason?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          structure_id?: string
          updated_at?: string | null
          vitals_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "consultation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_queue_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patient_queue_status_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_status: string
          previous_status: string | null
          queue_id: string
          structure_id: string
          user_agent: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_status: string
          previous_status?: string | null
          queue_id: string
          structure_id: string
          user_agent?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_status?: string
          previous_status?: string | null
          queue_id?: string
          structure_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_status_history_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_status_transitions: {
        Row: {
          created_at: string | null
          description: string | null
          from_status: string
          is_reversible: boolean | null
          requires_billing: boolean | null
          requires_reason: boolean | null
          to_status: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          from_status: string
          is_reversible?: boolean | null
          requires_billing?: boolean | null
          requires_reason?: boolean | null
          to_status: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          from_status?: string
          is_reversible?: boolean | null
          requires_billing?: boolean | null
          requires_reason?: boolean | null
          to_status?: string
        }
        Relationships: []
      }
      patient_transcripts: {
        Row: {
          audio_path: string | null
          consultation_id: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          language: string | null
          patient_id: string
          queue_entry_id: string | null
          recorder_type: string | null
          source: string
          status: string
          structure_id: string
          transcript_text: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          audio_path?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          patient_id: string
          queue_entry_id?: string | null
          recorder_type?: string | null
          source?: string
          status?: string
          structure_id: string
          transcript_text?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          audio_path?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          patient_id?: string
          queue_entry_id?: string | null
          recorder_type?: string | null
          source?: string
          status?: string
          structure_id?: string
          transcript_text?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_transcripts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transcripts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transcripts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transcripts_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transcripts_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_transcripts_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transcripts_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patient_vital_signs: {
        Row: {
          assistant_notes: string | null
          bmi: number | null
          created_at: string
          diastolic_bp: number | null
          heart_rate: number | null
          height_cm: number | null
          id: string
          patient_id: string
          practitioner_notes: string | null
          recorded_at: string
          recorded_by: string
          spo2: number | null
          structure_id: string
          systolic_bp: number | null
          temperature_celsius: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          assistant_notes?: string | null
          bmi?: number | null
          created_at?: string
          diastolic_bp?: number | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          patient_id: string
          practitioner_notes?: string | null
          recorded_at?: string
          recorded_by: string
          spo2?: number | null
          structure_id: string
          systolic_bp?: number | null
          temperature_celsius?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          assistant_notes?: string | null
          bmi?: number | null
          created_at?: string
          diastolic_bp?: number | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          patient_id?: string
          practitioner_notes?: string | null
          recorded_at?: string
          recorded_by?: string
          spo2?: number | null
          structure_id?: string
          systolic_bp?: number | null
          temperature_celsius?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_vital_signs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_vital_signs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_vital_signs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patients: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          dob: string | null
          email: string | null
          first_name: string
          id: string
          is_archived: boolean | null
          last_name: string
          note_admin: string | null
          origin: Database["public"]["Enums"]["patient_origin"] | null
          origin_notes: string | null
          origin_referrer_name: string | null
          origin_type: string | null
          phone: string | null
          primary_practitioner_user_id: string | null
          sex: string | null
          status: Database["public"]["Enums"]["patient_status"]
          structure_id: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_archived?: boolean | null
          last_name: string
          note_admin?: string | null
          origin?: Database["public"]["Enums"]["patient_origin"] | null
          origin_notes?: string | null
          origin_referrer_name?: string | null
          origin_type?: string | null
          phone?: string | null
          primary_practitioner_user_id?: string | null
          sex?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          structure_id?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_archived?: boolean | null
          last_name?: string
          note_admin?: string | null
          origin?: Database["public"]["Enums"]["patient_origin"] | null
          origin_notes?: string | null
          origin_referrer_name?: string | null
          origin_type?: string | null
          phone?: string | null
          primary_practitioner_user_id?: string | null
          sex?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          structure_id?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_absences: {
        Row: {
          absence_type: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          structure_id: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          absence_type?: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          structure_id: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          absence_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          structure_id?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_absences_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "practitioner_absences_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_absences_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "practitioner_absences_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_assistants: {
        Row: {
          assistant_user_id: string
          can_edit: boolean | null
          created_at: string
          id: string
          practitioner_user_id: string
          structure_id: string
        }
        Insert: {
          assistant_user_id: string
          can_edit?: boolean | null
          created_at?: string
          id?: string
          practitioner_user_id: string
          structure_id: string
        }
        Update: {
          assistant_user_id?: string
          can_edit?: boolean | null
          created_at?: string
          id?: string
          practitioner_user_id?: string
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_assistants_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "practitioner_assistants_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_assistants_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      practitioner_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          structure_id: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          structure_id: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          structure_id?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_schedules_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "practitioner_schedules_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_schedules_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "practitioner_schedules_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      preconsultation_audit: {
        Row: {
          action: string
          change_reason: string | null
          changed_at: string
          changed_by: string
          changed_by_role: Database["public"]["Enums"]["app_role"]
          id: string
          metadata: Json | null
          new_priority:
            | Database["public"]["Enums"]["preconsultation_priority"]
            | null
          new_status: Database["public"]["Enums"]["waiting_status"] | null
          preconsultation_id: string
          previous_priority:
            | Database["public"]["Enums"]["preconsultation_priority"]
            | null
          previous_status: Database["public"]["Enums"]["waiting_status"] | null
          structure_id: string
        }
        Insert: {
          action: string
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          changed_by_role: Database["public"]["Enums"]["app_role"]
          id?: string
          metadata?: Json | null
          new_priority?:
            | Database["public"]["Enums"]["preconsultation_priority"]
            | null
          new_status?: Database["public"]["Enums"]["waiting_status"] | null
          preconsultation_id: string
          previous_priority?:
            | Database["public"]["Enums"]["preconsultation_priority"]
            | null
          previous_status?: Database["public"]["Enums"]["waiting_status"] | null
          structure_id: string
        }
        Update: {
          action?: string
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          changed_by_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          metadata?: Json | null
          new_priority?:
            | Database["public"]["Enums"]["preconsultation_priority"]
            | null
          new_status?: Database["public"]["Enums"]["waiting_status"] | null
          preconsultation_id?: string
          previous_priority?:
            | Database["public"]["Enums"]["preconsultation_priority"]
            | null
          previous_status?: Database["public"]["Enums"]["waiting_status"] | null
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preconsultation_audit_preconsultation_id_fkey"
            columns: ["preconsultation_id"]
            isOneToOne: false
            referencedRelation: "preconsultations"
            referencedColumns: ["id"]
          },
        ]
      }
      preconsultations: {
        Row: {
          arrival_time: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          initial_symptoms: string | null
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["preconsultation_priority"]
          queue_entry_id: string | null
          started_at: string | null
          structure_id: string
          updated_at: string
          vital_signs: Json | null
          waiting_status: Database["public"]["Enums"]["waiting_status"]
        }
        Insert: {
          arrival_time?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          initial_symptoms?: string | null
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["preconsultation_priority"]
          queue_entry_id?: string | null
          started_at?: string | null
          structure_id: string
          updated_at?: string
          vital_signs?: Json | null
          waiting_status?: Database["public"]["Enums"]["waiting_status"]
        }
        Update: {
          arrival_time?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          initial_symptoms?: string | null
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["preconsultation_priority"]
          queue_entry_id?: string | null
          started_at?: string | null
          structure_id?: string
          updated_at?: string
          vital_signs?: Json | null
          waiting_status?: Database["public"]["Enums"]["waiting_status"]
        }
        Relationships: [
          {
            foreignKeyName: "preconsultations_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_shared: boolean
          medications: Json
          name: string
          notes: string | null
          structure_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          medications?: Json
          name: string
          notes?: string | null
          structure_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          medications?: Json
          name?: string
          notes?: string | null
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "prescription_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_templates_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          is_ald: boolean
          is_renewable: boolean
          medications: Json
          notes: string | null
          patient_id: string
          practitioner_id: string
          renewal_count: number | null
          signed_at: string | null
          status: string
          structure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          is_ald?: boolean
          is_renewable?: boolean
          medications?: Json
          notes?: string | null
          patient_id: string
          practitioner_id: string
          renewal_count?: number | null
          signed_at?: string | null
          status?: string
          structure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          is_ald?: boolean
          is_renewable?: boolean
          medications?: Json
          notes?: string | null
          patient_id?: string
          practitioner_id?: string
          renewal_count?: number | null
          signed_at?: string | null
          status?: string
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "prescriptions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          signature_url: string | null
          specialty: string | null
          structure_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          signature_url?: string | null
          specialty?: string | null
          structure_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          signature_url?: string | null
          specialty?: string | null
          structure_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "profiles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      prompt_tests: {
        Row: {
          actual_output: string | null
          expected_output: string | null
          id: string
          input: string
          passed: boolean | null
          tested_at: string
          tested_by: string
          version_id: string
        }
        Insert: {
          actual_output?: string | null
          expected_output?: string | null
          id?: string
          input: string
          passed?: boolean | null
          tested_at?: string
          tested_by: string
          version_id: string
        }
        Update: {
          actual_output?: string | null
          expected_output?: string | null
          id?: string
          input?: string
          passed?: boolean | null
          tested_at?: string
          tested_by?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_tests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_published: boolean | null
          max_tokens: number | null
          notes: string | null
          prompt_id: string
          published_at: string | null
          published_by: string | null
          temperature: number | null
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean | null
          max_tokens?: number | null
          notes?: string | null
          prompt_id: string
          published_at?: string | null
          published_by?: string | null
          temperature?: number | null
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean | null
          max_tokens?: number | null
          notes?: string | null
          prompt_id?: string
          published_at?: string | null
          published_by?: string | null
          temperature?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "system_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          structure_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          structure_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          structure_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      queue_priority_levels: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          level: number
          structure_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          level: number
          structure_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          level?: number
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_priority_levels_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "queue_priority_levels_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_priority_levels_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      rcp_meetings: {
        Row: {
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          notes: string | null
          participants: string[] | null
          patient_ids: string[] | null
          status: string
          structure_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          meeting_date: string
          notes?: string | null
          participants?: string[] | null
          patient_ids?: string[] | null
          status?: string
          structure_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          notes?: string | null
          participants?: string[] | null
          patient_ids?: string[] | null
          status?: string
          structure_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_action_permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          is_allowed: boolean
          requires_health_data_flag: boolean
          resource_type: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          is_allowed?: boolean
          requires_health_data_flag?: boolean
          resource_type: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          is_allowed?: boolean
          requires_health_data_flag?: boolean
          resource_type?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sensitive_data_access_log: {
        Row: {
          access_reason: string
          accessed_at: string
          data_type: string
          id: string
          ip_address: unknown
          patient_id: string | null
          patient_uuid: string | null
          structure_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_reason: string
          accessed_at?: string
          data_type: string
          id?: string
          ip_address?: unknown
          patient_id?: string | null
          patient_uuid?: string | null
          structure_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_reason?: string
          accessed_at?: string
          data_type?: string
          id?: string
          ip_address?: unknown
          patient_id?: string | null
          patient_uuid?: string | null
          structure_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          address: string | null
          archived_at: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          structure_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          structure_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "sites_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      structure_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          structure_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          structure_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          structure_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "structure_invitations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "structure_invitations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structure_invitations_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      structure_isolation_alerts: {
        Row: {
          alert_type: string
          attempted_by: string
          created_at: string
          details: Json | null
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string | null
          resource_type: string
          severity: string
          source_structure_id: string
          target_structure_id: string
        }
        Insert: {
          alert_type?: string
          attempted_by: string
          created_at?: string
          details?: Json | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type: string
          severity?: string
          source_structure_id: string
          target_structure_id: string
        }
        Update: {
          alert_type?: string
          attempted_by?: string
          created_at?: string
          details?: Json | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type?: string
          severity?: string
          source_structure_id?: string
          target_structure_id?: string
        }
        Relationships: []
      }
      structure_opening_hours: {
        Row: {
          break_end: string | null
          break_start: string | null
          close_time: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
          structure_id: string
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          close_time?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          structure_id: string
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          close_time?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "structure_opening_hours_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "structure_opening_hours_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structure_opening_hours_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      structure_settings: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          siret: string | null
          specialty: string | null
          structure_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          siret?: string | null
          specialty?: string | null
          structure_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          siret?: string | null
          specialty?: string | null
          structure_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "structure_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: true
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "structure_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: true
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structure_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: true
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      structures: {
        Row: {
          address: string | null
          archived_at: string | null
          country: string | null
          created_at: string
          email: string | null
          finess: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          finess?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          finess?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      super_admin_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          structure_id: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          structure_id?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          structure_id?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_audit_logs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "super_admin_audit_logs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_logs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          check_timestamp: string
          check_type: Database["public"]["Enums"]["health_check_type"]
          created_at: string
          details: Json | null
          duration_ms: number | null
          id: string
          performed_by: string | null
          status: Database["public"]["Enums"]["health_check_status"]
          structure_id: string | null
        }
        Insert: {
          check_timestamp?: string
          check_type: Database["public"]["Enums"]["health_check_type"]
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          id?: string
          performed_by?: string | null
          status: Database["public"]["Enums"]["health_check_status"]
          structure_id?: string | null
        }
        Update: {
          check_timestamp?: string
          check_type?: Database["public"]["Enums"]["health_check_type"]
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          id?: string
          performed_by?: string | null
          status?: Database["public"]["Enums"]["health_check_status"]
          structure_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_health_checks_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "system_health_checks_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_health_checks_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      system_prompts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          max_tokens: number | null
          name: string
          slug: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          name: string
          slug: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          name?: string
          slug?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          patient_id: string | null
          priority: number | null
          status: string | null
          structure_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: number | null
          status?: string | null
          structure_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: number | null
          status?: string | null
          structure_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "tasks_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      team_members: {
        Row: {
          adeli_number: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          job_title: string
          max_patients_per_day: number | null
          notes: string | null
          professional_email: string | null
          professional_id: string | null
          professional_phone: string | null
          rpps_number: string | null
          specialty: string | null
          structure_id: string
          updated_at: string | null
          user_id: string
          works_pdsa: boolean | null
        }
        Insert: {
          adeli_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          job_title: string
          max_patients_per_day?: number | null
          notes?: string | null
          professional_email?: string | null
          professional_id?: string | null
          professional_phone?: string | null
          rpps_number?: string | null
          specialty?: string | null
          structure_id: string
          updated_at?: string | null
          user_id: string
          works_pdsa?: boolean | null
        }
        Update: {
          adeli_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          job_title?: string
          max_patients_per_day?: number | null
          notes?: string | null
          professional_email?: string | null
          professional_id?: string | null
          professional_phone?: string | null
          rpps_number?: string | null
          specialty?: string | null
          structure_id?: string
          updated_at?: string | null
          user_id?: string
          works_pdsa?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "team_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string | null
          id: string
          role_in_team: string | null
          structure_id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_in_team?: string | null
          structure_id: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_in_team?: string | null
          structure_id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "team_memberships_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          structure_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          structure_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          structure_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "teams_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      transcript_summaries: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          generated_by: string | null
          id: string
          latency_ms: number | null
          model_used: string | null
          patient_id: string | null
          started_at: string | null
          status: string
          structure_id: string | null
          summary_text: string | null
          transcript_id: string
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          generated_by?: string | null
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          patient_id?: string | null
          started_at?: string | null
          status?: string
          structure_id?: string | null
          summary_text?: string | null
          transcript_id: string
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          generated_by?: string | null
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          patient_id?: string | null
          started_at?: string | null
          status?: string
          structure_id?: string | null
          summary_text?: string | null
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_summaries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_summaries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_summaries_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "transcript_summaries_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_summaries_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "transcript_summaries_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: true
            referencedRelation: "patient_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          consent_version: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consent_version?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consent_version?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          structure_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          structure_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          structure_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "user_roles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings_key: string
          settings_value: Json
          structure_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings_key: string
          settings_value?: Json
          structure_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings_key?: string
          settings_value?: Json
          structure_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "user_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
    }
    Views: {
      encrypted_fields_overview: {
        Row: {
          column_name: string | null
          encryption_key_purpose:
            | Database["public"]["Enums"]["encryption_key_purpose"]
            | null
          id: string | null
          is_encrypted: boolean | null
          requires_justification: boolean | null
          sensitivity_level: string | null
          table_name: string | null
        }
        Insert: {
          column_name?: string | null
          encryption_key_purpose?:
            | Database["public"]["Enums"]["encryption_key_purpose"]
            | null
          id?: string | null
          is_encrypted?: boolean | null
          requires_justification?: boolean | null
          sensitivity_level?: string | null
          table_name?: string | null
        }
        Update: {
          column_name?: string | null
          encryption_key_purpose?:
            | Database["public"]["Enums"]["encryption_key_purpose"]
            | null
          id?: string | null
          is_encrypted?: boolean | null
          requires_justification?: boolean | null
          sensitivity_level?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      export_audit_timeline: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expiration_date: string | null
          export_format: Database["public"]["Enums"]["export_format"] | null
          export_type: Database["public"]["Enums"]["export_type"] | null
          file_hash: string | null
          id: string | null
          justification: string | null
          legal_basis: string | null
          patient_id: string | null
          requester_first_name: string | null
          requester_id: string | null
          requester_last_name: string | null
          status: Database["public"]["Enums"]["export_status"] | null
          structure_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      identities_vault_safe: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          email_masked: string | null
          first_name_masked: string | null
          id: string | null
          last_name_masked: string | null
          nir_masked: string | null
          patient_uuid: string | null
          phone_masked: string | null
          structure_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          email_masked?: never
          first_name_masked?: never
          id?: string | null
          last_name_masked?: never
          nir_masked?: never
          patient_uuid?: string | null
          phone_masked?: never
          structure_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          email_masked?: never
          first_name_masked?: never
          id?: string | null
          last_name_masked?: never
          nir_masked?: never
          patient_uuid?: string | null
          phone_masked?: never
          structure_id?: string | null
        }
        Relationships: []
      }
      org_members_with_details: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          org_role: Database["public"]["Enums"]["org_role"] | null
          phone: string | null
          specialty: string | null
          structure_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "org_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patient_queue_status_timeline: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          id: string | null
          new_status: string | null
          previous_status: string | null
          queue_id: string | null
          structure_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_status_history_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patient_queue_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      patients_safe: {
        Row: {
          birth_year_only: string | null
          created_at: string | null
          first_name_masked: string | null
          gender: string | null
          id: string | null
          is_archived: boolean | null
          last_name_masked: string | null
          status: Database["public"]["Enums"]["patient_status"] | null
          structure_id: string | null
          updated_at: string | null
        }
        Insert: {
          birth_year_only?: never
          created_at?: string | null
          first_name_masked?: never
          gender?: string | null
          id?: string | null
          is_archived?: boolean | null
          last_name_masked?: never
          status?: Database["public"]["Enums"]["patient_status"] | null
          structure_id?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_year_only?: never
          created_at?: string | null
          first_name_masked?: never
          gender?: string | null
          id?: string | null
          is_archived?: boolean | null
          last_name_masked?: never
          status?: Database["public"]["Enums"]["patient_status"] | null
          structure_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "stats_dashboard"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "patients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "system_compliance_dashboard"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      stats_dashboard: {
        Row: {
          active_members: number | null
          active_patients: number | null
          structure_id: string | null
          structure_name: string | null
          total_consultations: number | null
        }
        Insert: {
          active_members?: never
          active_patients?: never
          structure_id?: string | null
          structure_name?: string | null
          total_consultations?: never
        }
        Update: {
          active_members?: never
          active_patients?: never
          structure_id?: string | null
          structure_name?: string | null
          total_consultations?: never
        }
        Relationships: []
      }
      system_compliance_dashboard: {
        Row: {
          gdpr_audit_count: number | null
          isolation_alerts: number | null
          structure_id: string | null
          structure_name: string | null
          total_audit_logs: number | null
          total_data_access_logs: number | null
        }
        Insert: {
          gdpr_audit_count?: never
          isolation_alerts?: never
          structure_id?: string | null
          structure_name?: string | null
          total_audit_logs?: never
          total_data_access_logs?: never
        }
        Update: {
          gdpr_audit_count?: never
          isolation_alerts?: never
          structure_id?: string | null
          structure_name?: string | null
          total_audit_logs?: never
          total_data_access_logs?: never
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      can_access_document: { Args: { _document_id: string }; Returns: boolean }
      can_access_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_patient_care: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_patient_identity: {
        Args: { p_patient_uuid: string; p_structure_id: string }
        Returns: boolean
      }
      can_access_patient_nir: {
        Args: { _patient_uuid: string; _user_id: string }
        Returns: boolean
      }
      can_access_patient_sensitive_data: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_patient_vault: {
        Args: { _patient_uuid: string; _user_id: string }
        Returns: boolean
      }
      can_access_profile: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      can_access_profile_secure: {
        Args: { _profile_user_id: string }
        Returns: boolean
      }
      can_access_site: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
      can_perform_action: {
        Args: {
          p_action: string
          p_resource_type: string
          p_structure_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      change_patient_queue_status: {
        Args: {
          p_new_status: string
          p_queue_entry_id: string
          p_reason?: string
        }
        Returns: Json
      }
      check_structure_isolation: {
        Args: { p_resource_id: string; p_table_name: string }
        Returns: boolean
      }
      close_patient_queue_entry: {
        Args: {
          p_billing_status?: string
          p_closure_reason?: string
          p_queue_entry_id: string
        }
        Returns: Json
      }
      compute_validation_signature: {
        Args: { p_content_hash: string; p_timestamp: string; p_user_id: string }
        Returns: string
      }
      create_encounter_from_queue: {
        Args: {
          _mode?: Database["public"]["Enums"]["encounter_mode"]
          _queue_entry_id: string
        }
        Returns: string
      }
      create_structure_with_admin:
        | {
            Args: {
              _structure_name: string
              _structure_slug?: string
              _user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _job_title?: string
              _specialty?: string
              _structure_name: string
              _structure_slug?: string
              _user_id: string
            }
            Returns: string
          }
      deactivate_structure_member: {
        Args: { _target_user_id: string }
        Returns: Json
      }
      generate_certification_report: {
        Args: {
          p_date_end: string
          p_date_start: string
          p_structure_id: string
        }
        Returns: Json
      }
      generate_has_audit_export: {
        Args: {
          p_date_end: string
          p_date_start: string
          p_structure_id: string
        }
        Returns: Json
      }
      generate_rgpd_patient_export: {
        Args: {
          p_export_type: Database["public"]["Enums"]["export_type"]
          p_patient_id: string
        }
        Returns: Json
      }
      get_all_org_admins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          is_active: boolean
          last_name: string
          member_id: string
          org_role: string
          structure_id: string
          structure_name: string
          updated_at: string
          user_id: string
        }[]
      }
      get_all_structures_with_stats: {
        Args: never
        Returns: {
          admin_count: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          member_count: number
          name: string
          slug: string
        }[]
      }
      get_all_users_for_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          is_active: boolean
          last_name: string
          last_sign_in: string
          role: string
          structure_id: string
          structure_name: string
          user_id: string
        }[]
      }
      get_allowed_next_statuses: {
        Args: { p_current_status: string }
        Returns: {
          description: string
          next_status: string
          requires_billing: boolean
          requires_reason: boolean
        }[]
      }
      get_org_role: {
        Args: { _structure_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_patient_appointments: {
        Args: { _patient_id: string }
        Returns: {
          appointment_type: string
          description: string
          end_time: string
          id: string
          location: string
          practitioner_name: string
          start_time: string
          status: string
          title: string
        }[]
      }
      get_patient_chatbot_settings: {
        Args: { _patient_id: string }
        Returns: {
          is_enabled: boolean
          quick_questions: Json
          system_prompt: string
          welcome_message: string
        }[]
      }
      get_patient_documents: {
        Args: { _patient_id: string }
        Returns: {
          created_at: string
          description: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          source: string
          status: string
          title: string
        }[]
      }
      get_patient_info: {
        Args: { _patient_id: string }
        Returns: {
          dob: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          sex: string
        }[]
      }
      get_patient_messages: {
        Args: { _patient_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_from_patient: boolean
          is_read: boolean
          practitioner_name: string
          subject: string
        }[]
      }
      get_stats_dashboard: {
        Args: never
        Returns: {
          appointments_7d: number
          appointments_completed_today: number
          appointments_today: number
          appointments_upcoming_7d: number
          avg_summary_latency_ms_7d: number
          avg_wait_time_minutes_7d: number
          inbox_30d: number
          inbox_7d: number
          inbox_total: number
          inbox_unassigned: number
          patients_active: number
          patients_archived: number
          patients_new_30d: number
          queue_completed_30d: number
          queue_completed_7d: number
          queue_completed_today: number
          queue_in_progress: number
          queue_waiting: number
          structure_id: string
          summaries_failed: number
          summaries_ready: number
          tasks_completed_7d: number
          tasks_in_progress: number
          tasks_overdue: number
          tasks_pending: number
          transcripts_7d: number
          transcripts_failed: number
          transcripts_ready: number
          transcripts_total: number
          transcripts_uploaded: number
        }[]
      }
      get_structure_isolation_status: {
        Args: { p_structure_id: string }
        Returns: Json
      }
      get_super_admin_security_logs: {
        Args: { _limit?: number }
        Returns: {
          action: string
          created_at: string
          details: Json
          id: string
          structure_name: string
          target_id: string
          target_type: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_super_admin_stats: { Args: never; Returns: Json }
      get_user_field_permissions: {
        Args: { p_table_name: string; p_user_id: string }
        Returns: {
          can_approve: boolean
          can_read: boolean
          can_write: boolean
          field_name: string
          is_medical_decision: boolean
          requires_signature: boolean
        }[]
      }
      get_user_primary_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_structure_id: { Args: { _user_id: string }; Returns: string }
      get_user_structure_ids: { Args: { p_user_id: string }; Returns: string[] }
      has_org_role: {
        Args: {
          _required_role: Database["public"]["Enums"]["org_role"]
          _structure_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_structure: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _structure_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_delegated_to_user: {
        Args: {
          _assistant_user_id: string
          _practitioner_user_id: string
          _structure_id: string
        }
        Returns: boolean
      }
      is_feature_enabled: {
        Args: { p_flag_name: string; p_structure_id: string }
        Returns: boolean
      }
      is_healthcare_provider: {
        Args: { _structure_id: string; _user_id: string }
        Returns: boolean
      }
      is_medical_decision_field: {
        Args: { p_field_name: string; p_table_name: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _structure_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _structure_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: { Args: { _user_id: string }; Returns: boolean }
      is_structure_admin: {
        Args: { p_structure_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      join_structure_with_code: {
        Args: {
          _default_role?: Database["public"]["Enums"]["app_role"]
          _structure_slug: string
          _user_id: string
        }
        Returns: Json
      }
      log_data_access: {
        Args: {
          p_access_reason: string
          p_access_reason_category?: string
          p_action_type: Database["public"]["Enums"]["data_access_action"]
          p_fields_accessed: string[]
          p_resource_id: string
          p_resource_type: string
        }
        Returns: string
      }
      log_illegal_deletion_attempt: {
        Args: {
          p_patient_id: string
          p_patient_queue_id: string
          p_structure_id: string
        }
        Returns: undefined
      }
      log_immutable_event: {
        Args: {
          p_action: string
          p_event_type: Database["public"]["Enums"]["audit_event_type"]
          p_new_value?: Json
          p_previous_value?: Json
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: string
      }
      log_super_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _structure_id?: string
          _target_id?: string
          _target_type: string
        }
        Returns: string
      }
      run_system_health_check: {
        Args: {
          p_check_type: Database["public"]["Enums"]["health_check_type"]
          p_structure_id?: string
        }
        Returns: string
      }
      safe_archive_patient_queue: {
        Args: { p_queue_entry_id: string; p_reason?: string }
        Returns: Json
      }
      send_appointment_reminders: { Args: never; Returns: undefined }
      send_patient_message: {
        Args: {
          _content: string
          _patient_id: string
          _structure_id: string
          _subject: string
        }
        Returns: string
      }
      simulate_patient_workflow: {
        Args: { p_dry_run?: boolean; p_structure_id: string }
        Returns: Json
      }
      super_admin_deactivate_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      super_admin_reactivate_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      super_admin_toggle_structure: {
        Args: { _is_active: boolean; _structure_id: string }
        Returns: undefined
      }
      trigger_notification: {
        Args: {
          p_event_key: string
          p_message: string
          p_metadata?: Json
          p_structure_id: string
          p_subject: string
        }
        Returns: undefined
      }
      update_queue_order: {
        Args: { p_ordered_ids: string[]; p_structure_id: string }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: Json
      }
      user_belongs_to_structure: {
        Args: { _structure_id: string; _user_id: string }
        Returns: boolean
      }
      validate_field_access: {
        Args: {
          p_field_name: string
          p_operation: string
          p_table_name: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_status_transition: {
        Args: {
          p_billing_status: string
          p_current_status: string
          p_new_status: string
          p_reason: string
        }
        Returns: boolean
      }
      verify_hash_chain_integrity: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_structure_id: string
        }
        Returns: {
          actual_hash: string
          broken_log_id: string
          expected_hash: string
          first_broken_at: string
          is_valid: boolean
          total_logs: number
        }[]
      }
      verify_patient_access: {
        Args: { _access_code: string; _email: string }
        Returns: {
          email: string
          first_name: string
          last_name: string
          patient_id: string
        }[]
      }
    }
    Enums: {
      antecedent_severity: "leger" | "modere" | "severe"
      antecedent_type:
        | "medical"
        | "chirurgical"
        | "familial"
        | "allergique"
        | "traitement_en_cours"
      app_role:
        | "admin"
        | "prompt_admin"
        | "practitioner"
        | "assistant"
        | "coordinator"
        | "super_admin"
        | "nurse"
        | "ipa"
      audit_event_type:
        | "user_action"
        | "data_access"
        | "data_modification"
        | "export"
        | "security_event"
        | "system_event"
      consent_status: "pending" | "obtained" | "refused" | "revoked"
      data_access_action: "read" | "decrypt" | "export" | "print"
      encounter_mode: "solo" | "assisted"
      encounter_status:
        | "created"
        | "preconsult_in_progress"
        | "preconsult_ready"
        | "consultation_in_progress"
        | "completed"
        | "cancelled"
      encryption_key_purpose:
        | "consultation_data"
        | "patient_records"
        | "ai_analysis"
        | "recordings"
      export_format: "pdf" | "json" | "csv" | "xml"
      export_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
      export_type:
        | "rgpd_patient_data"
        | "rgpd_rectification"
        | "rgpd_portability"
        | "has_certification"
        | "medical_legal_archive"
        | "audit_trail"
      health_check_status: "passed" | "failed" | "warning"
      health_check_type:
        | "rls_integrity"
        | "hash_chain_integrity"
        | "rbac_enforcement"
        | "audit_completeness"
        | "consent_coverage"
        | "data_encryption"
      org_role:
        | "owner"
        | "admin"
        | "doctor"
        | "ipa"
        | "nurse"
        | "assistant"
        | "coordinator"
        | "viewer"
      patient_consent_type:
        | "care"
        | "data_processing"
        | "recording"
        | "ai_analysis"
        | "data_sharing"
      patient_origin: "spontanee" | "samu" | "hopital" | "confrere" | "autre"
      patient_presence_status:
        | "present"
        | "waiting"
        | "called"
        | "in_consultation"
        | "awaiting_exam"
        | "completed"
        | "closed"
        | "no_show"
        | "cancelled"
      patient_status: "actif" | "clos"
      preconsultation_priority: "normal" | "urgent" | "emergency"
      waiting_status: "arrived" | "waiting" | "in_progress" | "completed"
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
      antecedent_severity: ["leger", "modere", "severe"],
      antecedent_type: [
        "medical",
        "chirurgical",
        "familial",
        "allergique",
        "traitement_en_cours",
      ],
      app_role: [
        "admin",
        "prompt_admin",
        "practitioner",
        "assistant",
        "coordinator",
        "super_admin",
        "nurse",
        "ipa",
      ],
      audit_event_type: [
        "user_action",
        "data_access",
        "data_modification",
        "export",
        "security_event",
        "system_event",
      ],
      consent_status: ["pending", "obtained", "refused", "revoked"],
      data_access_action: ["read", "decrypt", "export", "print"],
      encounter_mode: ["solo", "assisted"],
      encounter_status: [
        "created",
        "preconsult_in_progress",
        "preconsult_ready",
        "consultation_in_progress",
        "completed",
        "cancelled",
      ],
      encryption_key_purpose: [
        "consultation_data",
        "patient_records",
        "ai_analysis",
        "recordings",
      ],
      export_format: ["pdf", "json", "csv", "xml"],
      export_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "expired",
      ],
      export_type: [
        "rgpd_patient_data",
        "rgpd_rectification",
        "rgpd_portability",
        "has_certification",
        "medical_legal_archive",
        "audit_trail",
      ],
      health_check_status: ["passed", "failed", "warning"],
      health_check_type: [
        "rls_integrity",
        "hash_chain_integrity",
        "rbac_enforcement",
        "audit_completeness",
        "consent_coverage",
        "data_encryption",
      ],
      org_role: [
        "owner",
        "admin",
        "doctor",
        "ipa",
        "nurse",
        "assistant",
        "coordinator",
        "viewer",
      ],
      patient_consent_type: [
        "care",
        "data_processing",
        "recording",
        "ai_analysis",
        "data_sharing",
      ],
      patient_origin: ["spontanee", "samu", "hopital", "confrere", "autre"],
      patient_presence_status: [
        "present",
        "waiting",
        "called",
        "in_consultation",
        "awaiting_exam",
        "completed",
        "closed",
        "no_show",
        "cancelled",
      ],
      patient_status: ["actif", "clos"],
      preconsultation_priority: ["normal", "urgent", "emergency"],
      waiting_status: ["arrived", "waiting", "in_progress", "completed"],
    },
  },
} as const
