
let householdData=[], editingId=null;
document.addEventListener('DOMContentLoaded',async()=>{ await loadData(); });
async function loadData(){
    const mapData = await DigitalDataService.getHouseholdMap();
    householdData=mapData; renderTable(mapData);
}
function renderTable(data){
    const tbody=document.getElementById('householdBody');
    document.getElementById('resultCount').textContent=`${data.length} ครัวเรือน`;
    if(!data.length){tbody.innerHTML='<tr><td colspan="8" class="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>';return;}
    tbody.innerHTML=data.map(h=>`<tr>
        <td class="ps-4 fw-semibold">${h.house_number||'-'}</td>
        <td>หมู่ ${h.village_no||'-'}</td>
        <td>${h.owner_name||'-'}</td>
        <td class="text-center">${h.total_members||0}</td>
        <td class="text-center">${(h.elderly_count||0)>0?`<span class="badge bg-warning bg-opacity-10 text-warning">${h.elderly_count}</span>`:'-'}</td>
        <td class="text-center">${(h.disabled_count||0)>0?`<span class="badge bg-info bg-opacity-10 text-info">${h.disabled_count}</span>`:'-'}</td>
        <td class="text-center">${h.poverty_status?'<span class="badge bg-danger">ยากจน</span>':'<span class="badge bg-success bg-opacity-10 text-success">ปกติ</span>'}</td>
        <td class="pe-4 text-center"><button class="btn btn-xs btn-outline-primary me-1" onclick="viewProfile('${h.id}')"><i class="fa-solid fa-eye"></i></button><button class="btn btn-xs btn-outline-secondary" onclick="editHousehold('${h.id}')"><i class="fa-solid fa-pen"></i></button></td>
    </tr>`).join('');
}
function filterTable(){
    const q=document.getElementById('searchInput').value.toLowerCase();
    const v=document.getElementById('filterVillage').value;
    const s=document.getElementById('filterStatus').value;
    let d=householdData;
    if(q) d=d.filter(h=>(h.house_number||'').toLowerCase().includes(q)||(h.owner_name||'').toLowerCase().includes(q));
    if(v) d=d.filter(h=>String(h.village_no)===v);
    if(s==='poor') d=d.filter(h=>h.poverty_status);
    renderTable(d);
}
let pickerMap = null;
let pickerMarker = null;

function initPickerMap(lat, lng) {
    if (!pickerMap) {
        pickerMap = L.map('pickerMap').setView([lat, lng], 16);
        const googleStreets = L.tileLayer('http://mt0.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}', {
            maxZoom: 20, attribution: '© Google Maps'
        });
        const googleSat = L.tileLayer('http://mt0.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}', {
            maxZoom: 20, attribution: '© Google Maps'
        });
        googleStreets.addTo(pickerMap);
        L.control.layers({ "แผนที่ถนน": googleStreets, "ดาวเทียม": googleSat }).addTo(pickerMap);
        
        pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap);
        
        pickerMarker.on('dragend', function (event) {
            const marker = event.target;
            const position = marker.getLatLng();
            document.getElementById('fLat').value = position.lat.toFixed(6);
            document.getElementById('fLng').value = position.lng.toFixed(6);
        });
    } else {
        pickerMap.setView([lat, lng], 16);
        pickerMarker.setLatLng([lat, lng]);
    }
    
    // Fix map render issue in modal
    setTimeout(() => {
        pickerMap.invalidateSize();
    }, 300);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('fLat').value = lat.toFixed(6);
                document.getElementById('fLng').value = lng.toFixed(6);
                if (pickerMap && pickerMarker) {
                    pickerMap.setView([lat, lng], 16);
                    pickerMarker.setLatLng([lat, lng]);
                }
            },
            (error) => {
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาตรวจสอบการอนุญาตการเข้าถึงตำแหน่ง', 'error');
            }
        );
    } else {
        Swal.fire('ข้อผิดพลาด', 'เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งปัจจุบัน', 'error');
    }
}

