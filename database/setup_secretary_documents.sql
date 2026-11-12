-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบงานสารบรรณอิเล็กทรอนิกส์ (Digital Document System)
-- =========================================================================

-- 1. สร้างตารางหลักสำหรับเก็บข้อมูลหนังสือสารบรรณ (documents)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_no SERIAL, -- เลขทะเบียนรับ/ส่งอัตโนมัติ
    reg_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- วันที่ลงรับในระบบ
    type VARCHAR(50) NOT NULL DEFAULT 'INBOUND', -- INBOUND (หนังสือเข้า), OUTBOUND (หนังสือออก)
    doc_no VARCHAR(100) NOT NULL, -- เลขที่หนังสือจริง เช่น นร 0101/ว123
    doc_date DATE NOT NULL, -- วันที่ลงในเอกสารหนังสือ
    title TEXT NOT NULL, -- หัวข้อ/เรื่อง
    origin VARCHAR(255), -- หน่วยงานต้นทาง
    destination VARCHAR(255), -- หน่วยงานปลายทาง
    attachment_desc TEXT, -- รายละเอียดสิ่งส่งมาด้วย
    file_url TEXT, -- ลิงก์ไฟล์ PDF แนบจาก Google Drive/Supabase Storage
    status VARCHAR(50) NOT NULL DEFAULT 'รับเรื่อง', -- สถานะดำเนินงาน: รับเรื่อง, เสนอปลัด, ปลัดสั่งการ, มอบหมายกอง, กองรับทราบ, เสร็จสิ้น, ยกเลิก
    urgency VARCHAR(50) NOT NULL DEFAULT 'ปกติ', -- ปกติ, ด่วน, ด่วนมาก, ด่วนที่สุด
    assigned_dept VARCHAR(100), -- กองงานที่รับมอบหมาย เช่น กองช่าง, กองคลัง
    assigned_staff_id UUID, -- เจ้าหน้าที่รับผิดชอบหลัก
    assignment_detail TEXT, -- ข้อความมอบหมาย/คำสั่งจากปลัด
    due_date DATE, -- วันครบกำหนดส่งงาน
    remark TEXT, -- หมายเหตุเพิ่มเติม
    created_by VARCHAR(255) DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.documents IS 'ตารางเก็บข้อมูลหนังสือรับเข้าและหนังสือส่งออกของงานสารบรรณกลาง';

-- 2. สร้างตารางสำหรับบันทึกเส้นทางการเดินหนังสือและสถานะ (document_routing)
CREATE TABLE IF NOT EXISTS public.document_routing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    status VARCHAR(100) NOT NULL, -- สถานะในขั้นตอนนั้นๆ
    actor_name VARCHAR(255) NOT NULL, -- ชื่อผู้ดำเนินการ
    actor_role VARCHAR(255), -- บทบาท/ตำแหน่ง
    comment TEXT, -- ความเห็นสั่งการ/บันทึกการส่งต่อ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.document_routing IS 'ตารางบันทึกสถานะการเดินหนังสือและประวัติการสั่งการ (Routing Timeline)';

-- 3. สร้างตารางสำหรับบันทึกการเกษียณหนังสือดิจิทัลและลายมือชื่อ (document_endorsements)
CREATE TABLE IF NOT EXISTS public.document_endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    signer_name VARCHAR(255) NOT NULL, -- ชื่อผู้ลงนามเกษียณหนังสือ (ปลัด/นายก/ผอ.กอง)
    signer_position VARCHAR(255) NOT NULL, -- ตำแหน่งผู้ลงนาม
    endorsement_text TEXT NOT NULL, -- ข้อความเกษียณหนังสือ เช่น 'เห็นควรอนุมัติให้ดำเนินการตามเสนอ'
    signature_svg TEXT, -- ข้อมูลลายเส้นของลายมือชื่อแบบ SVG/Base64
    ip_address VARCHAR(50), -- IP Address ที่บันทึกเพื่อตรวจสอบย้อนกลับ
    audit_hash VARCHAR(255), -- ลายนิ้วมือเข้ารหัสความปลอดภัยเพื่อตรวจสอบความถูกต้องของข้อมูล (Integrity Log)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.document_endorsements IS 'ตารางเก็บบันทึกการเกษียณหนังสือและการลงลายมือชื่อดิจิทัลเพื่อใช้ในการแนบท้ายใบปะหน้า';

-- 4. ตั้งค่าความปลอดภัย Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_endorsements ENABLE ROW LEVEL SECURITY;

-- 5. กำหนดสิทธิ์ให้ผู้ใช้งานทั่วไปและเจ้าหน้าที่ (Policies)
CREATE POLICY "Allow select for authenticated on documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated on documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated on documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated on documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Allow select for authenticated on document_routing" ON public.document_routing FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated on document_routing" ON public.document_routing FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for authenticated on document_endorsements" ON public.document_endorsements FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated on document_endorsements" ON public.document_endorsements FOR INSERT WITH CHECK (true);
