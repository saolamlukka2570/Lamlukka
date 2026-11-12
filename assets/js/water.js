/**
 * water.js - Core Engine for Water Supply Management System
 * ระบบจัดการน้ำประปา - Smart Governance Platform
 * 
 * This is the central data service for the water module.
 * Pattern follows waste.js but with completely separate data/logic.
 */

// =============================================
// CONSTANTS
// =============================================
const WATER_CUSTOMER_TYPES = ['บ้านพักอาศัย', 'ร้านค้า', 'หน่วยงานราชการ', 'ธุรกิจ', 'อื่นๆ'];
const WATER_CUSTOMER_STATUS = ['active', 'suspended', 'cancelled', 'overdue'];
const WATER_METER_SIZES = ['1/2 นิ้ว', '3/4 นิ้ว', '1 นิ้ว', '1.5 นิ้ว', '2 นิ้ว'];
const WATER_BILL_STATUS = ['unpaid', 'pending', 'paid', 'overdue', 'cancelled'];
const WATER_PAYMENT_STATUS = ['pending', 'completed', 'rejected', 'cancelled'];
const WATER_MONTHS_TH = ['ตุลาคม','พฤศจิกายน','ธันวาคม','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน'];
const WATER_MONTHS_SHORT = ['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];
const WATER_MONTH_KEYS = ['oct','nov','dec','jan','feb','mar','apr','may','jun','jul','aug','sep'];

// =============================================
// LOCAL STORAGE KEYS (separate from waste)
// =============================================
const LS_WATER_CUSTOMERS = 'water_customers';
const LS_WATER_METERS = 'water_meters';
const LS_WATER_READINGS = 'water_meter_readings';
const LS_WATER_TARIFFS = 'water_tariffs';
const LS_WATER_TARIFF_RATES = 'water_tariff_rates';
const LS_WATER_BILLS = 'water_bills';
const LS_WATER_PAYMENTS = 'water_payments';
const LS_WATER_PAYMENT_ITEMS = 'water_payment_items';
const LS_WATER_RECEIPTS = 'water_receipts';
const LS_WATER_SETTINGS = 'water_settings';

// =============================================
// DATA INITIALIZATION
// =============================================
function initWaterData() {
    // Initialize localStorage keys if they don't exist
    const keys = [LS_WATER_CUSTOMERS, LS_WATER_METERS, LS_WATER_READINGS, LS_WATER_TARIFFS,
                  LS_WATER_TARIFF_RATES, LS_WATER_BILLS, LS_WATER_PAYMENTS, LS_WATER_PAYMENT_ITEMS,
                  LS_WATER_RECEIPTS, LS_WATER_SETTINGS];
    keys.forEach(k => {
        if (!localStorage.getItem(k)) {
            localStorage.setItem(k, JSON.stringify(k === LS_WATER_SETTINGS ? {} : []));
        }
    });
}

// =============================================
// GETTERS (from localStorage cache)
// =============================================
function getWaterCustomers() { return JSON.parse(localStorage.getItem(LS_WATER_CUSTOMERS) || '[]'); }
function getWaterMeters() { return JSON.parse(localStorage.getItem(LS_WATER_METERS) || '[]'); }
function getWaterReadings() { return JSON.parse(localStorage.getItem(LS_WATER_READINGS) || '[]'); }
function getWaterTariffs() { return JSON.parse(localStorage.getItem(LS_WATER_TARIFFS) || '[]'); }
function getWaterTariffRates() { return JSON.parse(localStorage.getItem(LS_WATER_TARIFF_RATES) || '[]'); }
function getWaterBills() { return JSON.parse(localStorage.getItem(LS_WATER_BILLS) || '[]'); }
function getWaterPayments() { return JSON.parse(localStorage.getItem(LS_WATER_PAYMENTS) || '[]'); }
function getWaterPaymentItems() { return JSON.parse(localStorage.getItem(LS_WATER_PAYMENT_ITEMS) || '[]'); }
function getWaterReceipts() { return JSON.parse(localStorage.getItem(LS_WATER_RECEIPTS) || '[]'); }
function getWaterSettings() { return JSON.parse(localStorage.getItem(LS_WATER_SETTINGS) || '{}'); }

// =============================================
// FETCH FROM SUPABASE (with localStorage cache)
// =============================================
async function fetchWaterCustomers() {
    if (!supabaseClient) return getWaterCustomers();
    try {
        const { data, error } = await supabaseClient.from('water_customers').select('*').order('customer_code');
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_CUSTOMERS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterCustomers error:', e);
        return getWaterCustomers();
    }
}

async function fetchWaterMeters() {
    if (!supabaseClient) return getWaterMeters();
    try {
        const { data, error } = await supabaseClient.from('water_meters').select('*').order('meter_code');
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_METERS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterMeters error:', e);
        return getWaterMeters();
    }
}

async function fetchWaterReadings(filters = {}) {
    if (!supabaseClient) return getWaterReadings();
    try {
        let query = supabaseClient.from('water_meter_readings').select('*').order('reading_date', { ascending: false });
        if (filters.fiscal_year) query = query.eq('fiscal_year', filters.fiscal_year);
        if (filters.billing_month) query = query.eq('billing_month', filters.billing_month);
        if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
        const { data, error } = await query;
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_READINGS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterReadings error:', e);
        return getWaterReadings();
    }
}

async function fetchWaterTariffs() {
    if (!supabaseClient) return getWaterTariffs();
    try {
        const { data, error } = await supabaseClient.from('water_tariffs').select('*').order('effective_from', { ascending: false });
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_TARIFFS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterTariffs error:', e);
        return getWaterTariffs();
    }
}

async function fetchWaterTariffRates() {
    if (!supabaseClient) return getWaterTariffRates();
    try {
        const { data, error } = await supabaseClient.from('water_tariff_rates').select('*').order('sort_order');
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_TARIFF_RATES, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterTariffRates error:', e);
        return getWaterTariffRates();
    }
}

async function fetchWaterBills(filters = {}) {
    if (!supabaseClient) return getWaterBills();
    try {
        let query = supabaseClient.from('water_bills').select('*').order('created_at', { ascending: false });
        if (filters.fiscal_year) query = query.eq('fiscal_year', filters.fiscal_year);
        if (filters.billing_month) query = query.eq('billing_month', filters.billing_month);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
        if (filters.limit) query = query.limit(filters.limit);
        const { data, error } = await query;
        if (error) throw error;
        if (data && !filters.customer_id) localStorage.setItem(LS_WATER_BILLS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterBills error:', e);
        return getWaterBills();
    }
}

async function fetchWaterPayments(filters = {}) {
    if (!supabaseClient) return getWaterPayments();
    try {
        let query = supabaseClient.from('water_payments').select('*').order('payment_date', { ascending: false });
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
        if (filters.limit) query = query.limit(filters.limit);
        const { data, error } = await query;
        if (error) throw error;
        if (data && !filters.customer_id) localStorage.setItem(LS_WATER_PAYMENTS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterPayments error:', e);
        return getWaterPayments();
    }
}

async function fetchWaterPaymentItems() {
    if (!supabaseClient) return getWaterPaymentItems();
    try {
        const { data, error } = await supabaseClient.from('water_payment_items').select('*');
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_PAYMENT_ITEMS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterPaymentItems error:', e);
        return getWaterPaymentItems();
    }
}

async function fetchWaterReceipts() {
    if (!supabaseClient) return getWaterReceipts();
    try {
        const { data, error } = await supabaseClient.from('water_receipts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) localStorage.setItem(LS_WATER_RECEIPTS, JSON.stringify(data));
        return data || [];
    } catch (e) {
        console.error('fetchWaterReceipts error:', e);
        return getWaterReceipts();
    }
}

async function fetchWaterSettings() {
    if (!supabaseClient) return getWaterSettings();
    try {
        const { data, error } = await supabaseClient.from('water_settings').select('*');
        if (error) throw error;
        if (data) {
            const settings = {};
            data.forEach(r => { settings[r.key] = r.value; });
            localStorage.setItem(LS_WATER_SETTINGS, JSON.stringify(settings));
            return settings;
        }
        return getWaterSettings();
    } catch (e) {
        console.error('fetchWaterSettings error:', e);
        return getWaterSettings();
    }
}

// =============================================
// WATER CHARGE CALCULATION (ขั้นบันได)
// =============================================
function calculateWaterCharge(usageUnits, customerType = 'บ้านพักอาศัย') {
    const tariffs = getWaterTariffs();
    const allRates = getWaterTariffRates();
    
    // Find active tariff for this customer type
    const tariff = tariffs.find(t => t.customer_type === customerType && t.status === 'active');
    if (!tariff) {
        // Fallback: simple rate
        return { waterCharge: usageUnits * 10, serviceCharge: 30, minimumCharge: 50, totalCharge: Math.max(usageUnits * 10 + 30, 50) };
    }
    
    // Get rates for this tariff
    const rates = allRates.filter(r => r.tariff_id === tariff.id).sort((a, b) => a.sort_order - b.sort_order);
    
    let waterCharge = 0;
    let remainingUnits = usageUnits;
    
    for (const rate of rates) {
        const minUnit = Number(rate.min_unit) || 0;
        const maxUnit = rate.max_unit !== null && rate.max_unit !== undefined ? Number(rate.max_unit) : Infinity;
        const pricePerUnit = Number(rate.price_per_unit) || 0;
        
        const rangeSize = maxUnit === Infinity ? remainingUnits : (maxUnit - minUnit + 1);
        const unitsInRange = Math.min(remainingUnits, rangeSize);
        
        if (unitsInRange > 0) {
            waterCharge += unitsInRange * pricePerUnit;
            remainingUnits -= unitsInRange;
        }
        
        if (remainingUnits <= 0) break;
    }
    
    const serviceCharge = Number(tariff.service_charge) || 0;
    const minimumCharge = Number(tariff.minimum_charge) || 0;
    const totalBeforeMin = waterCharge + serviceCharge;
    const totalCharge = Math.max(totalBeforeMin, minimumCharge);
    
    return {
        waterCharge: Math.round(waterCharge * 100) / 100,
        serviceCharge,
        minimumCharge,
        totalCharge: Math.round(totalCharge * 100) / 100,
        rates: rates,
        tariffName: tariff.name
    };
}

// =============================================
// BILL NUMBER GENERATION
// =============================================
async function generateBillNo(fiscalYear) {
    const settings = getWaterSettings();
    const prefix = settings.bill_prefix || 'WB';
    let lastNo = parseInt(settings.last_bill_no || '0') + 1;
    
    // Update setting in DB
    if (supabaseClient) {
        try {
            await supabaseClient.from('water_settings').update({ value: String(lastNo) }).eq('key', 'last_bill_no');
        } catch (e) { console.error(e); }
    }
    
    // Update localStorage
    settings.last_bill_no = String(lastNo);
    localStorage.setItem(LS_WATER_SETTINGS, JSON.stringify(settings));
    
    return `${prefix}-${fiscalYear}-${String(lastNo).padStart(6, '0')}`;
}

// =============================================
// RECEIPT NUMBER GENERATION (Running Number)
// =============================================
async function generateReceiptNo(fiscalYear) {
    const settings = getWaterSettings();
    const prefix = settings.receipt_prefix || 'WTR';
    let lastNo = parseInt(settings.last_receipt_no || '0') + 1;
    
    // Update setting in DB
    if (supabaseClient) {
        try {
            await supabaseClient.from('water_settings').update({ value: String(lastNo) }).eq('key', 'last_receipt_no');
        } catch (e) { console.error(e); }
    }
    
    // Update localStorage
    settings.last_receipt_no = String(lastNo);
    localStorage.setItem(LS_WATER_SETTINGS, JSON.stringify(settings));
    
    return `${prefix}-${fiscalYear}-${String(lastNo).padStart(6, '0')}`;
}

// =============================================
// CUSTOMER CODE GENERATION
// =============================================
function generateWaterCustomerCode() {
    const customers = getWaterCustomers();
    const existingCodes = customers.map(c => c.customer_code).filter(c => c && c.startsWith('W-'));
    let maxNum = 0;
    existingCodes.forEach(code => {
        const num = parseInt(code.replace('W-', ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `W-${String(maxNum + 1).padStart(5, '0')}`;
}

// =============================================
// METER CODE GENERATION
// =============================================
function generateWaterMeterCode() {
    const meters = getWaterMeters();
    const existingCodes = meters.map(m => m.meter_code).filter(c => c && c.startsWith('WM-'));
    let maxNum = 0;
    existingCodes.forEach(code => {
        const num = parseInt(code.replace('WM-', ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `WM-${String(maxNum + 1).padStart(5, '0')}`;
}

// =============================================
// ANOMALY DETECTION
// =============================================
function detectWaterAnomalies(customerId = null) {
    const readings = getWaterReadings();
    const settings = getWaterSettings();
    const thresholdPercent = parseInt(settings.anomaly_threshold_percent || '200');
    const zeroMonths = parseInt(settings.zero_usage_months || '3');
    const anomalies = [];
    
    // Group readings by customer
    const byCustomer = {};
    readings.forEach(r => {
        if (!byCustomer[r.customer_id]) byCustomer[r.customer_id] = [];
        byCustomer[r.customer_id].push(r);
    });
    
    const customerIds = customerId ? [customerId] : Object.keys(byCustomer);
    
    customerIds.forEach(cid => {
        const cReadings = (byCustomer[cid] || []).sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
        if (cReadings.length < 2) return;
        
        const latest = cReadings[0];
        const latestUsage = Number(latest.usage_units) || (Number(latest.current_reading) - Number(latest.previous_reading));
        
        // Calculate average of previous readings (excluding latest)
        const prevReadings = cReadings.slice(1, 7); // last 6 months
        const avgUsage = prevReadings.reduce((sum, r) => sum + (Number(r.usage_units) || (Number(r.current_reading) - Number(r.previous_reading))), 0) / prevReadings.length;
        
        // Check: usage spike
        if (avgUsage > 0 && latestUsage > avgUsage * (thresholdPercent / 100)) {
            anomalies.push({
                customer_id: cid,
                type: 'high_usage',
                message: `การใช้น้ำเพิ่มขึ้นผิดปกติ (${latestUsage} หน่วย vs ค่าเฉลี่ย ${avgUsage.toFixed(1)} หน่วย)`,
                severity: 'high',
                latest_usage: latestUsage,
                avg_usage: avgUsage
            });
        }
        
        // Check: reading decreased
        if (Number(latest.current_reading) < Number(latest.previous_reading)) {
            anomalies.push({
                customer_id: cid,
                type: 'reading_decreased',
                message: 'เลขมาตรลดลงจากครั้งก่อน',
                severity: 'warning'
            });
        }
        
        // Check: consecutive zero usage
        const consecutiveZero = cReadings.filter((r, i) => {
            const u = Number(r.usage_units) || (Number(r.current_reading) - Number(r.previous_reading));
            return u === 0 && i < zeroMonths;
        }).length;
        if (consecutiveZero >= zeroMonths) {
            anomalies.push({
                customer_id: cid,
                type: 'zero_usage',
                message: `ใช้น้ำ 0 หน่วยต่อเนื่อง ${consecutiveZero} เดือน`,
                severity: 'warning'
            });
        }
    });
    
    return anomalies;
}

// =============================================
// DASHBOARD STATISTICS
// =============================================
function getWaterDashboardStats() {
    const customers = getWaterCustomers();
    const meters = getWaterMeters();
    const readings = getWaterReadings();
    const bills = getWaterBills();
    const payments = getWaterPayments();
    const settings = getWaterSettings();
    
    const currentFY = settings.current_fiscal_year || '2569';
    const now = new Date();
    const currentMonth = WATER_MONTH_KEYS[now.getMonth() >= 9 ? now.getMonth() - 9 : now.getMonth() + 3];
    
    const activeCustomers = customers.filter(c => c.status === 'active');
    const activeMeters = meters.filter(m => m.status === 'active');
    
    // Readings this month
    const monthReadings = readings.filter(r => r.fiscal_year === currentFY && r.billing_month === currentMonth);
    const unreadMeters = activeMeters.length - monthReadings.length;
    
    // Bills this month
    const monthBills = bills.filter(b => b.fiscal_year === currentFY && b.billing_month === currentMonth);
    const monthlyCharge = monthBills.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    
    // Payments this month
    const monthPayments = payments.filter(p => {
        if (!p.payment_date) return false;
        const pDate = new Date(p.payment_date);
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear() && p.status === 'completed';
    });
    const monthlyPayment = monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    
    // Debts
    const unpaidBills = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
    const debtAmount = unpaidBills.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const debtCustomerIds = [...new Set(unpaidBills.map(b => b.customer_id))];
    
    // Monthly usage
    const monthlyUsage = monthReadings.reduce((s, r) => s + (Number(r.usage_units) || Math.max(Number(r.current_reading) - Number(r.previous_reading), 0)), 0);
    
    // Recent bills
    const recentBills = bills.slice(0, 20).map(b => {
        const cust = customers.find(c => c.id === b.customer_id);
        return { ...b, customer_name: cust?.name, customer_code: cust?.customer_code, house_no: cust?.house_no };
    });
    
    // Revenue by month (12 months)
    const monthlyRevenue = WATER_MONTH_KEYS.map(mk => {
        return payments.filter(p => {
            if (p.status !== 'completed') return false;
            return true; // simplified - would need better date matching
        }).reduce((s, p) => s + Number(p.amount || 0), 0) / 12; // simplified average
    });
    
    return {
        totalCustomers: activeCustomers.length,
        activeMeters: activeMeters.length,
        unreadMeters: Math.max(unreadMeters, 0),
        monthlyCharge,
        monthlyPayment,
        debtAmount,
        debtCount: debtCustomerIds.length,
        monthlyUsage,
        recentBills,
        anomalyCount: detectWaterAnomalies().length,
        customersByType: WATER_CUSTOMER_TYPES.map(t => ({
            type: t,
            count: activeCustomers.filter(c => c.customer_type === t).length
        }))
    };
}

// =============================================
// DEBTOR ANALYSIS
// =============================================
function calculateWaterDebtors() {
    const bills = getWaterBills();
    const customers = getWaterCustomers();
    
    const unpaidBills = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
    const debtByCustomer = {};
    
    unpaidBills.forEach(b => {
        if (!debtByCustomer[b.customer_id]) {
            const cust = customers.find(c => c.id === b.customer_id);
            debtByCustomer[b.customer_id] = {
                customer_id: b.customer_id,
                name: cust?.name || '',
                customer_code: cust?.customer_code || '',
                house_no: cust?.house_no || '',
                moo: cust?.moo || '',
                phone: cust?.phone || '',
                unpaid_count: 0,
                total_debt: 0,
                bills: []
            };
        }
        debtByCustomer[b.customer_id].unpaid_count++;
        debtByCustomer[b.customer_id].total_debt += Number(b.total_amount || 0);
        debtByCustomer[b.customer_id].bills.push(b);
    });
    
    return Object.values(debtByCustomer).sort((a, b) => b.total_debt - a.total_debt);
}

// =============================================
// AUDIT LOG
// =============================================
async function logWaterAudit(tableName, recordId, action, oldData, newData) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('water_audit_logs').insert({
            table_name: tableName,
            record_id: String(recordId),
            action: action,
            old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
            new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
            changed_by: 'system', // would be replaced with actual user
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('Audit log error:', e);
    }
}

// =============================================
// HELPER FUNCTIONS
// =============================================
function formatWaterMoney(value) {
    const num = Number(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return num.toLocaleString('th-TH');
    return String(num);
}

function formatWaterMoneyDecimal(value) {
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskIdCard(idCard) {
    if (!idCard || idCard.length < 4) return idCard || '-';
    return 'X-XXXX-XXXXX-XX-' + idCard.slice(-4);
}

function formatThaiDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = d.getDate();
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const year = d.getFullYear() + 543;
    return `${day} ${months[d.getMonth()]} ${year}`;
}

function getCurrentFiscalYear() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    // ปีงบประมาณไทย: ต.ค. ปีก่อน - ก.ย. ปีปัจจุบัน
    return month >= 9 ? (year + 544) : (year + 543);
}

function getCurrentBillingMonth() {
    const now = new Date();
    const month = now.getMonth();
    return WATER_MONTH_KEYS[month >= 9 ? month - 9 : month + 3];
}

function getMonthLabel(monthKey) {
    const idx = WATER_MONTH_KEYS.indexOf(monthKey);
    return idx >= 0 ? WATER_MONTHS_TH[idx] : monthKey;
}

function getMonthShortLabel(monthKey) {
    const idx = WATER_MONTH_KEYS.indexOf(monthKey);
    return idx >= 0 ? WATER_MONTHS_SHORT[idx] : monthKey;
}

function getWaterStatusBadge(status) {
    const map = {
        'active': '<span class="badge bg-success">ใช้งาน</span>',
        'suspended': '<span class="badge bg-warning text-dark">ระงับชั่วคราว</span>',
        'cancelled': '<span class="badge bg-secondary">ยกเลิก</span>',
        'overdue': '<span class="badge bg-danger">ค้างชำระ</span>',
        'unpaid': '<span class="badge bg-warning text-dark">ยังไม่ชำระ</span>',
        'pending': '<span class="badge bg-info text-dark">รอตรวจสอบ</span>',
        'paid': '<span class="badge bg-success">ชำระแล้ว</span>',
        'completed': '<span class="badge bg-success">สำเร็จ</span>',
        'rejected': '<span class="badge bg-danger">ไม่อนุมัติ</span>',
        'anomaly': '<span class="badge bg-danger">ผิดปกติ</span>',
        'inactive': '<span class="badge bg-secondary">ไม่ใช้งาน</span>',
        'removed': '<span class="badge bg-dark">ถอดแล้ว</span>',
        'faulty': '<span class="badge bg-danger">ชำรุด</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getWaterDebtBadgeClass(months) {
    if (months >= 6) return 'bg-danger';
    if (months >= 4) return 'bg-warning text-dark';
    if (months >= 2) return 'bg-info text-dark';
    return 'bg-secondary';
}

function getWaterDebtBadgeLabel(months) {
    if (months >= 6) return 'ค้างหนัก';
    if (months >= 4) return 'ค้างนาน';
    if (months >= 2) return 'เริ่มค้าง';
    return 'ค้างใหม่';
}

// =============================================
// SUPABASE CRUD HELPERS
// =============================================
async function upsertWaterCustomer(data) {
    if (!supabaseClient) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error'); return null; }
    try {
        const isNew = !data.id;
        if (isNew) {
            data.customer_code = data.customer_code || generateWaterCustomerCode();
            data.created_at = new Date().toISOString();
        }
        data.updated_at = new Date().toISOString();
        
        const { data: result, error } = isNew
            ? await supabaseClient.from('water_customers').insert(data).select().single()
            : await supabaseClient.from('water_customers').update(data).eq('id', data.id).select().single();
        
        if (error) throw error;
        
        await logWaterAudit('water_customers', result.id, isNew ? 'INSERT' : 'UPDATE', null, result);
        await fetchWaterCustomers();
        return result;
    } catch (e) {
        console.error('upsertWaterCustomer error:', e);
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        return null;
    }
}

async function upsertWaterMeter(data) {
    if (!supabaseClient) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error'); return null; }
    try {
        const isNew = !data.id;
        if (isNew) {
            data.meter_code = data.meter_code || generateWaterMeterCode();
            data.created_at = new Date().toISOString();
        }
        data.updated_at = new Date().toISOString();
        
        const { data: result, error } = isNew
            ? await supabaseClient.from('water_meters').insert(data).select().single()
            : await supabaseClient.from('water_meters').update(data).eq('id', data.id).select().single();
        
        if (error) throw error;
        
        await logWaterAudit('water_meters', result.id, isNew ? 'INSERT' : 'UPDATE', null, result);
        await fetchWaterMeters();
        return result;
    } catch (e) {
        console.error('upsertWaterMeter error:', e);
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        return null;
    }
}

async function saveMeterReading(data) {
    if (!supabaseClient) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error'); return null; }
    try {
        data.created_at = new Date().toISOString();
        
        const { data: result, error } = await supabaseClient.from('water_meter_readings').insert(data).select().single();
        if (error) {
            if (error.code === '23505') {
                showToast('มิเตอร์นี้ได้จดเลขมาตรในรอบบิลนี้แล้ว', 'warning');
                return null;
            }
            throw error;
        }
        
        await logWaterAudit('water_meter_readings', result.id, 'INSERT', null, result);
        return result;
    } catch (e) {
        console.error('saveMeterReading error:', e);
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        return null;
    }
}

async function createWaterBill(data) {
    if (!supabaseClient) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error'); return null; }
    try {
        const settings = getWaterSettings();
        data.bill_no = await generateBillNo(data.fiscal_year || settings.current_fiscal_year || '2569');
        data.created_at = new Date().toISOString();
        data.updated_at = new Date().toISOString();
        
        const { data: result, error } = await supabaseClient.from('water_bills').insert(data).select().single();
        if (error) throw error;
        
        await logWaterAudit('water_bills', result.id, 'INSERT', null, result);
        return result;
    } catch (e) {
        console.error('createWaterBill error:', e);
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        return null;
    }
}

async function createWaterPayment(paymentData, billIds, amounts) {
    if (!supabaseClient) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error'); return null; }
    try {
        // Create payment
        paymentData.created_at = new Date().toISOString();
        const { data: payment, error: pErr } = await supabaseClient.from('water_payments').insert(paymentData).select().single();
        if (pErr) throw pErr;
        
        // Create payment items
        const items = billIds.map((billId, i) => ({
            payment_id: payment.id,
            bill_id: billId,
            amount: amounts[i]
        }));
        
        if (items.length > 0) {
            const { error: iErr } = await supabaseClient.from('water_payment_items').insert(items);
            if (iErr) throw iErr;
        }
        
        // Update bill statuses
        if (paymentData.status === 'completed') {
            for (const billId of billIds) {
                await supabaseClient.from('water_bills').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', billId);
            }
        } else {
            for (const billId of billIds) {
                await supabaseClient.from('water_bills').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', billId);
            }
        }
        
        await logWaterAudit('water_payments', payment.id, 'INSERT', null, payment);
        return payment;
    } catch (e) {
        console.error('createWaterPayment error:', e);
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        return null;
    }
}

async function createWaterReceipt(data) {
    if (!supabaseClient) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error'); return null; }
    try {
        const settings = getWaterSettings();
        data.receipt_no = await generateReceiptNo(settings.current_fiscal_year || '2569');
        data.created_at = new Date().toISOString();
        
        const { data: result, error } = await supabaseClient.from('water_receipts').insert(data).select().single();
        if (error) throw error;
        
        await logWaterAudit('water_receipts', result.id, 'INSERT', null, result);
        return result;
    } catch (e) {
        console.error('createWaterReceipt error:', e);
        showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        return null;
    }
}

// =============================================
// EXPORT
// =============================================
if (typeof window !== 'undefined') {
    window.initWaterData = initWaterData;
    window.getWaterCustomers = getWaterCustomers;
    window.getWaterMeters = getWaterMeters;
    window.getWaterReadings = getWaterReadings;
    window.getWaterTariffs = getWaterTariffs;
    window.getWaterTariffRates = getWaterTariffRates;
    window.getWaterBills = getWaterBills;
    window.getWaterPayments = getWaterPayments;
    window.getWaterPaymentItems = getWaterPaymentItems;
    window.getWaterReceipts = getWaterReceipts;
    window.getWaterSettings = getWaterSettings;
    window.fetchWaterCustomers = fetchWaterCustomers;
    window.fetchWaterMeters = fetchWaterMeters;
    window.fetchWaterReadings = fetchWaterReadings;
    window.fetchWaterTariffs = fetchWaterTariffs;
    window.fetchWaterTariffRates = fetchWaterTariffRates;
    window.fetchWaterBills = fetchWaterBills;
    window.fetchWaterPayments = fetchWaterPayments;
    window.fetchWaterPaymentItems = fetchWaterPaymentItems;
    window.fetchWaterReceipts = fetchWaterReceipts;
    window.fetchWaterSettings = fetchWaterSettings;
    window.calculateWaterCharge = calculateWaterCharge;
    window.generateBillNo = generateBillNo;
    window.generateReceiptNo = generateReceiptNo;
    window.generateWaterCustomerCode = generateWaterCustomerCode;
    window.generateWaterMeterCode = generateWaterMeterCode;
    window.detectWaterAnomalies = detectWaterAnomalies;
    window.getWaterDashboardStats = getWaterDashboardStats;
    window.calculateWaterDebtors = calculateWaterDebtors;
    window.logWaterAudit = logWaterAudit;
    window.formatWaterMoney = formatWaterMoney;
    window.formatWaterMoneyDecimal = formatWaterMoneyDecimal;
    window.maskIdCard = maskIdCard;
    window.formatThaiDate = formatThaiDate;
    window.getCurrentFiscalYear = getCurrentFiscalYear;
    window.getCurrentBillingMonth = getCurrentBillingMonth;
    window.getMonthLabel = getMonthLabel;
    window.getMonthShortLabel = getMonthShortLabel;
    window.getWaterStatusBadge = getWaterStatusBadge;
    window.getWaterDebtBadgeClass = getWaterDebtBadgeClass;
    window.getWaterDebtBadgeLabel = getWaterDebtBadgeLabel;
    window.upsertWaterCustomer = upsertWaterCustomer;
    window.upsertWaterMeter = upsertWaterMeter;
    window.saveMeterReading = saveMeterReading;
    window.createWaterBill = createWaterBill;
    window.createWaterPayment = createWaterPayment;
    window.createWaterReceipt = createWaterReceipt;
    window.WATER_CUSTOMER_TYPES = WATER_CUSTOMER_TYPES;
    window.WATER_CUSTOMER_STATUS = WATER_CUSTOMER_STATUS;
    window.WATER_METER_SIZES = WATER_METER_SIZES;
    window.WATER_BILL_STATUS = WATER_BILL_STATUS;
    window.WATER_PAYMENT_STATUS = WATER_PAYMENT_STATUS;
    window.WATER_MONTHS_TH = WATER_MONTHS_TH;
    window.WATER_MONTHS_SHORT = WATER_MONTHS_SHORT;
    window.WATER_MONTH_KEYS = WATER_MONTH_KEYS;
}

// UI Helpers for Water Module
function showLoading(title = '���ѧ��Ŵ������...') {
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }
}
function hideLoading() {
    if(typeof Swal !== 'undefined') {
        setTimeout(() => Swal.close(), 600);
    }
}

