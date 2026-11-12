-- ==========================================
-- 2Q DEPRESSION SCREENING
-- Smart Governance Municipality Platform
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ph_2q_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES public.ph_care_visits(id) ON DELETE CASCADE,
    patient_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,
    
    -- Questions
    -- ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านรู้สึก หดหู่ เศร้า หรือท้อแท้สิ้นหวัง หรือไม่?
    q1_depressed BOOLEAN NOT NULL,
    -- ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านรู้สึก เบื่อ ทำอะไรก็ไม่เพลิดเพลิน หรือไม่?
    q2_loss_interest BOOLEAN NOT NULL,
    
    -- Result (If any is TRUE, considered positive/at risk)
    is_at_risk BOOLEAN NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ph_2q_visit ON public.ph_2q_assessments(visit_id);
CREATE INDEX IF NOT EXISTS idx_ph_2q_patient ON public.ph_2q_assessments(patient_member_id);

-- RLS
ALTER TABLE public.ph_2q_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_2q_read" ON public.ph_2q_assessments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ph_2q_manage" ON public.ph_2q_assessments FOR ALL USING (true);