function showAddModal(){
    editingId=null;
    document.getElementById('modalTitle').innerHTML='<i class="fa-solid fa-house-chimney text-success me-2"></i>เพิ่มครัวเรือน';
    document.getElementById('householdForm').reset();
    
    // Default coordinate (Bueng Kan area)
    const defaultLat = 18.3615;
    const defaultLng = 103.6520;
    document.getElementById('fLat').value = defaultLat;
    document.getElementById('fLng').value = defaultLng;
    
    const myModal = new bootstrap.Modal(document.getElementById('householdModal'));
    myModal.show();
    
    document.getElementById('householdModal').addEventListener('shown.bs.modal', function () {
        initPickerMap(defaultLat, defaultLng);
    }, { once: true });
}

async function saveHousehold(){
    const houseNo = document.getElementById('fHouseNo').value.trim();
    const villageNo = document.getElementById('fVillageNo').value.trim();
    const houseId = document.getElementById('fHouseID').value.trim();
    
    if(!houseNo || !villageNo || !houseId) {
        Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอก รหัสประจำบ้าน, บ้านเลขที่ และ หมู่ที่', 'warning');
        return;
    }
    
    // Duplicate check
    const isDuplicate = householdData.some(h => 
        h.house_number === houseNo && 
        String(h.village_no) === villageNo && 
        h.id !== editingId
    );
    
    if(isDuplicate) {
        Swal.fire('บ้านเลขที่ซ้ำ', `บ้านเลขที่ ${houseNo} หมู่ที่ ${villageNo} มีอยู่ในระบบแล้ว`, 'error');
        return;
    }

    const data={
        house_number: houseNo,
        village_no: parseInt(villageNo),
        village_name: document.getElementById('fVillageName').value,
        owner_name: document.getElementById('fOwner').value,
        tr14_number: houseId, // Map to tr14_number for backward compatibility
        latitude: parseFloat(document.getElementById('fLat').value)||null,
        longitude: parseFloat(document.getElementById('fLng').value)||null,
        poverty_status: document.getElementById('fPoverty').value==='true'
    };
    
    try{
        if(editingId) await HouseholdService.updateHousehold(editingId,data);
        else await HouseholdService.createHousehold(data);
        bootstrap.Modal.getInstance(document.getElementById('householdModal')).hide();
        Swal.fire({icon:'success', title: editingId?'แก้ไขสำเร็จ':'เพิ่มครัวเรือนสำเร็จ', timer:1500, showConfirmButton:false});
        await loadData();
    }catch(e){
        Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    }
}

function editHousehold(id){
    const h=householdData.find(x=>x.id===id);
    if(!h)return;
    
    editingId=id;
    document.getElementById('modalTitle').innerHTML='<i class="fa-solid fa-pen text-primary me-2"></i>แก้ไขครัวเรือน';
    
    document.getElementById('fHouseNo').value=h.house_number||'';
    document.getElementById('fVillageNo').value=h.village_no||'';
    document.getElementById('fVillageName').value=h.village_name||'';
    document.getElementById('fOwner').value=h.owner_name||'';
    document.getElementById('fHouseID').value=h.tr14_number||'';
    document.getElementById('fPoverty').value=h.poverty_status?'true':'false';
    
    const lat = h.latitude || 18.3615;
    const lng = h.longitude || 103.6520;
    document.getElementById('fLat').value = lat;
    document.getElementById('fLng').value = lng;
    
    const myModal = new bootstrap.Modal(document.getElementById('householdModal'));
    myModal.show();
    
    document.getElementById('householdModal').addEventListener('shown.bs.modal', function () {
        initPickerMap(lat, lng);
    }, { once: true });
}

function viewProfile(id){window.location.href='digital-data-profile.html?id='+id;}

