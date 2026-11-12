const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors({
    exposedHeaders: ['Content-Range', 'Range-Unit', 'Preference-Applied']
}));

// ===============================================
// SUPABASE BACKEND PROXY (Uses Secret Key to bypass RLS)
// ===============================================
const SUPABASE_URL = 'https://blotxjrfsqsmkwyftfmv.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_x8mzeWqk0b_RaoQnWr9vyg_dT3fgc2r';

app.use('/supabase-proxy', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    try {
        const subPath = req.originalUrl.replace(/^\/supabase-proxy/, '');
        const targetUrl = `${SUPABASE_URL}${subPath}`;
        const forwardHeaders = {
            'apikey': SUPABASE_SECRET_KEY,
            'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`
        };
        const passHeaders = ['content-type', 'accept', 'prefer', 'range', 'accept-profile', 'content-profile', 'x-client-info'];
        for (const h of passHeaders) {
            if (req.headers[h]) forwardHeaders[h] = req.headers[h];
        }
        const fetchOptions = {
            method: req.method,
            headers: forwardHeaders
        };
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0) {
            fetchOptions.body = req.body;
        }
        const response = await fetch(targetUrl, fetchOptions);
        res.status(response.status);
        for (const h of ['content-type', 'content-range', 'preference-applied']) {
            const val = response.headers.get(h);
            if (val) res.setHeader(h, val);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        console.error('Supabase Proxy Error:', err.message);
        res.status(502).json({ error: err.message });
    }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ===============================================
// LINE LOGIN BACKEND (Development)
// ===============================================
// ใส่ Channel Secret ของคุณที่นี่ (ห้ามให้หลุดไปในหน้า HTML เด็ดขาด)
const LINE_CHANNEL_ID = '2009933819';
const LINE_CHANNEL_SECRET = '0238be5aeae629b16ec9301c7cbc27dd';

app.post('/api/line-auth', async (req, res) => {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing code or redirect_uri' });
    }

    if (LINE_CHANNEL_SECRET === 'YOUR_LINE_CHANNEL_SECRET_HERE') {
        return res.status(500).json({ 
            error: 'กรุณาตั้งค่า LINE_CHANNEL_SECRET ในไฟล์ server.js ก่อนใช้งานครับ' 
        });
    }

    try {
        // 1. นำ Authorization Code ไปแลกเป็น Access Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('code', code);
        tokenParams.append('redirect_uri', redirect_uri);
        tokenParams.append('client_id', LINE_CHANNEL_ID);
        tokenParams.append('client_secret', LINE_CHANNEL_SECRET);

        const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', tokenParams.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;
        const idToken = tokenResponse.data.id_token;

        // 2. นำ Access Token ไปดึงข้อมูล Profile ของผู้ใช้
        const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const profileData = profileResponse.data;

        // 3. เตรียมข้อมูลส่งกลับให้หน้าเว็บ
        const profile = {
            userId: profileData.userId,
            displayName: profileData.displayName,
            pictureUrl: profileData.pictureUrl,
            email: null
        };

        // (Optional) ถอดรหัส id_token เพื่อเอาอีเมล (ถ้าเปิดขอสิทธิ์อีเมลไว้)
        if (idToken) {
            try {
                const payloadBase64 = idToken.split('.')[1];
                const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
                const decoded = JSON.parse(payloadJson);
                if (decoded.email) profile.email = decoded.email;
            } catch (err) {
                console.error('Failed to decode id_token', err);
            }
        }

        res.json({ profile });
    } catch (error) {
        console.error('Error during LINE token exchange:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to authenticate with LINE API' });
    }
});

const PORT = 3000;

// ===============================================
// ELECTRIC MAINTENANCE SYSTEM API
// ===============================================

