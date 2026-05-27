// Placeholder types — regenerate with Supabase CLI once connected:
// npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      people: {
        Row: {
          id: string
          name: string
          auth_user_id: string | null
          telegram_chat_id: number | null
          email: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          auth_user_id?: string | null
          telegram_chat_id?: number | null
          email?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          auth_user_id?: string | null
          telegram_chat_id?: number | null
          email?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          description: string | null
          address: string | null
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          description?: string | null
          address?: string | null
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          description?: string | null
          address?: string | null
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      phases: {
        Row: {
          id: string
          project_id: string
          name: string
          order_index: number
          start_date: string | null
          end_date: string | null
          status: "planned" | "in_progress" | "completed" | "on_hold"
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          order_index?: number
          start_date?: string | null
          end_date?: string | null
          status?: "planned" | "in_progress" | "completed" | "on_hold"
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          order_index?: number
          start_date?: string | null
          end_date?: string | null
          status?: "planned" | "in_progress" | "completed" | "on_hold"
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      work_lots: {
        Row: {
          id: string
          code: string
          name: string
          category: string | null
          color: string | null
          order_index: number
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          name: string
          category?: string | null
          color?: string | null
          order_index?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category?: string | null
          color?: string | null
          order_index?: number
          is_active?: boolean
        }
        Relationships: []
      }
      zones: {
        Row: {
          id: string
          project_id: string
          name: string
          surface_m2: number | null
          description: string | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          surface_m2?: number | null
          description?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          surface_m2?: number | null
          description?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          name: string
          normalized_name: string
          website: string | null
          address: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          id: string
          name: string
          worker_type: "journalier" | "artisan_forfait" | "sous_traitant" | "entreprise"
          default_hourly_rate: number | null
          speciality: string | null
          phone: string | null
          iban: string | null
          notes: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          worker_type?: "journalier" | "artisan_forfait" | "sous_traitant" | "entreprise"
          default_hourly_rate?: number | null
          speciality?: string | null
          phone?: string | null
          iban?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          worker_type?: "journalier" | "artisan_forfait" | "sous_traitant" | "entreprise"
          default_hourly_rate?: number | null
          speciality?: string | null
          phone?: string | null
          iban?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          store_id: string | null
          paid_by: string
          receipt_date: string
          total_amount: number
          vat_amount: number | null
          currency: string
          payment_method: "cb" | "virement" | "cash" | "cheque" | "autre" | null
          photo_url: string | null
          photo_thumbnail_url: string | null
          status: "pending" | "validated" | "archived"
          source: "manual" | "telegram" | "email" | "imported"
          notes: string | null
          ocr_raw_json: Json | null
          created_at: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          store_id?: string | null
          paid_by: string
          receipt_date: string
          total_amount: number
          vat_amount?: number | null
          currency?: string
          payment_method?: "cb" | "virement" | "cash" | "cheque" | "autre" | null
          photo_url?: string | null
          photo_thumbnail_url?: string | null
          status?: "pending" | "validated" | "archived"
          source?: "manual" | "telegram" | "email" | "imported"
          notes?: string | null
          ocr_raw_json?: Json | null
          created_at?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          phase_id?: string | null
          store_id?: string | null
          paid_by?: string
          receipt_date?: string
          total_amount?: number
          vat_amount?: number | null
          currency?: string
          payment_method?: "cb" | "virement" | "cash" | "cheque" | "autre" | null
          photo_url?: string | null
          photo_thumbnail_url?: string | null
          status?: "pending" | "validated" | "archived"
          source?: "manual" | "telegram" | "email" | "imported"
          notes?: string | null
          ocr_raw_json?: Json | null
          created_at?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      receipt_lines: {
        Row: {
          id: string
          receipt_id: string
          line_number: number
          description: string
          quantity: number
          unit: string | null
          unit_price: number | null
          line_total: number
          lot_id: string | null
          zone_id: string | null
          suggested_lot_id: string | null
          is_categorized: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receipt_id: string
          line_number: number
          description: string
          quantity?: number
          unit?: string | null
          unit_price?: number | null
          line_total: number
          lot_id?: string | null
          zone_id?: string | null
          suggested_lot_id?: string | null
          is_categorized?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          line_number?: number
          description?: string
          quantity?: number
          unit?: string | null
          unit_price?: number | null
          line_total?: number
          lot_id?: string | null
          zone_id?: string | null
          suggested_lot_id?: string | null
          is_categorized?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      work_days: {
        Row: {
          id: string
          worker_id: string
          project_id: string
          phase_id: string | null
          lot_id: string | null
          zone_id: string | null
          work_date: string
          hours_worked: number
          hourly_rate: number
          amount_due: number
          notes: string | null
          logged_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          project_id: string
          phase_id?: string | null
          lot_id?: string | null
          zone_id?: string | null
          work_date: string
          hours_worked: number
          hourly_rate: number
          notes?: string | null
          logged_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          project_id?: string
          phase_id?: string | null
          lot_id?: string | null
          zone_id?: string | null
          work_date?: string
          hours_worked?: number
          hourly_rate?: number
          notes?: string | null
          logged_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      worker_payments: {
        Row: {
          id: string
          worker_id: string
          paid_by: string
          payment_date: string
          amount: number
          payment_method: "virement" | "cash" | "cheque" | "cb"
          receipt_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          paid_by: string
          payment_date: string
          amount: number
          payment_method?: "virement" | "cash" | "cheque" | "cb"
          receipt_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          paid_by?: string
          payment_date?: string
          amount?: number
          payment_method?: "virement" | "cash" | "cheque" | "cb"
          receipt_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      work_day_payments: {
        Row: {
          work_day_id: string
          payment_id: string
          allocated_amount: number
        }
        Insert: {
          work_day_id: string
          payment_id: string
          allocated_amount: number
        }
        Update: {
          work_day_id?: string
          payment_id?: string
          allocated_amount?: number
        }
        Relationships: []
      }
      budget_estimates: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          lot_id: string | null
          zone_id: string | null
          estimated_amount: number
          cost_type: "materials" | "labor" | "mixed" | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          lot_id?: string | null
          zone_id?: string | null
          estimated_amount: number
          cost_type?: "materials" | "labor" | "mixed" | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          phase_id?: string | null
          lot_id?: string | null
          zone_id?: string | null
          estimated_amount?: number
          cost_type?: "materials" | "labor" | "mixed" | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      worker_balances: {
        Row: {
          worker_id: string
          worker_name: string
          is_active: boolean
          total_earned: number
          total_paid: number
          balance_due: number
          days_worked: number
          total_hours: number
          last_work_date: string | null
        }
        Relationships: []
      }
      spend_by_lot_project: {
        Row: {
          project_id: string
          project_name: string
          lot_id: string | null
          lot_name: string | null
          total_spent: number
          receipt_count: number
          line_count: number
        }
        Relationships: []
      }
      project_total_cost: {
        Row: {
          project_id: string
          project_name: string
          materials_cost: number
          labor_cost: number
          total_cost: number
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
