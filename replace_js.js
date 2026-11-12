const fs = require('fs');
const file = 'digital-infrastructure-signs.html';
let content = fs.readFileSync(file, 'utf8');

// Replace renderRoadsTable body
const renderRegex = /function renderRoadsTable[\s\S]*?}\n\n    function filterRoadsTable/m;
const newRender = `function renderRoadsTable(roads) {
        const tbody = document.getElementById('roadsTableBody');
        if (!tbody) return;
        if (!roads.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">ไม่พบข้อมูลป้ายซอย</td></tr>';
            return;
        }

        tbody.innerHTML = roads.map((r, index) => {
            return \`<tr>
                <td class="ps-4 fw-bold text-indigo-600">\${index + 1}</td>
                <td class="font-semibold text-slate-800">\${r.road_name || r.sign_name || '-'}</td>
                <td><span class="d-inline-flex align-items-center gap-1"><i class="fa-solid fa-location-dot text-red-500"></i> \${r.latitude || '-'}, \${r.longitude || '-'}</span></td>
                <td class="pe-4 text-center">
                    <div class="d-flex justify-content-center gap-1">
                        <button class="btn btn-xs btn-outline-warning text-dark fw-semibold" onclick="editRoad('\${r.id}')"><i class="fa-solid fa-edit"></i> แก้ไข</button>
                        <button class="btn btn-xs btn-outline-danger" onclick="deleteRoad('\${r.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>\`;
        }).join('');
    }

    function filterRoadsTable`;

content = content.replace(renderRegex, newRender);

// Update table headers to include 'ลำดับ'
const headerRegex = /<th class="text-nowrap ps-4">ชื่อป้ายซอย<\/th>\s*<th class="text-nowrap">พิกัด<\/th>/m;
const newHeader = `<th class="text-nowrap ps-4">ลำดับ</th>
                                    <th class="text-nowrap">ชื่อป้ายซอย</th>
                                    <th class="text-nowrap">พิกัด</th>`;
content = content.replace(headerRegex, newHeader);


// Update form submit logic
const submitRegex = /const roadPayload = {[\s\S]*?};[\s\S]*?if\s*\(roadType === 'ถนนในแผนพัฒนา'\)[\s\S]*?\} else \{[\s\S]*?\}/m;
const newSubmit = `const roadPayload = {
            sign_name: document.getElementById('nrRoadName').value,
            road_name: document.getElementById('nrRoadName').value, // keeping for compatibility
            latitude: parseFloat(document.getElementById('nrLat').value) || 0,
            longitude: parseFloat(document.getElementById('nrLng').value) || 0,
            road_type: 'sign',
            geom: null
        };`;
content = content.replace(submitRegex, newSubmit);

// Update Map digitization logic inside initDigitizeMap
// The JS uses L.Draw.Polyline. We don't need it, we can just use simple Marker if possible, but leaving it or removing it is fine.
// The user asked "เพิ่มจุดได้" (Can add a point). So maybe just use lat/lng fields. The form already has lat/lng inputs!
// Let's remove digitizeMapContainer from the script so it won't break if not needed.
// Or just let it be, the HTML form has `nrLat` and `nrLng` text boxes.


fs.writeFileSync(file, content, 'utf8');
console.log("Replaced render and submit.");