// Export/Import Excel
function exportExcel() {
    if(!householdData.length) { Swal.fire('ไม่มีข้อมูล','ไม่พบข้อมูลสำหรับส่งออก','warning'); return; }
    const exportData = householdData.map((h, idx) => {
        return {
            "ลำดับ": idx + 1,
            "รหัสประจำบ้าน": h.tr14_number || '',
            "บ้านเลขที่": h.house_number || '',
            "หมู่ที่": h.village_no || '',
            "ชื่อหมู่บ้าน": h.village_name || '',
            "ชื่อเจ้าบ้าน": h.owner_name || '',
            "สมาชิก (คน)": h.total_members || 0,
            "ผู้สูงอายุ (คน)": h.elderly_count || 0,
            "ผู้พิการ (คน)": h.disabled_count || 0,
            "ผู้ป่วยติดเตียง (คน)": h.bedridden_count || 0,
            "เด็กแรกเกิด (คน)": h.newborn_count || 0,
            "สถานะยากจน": h.poverty_status ? 'ยากจน' : 'ปกติ',
            "ละติจูด": h.latitude || '',
            "ลองจิจูด": h.longitude || ''
        };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ทะเบียนครัวเรือน");
    XLSX.writeFile(wb, "households_data_export.xlsx");
}

async function handleImportExcel(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if(!jsonData || jsonData.length === 0) {
                Swal.fire('ไฟล์ว่างเปล่า','ไม่พบข้อมูลในไฟล์ Excel','error');
                return;
            }
            
            let importCount = 0;
            let skipCount = 0;
            
            for(const row of jsonData) {
                const houseNo = String(row['บ้านเลขที่'] || '').trim();
                const villageNo = String(row['หมู่ที่'] || '').trim();
                
                if(houseNo && villageNo) {
                    // Check duplicate
                    const isDuplicate = householdData.some(h => String(h.house_number) === houseNo && String(h.village_no) === villageNo);
                    
                    if(isDuplicate) {
                        skipCount++;
                    } else {
                        const newData = {
                            house_number: houseNo,
                            village_no: parseInt(villageNo) || 1,
                            village_name: row['ชื่อหมู่บ้าน'] || '',
                            owner_name: row['ชื่อเจ้าบ้าน'] || '-',
                            tr14_number: row['รหัสประจำบ้าน'] || '',
                            latitude: parseFloat(row['ละติจูด']) || null,
                            longitude: parseFloat(row['ลองจิจูด']) || null,
                            poverty_status: row['สถานะยากจน'] === 'ยากจน'
                        };
                        
                        // Using mock create function (or real if supabase connected)
                        await HouseholdService.createHousehold(newData);
                        importCount++;
                    }
                }
            }
            
            await loadData();
            
            if (skipCount > 0) {
                Swal.fire('นำเข้าเสร็จสิ้น', `นำเข้าสำเร็จ: ${importCount} รายการ<br>ข้ามข้อมูลซ้ำ: ${skipCount} รายการ`, 'info');
            } else {
                Swal.fire('นำเข้าสำเร็จ', `นำเข้าข้อมูลจำนวน ${importCount} รายการ`, 'success');
            }
        } catch(err) {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ Excel ได้ หรือโครงสร้างไม่ถูกต้อง', 'error');
        }
        event.target.value = ''; // Reset input
    };
    reader.readAsArrayBuffer(file);
}

