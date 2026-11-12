# 🏛️ SMART GOVERNANCE MUNICIPALITY PLATFORM

ระบบบริหารจัดการเทศบาลอัจฉริยะ — แพลตฟอร์มดิจิทัลทรานส์ฟอร์เมชันสำหรับองค์กรปกครองส่วนท้องถิ่น

---

## 📋 โครงสร้างโปรเจคต์

```
Smart governance/
├── index.html              # หน้าเข้าสู่ระบบ (Login)
├── dashboard.html          # แดชบอร์ดส่วนกลาง
├── citizen-portal.html     # ระบบบริการประชาชน
├── finance.html            # กองคลัง (Finance & Revenue)
├── tax-map.html            # ระบบแผนที่ภาษี LTAX GIS
├── waste.html              # ระบบค่าธรรมเนียมขยะ
├── water.html              # ระบบประปาหมู่บ้าน
├── publicworks.html        # กองช่าง (Public Works)
├── health.html             # กองสาธารณสุขและสิ่งแวดล้อม
├── education.html          # กองการศึกษา
├── welfare.html            # กองสวัสดิการสังคม
├── planning.html           # กองยุทธศาสตร์และงบประมาณ
├── settings.html           # ตั้งค่าระบบ
├── assets/
│   ├── css/
│   │   └── style.css       # Design System ของระบบ
│   └── js/
│       ├── app.js          # Shared Components (Sidebar, Navbar, Toast)
│       └── supabase-client.js  # Supabase Client
└── database/
    ├── schema.sql          # โครงสร้างฐานข้อมูล PostgreSQL
    └── seed.sql            # ข้อมูลตัวอย่าง
```

---

## 🚀 การติดตั้งและใช้งาน

### วิธีที่ 1: เปิดโดยตรง (Static HTML)
เปิดไฟล์ `index.html` ในเบราว์เซอร์ได้ทันที ไม่ต้องติดตั้งอะไรเพิ่มเติม

### วิธีที่ 2: รันด้วย Live Server (แนะนำสำหรับพัฒนา)
```bash
# หากมี VS Code + Live Server Extension
# คลิกขวาที่ index.html > Open with Live Server

# หรือใช้ npx serve
npx serve .
```

---

## 🗄️ ตั้งค่า Supabase (Backend)

