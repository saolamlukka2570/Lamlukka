-- =========================================================================
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบคลังอุปกรณ์ไฟฟ้าและการตัดสต็อก (Inventory & Stock)
-- =========================================================================

-- 1. สร้างตารางเก็บรายการอุปกรณ์ไฟฟ้า (electric_items)
CREATE TABLE IF NOT EXISTS public.electric_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- เช่น หลอด, ตัว, เมตร
    qty INTEGER DEFAULT 0, -- จำนวนคงเหลือ
    min_qty INTEGER DEFAULT 5, -- จุดสั่งซื้อขั้นต่ำ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.electric_items IS 'คลังอุปกรณ์ไฟฟ้า';

-- เปิด RLS และสร้าง Policy ให้อ่านและอัปเดตได้
ALTER TABLE public.electric_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous select on electric_items" ON public.electric_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update on electric_items" ON public.electric_items FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous insert on electric_items" ON public.electric_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete on electric_items" ON public.electric_items FOR DELETE USING (true);

-- 2. เพิ่มคอลัมน์เก็บข้อความสรุปอุปกรณ์ที่ใช้ ในตาราง electric_repairs (ถ้ายังไม่มี)
ALTER TABLE public.electric_repairs ADD COLUMN IF NOT EXISTS repair_items_text TEXT;

-- 3. สร้างตารางบันทึกประวัติการเบิกใช้อุปกรณ์ (electric_repair_items) เพื่อผูกกับใบแจ้งซ่อม
CREATE TABLE IF NOT EXISTS public.electric_repair_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_id UUID REFERENCES public.electric_repairs(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.electric_items(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.electric_repair_items IS 'บันทึกประวัติการเบิกใช้อุปกรณ์ตามใบแจ้งซ่อม';

ALTER TABLE public.electric_repair_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert on electric_repair_items" ON public.electric_repair_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select on electric_repair_items" ON public.electric_repair_items FOR SELECT USING (true);


-- =========================================================================
-- ฟังก์ชันสำหรับตัดสต็อกและบันทึกผลการซ่อมใน Transaction เดียวกัน (ป้องกันข้อมูลเพี้ยน)
-- =========================================================================
CREATE OR REPLACE FUNCTION record_repair_and_deduct_stock(
    p_repair_id UUID,
    p_detail TEXT,
    p_date DATE,
    p_image TEXT,
    p_staff_id UUID,
    p_staff_name TEXT,
    p_items JSONB -- รอรับรูปแบบ JSON Array เช่น [{"item_id":"...", "qty": 2, "item_name":"หลอดไฟ"}]
)
RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    summary_text TEXT := '';
BEGIN
    -- 1. ลูปเพื่อตัดสต็อกและบันทึกประวัติการใช้
    FOR item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, qty INTEGER, item_name TEXT)
    LOOP
        -- บันทึกประวัติ
        INSERT INTO public.electric_repair_items (repair_id, item_id, qty)
        VALUES (p_repair_id, item_record.item_id, item_record.qty);
        
        -- หักสต็อกคลัง
        UPDATE public.electric_items
        SET qty = qty - item_record.qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = item_record.item_id;

        -- ต่อข้อความสรุปรายการ (เช่น "หลอดไฟ (2 หลอด), บัลลาสต์ (1 ตัว)")
        IF summary_text = '' THEN
            summary_text := item_record.item_name || ' (' || item_record.qty || ')';
        ELSE
            summary_text := summary_text || ', ' || item_record.item_name || ' (' || item_record.qty || ')';
        END IF;
    END LOOP;

    -- 2. อัปเดตสถานะการซ่อมใน electric_repairs
    UPDATE public.electric_repairs
    SET status = 'completed',
        repair_detail = p_detail,
        repair_date = p_date,
        repair_image_url = p_image,
        staff_id = p_staff_id,
        staff_name = p_staff_name,
        repair_items_text = summary_text,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_repair_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- เพิ่มข้อมูลตัวอย่างคลังอุปกรณ์ (Mock Data) ลงในตาราง electric_items
-- =========================================================================
INSERT INTO public.electric_items (name, unit, qty, min_qty) VALUES
('หลอดไฟ LED 50W', 'หลอด', 50, 10),
('บัลลาสต์อิเล็กทรอนิกส์', 'ตัว', 20, 5),
('โครมไฟถนน LED', 'ชุด', 10, 3),
('สายไฟ THW 2.5 sq.mm.', 'เมตร', 200, 50),
('เบรกเกอร์ 20A', 'ตัว', 15, 5),
('โฟโต้สวิตช์ (Photo Switch)', 'ตัว', 5, 2)
ON CONFLICT DO NOTHING;