// In-memory store for demo (when Supabase is not available)
const memoryStore = {
    electric_poles: [
        { id: 'p1', pole_code: 'PL-001', pole_type: 'คอนกรีต', light_type: 'LED', lat: 13.7563, lng: 100.5018, location_detail: 'หน้าตลาดสด หมู่ 1', village_no: '1', status: 'normal', image_url: null, created_at: new Date().toISOString() },
        { id: 'p2', pole_code: 'PL-002', pole_type: 'เหล็ก', light_type: 'LED', lat: 13.7570, lng: 100.5025, location_detail: 'ซอยสุขเจริญ 3 หมู่ 2', village_no: '2', status: 'broken', image_url: null, created_at: new Date().toISOString() },
        { id: 'p3', pole_code: 'PL-003', pole_type: 'คอนกรีต', light_type: 'โซล่าเซลล์', lat: 13.7580, lng: 100.5010, location_detail: 'ถนนเลียบคลอง หมู่ 3', village_no: '3', status: 'normal', image_url: null, created_at: new Date().toISOString() },
        { id: 'p4', pole_code: 'PL-004', pole_type: 'คอนกรีต', light_type: 'หลอดไส้', lat: 13.7555, lng: 100.5035, location_detail: 'หน้าวัดใหญ่ หมู่ 1', village_no: '1', status: 'broken', image_url: null, created_at: new Date().toISOString() },
        { id: 'p5', pole_code: 'PL-005', pole_type: 'เหล็ก', light_type: 'LED', lat: 13.7590, lng: 100.5000, location_detail: 'สี่แยกโรงเรียน หมู่ 4', village_no: '4', status: 'normal', image_url: null, created_at: new Date().toISOString() },
        { id: 'p6', pole_code: 'PL-006', pole_type: 'คอนกรีต', light_type: 'LED', lat: 13.7548, lng: 100.5042, location_detail: 'ข้างสนามกีฬา หมู่ 2', village_no: '2', status: 'normal', image_url: null, created_at: new Date().toISOString() },
    ],
    electric_staff: [
        { id: 's1', name: 'นายสมหมาย ช่างดี', position: 'หัวหน้าทีมซ่อม', phone: '081-234-5678', created_at: new Date().toISOString() },
        { id: 's2', name: 'นายประเสริฐ ไฟฟ้า', position: 'ช่างไฟฟ้า', phone: '089-876-5432', created_at: new Date().toISOString() },
        { id: 's3', name: 'นายวิชัย มานะ', position: 'ช่างไฟฟ้า', phone: '085-111-2222', created_at: new Date().toISOString() },
    ],
    electric_repairs: [
        { id: 'r1', complaint_id: 'REP-000001', pole_id: 'p2', repair_date: '2026-05-04', detail: 'หลอดไฟขาด เปลี่ยนหลอดใหม่', image_url: null, staff_id: 's1', status: 'in_progress', reporter_name: 'วิชัย มานะ', damage_cause: 'ไฟดับ', location: 'ซอยสุขเจริญ 3', created_at: '2026-05-03T09:30:00Z' },
        { id: 'r2', complaint_id: 'REP-000002', pole_id: 'p4', repair_date: '2026-05-04', detail: null, image_url: null, staff_id: null, status: 'pending', reporter_name: 'สมรักษ์ ยินดี', damage_cause: 'ไฟกระพริบ', location: 'หน้าวัดใหญ่', created_at: '2026-05-04T08:15:00Z' },
        { id: 'r3', complaint_id: 'REP-000003', pole_id: null, repair_date: '2026-05-02', detail: 'เปลี่ยนบัลลาสต์และหลอดไฟ', image_url: null, staff_id: 's2', status: 'completed', reporter_name: 'กิตติพงษ์ แสนดี', damage_cause: 'หลอดไฟ/โครมไฟ ชำรุด', location: 'ถนนเลียบคลอง', created_at: '2026-05-01T10:00:00Z' },
    ],
    electric_items: [
        { id: 'i1', name: 'หลอดไฟ LED 50W', unit: 'หลอด', qty: 45, min_qty: 10, updated_at: new Date().toISOString() },
        { id: 'i2', name: 'บัลลาสต์อิเล็กทรอนิกส์', unit: 'ตัว', qty: 12, min_qty: 5, updated_at: new Date().toISOString() },
        { id: 'i3', name: 'โครมไฟถนน LED', unit: 'ชุด', qty: 8, min_qty: 3, updated_at: new Date().toISOString() },
        { id: 'i4', name: 'สายไฟ THW 2.5 sq.mm.', unit: 'เมตร', qty: 200, min_qty: 50, updated_at: new Date().toISOString() },
        { id: 'i5', name: 'เบรกเกอร์ 20A', unit: 'ตัว', qty: 15, min_qty: 5, updated_at: new Date().toISOString() },
        { id: 'i6', name: 'โฟโต้สวิตช์ (Photo Switch)', unit: 'ตัว', qty: 3, min_qty: 5, updated_at: new Date().toISOString() },
        { id: 'i7', name: 'แผงโซล่าเซลล์ 100W', unit: 'แผง', qty: 4, min_qty: 2, updated_at: new Date().toISOString() },
    ],
    repair_items: [],
};

