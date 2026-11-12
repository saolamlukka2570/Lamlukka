-- =========================================================================
-- เพิ่มคอลัมน์ pdf_url ในตาราง electric_repairs
-- สำหรับเก็บลิงก์ PDF ที่สร้างอัตโนมัติเมื่อมีคำร้องเข้ามา
-- =========================================================================
ALTER TABLE public.electric_repairs ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN public.electric_repairs.pdf_url IS 'ลิงก์ไฟล์ PDF คำร้องที่ถูกสร้างอัตโนมัติและเก็บใน Google Drive';
