-- ==========================================
-- CARE GIVER (CG)
-- Smart Governance Municipality Platform
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ph_cg_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position TEXT DEFAULT 'Care Giver',
    agency TEXT DEFAULT 'กองสาธารณสุขและสิ่งแวดล้อม',
    phone TEXT,
    service_area TEXT, -- พื้นที่รับผิดชอบ
    status TEXT DEFAULT 'ปฏิบัติงาน' CHECK (status IN ('ปฏิบัติงาน', 'พักงาน', 'ลาออก')),
    user_id UUID, -- References auth.users if they have a login
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ph_cg_staff_status ON public.ph_cg_staff(status);

-- RLS
ALTER TABLE public.ph_cg_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_cg_staff_read" ON public.ph_cg_staff FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ph_cg_staff_manage" ON public.ph_cg_staff FOR ALL USING (true);