// TR.14 Export/Import
function exportTR14Excel() {
    let exportData = [];
    
    if(!householdData || householdData.length === 0) {
        // Generate Template
        exportData = [{
            "รหัสประจำบ้าน": "13901XXXXX",
            "บ้านเลขที่": "99/9",
            "หมู่ที่": "1",
            "ชื่อหมู่บ้าน": "บ้านตัวอย่าง",
            "สถานะในบ้าน": "เจ้าบ้าน",
            "คำนำหน้า": "นาย",
            "ชื่อ": "สมชาย",
            "นามสกุล": "ใจดี",
            "เลขบัตรประชาชน": "1234567890123",
            "วันเกิด": "1980-01-15",
            "เพศ": "ชาย"
        }];
        Swal.fire('ดาวน์โหลดแบบฟอร์ม', 'ส่งออกแบบฟอร์มว่างพร้อมตัวอย่าง 1 รายการ', 'info');
    } else {
        // Real data (Mock mapping for now)
        exportData = householdData.map((h, idx) => {
            return {
                "รหัสประจำบ้าน": h.tr14_number || '',
                "บ้านเลขที่": h.house_number || '',
                "หมู่ที่": h.village_no || '',
                "ชื่อหมู่บ้าน": h.village_name || '',
                "สถานะในบ้าน": "เจ้าบ้าน", // Default to owner
                "คำนำหน้า": "", // Need robust member mapping here if available
                "ชื่อ": h.owner_name ? h.owner_name.split(' ')[0] : '',
                "นามสกุล": h.owner_name && h.owner_name.includes(' ') ? h.owner_name.split(' ')[1] : '',
                "เลขบัตรประชาชน": "",
                "วันเกิด": "",
                "เพศ": ""
            };
        });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ข้อมูล ทร.14");
    XLSX.writeFile(wb, "tr14_data_template.xlsx");
}

let pendingTR14Data = [];

async function handleImportTR14Excel(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    Swal.fire({
        title: 'กำลังประมวลผล',
        html: 'กรุณารอสักครู่ ระบบกำลังอ่านไฟล์ Excel',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {raw: false});
            
            if(!jsonData || jsonData.length === 0) {
                Swal.fire('ไฟล์ว่างเปล่า','ไม่พบข้อมูลในไฟล์ Excel','error');
                return;
            }
            
            pendingTR14Data = jsonData;
            renderTR14PreviewTable();
            Swal.close();
            
            const previewModal = new bootstrap.Modal(document.getElementById('tr14PreviewModal'));
            previewModal.show();
            
        } catch(err) {
            console.error(err);
            Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้ หรือโครงสร้างไม่ถูกต้อง', 'error');
        }
        event.target.value = ''; // Reset input
    };
    reader.readAsArrayBuffer(file);
}

function normalizePrefix(p) {
    const cleanP = p.replace(/\s+/g, '');
    if (cleanP === 'น.ส.' || cleanP === 'น.ส' || cleanP === 'นส.' || cleanP === 'นางสาว') return 'นางสาว';
    if (cleanP === 'ด.ช.' || cleanP === 'ดช.') return 'เด็กชาย';
    if (cleanP === 'ด.ญ.' || cleanP === 'ดญ.') return 'เด็กหญิง';
    return p; // Keep original if it's a rank or title
}

function extractPrefixFromName(name) {
    name = name.trim();
    // 1. Check "ว่าที่" ranks
    if (name.startsWith('ว่าที่ ร.ต.')) return { p: 'ว่าที่ ร.ต.', n: name.substring(11).trim() };
    if (name.startsWith('ว่าที่ร.ต.')) return { p: 'ว่าที่ ร.ต.', n: name.substring(10).trim() };
    
    // 2. Common prefixes
    const common = ['นางสาว', 'นาย', 'นาง', 'น.ส.', 'น.ส', 'นส.', 'ด.ช.', 'ดช.', 'ด.ญ.', 'ดญ.'];
    for (const p of common) {
        if (name.startsWith(p)) {
            return { p: normalizePrefix(p), n: name.substring(p.length).trim() };
        }
    }
    
    // 3. Ranks with dots (e.g., พ.อ., ร.ต.อ., จ.ส.อ.)
    const rankMatch = name.match(/^([ก-ฮa-zA-Z\.]+\.)\s*(.*)$/);
    if (rankMatch) {
        return { p: rankMatch[1], n: rankMatch[2] };
    }
    
    return { p: '', n: name };
}

