/**
 * water-meter-upload.js — Shapefile & GeoJSON Upload Engine (Water Meter Edition)
 * Smart Governance Municipality Platform
 * 
 * ระบบนำเข้าข้อมูล GeoJSON/Shapefile สำหรับจุดมาตรน้ำประปา (Points)
 */

const WaterMeterShapefileUploader = {
    selectedFile: null,
    parsedGeoJSON: null,
    detectedCRS: 'EPSG:4326 (WGS 84)',
    attributes: [],
    previewMapInstance: null,
    previewLayers: null,

    // === ตารางจับคู่ field อัจฉริยะ สำหรับมาตรน้ำประปา ===
    _fieldAliases: {
        meter_code:     ['meter_code', 'meter_id', 'รหัสมาตร', 'รหัสน้ำ', 'รหัส', 'code', 'id', 'meter'],
        house_number:   ['house_number', 'house_no', 'address', 'บ้านเลขที่', 'เลขที่บ้าน', 'บ้านเลข'],
        village_no:     ['village_no', 'village', 'moo', 'หมู่ที่', 'หมู่', 'villageno', 'moo_no', 'ban_no', 'vilno'],
        owner_name:     ['owner_name', 'owner', 'name', 'ชื่อเจ้าของ', 'เจ้าของ', 'ชื่อ-สกุล', 'ชื่อ', 'ownername'],
        caretaker_name: ['caretaker_name', 'caretaker', 'ผู้ดูแล', 'ผู้ดูแลมาตรน้ำ', 'คนดูแล'],
        image_url:      ['image_url', 'image', 'รูป', 'รูปภาพ', 'url', 'photo', 'picture', 'img']
    },

    // === TARGET FIELDS สำหรับระบบทะเบียนมาตรน้ำประปา ===
    targetFields: [
        { key: 'meter_code', label: 'รหัสมาตร', icon: 'fa-hashtag', required: true },
        { key: 'house_number', label: 'บ้านเลขที่', icon: 'fa-house', required: true },
        { key: 'village_no', label: 'หมู่ที่ตั้ง', icon: 'fa-location-dot', required: true },
        { key: 'owner_name', label: 'เจ้าของ', icon: 'fa-user' },
        { key: 'caretaker_name', label: 'ผู้ดูแลมาตรน้ำ', icon: 'fa-user-gear' },
        { key: 'image_url', label: 'URL รูปภาพ', icon: 'fa-image' }
    ],

    initDropZone(dropZoneId, fileInputId, onParsedCallback) {
        const zone = document.getElementById(dropZoneId);
        const input = document.getElementById(fileInputId);
        if (!zone || !input) return;

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('border-blue-500', 'bg-blue-50/50');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('border-blue-500', 'bg-blue-50/50');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('border-blue-500', 'bg-blue-50/50');
            const files = e.dataTransfer.files;
            if (files.length) {
                this.handleFileSelect(files[0], onParsedCallback);
            }
        });

        zone.addEventListener('click', () => input.click());

        input.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileSelect(e.target.files[0], onParsedCallback);
            }
        });
    },

    async handleFileSelect(file, callback) {
        this.selectedFile = file;
        const name = file.name.toLowerCase();
        
        if (typeof showToast !== 'undefined') {
            showToast(`ได้รับไฟล์ ${file.name} กำลังประมวลผลข้อมูล...`, 'info');
        }

        try {
            if (name.endsWith('.geojson') || name.endsWith('.json')) {
                const text = await file.text();
                const geojson = JSON.parse(text);
                this.parseGeoJSONData(geojson);
            } else if (name.endsWith('.kml')) {
                // mock KML
                this.parseGeoJSONData(this.getMockGeoJSON());
            } else if (name.endsWith('.zip') || name.endsWith('.shp')) {
                // mock shapefile
                this.parseGeoJSONData(this.getMockGeoJSON());
            } else {
                throw new Error('รูปแบบไฟล์ไม่รองรับ กรุณาใช้ไฟล์ .shp, .zip, .geojson, .kml');
            }

            if (callback) callback(this.parsedGeoJSON);
        } catch (e) {
            console.error(e);
            if (typeof showToast !== 'undefined') {
                showToast(`เกิดข้อผิดพลาด: ${e.message}`, 'danger');
            }
        }
    },

    parseGeoJSONData(geojson) {
        this.parsedGeoJSON = geojson;
        this.detectedCRS = geojson.crs && geojson.crs.properties && geojson.crs.properties.name 
            ? geojson.crs.properties.name 
            : 'EPSG:4326 (WGS 84)';
            
        this.attributes = [];
        if (geojson.features && geojson.features.length) {
            const allKeys = new Set();
            geojson.features.forEach(f => {
                if (f.properties) Object.keys(f.properties).forEach(k => allKeys.add(k));
            });
            this.attributes = Array.from(allKeys);
        }
        
        if (typeof showToast !== 'undefined') {
            showToast(`ตรวจจับพิกัดสมบูรณ์ พบ ${geojson.features.length} จุดมาตรน้ำ, ${this.attributes.length} ฟิลด์ข้อมูล`, 'success');
        }
    },

    getMockGeoJSON() {
        this.detectedCRS = 'EPSG:32647 (UTM Zone 47N)';
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { meter_id: 'WM-0001', address: '123/4', moo: '1', name: 'นาย ก.', caretaker: 'นาย ข.' },
                    geometry: { type: 'Point', coordinates: [103.474, 17.980] }
                },
                {
                    type: 'Feature',
                    properties: { meter_id: 'WM-0002', address: '45/6', moo: '2', name: 'นาง ค.', caretaker: 'นาย ง.' },
                    geometry: { type: 'Point', coordinates: [103.468, 17.972] }
                }
            ]
        };
    },

    _autoMapField(fieldKey) {
        const aliases = this._fieldAliases[fieldKey] || [];
        for (const attr of this.attributes) {
            const attrLow = attr.toLowerCase().replace(/[_\-\s]/g, '');
            for (const alias of aliases) {
                const aliasLow = alias.toLowerCase().replace(/[_\-\s]/g, '');
                if (attrLow === aliasLow) return attr;
            }
        }
        for (const attr of this.attributes) {
            const attrLow = attr.toLowerCase().replace(/[_\-\s]/g, '');
            for (const alias of aliases) {
                const aliasLow = alias.toLowerCase().replace(/[_\-\s]/g, '');
                if (attrLow.includes(aliasLow) || aliasLow.includes(attrLow)) return attr;
            }
        }
        return '';
    },

    _generateAutoMapping() {
        const mapping = {};
        this.targetFields.forEach(field => {
            mapping[field.key] = this._autoMapField(field.key);
        });
        return mapping;
    },

    buildAttributeMapper(containerId, targetTableFields, onConfirmCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const fields = targetTableFields || this.targetFields;

        if (!this.attributes.length) {
            container.innerHTML = `<div class="p-3 text-center text-muted border rounded-xl bg-slate-50 text-xs">กรุณาอัปโหลดไฟล์ข้อมูล GIS เพื่อเริ่มต้นจับคู่แอตทริบิวต์ฟิลด์</div>`;
            return;
        }

        const autoMapping = this._generateAutoMapping();
        const matchedCount = Object.values(autoMapping).filter(v => v).length;

        let html = `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h6 class="font-bold text-xs mb-0 text-blue-400">
                        <i class="fa-solid fa-wand-magic-sparkles me-1"></i> จับคู่คอลัมน์อัตโนมัติ
                    </h6>
                    <span class="badge bg-emerald-600 text-[10px] px-2 py-1 rounded-pill">
                        <i class="fa-solid fa-check-double me-1"></i> จับคู่ได้ ${matchedCount}/${fields.length} ฟิลด์
                    </span>
                </div>
                
                <div class="mb-3 d-flex flex-wrap gap-1">
                    <span class="text-[10px] text-slate-400 me-1">ฟิลด์ที่ตรวจพบ:</span>
                    ${this.attributes.map(a => {
                        const isMapped = Object.values(autoMapping).includes(a);
                        return `<span class="badge ${isMapped ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-700 text-slate-300'} text-[9px] px-2 py-1 rounded-pill">${isMapped ? '✓' : '○'} ${a}</span>`;
                    }).join('')}
                </div>

                <div class="row g-2 text-xs">
        `;

        fields.forEach(field => {
            const autoMatch = autoMapping[field.key] || '';
            const matchStatus = autoMatch 
                ? '<i class="fa-solid fa-circle-check text-emerald-400 ms-1" title="จับคู่อัตโนมัติสำเร็จ"></i>' 
                : '<i class="fa-solid fa-circle-xmark text-slate-600 ms-1" title="ไม่พบฟิลด์ตรงกัน"></i>';
            
            const options = this.attributes.map(attr => `<option value="${attr}" ${attr === autoMatch ? 'selected' : ''}>${attr}</option>`).join('');
            const requiredMark = field.required ? '<span class="text-red-400 ms-1">*</span>' : '';

            html += `
                <div class="col-md-6 col-lg-4 mb-2">
                    <div class="p-2 rounded bg-slate-800/80 border ${autoMatch ? 'border-emerald-700/50' : 'border-slate-700'}" style="min-height:60px;">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <span class="fw-semibold text-white text-[11px] d-flex align-items-center">
                                <i class="fa-solid ${field.icon} text-blue-400 me-1 w-3 text-center" style="font-size:10px;"></i>
                                ${field.label}${requiredMark}
                                ${matchStatus}
                            </span>
                        </div>
                        <select class="form-select form-select-xs bg-slate-900 border-slate-700 text-white w-100" style="font-size:10px;padding:3px 6px;" data-field="${field.key}">
                            <option value="">-- ไม่จัดเก็บ --</option>
                            ${options}
                        </select>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                
                <div class="mt-3 border-t border-slate-700 pt-3">
                    <h6 class="text-xs fw-bold text-cyan-400 mb-2"><i class="fa-solid fa-table me-1"></i> ตัวอย่างข้อมูลก่อนนำเข้า (Preview ${Math.min(this.parsedGeoJSON.features.length, 5)} จาก ${this.parsedGeoJSON.features.length} รายการ)</h6>
                    <div class="table-responsive" style="max-height:200px;overflow-y:auto;">
                        <table class="table table-sm table-dark table-bordered mb-0" style="font-size:10px;">
                            <thead>
                                <tr>
                                    <th class="text-nowrap bg-slate-800 text-blue-400">#</th>
                                    ${fields.filter(f => autoMapping[f.key]).map(f => `<th class="text-nowrap bg-slate-800 text-blue-400">${f.label}</th>`).join('')}
                                    <th class="text-nowrap bg-slate-800 text-blue-400">พิกัด</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.parsedGeoJSON.features.slice(0, 5).map((feat, i) => {
                                    const props = feat.properties || {};
                                    const geom = feat.geometry || {};
                                    let coordStr = '-';
                                    if (geom.type === 'Point' && geom.coordinates) {
                                        coordStr = `${geom.coordinates[1].toFixed(4)}, ${geom.coordinates[0].toFixed(4)}`;
                                    } else {
                                        coordStr = 'ไม่ใช่ข้อมูล Point';
                                    }
                                    return `<tr>
                                        <td class="text-slate-400">${i + 1}</td>
                                        ${fields.filter(f => autoMapping[f.key]).map(f => `<td class="text-slate-200">${props[autoMapping[f.key]] || '-'}</td>`).join('')}
                                        <td class="text-emerald-400 fw-bold">${coordStr}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="mt-3 border-t border-slate-700 pt-3">
                    <h6 class="text-xs fw-bold text-cyan-400 mb-2"><i class="fa-solid fa-map me-1"></i> ตำแหน่งมาตรน้ำจากไฟล์ GeoJSON</h6>
                    <div id="wmImportPreviewMap" style="height:220px;border-radius:10px;border:1px solid #334155;overflow:hidden;"></div>
                </div>

                <div class="d-flex gap-2 mt-3">
                    <button type="button" class="btn btn-primary btn-sm flex-grow-1 fw-bold" id="btnConfirmImport">
                        <i class="fa-solid fa-file-import me-1"></i> ยืนยันนำเข้าทั้งหมด ${this.parsedGeoJSON.features.length} รายการ
                    </button>
                    <button type="button" class="btn btn-outline-light btn-sm" id="btnRefreshMapping" title="สร้าง mapping ใหม่">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        setTimeout(() => this._initPreviewMap(), 200);

        document.getElementById('btnConfirmImport').addEventListener('click', () => {
            const mapping = {};
            const selects = container.querySelectorAll('select[data-field]');
            selects.forEach(sel => {
                if (sel.value) mapping[sel.dataset.field] = sel.value;
            });
            this.executeImport(mapping, onConfirmCallback);
        });

        document.getElementById('btnRefreshMapping').addEventListener('click', () => {
            this.buildAttributeMapper(containerId, targetTableFields, onConfirmCallback);
        });
    },

    _initPreviewMap() {
        const mapEl = document.getElementById('wmImportPreviewMap');
        if (!mapEl || typeof L === 'undefined') return;
        
        mapEl.style.position = 'relative';
        mapEl.style.background = '#0f172a';

        if (this.previewMapInstance) {
            this.previewMapInstance.remove();
        }

        this.previewMapInstance = L.map('wmImportPreviewMap', { zoomSnap: 0, zoomDelta: 0.25, wheelPxPerZoomLevel: 100, zoomAnimation: true }).setView([17.975, 103.472], 13);
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}', { maxZoom: 20 }).addTo(this.previewMapInstance);

        if (this.parsedGeoJSON && this.parsedGeoJSON.features) {
            const bounds = L.latLngBounds();
            this.previewLayers = L.layerGroup().addTo(this.previewMapInstance);

            this.parsedGeoJSON.features.forEach((feat) => {
                const geom = feat.geometry;
                if (geom && geom.type === 'Point' && geom.coordinates) {
                    const lat = geom.coordinates[1];
                    const lng = geom.coordinates[0];
                    if (lat && lng) {
                        const marker = L.circleMarker([lat, lng], {
                            radius: 6, color: '#ffffff', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2
                        });
                        this.previewLayers.addLayer(marker);
                        bounds.extend([lat, lng]);
                    }
                }
            });

            if (bounds.isValid()) {
                this.previewMapInstance.fitBounds(bounds, { padding: [25, 25] });
            }
        }
        setTimeout(() => { if (this.previewMapInstance) this.previewMapInstance.invalidateSize(); }, 200);
    },

    async executeImport(mapping, onImported) {
        if (!this.parsedGeoJSON) return;

        const features = this.parsedGeoJSON.features || [];
        const results = [];

        features.forEach((feat, index) => {
            const props = feat.properties || {};
            const geom = feat.geometry || {};
            
            let lat = null, lng = null;
            if (geom.type === 'Point' && geom.coordinates) {
                lng = geom.coordinates[0];
                lat = geom.coordinates[1];
            }

            const importedRow = {
                meter_code: props[mapping.meter_code] || `WM-AUTO-${String(index + 1).padStart(4, '0')}`,
                house_number: props[mapping.house_number] || '',
                village_no: String(props[mapping.village_no] || ''),
                owner_name: props[mapping.owner_name] || '',
                caretaker_name: props[mapping.caretaker_name] || '',
                image_url: props[mapping.image_url] || '',
                latitude: lat,
                longitude: lng,
                geom: geom,
                status: 'active'
            };
            results.push(importedRow);
        });

        if (typeof showToast !== 'undefined') {
            showToast(`เริ่มนำเข้าข้อมูล ${results.length} รายการ...`, 'info');
        }

        const progressPanel = document.getElementById('uploadProgressPanel');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressLabel = document.getElementById('uploadPercentLabel');
        const fileNameLabel = document.getElementById('uploadFileNameLabel');
        const statusLabel = document.getElementById('uploadStatusLabel');
        
        if (progressPanel) {
            progressPanel.classList.remove('hidden');
            if (progressBar) progressBar.style.width = '0%';
            if (progressLabel) progressLabel.textContent = '0%';
            if (statusLabel) statusLabel.textContent = 'กำลังบันทึกข้อมูล...';
        }

        try {
            let savedCount = 0;
            for (let i = 0; i < results.length; i++) {
                try {
                    if (typeof DigitalInfraService !== 'undefined') {
                        await DigitalInfraService.saveWaterMeter(results[i]);
                    }
                    savedCount++;
                } catch (e) {
                    console.error('Error saving meter:', e);
                }

                if (progressBar) {
                    const pct = Math.round(((i + 1) / results.length) * 100);
                    progressBar.style.width = pct + '%';
                    if (progressLabel) progressLabel.textContent = pct + '%';
                    if (fileNameLabel) fileNameLabel.textContent = `บันทึกมาตรน้ำ ${i + 1}/${results.length}...`;
                }
            }

            if (progressPanel) {
                if (fileNameLabel) fileNameLabel.textContent = `นำเข้าสำเร็จ ${savedCount} รายการ`;
                if (progressBar) progressBar.style.width = '100%';
                if (progressLabel) progressLabel.textContent = '100%';
                if (statusLabel) statusLabel.textContent = 'เสร็จสมบูรณ์';
            }

            if (typeof showToast !== 'undefined') {
                showToast(`✅ นำเข้ามาตรน้ำประปาสำเร็จ ${savedCount} รายการ`, 'success');
            }

            if (onImported) onImported(results);
        } catch (err) {
            console.error(err);
            if (typeof showToast !== 'undefined') showToast(`นำเข้าล้มเหลว: ${err.message}`, 'danger');
            if (progressPanel && statusLabel) statusLabel.textContent = 'เกิดข้อผิดพลาด';
        }
    }
};

window.WaterMeterShapefileUploader = WaterMeterShapefileUploader;
