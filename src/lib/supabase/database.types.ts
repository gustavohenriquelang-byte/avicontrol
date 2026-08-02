/**
 * Tipos do banco (Etapa 1). Idealmente gerados com:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 * Mantidos manualmente aqui enquanto o CLI do Supabase não é executado.
 */

export type UserRole =
  | "admin"
  | "gerente"
  | "operador"
  | "veterinario"
  | "comercial"
  | "consulta";

export type HousingSystem =
  | "gaiolas_convencionais"
  | "cage_free"
  | "free_range"
  | "caipira"
  | "organico"
  | "outro";

export type HouseStatus = "ativo" | "inativo" | "manutencao" | "vazio_sanitario";

export type FlockStatus =
  | "recria"
  | "pre_postura"
  | "producao"
  | "muda"
  | "encerrado"
  | "vazio_sanitario";

export type FlockMovementType =
  | "entrada"
  | "transferencia"
  | "mortalidade"
  | "descarte"
  | "venda"
  | "ajuste"
  | "encerramento";

export type DailyRecordStatus = "draft" | "closed";

export type MortalityReason =
  | "desconhecida"
  | "doenca"
  | "acidente"
  | "canibalismo"
  | "locomotor"
  | "respiratorio"
  | "baixa_produtividade"
  | "descarte_sanitario"
  | "outro";

export type FeedMovementType =
  | "compra"
  | "consumo"
  | "transferencia"
  | "perda"
  | "ajuste"
  | "inventario";

export type EggQuality =
  | "bom"
  | "sujo"
  | "trincado"
  | "quebrado"
  | "deformado"
  | "industrial"
  | "descartado";

export type EggMovementType =
  | "producao"
  | "classificacao"
  | "transferencia"
  | "venda"
  | "descarte"
  | "ajuste"
  | "inventario";

