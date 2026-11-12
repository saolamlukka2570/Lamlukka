const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    {
        name: 'roads',
        path: 'e:/ANTIGRAVITY/Smart governance/digital-infrastructure-roads.html',
        cssTarget: `        #digitizeMap {
            border: 1px solid #cbd5e1;
        }`,
        htmlTarget: `                        <!-- Map Container inside Modal -->
                        <div class="col-12">
                            <div id="digitizeMap" style="height: 280px; width: 100%; border-radius: 8px; display: none; z-index: 10;"></div>
                        </div>`,
        htmlReplacement: `                        <!-- Map Container inside Modal -->
                        <div class="col-12">
                            <div class="position-relative">
                                <div id="digitizeMap" style="height: 280px; width: 100%; border-radius: 8px; display: none; z-index: 10;"></div>
                                <button type="button" id="btnMapFullscreen" class="btn btn-light shadow-sm border" style="position: absolute; top: 80px; left: 10px; z-index: 1050; width: 34px; height: 34px; border-radius: 4px; display: none; align-items: center; justify-content: center; padding: 0;" onclick="toggleMapFullscreen()" title="ย่อ-ขยายแผนที่เต็มหน้าจอ">
                                    <i class="fa-solid fa-expand text-slate-700 text-sm"></i>
                                </button>
                            </div>
                        </div>`,
        jsTarget: `    function initDigitizeMap() {`,
        jsReplacement: `    function toggleMapFullscreen() {
        const mapDiv = document.getElementById('digitizeMap');
        const icon = document.querySelector('#btnMapFullscreen i');
        
        if (mapDiv.classList.contains('fullscreen-map')) {
            mapDiv.classList.remove('fullscreen-map');
            if (icon) {
                icon.className = 'fa-solid fa-expand text-slate-700 text-sm';
            }
            if (typeof showToast !== 'undefined') {
                showToast('ย่อขนาดแผนที่กลับสู่ฟอร์มปกติ', 'info');
            }
        } else {
            mapDiv.classList.add('fullscreen-map');
            if (icon) {
                icon.className = 'fa-solid fa-compress text-slate-700 text-sm';
            }
            if (typeof showToast !== 'undefined') {
                showToast('ขยายแผนที่เต็มหน้าจอเพื่อสะดวกในการวาดแนวเส้นทาง', 'info');
            }
        }
        
        setTimeout(() => {
            if (digitizeMapInstance) {
                digitizeMapInstance.invalidateSize();
            }
        }, 100);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const mapDiv = document.getElementById('digitizeMap');
            if (mapDiv && mapDiv.classList.contains('fullscreen-map')) {
                toggleMapFullscreen();
            }
        }
    });

    function initDigitizeMap() {`,
        visibilityHooks: [
            {
                target: `            mapDiv.style.display = 'block';
            controlsDiv.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i> 🗺️ ย่อขนาด/ซ่อนแผนที่วาดแนว';`,
                replacement: `            mapDiv.style.display = 'block';
            controlsDiv.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i> 🗺️ ย่อขนาด/ซ่อนแผนที่วาดแนว';
            const fsBtn = document.getElementById('btnMapFullscreen');
            if (fsBtn) fsBtn.style.display = 'flex';`
            },
            {
                target: `        } else {
            mapDiv.style.display = 'none';
            controlsDiv.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i> 🗺️ เปิดระบบวาดแนวเส้นทางถนนบนแผนที่ดาวเทียม (Digitize Path)';`,
                replacement: `        } else {
            mapDiv.style.display = 'none';
            controlsDiv.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i> 🗺️ เปิดระบบวาดแนวเส้นทางถนนบนแผนที่ดาวเทียม (Digitize Path)';
            const fsBtn = document.getElementById('btnMapFullscreen');
            if (fsBtn) fsBtn.style.display = 'none';
            if (mapDiv.classList.contains('fullscreen-map')) {
                mapDiv.classList.remove('fullscreen-map');
                const icon = document.querySelector('#btnMapFullscreen i');
                if (icon) icon.className = 'fa-solid fa-expand text-slate-700 text-sm';
            }`
            },
            {
                target: `        document.getElementById('digitizeMap').style.display = 'none';
        document.getElementById('digitizeControls').style.display = 'none';
        document.getElementById('digitizeSuccessBadge').style.display = 'none';`,
                replacement: `        document.getElementById('digitizeMap').style.display = 'none';
        document.getElementById('digitizeControls').style.display = 'none';
        document.getElementById('digitizeSuccessBadge').style.display = 'none';
        const fsBtn = document.getElementById('btnMapFullscreen');
        if (fsBtn) fsBtn.style.display = 'none';
        const mapDiv = document.getElementById('digitizeMap');
        if (mapDiv && mapDiv.classList.contains('fullscreen-map')) {
            mapDiv.classList.remove('fullscreen-map');
            const icon = document.querySelector('#btnMapFullscreen i');
            if (icon) icon.className = 'fa-solid fa-expand text-slate-700 text-sm';
        }`
            },
            {
                target: `        // แสดงแผนที่ดาวเทียมและเครื่องมือจัดการแนวพิกัดทันทีในโหมดแก้ไข
        document.getElementById('digitizeMap').style.display = 'block';
        document.getElementById('digitizeControls').style.display = 'block';
        document.getElementById('digitizeSuccessBadge').style.display = 'none';`,
                replacement: `        // แสดงแผนที่ดาวเทียมและเครื่องมือจัดการแนวพิกัดทันทีในโหมดแก้ไข
        document.getElementById('digitizeMap').style.display = 'block';
        document.getElementById('digitizeControls').style.display = 'block';
        document.getElementById('digitizeSuccessBadge').style.display = 'none';
        const fsBtn = document.getElementById('btnMapFullscreen');
        if (fsBtn) fsBtn.style.display = 'flex';`
            }
        ]
    },
    {
        name: 'public-land',
        path: 'e:/ANTIGRAVITY/Smart governance/digital-infrastructure-public-land.html',
        cssTarget: `        #digitizeMap {
            border: 1px solid #cbd5e1;
        }`,
        htmlTarget: `                        <!-- แผนที่ดาวเทียม Leaflet -->
                        <div id="digitizeMap" class="w-100 h-100"></div>`,
        htmlReplacement: `                        <!-- แผนที่ดาวเทียม Leaflet -->
                        <div id="digitizeMap" class="w-100 h-100"></div>
                        <button type="button" id="btnMapFullscreen" class="btn btn-light shadow-sm border" style="position: absolute; top: 80px; left: 10px; z-index: 1050; width: 34px; height: 34px; border-radius: 4px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="toggleMapFullscreen()" title="ย่อ-ขยายแผนที่เต็มหน้าจอ">
                            <i class="fa-solid fa-expand text-slate-700 text-sm"></i>
                        </button>`,
        jsTarget: `    function initDigitizeMap() {`,
        jsReplacement: `    function toggleMapFullscreen() {
        const mapDiv = document.getElementById('digitizeMap');
        const icon = document.querySelector('#btnMapFullscreen i');
        
        if (mapDiv.classList.contains('fullscreen-map')) {
            mapDiv.classList.remove('fullscreen-map');
            if (icon) {
                icon.className = 'fa-solid fa-expand text-slate-700 text-sm';
            }
            if (typeof showToast !== 'undefined') {
                showToast('ย่อขนาดแผนที่กลับสู่ฟอร์มปกติ', 'info');
            }
        } else {
            mapDiv.classList.add('fullscreen-map');
            if (icon) {
                icon.className = 'fa-solid fa-compress text-slate-700 text-sm';
            }
            if (typeof showToast !== 'undefined') {
                showToast('ขยายแผนที่เต็มหน้าจอเพื่อสะดวกในการวาดแนวเส้นทาง', 'info');
            }
        }
        
        setTimeout(() => {
            if (digitizeMapInstance) {
                digitizeMapInstance.invalidateSize();
            }
        }, 100);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const mapDiv = document.getElementById('digitizeMap');
            if (mapDiv && mapDiv.classList.contains('fullscreen-map')) {
                toggleMapFullscreen();
            }
        }
    });

    function initDigitizeMap() {`,
        visibilityHooks: []
    },
    {
        name: 'water',
        path: 'e:/ANTIGRAVITY/Smart governance/digital-infrastructure-water.html',
        cssTarget: `        #digitizeMap {
            border: 1px solid #cbd5e1;
        }`,
        htmlTarget: `                        <!-- แผนที่ดาวเทียม Leaflet -->
                        <div id="digitizeMap" class="w-100 h-100"></div>`,
        htmlReplacement: `                        <!-- แผนที่ดาวเทียม Leaflet -->
                        <div id="digitizeMap" class="w-100 h-100"></div>
                        <button type="button" id="btnMapFullscreen" class="btn btn-light shadow-sm border" style="position: absolute; top: 80px; left: 10px; z-index: 1050; width: 34px; height: 34px; border-radius: 4px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="toggleMapFullscreen()" title="ย่อ-ขยายแผนที่เต็มหน้าจอ">
                            <i class="fa-solid fa-expand text-slate-700 text-sm"></i>
                        </button>`,
        jsTarget: `    function initDigitizeMap() {`,
        jsReplacement: `    function toggleMapFullscreen() {
        const mapDiv = document.getElementById('digitizeMap');
        const icon = document.querySelector('#btnMapFullscreen i');
        
        if (mapDiv.classList.contains('fullscreen-map')) {
            mapDiv.classList.remove('fullscreen-map');
            if (icon) {
                icon.className = 'fa-solid fa-expand text-slate-700 text-sm';
            }
            if (typeof showToast !== 'undefined') {
                showToast('ย่อขนาดแผนที่กลับสู่ฟอร์มปกติ', 'info');
            }
        } else {
            mapDiv.classList.add('fullscreen-map');
            if (icon) {
                icon.className = 'fa-solid fa-compress text-slate-700 text-sm';
            }
            if (typeof showToast !== 'undefined') {
                showToast('ขยายแผนที่เต็มหน้าจอเพื่อสะดวกในการวาดแนวเส้นทาง', 'info');
            }
        }
        
        setTimeout(() => {
            if (digitizeMapInstance) {
                digitizeMapInstance.invalidateSize();
            }
        }, 100);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const mapDiv = document.getElementById('digitizeMap');
            if (mapDiv && mapDiv.classList.contains('fullscreen-map')) {
                toggleMapFullscreen();
            }
        }
    });

    function initDigitizeMap() {`,
        visibilityHooks: []
    }
];

