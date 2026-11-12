/**
 * citizen-water-payment.js — MOCK DATA for testing payment module
 */

let currentStep = 'search'; 
let selectedCustomer = { id: 'mock-1', name: 'นาย ทดลอง ระบบ', house_no: '10/1', moo: '1' };
let mockBills = [
    { 
        month: 'aug', 
        name: 'สิงหาคม 2569', 
        billing_cycle: '01/08/2569 - 31/08/2569',
        previous_reading: 1020,
        current_reading: 1035,
        usage_units: 15,
        total_amount: 150, 
        status: 'pending' 
    },
    { 
        month: 'sep', 
        name: 'กันยายน 2569', 
        billing_cycle: '01/09/2569 - 30/09/2569',
        previous_reading: 1035,
        current_reading: 1050,
        usage_units: 15,
        total_amount: 150, 
        status: 'pending' 
    }
];
let selectedMonthKeys = [];
let slipBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
    buildFiscalYearOptions();
    // Simulate auto-search with mock data
    setTimeout(() => {
        document.getElementById('searchInput').value = '10/1';
        searchCustomer();
    }, 500);
});

function buildFiscalYearOptions() {
    const sel = document.getElementById('fiscalYearSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="2569" selected>2569</option><option value="2568">2568</option>';
}

function onFiscalYearChange() {
    loadMonthlyStatus();
}

function updateStepUI() {
    const steps = ['search','details','payment'];
    const idx = steps.indexOf(currentStep);
    for (let i = 1; i <= 3; i++) {
        const circle = document.getElementById('step' + i);
        const lbl = document.getElementById('lbl' + i);
        if(!circle || !lbl) continue;
        circle.classList.remove('active','done');
        lbl.classList.remove('active');
        if (i - 1 < idx) { circle.classList.add('done'); circle.innerHTML = '<i class="fa-solid fa-check" style="font-size:0.7rem"></i>'; }
        else if (i - 1 === idx) { circle.classList.add('active'); circle.textContent = i; lbl.classList.add('active'); }
        else { circle.textContent = i; }
    }
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById('line' + i);
        if(line) line.classList.toggle('done', i <= idx);
    }
}

