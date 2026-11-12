-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบลางานออนไลน์และสมุดบันทึกงานประจำวัน (Online Leave & Daily Work Log System)
-- =========================================================================

-- 1. สร้างตารางบันทึกการลาพักของบุคลากร (staff_leaves)
CREATE TABLE IF NOT EXISTS public.staff_leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- อ้างอิง ID ในตาราง Staff
    staff_name VARCHAR(255) NOT NULL, -- ชื่อผู้ลา
    leave_type VARCHAR(100) NOT NULL, -- ลาป่วย, ลากิจ, ลาพักผ่อน, ลาคลอด, ลาอุปสมบท
    start_date DATE NOT NULL, -- วันที่เริ่มลา
    end_date DATE NOT NULL, -- วันที่สิ้นสุด
    total_days DECIMAL(5, 2) NOT NULL, -- จำนวนวันลา เช่น 1.5 วัน
    reason TEXT NOT NULL, -- เหตุผลการลา
    contact_address TEXT, -- ที่อยู่หรือข้อมูลติดต่อระหว่างการลา
    file_url TEXT, -- ลิงก์แนบใบรับรองแพทย์ หรือใบมอบงาน
    status VARCHAR(50) NOT NULL DEFAULT 'เสนอปลัด', -- เสนอปลัด, ปลัดเห็นชอบ, นายกอนุมัติ, ไม่อนุมัติ, ยกเลิก
    signature_url TEXT, -- รูปภาพลายเซ็นผู้ยื่นคำขอ
    approver_name VARCHAR(255), -- ชื่อผู้อนุมัติขั้นสุดท้าย
    approval_date DATE, -- วันที่ลงนามอนุมัติ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.staff_leaves IS 'ข้อมูลการขอยื่นลางานออนไลน์พร้อมประวัติการอนุมัติ';

-- 2. สร้างตารางเก็บจำนวนโควตาวันลาสะสมของบุคลากรแต่ละคน (leave_balances)
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL UNIQUE, -- อ้างอิง ID ในตาราง Staff
    year INT NOT NULL DEFAULT 2569, -- ปีงบประมาณราชการ
    sick_taken INT DEFAULT 0, -- ใช้ลาป่วยไปแล้ว (วัน)
    sick_limit INT DEFAULT 30, -- โควตาลาป่วยสูงสุด (วัน)
    personal_taken INT DEFAULT 0, -- ใช้ลากิจไปแล้ว (วัน)
    personal_limit INT DEFAULT 45, -- โควตาลากิจสูงสุด (วัน)
    vacation_taken INT DEFAULT 0, -- ใช้ลาพักผ่อนไปแล้ว (วัน)
    vacation_limit INT DEFAULT 10, -- โควตาลาพักผ่อนสูงสุด (วัน)
    vacation_carried INT DEFAULT 0, -- โควตาลาพักผ่อนสะสมปีก่อน (วัน)
    maternity_taken INT DEFAULT 0,
    maternity_limit INT DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.leave_balances IS 'โควตาวันลาคงเหลือของข้าราชการและบุคลากร';

-- 3. สร้างตารางสมุดบันทึกงานประจำวัน สำหรับพนักงานจ้างเหมา (daily_work_logs)
CREATE TABLE IF NOT EXISTS public.daily_work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL, -- ผู้จดบันทึก
    staff_name VARCHAR(255) NOT NULL, -- ชื่อผู้ส่งรายงาน
    work_date DATE NOT NULL DEFAULT CURRENT_DATE, -- วันที่ทำบันทึกปฏิบัติงาน
    tasks_performed TEXT NOT NULL, -- รายละเอียดผลการปฏิบัติงานหลัก
    time_spent VARCHAR(50), -- ชั่วโมงการทำงาน เช่น 08:30 - 16:30 น.
    attachment_url TEXT, -- ไฟล์ผลงานแนบ
    photo_url TEXT, -- ภาพถ่ายยืนยันการปฏิบัติภารกิจนอกสถานที่
    supervisor_id TEXT, -- หัวหน้าผู้ตรวจประเมิน
    supervisor_comment TEXT, -- ความเห็นตรวจงาน
    status VARCHAR(50) DEFAULT 'รอตรวจ', -- รอตรวจ, ตรวจเสร็จแล้ว, ให้แก้ไข
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.daily_work_logs IS 'แบบบันทึกผลงานการทำงานประจำวันสำหรับพนักงานจ้างเหมาบริการเพื่อใช้ยื่นเบิกจ่ายเงินเดือน';

-- 4. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;

-- 5. ตั้งค่านโยบาย (Policies)
CREATE POLICY "Allow public select for staff_leaves" ON public.staff_leaves FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on staff_leaves" ON public.staff_leaves FOR ALL USING (true);

CREATE POLICY "Allow public select for leave_balances" ON public.leave_balances FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on leave_balances" ON public.leave_balances FOR ALL USING (true);

CREATE POLICY "Allow public select for daily_work_logs" ON public.daily_work_logs FOR SELECT USING (true);
CREATE POLICY "Allow write for authenticated on daily_work_logs" ON public.daily_work_logs FOR ALL USING (true);
