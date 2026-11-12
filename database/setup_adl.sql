-- ==========================================
-- ADL ASSESSMENT (Activities of Daily Living)
-- Smart Governance Municipality Platform
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ph_adl_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES public.ph_care_visits(id) ON DELETE CASCADE,
    patient_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,
    
    -- ADL 10 Items (Scores)
    feeding INTEGER DEFAULT 0,
    grooming INTEGER DEFAULT 0,
    transfer INTEGER DEFAULT 0,
    toilet INTEGER DEFAULT 0,
    mobility INTEGER DEFAULT 0,
    dressing INTEGER DEFAULT 0,
    stairs INTEGER DEFAULT 0,
    bathing INTEGER DEFAULT 0,
    bowel INTEGER DEFAULT 0,
    bladder INTEGER DEFAULT 0,
    
    -- Total & Result
    total_score INTEGER DEFAULT 0,
    dependency_level TEXT CHECK (dependency_level IN ('ติดสังคม', 'ติดบ้าน', 'ติดเตียง')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ph_adl_visit ON public.ph_adl_assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_ph_adl_patient ON public.ph_adl_assessments(patient_member_id);

-- RLS
ALTER TABLE public.ph_adl_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_adl_read" ON public.ph_adl_assessments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ph_adl_manage" ON public.ph_adl_assessments FOR ALL USING (true);