function showSection(name) {
    ['sectionSearch','sectionDetails','sectionPayment'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    const target = document.getElementById('section' + name.charAt(0).toUpperCase() + name.slice(1));
    if (target) { target.style.display = 'block'; target.classList.add('fade-in'); }
}

function goBack() {
    if (currentStep === 'payment') {
        currentStep = 'details';
        showSection('details');
        updateStepUI();
        updateActionButton();
    } else if (currentStep === 'details') {
        currentStep = 'search';
        showSection('search');
        updateStepUI();
        document.getElementById('stickyAction').style.display = 'none';
    } else {
        window.location.href = 'water-payment-portal.html';
    }
}

function searchCustomer() {
    const btn = document.querySelector('.btn-primary[onclick="searchCustomer()"]');
    if(btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังค้นหา...';
    
    setTimeout(() => {
        if(btn) btn.innerHTML = '<i class="fa-solid fa-search me-1"></i>ค้นหา';
        
        const searchInput = document.getElementById('searchInput');
        if (!searchInput || searchInput.value.trim() === '') {
            const results = document.getElementById('searchResults');
            if(results) results.innerHTML = '<div class="text-center py-4 text-danger"><i class="fa-solid fa-circle-xmark fa-2x mb-2"></i><p class="small mb-0">ไม่พบข้อมูลที่ตรงกัน</p></div>';
            return;
        }

        // Use mock data
        const dispName = document.getElementById('dispName');
        const dispAddress = document.getElementById('dispAddress');
        const dispType = document.getElementById('dispType');
        
        if(dispName) dispName.textContent = selectedCustomer.name;
        if(dispAddress) dispAddress.textContent = `บ้านเลขที่ ${selectedCustomer.house_no} ม.${selectedCustomer.moo}`;
        if(dispType) dispType.textContent = 'ที่พักอาศัย';
        
        currentStep = 'details';
        showSection('details');
        updateStepUI();
        document.getElementById('stickyAction').style.display = 'block';
        
        loadMonthlyStatus();
    }, 800);
}

function handleSearchInput(e) {
    if (e.key === 'Enter') {
        searchCustomer();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const results = document.getElementById('searchResults');
    if(results) results.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fa-solid fa-file-invoice fa-2x mb-2" style="opacity:0.2;"></i>
            <p class="small mb-0">กรอกข้อมูลเพื่อค้นหาประวัติการชำระ</p>
        </div>
    `;
}

function loadMonthlyStatus() {
    const list = document.getElementById('monthlyStatusList');
    if (!list) return;
    
    list.innerHTML = '';
    selectedMonthKeys = [];
    
    if (mockBills.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-muted">ไม่มียอดค้างชำระ</div>';
        document.getElementById('dispDebtBadge').style.display = 'none';
    } else {
        const debtBadge = document.getElementById('dispDebtBadge');
        if(debtBadge) {
            debtBadge.style.display = 'inline-block';
            debtBadge.textContent = `ค้าง ${mockBills.length} เดือน`;
        }
        
        mockBills.forEach(bill => {
            const isSelected = selectedMonthKeys.includes(bill.month);
            const html = `
                <div class="mt-row selectable ${isSelected ? 'selected' : ''}" id="row_${bill.month}" onclick="toggleMonth('${bill.month}')">
                    <div class="mt-icon">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bold mb-1">${bill.name}</div>
                        <div class="small text-muted mb-1"><i class="fa-regular fa-calendar me-1"></i> ${bill.billing_cycle || '-'}</div>
                        <div class="small text-muted d-flex gap-3">
                            <span><i class="fa-solid fa-gauge-high me-1"></i> ${bill.previous_reading || 0} <i class="fa-solid fa-arrow-right mx-1 text-secondary" style="font-size:0.7em;"></i> ${bill.current_reading || 0}</span>
                            <span><i class="fa-solid fa-tint me-1 text-primary"></i> ${bill.usage_units || 0} หน่วย</span>
                        </div>
                    </div>
                    <div class="text-end ms-2">
                        <div class="fw-bold text-dark fs-5 mb-1">฿${bill.total_amount || bill.amount}</div>
                        <i class="fa-solid fa-circle-check text-primary fs-5" id="check_${bill.month}" style="display:${isSelected ? 'block' : 'none'}"></i>
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }
    
    updateSummary();
}

function toggleMonth(month) {
    const idx = selectedMonthKeys.indexOf(month);
    const row = document.getElementById('row_' + month);
    const check = document.getElementById('check_' + month);
    
    if (idx === -1) {
        selectedMonthKeys.push(month);
        row.classList.add('selected');
        check.style.display = 'block';
    } else {
        selectedMonthKeys.splice(idx, 1);
        row.classList.remove('selected');
        check.style.display = 'none';
    }
    updateSummary();
}

function updateSummary() {
    let totalAmount = 0;
    selectedMonthKeys.forEach(key => {
        const bill = mockBills.find(b => b.month === key);
        if(bill) totalAmount += (bill.total_amount || bill.amount);
    });
    
    const countBadge = document.getElementById('payCountBadge');
    if (countBadge) countBadge.textContent = `${selectedMonthKeys.length} เดือน`;
    
    const payTotal = document.getElementById('payTotalAmount');
    if (payTotal) payTotal.textContent = `฿${totalAmount.toLocaleString('th-TH')}.00`;
    
    updateActionButton();
}

function updateActionButton() {
    const btn = document.getElementById('btnAction');
    if (!btn) return;
    
    if (currentStep === 'details') {
        if (selectedMonthKeys.length === 0) {
            btn.disabled = true;
            btn.className = 'btn btn-secondary w-100 rounded-pill fw-bold shadow';
            btn.innerHTML = 'กรุณาเลือกเดือนที่ต้องการชำระ';
        } else {
            let total = 0;
            selectedMonthKeys.forEach(key => {
                const bill = mockBills.find(b => b.month === key);
                if(bill) total += (bill.total_amount || bill.amount);
            });
            btn.disabled = false;
            btn.className = 'btn btn-primary w-100 rounded-pill fw-bold shadow';
            btn.innerHTML = `ชำระเงิน ฿${total.toLocaleString('th-TH')} <i class="fa-solid fa-arrow-right ms-2"></i>`;
        }
    } else if (currentStep === 'payment') {
        if (!slipBase64) {
            btn.disabled = true;
            btn.className = 'btn btn-secondary w-100 rounded-pill fw-bold shadow';
            btn.innerHTML = '<i class="fa-solid fa-upload me-2"></i>กรุณาแนบหลักฐานการโอนเงิน';
        } else {
            btn.disabled = false;
            btn.className = 'btn btn-primary w-100 rounded-pill fw-bold shadow';
            btn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i>ยืนยันการชำระเงิน';
        }
    }
}

function handleAction() {
    if (currentStep === 'details') {
        currentStep = 'payment';
        showSection('payment');
        updateStepUI();
        
        let total = 0;
        const payList = document.getElementById('payItemsList');
        if (payList) payList.innerHTML = '';
        
        selectedMonthKeys.forEach(key => {
            const bill = mockBills.find(b => b.month === key);
            if(bill) {
                total += (bill.total_amount || bill.amount);
                if (payList) {
                    payList.insertAdjacentHTML('beforeend', `
                        <div class="summary-item">
                            <span>บิลเดือน ${bill.name}</span>
                            <span>฿${(bill.total_amount || bill.amount).toLocaleString('th-TH')}.00</span>
                        </div>
                    `);
                }
            }
        });
        document.getElementById('saveQrTotal').textContent = `฿${total.toLocaleString('th-TH')}.00`;
        
        updateActionButton();
    } else if (currentStep === 'payment') {
        const btn = document.getElementById('btnAction');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังส่งข้อมูล...';
        
        // Mock API Call
        setTimeout(() => {
            const modal = new bootstrap.Modal(document.getElementById('successModal'));
            modal.show();
        }, 1500);
    }
}

function previewSlip(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('ขนาดไฟล์ใหญ่เกินไป', 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 5 MB', 'error');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            slipBase64 = e.target.result;
            document.getElementById('slipPreview').src = slipBase64;
            document.getElementById('slipPreview').style.display = 'block';
            document.getElementById('uploadZone').style.display = 'none';
            updateActionButton();
        };
        reader.readAsDataURL(file);
    }
}

function togglePayMethod() {
    const isBank = document.getElementById('methodBank').checked;
    const bankArea = document.getElementById('bankArea');
    if(bankArea) bankArea.style.display = isBank ? 'block' : 'none';
}

function copyAccount() {
    const no = document.getElementById('bankAccNoDisplay').textContent.replace(/-/g, '');
    navigator.clipboard.writeText(no).then(() => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'คัดลอกเลขบัญชีแล้ว', showConfirmButton: false, timer: 1500 });
    });
}

function viewHistory() {
    window.location.href = 'water-payment-portal.html';
}

function saveQRCodeImage() {
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ดาวน์โหลด QR Code สำเร็จ (จำลอง)', showConfirmButton: false, timer: 1500 });
}
