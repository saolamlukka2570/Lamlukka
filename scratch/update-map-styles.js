const fs = require('fs');

const filePath = 'e:/ANTIGRAVITY/Smart governance/digital-infrastructure-map.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject CSS classes inside <style> tag
const targetCssPlace = `.custom-infra-popup {
            font-family: 'Prompt', sans-serif;
            min-width: 250px;
        }`;

const replacementCss = `.custom-infra-popup {
            font-family: 'Prompt', sans-serif;
            min-width: 250px;
        }
        /* Custom Survey Marker Styles */
        .survey-marker-container {
            position: relative;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .survey-marker-pulse {
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            opacity: 0.6;
            animation: survey-marker-pulse 2s infinite ease-out;
            pointer-events: none;
        }
        .survey-marker-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 10px rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .survey-marker-inner {
            width: 5px;
            height: 5px;
            background-color: #ffffff;
            border-radius: 50%;
        }
        @keyframes survey-marker-pulse {
            0% {
                transform: scale(0.4);
                opacity: 1;
            }
            100% {
                transform: scale(2.4);
                opacity: 0;
            }
        }`;

// Normalize line endings for replacement
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTargetCss = targetCssPlace.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTargetCss)) {
    content = normalizedContent.replace(normalizedTargetCss, replacementCss);
    console.log("Successfully injected CSS!");
} else {
    console.error("Could not find Target CSS injection point!");
}

// 2. Replace boundary styling logic (Yellow subdistrict dashed line + Red village dashed line)
const targetBoundaryStyle = `                        // แยกสไตล์สี: ตำบลสีม่วง หมู่บ้านสีเขียวมรกต
                        const style = b.boundary_type === 'แนวเขตตำบล' ? 
                            { color: '#8b5cf6', fillColor: '#c084fc', fillOpacity: 0.15, weight: 3, dashArray: '8, 8' } :
                            { color: '#10b981', fillColor: '#34d399', fillOpacity: 0.10, weight: 2, dashArray: '5, 5' };`;

const replacementBoundaryStyle = `                        // แยกสไตล์สี: ตำบลสีเหลืองประเส้นใหญ่ขึ้น หมู่บ้านสีแดงประหนาปานกลาง
                        const style = b.boundary_type === 'แนวเขตตำบล' ? 
                            { color: '#facc15', fillColor: '#fef08a', fillOpacity: 0.15, weight: 5, dashArray: '12, 10' } :
                            { color: '#ef4444', fillColor: '#fee2e2', fillOpacity: 0.10, weight: 3.5, dashArray: '6, 6' };`;

const currentContent2 = content.replace(/\r\n/g, '\n');
const normalizedTargetBoundaryStyle = targetBoundaryStyle.replace(/\r\n/g, '\n');

if (currentContent2.includes(normalizedTargetBoundaryStyle)) {
    content = currentContent2.replace(normalizedTargetBoundaryStyle, replacementBoundaryStyle);
    console.log("Successfully replaced Boundary styles!");
} else {
    console.error("Could not find Target Boundary styling block!");
}

// 3. Replace marker styling logic with premium custom survey DivIcon
const targetMarkerStyle = `                dbMarkers.forEach(bm => {
                    let lat = bm.latitude;
                    let lng = bm.longitude;
                    if (!lat || !lng) return;

                    // สไตล์สัญวิทยาหมุดหลักเขต
                    const markerStyle = {
                        color: bm.marker_type.includes('ตำบล') ? '#7c3aed' : '#059669',
                        fillColor: '#ffffff',
                        fillOpacity: 1,
                        radius: 7,
                        weight: 2
                    };

                    const marker = L.circleMarker([lat, lng], markerStyle);`;

const replacementMarkerStyle = `                dbMarkers.forEach(bm => {
                    let lat = bm.latitude;
                    let lng = bm.longitude;
                    if (!lat || !lng) return;

                    // สีหมุดหลักเขตตามประเภท: สีเหลืองทองสำหรับตำบล สีแดงสดสำหรับหมู่บ้าน
                    const markerColor = bm.marker_type.includes('ตำบล') ? '#facc15' : '#ef4444';
                    
                    // สร้าง DivIcon หมุดหลักเขตพร้อมเอฟเฟกต์วงแหวนเรืองแสงและหัวหมุดสะท้อนแสง
                    const customDivIcon = L.divIcon({
                        className: 'custom-survey-marker',
                        html: \`
                            <div class="survey-marker-container">
                                <div class="survey-marker-pulse" style="background-color: \${markerColor};"></div>
                                <div class="survey-marker-dot" style="background-color: \${markerColor};" title="\${bm.marker_code}: \${bm.marker_type}">
                                    <div class="survey-marker-inner"></div>
                                </div>
                            </div>
                        \`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });

                    const marker = L.marker([lat, lng], { icon: customDivIcon });`;

const currentContent3 = content.replace(/\r\n/g, '\n');
const normalizedTargetMarkerStyle = targetMarkerStyle.replace(/\r\n/g, '\n');

if (currentContent3.includes(normalizedTargetMarkerStyle)) {
    content = currentContent3.replace(normalizedTargetMarkerStyle, replacementMarkerStyle);
    console.log("Successfully replaced Marker styles!");
} else {
    console.error("Could not find Target Marker styling block!");
}

// Save back to file
fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved successfully!");