function renderTR14PreviewTable() {
    const tbody = document.getElementById('tr14PreviewBody');
    tbody.innerHTML = '';
    
    let errorCount = 0;
    
    pendingTR14Data.forEach((row, index) => {
        // Parse basic details
        const houseNo = String(row['บ้านเลขที่'] || '').trim();
        const villageNo = String(row['หมู่ที่'] || '').trim();
        let prefix = String(row['คำนำหน้า'] || '').trim();
        let fName = String(row['ชื่อ'] || '').trim();
        const lName = String(row['นามสกุล'] || '').trim();
        
        // Try extracting prefix from fName if fName starts with a known prefix
        const extracted = extractPrefixFromName(fName);
        if (extracted.p) {
            if (!prefix || prefix.replace(/\s/g,'') === extracted.p.replace(/\s/g,'')) {
                prefix = extracted.p;
                fName = extracted.n;
            } else if (!prefix) {
                prefix = extracted.p;
                fName = extracted.n;
            }
        }
        
        prefix = normalizePrefix(prefix);
        
        // Save cleaned back
        pendingTR14Data[index]['คำนำหน้า'] = prefix;
        pendingTR14Data[index]['ชื่อ'] = fName;
        
        const citizenId = String(row['เลขบัตรประชาชน'] || '').trim();
        
        let hasError = false;
        if (!houseNo || !villageNo || !fName) hasError = true;
        
        // Gender validation
        let g = String(row['เพศ'] || '').trim();
        if (g !== 'ชาย' && g !== 'หญิง' && g !== 'อื่นๆ') {
            g = 'อื่นๆ';
            // Not necessarily a hard error, but we fixed it
        }
        
        // Date parsing (BE to CE)
        let bDate = row['วันเกิด'];
        let displayDate = bDate;
        let isDateError = false;
        
        if (bDate instanceof Date) {
            bDate = bDate.toISOString().split('T')[0];
        } else if (bDate) {
            bDate = String(bDate).trim();
            if (bDate.includes('/')) {
                const parts = bDate.split('/');
                if (parts.length === 3) {
                    let d = parts[0].padStart(2, '0');
                    let mStr = parts[1].padStart(2, '0');
                    let y = parseInt(parts[2]);
                    if (y > 2400) y = y - 543;
                    bDate = `${y}-${mStr}-${d}`;
                }
            } else if (bDate.includes('-')) {
                const parts = bDate.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                    let y = parseInt(parts[0]);
                    if (y > 2400) y = y - 543;
                    bDate = `${y}-${parts[1]}-${parts[2]}`;
                }
            }
        }
        
        // Strictly validate date regex & valid date logic
        if (!bDate || bDate === 'NaN-NaN-NaN' || bDate.includes('undefined') || !bDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            bDate = ''; // Set empty to allow user to edit
        } else {
            // Check if it's a real calendar date (e.g., prevent 1958-06-39)
            const dObj = new Date(bDate);
            if (isNaN(dObj.getTime()) || dObj.toISOString().split('T')[0] !== bDate) {
                bDate = '';
                isDateError = true;
                hasError = true;
            }
        }
        
        if(isDateError) hasError = true;
        
        // Save cleaned back to pending
        pendingTR14Data[index]['_clean_date'] = bDate;
        pendingTR14Data[index]['_clean_gender'] = g;
        
        if (hasError) errorCount++;
        
        const tr = document.createElement('tr');
        if (hasError) tr.classList.add('table-danger');
        
        tr.innerHTML = `
            <td>${row['รหัสประจำบ้าน'] || '-'}</td>
            <td>${houseNo}</td>
            <td>${villageNo}</td>
            <td>
                <input type="text" class="form-control form-control-sm" value="${prefix}${prefix && fName && !prefix.endsWith('.') ? ' ' : ''}${fName} ${lName}" onchange="updatePendingName(${index}, this.value)">
            </td>
            <td>${citizenId}</td>
            <td>
                <input type="date" class="form-control form-control-sm ${isDateError ? 'is-invalid border-danger' : ''}" value="${bDate}" onchange="updatePendingDate(${index}, this.value)">
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updatePendingGender(${index}, this.value)">
                    <option value="ชาย" ${g==='ชาย'?'selected':''}>ชาย</option>
                    <option value="หญิง" ${g==='หญิง'?'selected':''}>หญิง</option>
                    <option value="อื่นๆ" ${g==='อื่นๆ'?'selected':''}>อื่นๆ</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    const summary = document.getElementById('tr14PreviewSummary');
    if (errorCount > 0) {
        summary.className = 'alert alert-danger';
        summary.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i>พบข้อมูลที่มีปัญหา (ช่องสีแดง) จำนวน ${errorCount} รายการ กรุณาแก้ไขในตารางก่อนกดยืนยัน`;
    } else {
        summary.className = 'alert alert-success';
        summary.innerHTML = `<i class="fa-solid fa-circle-check me-2"></i>ข้อมูลทั้งหมด ${pendingTR14Data.length} รายการ ถูกต้องพร้อมนำเข้า`;
    }
}