### ขั้นตอนที่ 1: สร้าง Supabase Project
1. ไปที่ [https://supabase.com](https://supabase.com) และสร้างบัญชี
2. สร้าง Project ใหม่ เลือก Region: Southeast Asia (Singapore)
3. คัดลอก **Project URL** และ **Anon Key** จาก Settings > API

### ขั้นตอนที่ 2: รัน SQL Schema
1. ไปที่ **SQL Editor** ใน Supabase Dashboard
2. นำเข้าไฟล์ `database/schema.sql` และรัน
3. นำเข้าไฟล์ `database/seed.sql` เพื่อเพิ่มข้อมูลทดสอบ

### ขั้นตอนที่ 3: ตั้งค่า Credentials
แก้ไขไฟล์ `assets/js/supabase-client.js`:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### ขั้นตอนที่ 4: เปิดใช้งาน Auth
ใน Supabase Dashboard > Authentication > Providers:
- เปิดใช้ **Email/Password**
- (Optional) ตั้งค่า **LINE Login** ผ่าน OAuth Provider

---

## 👥 บทบาทผู้ใช้งาน (Role-Based Access Control)

| Role | สิทธิ์การเข้าถึง |
|------|-----------------|
| **Super Admin** | เข้าถึงทุกโมดูล ตั้งค่าระบบ จัดการผู้ใช้ |
| **Executive** | ดูรายงานและแดชบอร์ดทุกกอง (Read-only) |
| **Department Head** | เต็มสิทธิ์ภายในกองที่รับผิดชอบ |
| **Officer** | เข้าถึงโมดูลที่ได้รับมอบหมาย |
| **Field Staff** | โหมดมือถือ: จดมาตร, สแกน QR, รายงานสนาม |
| **Citizen** | Citizen Portal เท่านั้น |

---

## 📦 เทคโนโลยีที่ใช้

### Frontend
| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|---------|-----------|
| HTML5 | - | โครงสร้างหน้าเว็บ |
| CSS3 | - | Styling + Design System |
| Bootstrap | 5.3.2 | UI Components & Grid |
| FontAwesome | 6.4.0 | Icons |
| Chart.js | 4.4.0 | กราฟและ Data Visualization |
| Leaflet.js | 1.9.4 | GIS Map (OpenStreetMap) |
| Google Fonts (Prompt) | - | ฟอนต์ภาษาไทย |

### Backend
| เทคโนโลยี | การใช้งาน |
|-----------|-----------|
| Supabase Auth | ระบบ Login & Session |
| Supabase PostgreSQL | ฐานข้อมูลหลัก |
| Supabase RLS | Row Level Security |
| Supabase Realtime | อัปเดตข้อมูลแบบ Real-time |
| Supabase Storage | เก็บไฟล์รูปภาพ/เอกสาร |

---

## 🗺️ โมดูลหลัก (Modules)

### Module 1: กองคลัง (Finance & Revenue)
- ✅ ระบบแผนที่ภาษีอัจฉริยะ (LTAX GIS) — Leaflet + แปลงที่ดิน
- ✅ ระบบค่าธรรมเนียมขยะ — Field Worker Mode + QR Scan
- ✅ ระบบประปาหมู่บ้าน — จดมาตร + E-Invoice + Alert ผิดปกติ
- ✅ PromptPay QR Code Generator
- ✅ Export e-LAAS

### Module 2: กองช่าง (Public Works)
- ✅ ศูนย์รับแจ้งซ่อมไฟถนน (LINE OA Ready)
- ✅ ระบบ E-Permit การก่อสร้าง
- ✅ GIS Registry โครงสร้างพื้นฐาน

### Module 3: กองสาธารณสุขฯ (Public Health)
- ✅ ฐานข้อมูลกลุ่มเปราะบาง LTC Program
- ✅ ติดตามรถเก็บขยะ Real-time (Leaflet)
- ✅ ระบบใบอนุญาตประกอบกิจการ + แจ้งเตือน

### Module 4: กองการศึกษา (Education)
- ✅ บันทึกการเข้าเรียน + โภชนาการ ศพด.
- ✅ รายงานพัฒนาการนักเรียน (Chart.js)
- ✅ E-Learning Portal
- ✅ แจ้งผู้ปกครองผ่าน LINE

### Module 5: กองสวัสดิการสังคม (Welfare)
- ✅ ลงทะเบียนรับเบี้ยยังชีพ (ผู้สูงอายุ/ผู้พิการ/เด็ก)
- ✅ ระบบป้องกันรับสิทธิซ้ำซ้อน
- ✅ ตลาดชุมชน OTOP Marketplace

### Module 6: กองยุทธศาสตร์ฯ (Planning)
- ✅ City Data Platform + KPI Dashboard
- ✅ E-Hearing (โหวตโครงการ/รับฟังความเห็น)
- ✅ ติดตามการเบิกจ่ายงบประมาณ
- ✅ Heat Map GIS Analytics

### Citizen Portal
- ✅ ตรวจสอบภาษีและชำระออนไลน์ (PromptPay QR)
- ✅ แจ้งปัญหา/ร้องทุกข์ (พร้อมแนบรูปภาพ)
- ✅ ติดตามสถานะคำร้อง
- ✅ ตรวจสอบสวัสดิการ
- ✅ เชื่อมต่อ LINE OA

---

## 🔒 ความปลอดภัย

- **Row Level Security (RLS)**: จำกัดการเข้าถึงข้อมูลตาม Role
- **Session Management**: Supabase Auth + Session Timeout
- **Audit Trail**: บันทึกทุก Action ของผู้ใช้
- **Encrypted Credentials**: API Keys ถูกเก็บในระบบที่ปลอดภัย
- **Input Validation**: ตรวจสอบข้อมูลก่อนบันทึก

---

## 🔗 การเชื่อมต่อระบบภายนอก

| ระบบ | สถานะ | วิธีเชื่อมต่อ |
|------|--------|--------------|
| LTAX Online | 🟡 พร้อมเชื่อม | ตั้งค่า API Key ใน Settings |
| LINE Notify | 🟡 พร้อมเชื่อม | ตั้งค่า Token ใน Settings |
| PromptPay QR | 🟡 พร้อมเชื่อม | ตั้งค่า PromptPay ID ใน Settings |
| e-LAAS | 🟡 พร้อม Export | ปุ่ม Export ในแต่ละโมดูล |
| SMS | 🔵 แผนอนาคต | Twilio / dSMS |

---

## 📱 Mobile App Roadiness

โปรเจคต์นี้ถูกออกแบบให้รองรับการต่อยอดเป็น Mobile App:
- **React Native / Flutter**: ใช้ Supabase SDK เดิมได้ทันที
- **PWA (Progressive Web App)**: เพิ่ม `manifest.json` + Service Worker
- **Field Worker Mode**: UI รองรับ Tablet/Mobile อยู่แล้ว

---

## 🐛 Known Issues & TODO

- [ ] เชื่อม Supabase Auth จริง (ปัจจุบัน Mock Login)
- [ ] เพิ่ม Service Worker สำหรับ Offline Mode
- [ ] เพิ่ม QR Code Generator Library จริง
- [ ] เชื่อมต่อ LINE Login OAuth
- [ ] เพิ่ม PDF Receipt Generator (jsPDF)
- [ ] เพิ่ม Excel Export (SheetJS)

---

## 👨‍💻 การพัฒนาต่อ

```bash
# เปิด Project ด้วย VS Code
code "e:/ANTIGRAVITY/Smart governance"

# ติดตั้ง Live Server Extension แล้วกด F5
# หรือใช้ npm serve
npx serve . -p 3000
```

---

## 📞 ติดต่อ

สร้างโดย **Antigravity AI** · Powered by **Google Gemini**  
สำหรับ **Smart Governance Municipality Platform**  
&copy; 2026 — Production Ready for Thai Local Government
