-- ==========================================
-- MEDICAL EQUIPMENT INVENTORY & REQUESTS
-- Smart Governance Municipality Platform
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EQUIPMENT INVENTORY
CREATE TABLE IF NOT EXISTS public.ph_medical_equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_code TEXT UNIQUE NOT NULL,
    equipment_name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Wheelchair', 'Bed', 'Oxygen', 'Suction'
    total_quantity INTEGER DEFAULT 0,
    borrowed_quantity INTEGER DEFAULT 0,
    remaining_quantity INTEGER DEFAULT 0, -- Should be total_quantity - borrowed_quantity
    status TEXT DEFAULT 'พร้อมใช้งาน' CHECK (status IN ('พร้อมใช้งาน', 'ต้องซ่อมแซม', 'แทงจำหน่าย')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ph_med_equip_cat ON public.ph_medical_equipments(category);

-- RLS
ALTER TABLE public.ph_medical_equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_med_equip_read" ON public.ph_medical_equipments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ph_med_equip_manage" ON public.ph_medical_equipments FOR ALL USING (true);


-- 2. BORROW REQUESTS
CREATE TABLE IF NOT EXISTS public.ph_equipment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number TEXT UNIQUE, -- e.g. REQ-2026-0001
    applicant_name TEXT NOT NULL,
    patient_member_id UUID REFERENCES public.dd_household_members(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES public.ph_medical_equipments(id) ON DELETE CASCADE,
    
    reason TEXT,
    borrow_date DATE NOT NULL,
    expected_return_date DATE,
    actual_return_date DATE,
    
    approval_status TEXT DEFAULT 'รออนุมัติ' CHECK (approval_status IN ('รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ', 'คืนแล้ว', 'ค้างส่งคืน')),
    cm_id UUID REFERENCES public.ph_cm_staff(id) ON DELETE SET NULL, -- Approved By
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ph_equip_req_patient ON public.ph_equipment_requests(patient_member_id);
CREATE INDEX IF NOT EXISTS idx_ph_equip_req_equip ON public.ph_equipment_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_ph_equip_req_status ON public.ph_equipment_requests(approval_status);

-- RLS
ALTER TABLE public.ph_equipment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_equip_req_read" ON public.ph_equipment_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ph_equip_req_manage" ON public.ph_equipment_requests FOR ALL USING (true);
