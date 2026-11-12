-- ==========================================
-- CARE VISITS
-- Smart Governance Municipality Platform
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ph_care_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    patient_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,
    cg_id UUID REFERENCES public.ph_cg_staff(id) ON DELETE SET NULL,
    cm_id UUID REFERENCES public.ph_cm_staff(id) ON DELETE SET NULL,
    
    -- Visit Time
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Health Assessment (Vitals & Body)
    weight NUMERIC(5,2),
    height NUMERIC(5,2),
    bmi NUMERIC(5,2),
    blood_pressure TEXT, -- e.g. 120/80
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    temperature NUMERIC(4,1),
    
    -- Care Details
    problems_found TEXT,
    activities_provided TEXT,
    recommendations TEXT,
    observations TEXT,
    
    -- Result
    visit_result TEXT CHECK (visit_result IN ('ดีขึ้น', 'เท่าเดิม', 'แย่ลง')),
    
    -- Proof & Confirmations
    photo_url TEXT,
    relative_signature_url TEXT,
    cg_signature_url TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- CM Review
    status TEXT DEFAULT 'รอดำเนินการ' CHECK (status IN ('รอดำเนินการ', 'ตรวจสอบแล้ว', 'รอแก้ไข', 'ส่งต่อ')),
    cm_comment TEXT,
    cm_review_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ph_care_visits_patient ON public.ph_care_visits(patient_member_id);
CREATE INDEX IF NOT EXISTS idx_ph_care_visits_cg ON public.ph_care_visits(cg_id);
CREATE INDEX IF NOT EXISTS idx_ph_care_visits_date ON public.ph_care_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_ph_care_visits_status ON public.ph_care_visits(status);

-- RLS
ALTER TABLE public.ph_care_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_care_visits_read" ON public.ph_care_visits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ph_care_visits_manage" ON public.ph_care_visits FOR ALL USING (true);