let idCounter = 100;
function genId() { return 'auto_' + (++idCounter); }

// --- ELECTRIC POLES ---
app.get('/api/electric/poles', (req, res) => {
    let poles = [...memoryStore.electric_poles];
    const { village_no, pole_type, status } = req.query;
    if (village_no) poles = poles.filter(p => p.village_no === village_no);
    if (pole_type) poles = poles.filter(p => p.pole_type === pole_type);
    if (status) poles = poles.filter(p => p.status === status);
    res.json(poles);
});

app.post('/api/electric/poles', (req, res) => {
    const pole = { id: genId(), ...req.body, created_at: new Date().toISOString() };
    memoryStore.electric_poles.push(pole);
    res.status(201).json(pole);
});

app.put('/api/electric/poles/:id', (req, res) => {
    const idx = memoryStore.electric_poles.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_poles[idx] = { ...memoryStore.electric_poles[idx], ...req.body };
    res.json(memoryStore.electric_poles[idx]);
});

app.delete('/api/electric/poles/:id', (req, res) => {
    const idx = memoryStore.electric_poles.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_poles.splice(idx, 1);
    res.json({ success: true });
});

// --- ELECTRIC REPAIRS ---
app.get('/api/electric/repairs', (req, res) => {
    let repairs = [...memoryStore.electric_repairs];
    const { status } = req.query;
    if (status) repairs = repairs.filter(r => r.status === status);
    // Enrich with staff & pole data
    repairs = repairs.map(r => ({
        ...r,
        staff_name: r.staff_id ? (memoryStore.electric_staff.find(s => s.id === r.staff_id) || {}).name : null,
        pole_code: r.pole_id ? (memoryStore.electric_poles.find(p => p.id === r.pole_id) || {}).pole_code : null,
    }));
    res.json(repairs);
});

app.post('/api/electric/repairs', (req, res) => {
    const repair = { id: genId(), ...req.body, created_at: new Date().toISOString() };
    memoryStore.electric_repairs.push(repair);
    res.status(201).json(repair);
});

app.put('/api/electric/repairs/:id', (req, res) => {
    const idx = memoryStore.electric_repairs.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_repairs[idx] = { ...memoryStore.electric_repairs[idx], ...req.body };
    res.json(memoryStore.electric_repairs[idx]);
});

// --- ELECTRIC ITEMS (Stock) ---
app.get('/api/electric/items', (req, res) => {
    res.json(memoryStore.electric_items);
});

app.post('/api/electric/items', (req, res) => {
    const item = { id: genId(), ...req.body, updated_at: new Date().toISOString() };
    memoryStore.electric_items.push(item);
    res.status(201).json(item);
});

app.put('/api/electric/items/:id', (req, res) => {
    const idx = memoryStore.electric_items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_items[idx] = { ...memoryStore.electric_items[idx], ...req.body, updated_at: new Date().toISOString() };
    res.json(memoryStore.electric_items[idx]);
});

app.delete('/api/electric/items/:id', (req, res) => {
    const idx = memoryStore.electric_items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_items.splice(idx, 1);
    res.json({ success: true });
});