function updatePendingName(index, val) {
    const parts = val.trim().split(' ');
    if (parts.length >= 2) {
        pendingTR14Data[index]['นามสกุล'] = parts[parts.length-1];
        let remaining = parts.slice(0, -1).join(' ');
        
        // Use our smart extraction
        const ext = extractPrefixFromName(remaining);
        if (ext.p) {
            pendingTR14Data[index]['คำนำหน้า'] = ext.p;
            pendingTR14Data[index]['ชื่อ'] = ext.n;
        } else {
            // fallback: first part is prefix, rest is firstname
            pendingTR14Data[index]['คำนำหน้า'] = parts[0];
            pendingTR14Data[index]['ชื่อ'] = parts.slice(1, -1).join(' ');
        }
    } else {
        const ext = extractPrefixFromName(val);
        if (ext.p) {
            pendingTR14Data[index]['คำนำหน้า'] = ext.p;
            pendingTR14Data[index]['ชื่อ'] = ext.n;
            pendingTR14Data[index]['นามสกุล'] = '';
        } else {
            pendingTR14Data[index]['ชื่อ'] = val;
            pendingTR14Data[index]['นามสกุล'] = '';
        }
    }
    recheckErrors();
}

function updatePendingDate(index, val) {
    pendingTR14Data[index]['_clean_date'] = val;
    recheckErrors();
}

function updatePendingGender(index, val) {
    pendingTR14Data[index]['_clean_gender'] = val;
    recheckErrors();
}

