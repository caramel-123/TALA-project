export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      regions: {
        Row: {
          id: string;
          psgc_code: string;
          region_name: string;
          created_at: string;
          updated_at: string;
        };
      };
      divisions: {
        Row: {
          id: string;
          division_code: string;
          division_name: string;
          region_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      schools: {
        Row: {
          id: string;
          school_id_code: string;
          school_name: string;
          division_id: string;
          is_remote: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      star_programs: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          teacher_code: string;
          region_id: string;
          division_id: string | null;
          school_id: string | null;
          specialization: string | null;
          career_stage: string | null;
          years_experience: number | null;
          created_at: string;
          updated_at: string;
        };
      };
      training_participation: {
        Row: {
          id: string;
          teacher_id: string | null;
          program_id: string;
          region_id: string;
          participation_date: string;
          participants_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      school_context: {
        Row: {
          id: string;
          school_id: string;
          region_id: string;
          coverage_pct: number;
          priority_status: string;
          top_gap: string | null;
          underserved_score: number;
          cluster_name: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      regional_context: {
        Row: {
          id: string;
          region_id: string;
          snapshot_date: string;
          teacher_population: number;
          star_coverage_pct: number;
          underserved_score: number;
          data_quality_score: number;
          data_completeness_pct: number;
          high_priority_divisions: number;
          gap_factors: Json | null;
          cluster_map: Json | null;
          score_factors: Json | null;
          data_confidence: Json | null;
          created_at: string;
          updated_at: string;
        };
      };
      recommendations: {
        Row: {
          id: string;
          region_id: string;
          score: number;
          gap: string;
          primary_program_id: string | null;
          secondary_program_id: string | null;
          status: string;
          confidence: string;
          delivery_method: string;
          resource_requirement: string;
          created_at: string;
          updated_at: string;
        };
      };
      data_sources: {
        Row: {
          id: string;
          source_name: string;
          source_type: string;
          region_id: string | null;
          coverage_label: string | null;
          records_count: number;
          completeness_pct: number;
          status: string;
          last_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      upload_batches: {
        Row: {
          id: string;
          data_source_id: string;
          file_name: string;
          file_type: string;
          file_size_bytes: number;
          upload_status: string;
          row_count: number;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      teacher_records_staging: {
        Row: {
          id: string;
          batch_id: string;
          teacher_external_id: string;
          teacher_name: string | null;
          anonymized_teacher_hash: string | null;
          specialization: string | null;
          school_id: string | null;
          region_id: string | null;
          years_experience: number | null;
          training_hours_last_12m: number | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
      };
      validation_issues: {
        Row: {
          id: string;
          batch_id: string;
          staging_record_id: string | null;
          issue_type: string;
          severity: string;
          field_name: string | null;
          issue_message: string;
          is_resolved: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      validation_actions: {
        Row: {
          id: string;
          issue_id: string;
          action: string;
          reviewer_id: string | null;
          notes: string | null;
          action_at: string;
          created_at: string;
          updated_at: string;
        };
      };
      data_quality_snapshots: {
        Row: {
          id: string;
          region_id: string;
          snapshot_date: string;
          quality_score: number;
          completeness_pct: number;
          recency: string;
          validation_status: string;
          conflict_flags: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Views: {
      v_data_source_registry: {
        Row: {
          id: string;
          source_name: string;
          source_type: string;
          region_or_coverage: string;
          records_count: number;
          last_updated_at: string | null;
          completeness_pct: number;
          status: string;
          total_batches: number;
          open_issues: number;
        };
      };
      v_validation_issue_summary: {
        Row: {
          batch_id: string;
          data_source_id: string;
          source_name: string;
          issue_type: string;
          severity: string;
          issue_count: number;
          resolved_count: number;
          open_count: number;
        };
      };
      v_region_data_quality_latest: {
        Row: {
          region_id: string;
          region_name: string;
          snapshot_date: string;
          quality_score: number;
          completeness_pct: number;
          recency: string;
          validation_status: string;
          conflict_flags: number;
        };
      };
      ingestion_batches: {
        Row: {
          id: string;
          source_name: string;
          file_name: string;
          upload_status: string;
          row_count: number;
          started_at: string;
          completed_at: string | null;
        };
      };
      data_quality_issues: {
        Row: {
          id: string;
          source_name: string;
          issue_type: string;
          severity: string;
          is_resolved: boolean;
          created_at: string;
        };
      };
    };
  };
};
