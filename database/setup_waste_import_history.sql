-- ==========================================
-- DDL for Waste Import History Table
-- GOOD GOV Waste Fee System
-- ==========================================

CREATE TABLE IF NOT EXISTS public.waste_import_history (
    id text PRIMARY KEY,
    batch_id text NOT NULL,
    filename text NOT NULL,
    import_date timestamptz DEFAULT now(),
    user_name text,
    fiscal_year text,
    village text,
    sheet_name text,
    total_rows integer DEFAULT 0,
    success_count integer DEFAULT 0,
    warning_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    status text DEFAULT 'completed',
    rollback_status text DEFAULT 'none',
    import_data jsonb,
    error_log jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.waste_import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for public" ON public.waste_import_history FOR ALL USING (true) WITH CHECK (true);