function recheckErrors() {
    let errorCount = 0;
    const rows = document.getElementById('tr14PreviewBody').querySelectorAll('tr');
    
    pendingTR14Data.forEach((row, idx) => {
        const houseNo = String(row['บ้านเลขที่'] || '').trim();
        const fName = String(row['ชื่อ'] || '').trim();
        const bDate = row['_clean_date'];
        
        let hasError = false;
        if (!houseNo || !fName) hasError = true;
        
        if (hasError) {
            errorCount++;
            rows[idx].classList.add('table-danger');
        } else {
            rows[idx].classList.remove('table-danger');
        }
    });
    
    const summary = document.getElementById('tr14PreviewSummary');
    if (errorCount > 0) {
        summary.className = 'alert alert-danger';
        summary.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i>พบข้อมูลที่มีปัญหา (ช่องสีแดง) จำนวน ${errorCount} รายการ กรุณาแก้ไขในตารางก่อนกดยืนยัน`;
    } else {
        summary.className = 'alert alert-success';
        summary.innerHTML = `<i class="fa-solid fa-circle-check me-2"></i>ข้อมูลทั้งหมด ${pendingTR14Data.length} รายการ ถูกต้องพร้อมนำเข้า`;
    }
}

async function confirmTR14Import() {
    // Check if any errors remain
    const errorCount = document.querySelectorAll('#tr14PreviewBody tr.table-danger').length;
    if (errorCount > 0) {
        const confirm = await Swal.fire({
            title: 'มีข้อมูลผิดพลาด',
            text: 'ยังมีแถวที่เป็นสีแดงอยู่ คุณต้องการข้ามข้อมูลเหล่านั้นและนำเข้าเฉพาะข้อมูลที่ถูกต้องหรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันนำเข้า (ข้ามตัวผิด)',
            cancelButtonText: 'กลับไปแก้ไข'
        });
        if (!confirm.isConfirmed) return;
    }
    
    bootstrap.Modal.getInstance(document.getElementById('tr14PreviewModal')).hide();
    
    Swal.fire({
        title: 'กำลังบันทึกข้อมูล',
        html: 'กรุณารอสักครู่...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const householdsMap = {};
        
        pendingTR14Data.forEach((row, idx) => {
            const houseNo = String(row['บ้านเลขที่'] || '').trim();
            const villageNo = String(row['หมู่ที่'] || '').trim();
            const fName = String(row['ชื่อ'] || '').trim();
            const bDate = row['_clean_date'];
            
            // Skip rows with critical errors
            if (!houseNo || !villageNo || !fName) return; 
            
            const key = houseNo + '_' + villageNo;
            if(!householdsMap[key]) {
                householdsMap[key] = {
                    house_number: houseNo,
                    village_no: parseInt(villageNo) || 1,
                    village_name: row['ชื่อหมู่บ้าน'] || '',
                    tr14_number: row['รหัสประจำบ้าน'] || '',
                    members: [],
                    owner_name: ''
                };
            }
            
            const isHead = (row['สถานะในบ้าน'] === 'เจ้าบ้าน');
            const normalizedPrefix = normalizePrefix(String(row['คำนำหน้า'] || '').trim());
            const fName = String(row['ชื่อ'] || '').trim();
            const lName = String(row['นามสกุล'] || '').trim();
            
            const fullName = (normalizedPrefix ? normalizedPrefix + (normalizedPrefix.endsWith('.') ? '' : ' ') : '') + fName + ' ' + lName;
            if (isHead) {
                householdsMap[key].owner_name = fullName.trim();
            }
            
            householdsMap[key].members.push({
                is_head: isHead,
                prefix: normalizedPrefix,
                first_name: fName,
                last_name: lName,
                citizen_id: String(row['เลขบัตรประชาชน'] || '').trim(),
                birth_date: bDate,
                gender: row['_clean_gender']
            });
        });
        
        let hCount = 0;
        let mCount = 0;
        
        for (const key in householdsMap) {
            const hData = householdsMap[key];
            
            if(!hData.owner_name && hData.members.length > 0) {
                hData.owner_name = (hData.members[0].first_name + ' ' + hData.members[0].last_name).trim();
            }
            
            const housePayload = {
                house_number: hData.house_number,
                village_no: hData.village_no,
                village_name: hData.village_name,
                tr14_number: String(hData.tr14_number),
                owner_name: hData.owner_name,
                total_members: hData.members.length,
                poverty_status: false
            };
            
            let houseId = null;
            const existingHouse = householdData.find(h => 
                String(h.house_number) === String(hData.house_number) && 
                String(h.village_no) === String(hData.village_no)
            );
            
            if (existingHouse) {
                houseId = existingHouse.id;
                await HouseholdService.updateHousehold(houseId, housePayload);
            } else {
                let createdHouse = await HouseholdService.createHousehold(housePayload);
                houseId = createdHouse.id;
                hCount++;
            }
            
            for(const m of hData.members) {
                let calculatedAge = null;
                if (m.birth_date) {
                    const birthYear = parseInt(m.birth_date.split('-')[0]);
                    const currentYear = new Date().getFullYear();
                    calculatedAge = currentYear - birthYear;
                }

                const memberPayload = {
                    is_head: m.is_head,
                    prefix: m.prefix,
                    first_name: m.first_name,
                    last_name: m.last_name,
                    citizen_id: m.citizen_id,
                    birth_date: m.birth_date || null,
                    age: calculatedAge,
                    gender: m.gender
                };
                
                await HouseholdService.linkMember(houseId, memberPayload);
                mCount++;
            }
        }
        
        await loadData();
        Swal.fire('นำเข้า ทร.14 สำเร็จ', `สร้างครัวเรือนใหม่/อัปเดตรวม ${Object.keys(householdsMap).length} หลัง <br>และเชื่อมโยงสมาชิก ${mCount} รายการ`, 'success');
        
    } catch(err) {
        console.error("IMPORT ERROR:", err);
        Swal.fire('เกิดข้อผิดพลาด', (err.message || JSON.stringify(err)) + ' <br><small>ไม่สามารถนำเข้าข้อมูลได้ โปรดตรวจสอบ Console</small>', 'error');
    }
}