const cssTemplate = `        #digitizeMap {
            border: 1px solid #cbd5e1;
        }
        /* Fullscreen Map Styles */
        .fullscreen-map {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            border-radius: 0 !important;
            margin: 0 !important;
        }
        #btnMapFullscreen {
            transition: all 0.2s ease;
        }
        #btnMapFullscreen:hover {
            background-color: #f1f5f9 !important;
            transform: scale(1.05);
        }`;

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file.path, 'utf8');
    
    // Normalize content
    content = content.replace(/\r\n/g, '\n');
    
    // 1. Replace CSS
    const normCssTarget = file.cssTarget.replace(/\r\n/g, '\n');
    if (content.includes(normCssTarget)) {
        content = content.replace(normCssTarget, cssTemplate);
        console.log(`[${file.name}] Successfully injected CSS styles!`);
    } else {
        console.warn(`[${file.name}] Could not find CSS target!`);
    }
    
    // 2. Replace HTML Map Container (with button injection)
    const normHtmlTarget = file.htmlTarget.replace(/\r\n/g, '\n');
    const normHtmlReplacement = file.htmlReplacement.replace(/\r\n/g, '\n');
    if (content.includes(normHtmlTarget)) {
        content = content.replace(normHtmlTarget, normHtmlReplacement);
        console.log(`[${file.name}] Successfully injected HTML fullscreen button!`);
    } else {
        console.warn(`[${file.name}] Could not find HTML target!`);
    }
    
    // 3. Replace JS initialization functions
    const normJsTarget = file.jsTarget.replace(/\r\n/g, '\n');
    const normJsReplacement = file.jsReplacement.replace(/\r\n/g, '\n');
    if (content.includes(normJsTarget)) {
        content = content.replace(normJsTarget, normJsReplacement);
        console.log(`[${file.name}] Successfully injected JS fullscreen functions!`);
    } else {
        console.warn(`[${file.name}] Could not find JS target!`);
    }
    
    // 4. Apply visibility hooks if any (specifically for roads page where map displays dynamically)
    if (file.visibilityHooks && file.visibilityHooks.length > 0) {
        file.visibilityHooks.forEach((hook, i) => {
            const normHookTarget = hook.target.replace(/\r\n/g, '\n');
            const normHookReplacement = hook.replacement.replace(/\r\n/g, '\n');
            if (content.includes(normHookTarget)) {
                content = content.replace(normHookTarget, normHookReplacement);
                console.log(`[${file.name}] Applied visibility hook ${i + 1}!`);
            } else {
                console.warn(`[${file.name}] Could not apply visibility hook ${i + 1}!`);
            }
        });
    }
    
    // Write changes back to the file
    fs.writeFileSync(file.path, content, 'utf8');
    console.log(`[${file.name}] File written successfully!\n`);
});