// --- ELECTRIC STAFF ---
app.get('/api/electric/staff', (req, res) => {
    res.json(memoryStore.electric_staff);
});

app.post('/api/electric/staff', (req, res) => {
    const staff = { id: genId(), ...req.body, created_at: new Date().toISOString() };
    memoryStore.electric_staff.push(staff);
    res.status(201).json(staff);
});

app.put('/api/electric/staff/:id', (req, res) => {
    const idx = memoryStore.electric_staff.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_staff[idx] = { ...memoryStore.electric_staff[idx], ...req.body };
    res.json(memoryStore.electric_staff[idx]);
});

app.delete('/api/electric/staff/:id', (req, res) => {
    const idx = memoryStore.electric_staff.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    memoryStore.electric_staff.splice(idx, 1);
    res.json({ success: true });
});

// --- REPAIR ITEMS (ตัด stock อัตโนมัติ) ---
app.post('/api/electric/repair-items', (req, res) => {
    const { repair_id, item_id, qty } = req.body;
    
    // Validate item exists and has enough stock
    const itemIdx = memoryStore.electric_items.findIndex(i => i.id === item_id);
    if (itemIdx === -1) return res.status(404).json({ error: 'Item not found' });
    if (memoryStore.electric_items[itemIdx].qty < qty) {
        return res.status(400).json({ error: 'Insufficient stock', available: memoryStore.electric_items[itemIdx].qty });
    }
    
    // Create repair_item record
    const repairItem = { id: genId(), repair_id, item_id, qty, created_at: new Date().toISOString() };
    memoryStore.repair_items.push(repairItem);
    
    // Deduct stock (mirrors the SQL trigger)
    memoryStore.electric_items[itemIdx].qty -= qty;
    memoryStore.electric_items[itemIdx].updated_at = new Date().toISOString();
    
    res.status(201).json({ 
        repairItem, 
        updatedItem: memoryStore.electric_items[itemIdx],
        message: `ตัด stock ${memoryStore.electric_items[itemIdx].name} จำนวน ${qty} ${memoryStore.electric_items[itemIdx].unit} สำเร็จ`
    });
});

app.get('/api/electric/repair-items/:repairId', (req, res) => {
    const items = memoryStore.repair_items
        .filter(ri => ri.repair_id === req.params.repairId)
        .map(ri => ({
            ...ri,
            item_name: (memoryStore.electric_items.find(i => i.id === ri.item_id) || {}).name,
            item_unit: (memoryStore.electric_items.find(i => i.id === ri.item_id) || {}).unit,
        }));
    res.json(items);
});

// --- DASHBOARD STATS ---
app.get('/api/electric/dashboard', (req, res) => {
    const totalPoles = memoryStore.electric_poles.length;
    const brokenPoles = memoryStore.electric_poles.filter(p => p.status === 'broken').length;
    const normalPoles = totalPoles - brokenPoles;
    const totalRepairs = memoryStore.electric_repairs.length;
    const pendingRepairs = memoryStore.electric_repairs.filter(r => r.status === 'pending').length;
    const inProgressRepairs = memoryStore.electric_repairs.filter(r => r.status === 'in_progress' || r.status === 'accepted').length;
    const completedRepairs = memoryStore.electric_repairs.filter(r => r.status === 'completed').length;
    const todayRepairs = memoryStore.electric_repairs.filter(r => r.repair_date === new Date().toISOString().split('T')[0]).length;
    const lowStockItems = memoryStore.electric_items.filter(i => i.qty <= i.min_qty).length;

    res.json({
        totalPoles, brokenPoles, normalPoles,
        totalRepairs, pendingRepairs, inProgressRepairs, completedRepairs,
        todayRepairs, lowStockItems
    });
});

app.listen(PORT, () => {
    console.log(`✅ Local Backend Server running on http://localhost:${PORT}`);
    console.log(`👉 เปิดหน้าเว็บของคุณได้ที่ http://127.0.0.1:5500/index.html`);
    console.log(`⚡ Electric Maintenance API ready at /api/electric/*`);
});