export type ManureUnit = "kg" | "tonelada" | "saco" | "big_bag" | "m3";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          tax_id: string | null;
          phone: string | null;
          email: string | null;
          city: string | null;
          state: string | null;
          timezone: string;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          timezone?: string;
          active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organization_users: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["organization_users"]["Insert"]>;
        Relationships: [];
      };
      farms: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          city: string | null;
          state: string | null;
          address: string | null;
          notes: string | null;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          city?: string | null;
          state?: string | null;
          address?: string | null;
          notes?: string | null;
          active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["farms"]["Insert"]>;
        Relationships: [];
      };
      farm_units: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string;
          code: string;
          name: string;
          notes: string | null;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id: string;
          code: string;
          name: string;
          notes?: string | null;
          active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["farm_units"]["Insert"]>;
        Relationships: [];
      };
      houses: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string;
          farm_unit_id: string | null;
          code: string;
          name: string;
          capacity: number | null;
          installation_type: string | null;
          housing_system: HousingSystem;
          area_m2: number | null;
          cages_count: number | null;
          status: HouseStatus;
          notes: string | null;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id: string;
          farm_unit_id?: string | null;
          code: string;
          name: string;
          capacity?: number | null;
          installation_type?: string | null;
          housing_system?: HousingSystem;
          area_m2?: number | null;
          cages_count?: number | null;
          status?: HouseStatus;
          notes?: string | null;
          active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["houses"]["Insert"]>;
        Relationships: [];
      };
      breeds: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          supplier: string | null;
          color: string | null;
          notes: string | null;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          supplier?: string | null;
          color?: string | null;
          notes?: string | null;
          active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["breeds"]["Insert"]>;
        Relationships: [];
      };
      breed_curves: {
        Row: {
          id: string;
          organization_id: string;
          breed_id: string;
          age_weeks: number;
          expected_laying_rate: number | null;
          expected_weight_g: number | null;
          expected_feed_g: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          breed_id: string;
          age_weeks: number;
          expected_laying_rate?: number | null;
          expected_weight_g?: number | null;
          expected_feed_g?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["breed_curves"]["Insert"]>;
        Relationships: [];
      };
      flocks: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string;
          house_id: string | null;
          breed_id: string | null;
          code: string;
          supplier: string | null;
          birth_date: string | null;
          housing_date: string | null;
          initial_quantity: number;
          current_quantity: number;
          age_at_housing_days: number | null;
          acquisition_cost: number | null;
          initial_avg_weight_g: number | null;
          expected_laying_start: string | null;
          expected_cull_date: string | null;
          status: FlockStatus;
          notes: string | null;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id: string;
          house_id?: string | null;
          breed_id?: string | null;
          code: string;
          supplier?: string | null;
          birth_date?: string | null;
          housing_date?: string | null;
          initial_quantity?: number;
          current_quantity?: number;
          age_at_housing_days?: number | null;
          acquisition_cost?: number | null;
          initial_avg_weight_g?: number | null;
          expected_laying_start?: string | null;
          expected_cull_date?: string | null;
          status?: FlockStatus;
          notes?: string | null;
          active?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["flocks"]["Insert"]>;
        Relationships: [];
      };
      flock_movements: {
        Row: {
          id: string;
          organization_id: string;
          flock_id: string;
          movement_type: FlockMovementType;
          movement_date: string;
          quantity: number;
          reason: string | null;
          reference: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          flock_id: string;
          movement_type: FlockMovementType;
          movement_date?: string;
          quantity?: number;
          reason?: string | null;
          reference?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["flock_movements"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          organization_id: string;
          key: string;
          value: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          key: string;
          value?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_value: Record<string, unknown> | null;
          new_value: Record<string, unknown> | null;
          ip: string | null;
          device: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_value?: Record<string, unknown> | null;
          new_value?: Record<string, unknown> | null;
          ip?: string | null;
          device?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      daily_records: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string;
          house_id: string | null;
          flock_id: string;
          record_date: string;
          collection_time: string | null;
          birds_start: number;
          eggs_total: number;
          eggs_good: number;
          eggs_dirty: number;
          eggs_cracked: number;
          eggs_broken: number;
          eggs_deformed: number;
          eggs_double_yolk: number;
          eggs_industrial: number;
          eggs_discarded: number;
          feed_kg: number;
          water_l: number;
          mortality: number;
          culls: number;
          temp_min: number | null;
          temp_max: number | null;
          humidity: number | null;
          notes: string | null;
          status: DailyRecordStatus;
          adjustment_justification: string | null;
          created_by: string | null;
          closed_by: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id: string;
          house_id?: string | null;
          flock_id: string;
          record_date: string;
          collection_time?: string | null;
          birds_start?: number;
          eggs_total?: number;
          eggs_good?: number;
          eggs_dirty?: number;
          eggs_cracked?: number;
          eggs_broken?: number;
          eggs_deformed?: number;
          eggs_double_yolk?: number;
          eggs_industrial?: number;
          eggs_discarded?: number;
          feed_kg?: number;
          water_l?: number;
          mortality?: number;
          culls?: number;
          temp_min?: number | null;
          temp_max?: number | null;
          humidity?: number | null;
          notes?: string | null;
          status?: DailyRecordStatus;
          adjustment_justification?: string | null;
          created_by?: string | null;
          closed_by?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_records"]["Insert"]>;
        Relationships: [];
      };
      mortality_records: {
        Row: {
          id: string;
          organization_id: string;
          flock_id: string;
          house_id: string | null;
          record_date: string;
          quantity: number;
          reason: MortalityReason;
          cause_note: string | null;
          responsible: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          flock_id: string;
          house_id?: string | null;
          record_date: string;
          quantity?: number;
          reason?: MortalityReason;
          cause_note?: string | null;
          responsible?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mortality_records"]["Insert"]>;
        Relationships: [];
      };
      feed_types: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          notes: string | null;
          active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          notes?: string | null;
          active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_types"]["Insert"]>;
        Relationships: [];
      };
      feed_purchases: {
        Row: {
          id: string;
          organization_id: string;
          feed_type_id: string;
          farm_id: string | null;
          purchase_date: string;
          supplier: string | null;
          quantity_kg: number;
          unit_cost: number;
          total_cost: number;
          invoice: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feed_type_id: string;
          farm_id?: string | null;
          purchase_date?: string;
          supplier?: string | null;
          quantity_kg?: number;
          unit_cost?: number;
          total_cost?: number;
          invoice?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_purchases"]["Insert"]>;
        Relationships: [];
      };
      feed_inventory: {
        Row: {
          id: string;
          organization_id: string;
          feed_type_id: string;
          quantity_kg: number;
          avg_cost: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feed_type_id: string;
          quantity_kg?: number;
          avg_cost?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_inventory"]["Insert"]>;
        Relationships: [];
      };
      feed_movements: {
        Row: {
          id: string;
          organization_id: string;
          feed_type_id: string;
          farm_id: string | null;
          movement_type: FeedMovementType;
          movement_date: string;
          quantity_kg: number;
          unit_cost: number | null;
          reference: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feed_type_id: string;
          farm_id?: string | null;
          movement_type: FeedMovementType;
          movement_date?: string;
          quantity_kg?: number;
          unit_cost?: number | null;
          reference?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_movements"]["Insert"]>;
        Relationships: [];
      };
      egg_inventory: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string;
          flock_id: string | null;
          location: string | null;
          production_date: string;
          quality: EggQuality;
          weight_category: string | null;
          quantity: number;
          expiry_date: string | null;
          trace_code: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id: string;
          flock_id?: string | null;
          location?: string | null;
          production_date: string;
          quality?: EggQuality;
          weight_category?: string | null;
          quantity?: number;
          expiry_date?: string | null;
          trace_code: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["egg_inventory"]["Insert"]>;
        Relationships: [];
      };
      egg_inventory_movements: {
        Row: {
          id: string;
          organization_id: string;
          egg_inventory_id: string;
          movement_type: EggMovementType;
          movement_date: string;
          quantity: number;
          reference: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          egg_inventory_id: string;
          movement_type: EggMovementType;
          movement_date?: string;
          quantity?: number;
          reference?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["egg_inventory_movements"]["Insert"]>;
        Relationships: [];
      };
      manure_production: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string | null;
          house_id: string | null;
          flock_id: string | null;
          production_date: string;
          quantity: number;
          unit: ManureUnit;
          quantity_kg: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id?: string | null;
          house_id?: string | null;
          flock_id?: string | null;
          production_date?: string;
          quantity?: number;
          unit?: ManureUnit;
          quantity_kg?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["manure_production"]["Insert"]>;
        Relationships: [];
      };
      manure_sales: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string | null;
          sale_date: string;
          buyer: string | null;
          quantity: number;
          unit: ManureUnit;
          quantity_kg: number;
          unit_price: number;
          total: number;
          payment_method: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id?: string | null;
          sale_date?: string;
          buyer?: string | null;
          quantity?: number;
          unit?: ManureUnit;
          quantity_kg?: number;
          unit_price?: number;
          total?: number;
          payment_method?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["manure_sales"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      auth_org_ids: { Args: Record<string, never>; Returns: string[] };
      is_org_member: { Args: { org: string }; Returns: boolean };
      current_org_role: { Args: { org: string }; Returns: UserRole };
      has_org_role: { Args: { org: string; roles: UserRole[] }; Returns: boolean };
      create_org_and_join: { Args: { p_name: string }; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      housing_system: HousingSystem;
      house_status: HouseStatus;
      flock_status: FlockStatus;
      flock_movement_type: FlockMovementType;
      daily_record_status: DailyRecordStatus;
      mortality_reason: MortalityReason;
      feed_movement_type: FeedMovementType;
      egg_quality: EggQuality;
      egg_movement_type: EggMovementType;
      manure_unit: ManureUnit;
    };
  };
}

// Atalhos de tipo úteis
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
