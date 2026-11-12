const fs = require('fs');

const filePath = 'e:/ANTIGRAVITY/Smart governance/digital-infrastructure-map.html';
let content = fs.readFileSync(filePath, 'utf8');

// Target the Road Color Legend wrapper's closing tag to append the new legend
const targetLegend = `                        <div class="d-flex align-items-center gap-2">
                            <span style="display:inline-block;width:24px;height:4px;border-radius:2px;background:#8b5cf6;"></span>
                            <span>อื่นๆ</span>
                        </div>
                    </div>
                </div>`;

const replacementLegend = `                        <div class="d-flex align-items-center gap-2">
                            <span style="display:inline-block;width:24px;height:4px;border-radius:2px;background:#8b5cf6;"></span>
                            <span>อื่นๆ</span>
                        </div>
                    </div>
                </div>
                
                <!-- Boundary & Marker Legend -->
                <div class="border-t pt-3 mt-3">
                    <h6 class="font-bold text-slate-800 text-xs mb-2"><i class="fa-solid fa-map-location-dot text-indigo-600 me-1"></i> คำอธิบายสัญลักษณ์แนวเขต/หมุด</h6>
                    <div class="space-y-1.5 text-[11px] text-slate-600">
                        <div class="d-flex align-items-center gap-2">
                            <span style="display:inline-block;width:24px;height:4px;background:#facc15;border-radius:2px;border:0.5px dashed #ca8a04;"></span>
                            <span>แนวเขตตำบล (เส้นปะเหลืองทอง)</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span style="display:inline-block;width:24px;height:3px;background:#ef4444;border-radius:2.5px;border:0.5px dashed #b91c1c;"></span>
                            <span>ขอบเขตปกครองหมู่บ้าน (เส้นปะแดง)</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#facc15;border:1.5px solid #ffffff;box-shadow: 0 0 4px rgba(0,0,0,0.3);"></span>
                            <span>หมุดหลักเขตตำบล (วงแหวนเหลืองทอง)</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;border:1.5px solid #ffffff;box-shadow: 0 0 4px rgba(0,0,0,0.3);"></span>
                            <span>หมุดหลักเขตหมู่บ้าน (วงแหวนแดงเรืองแสง)</span>
                        </div>
                    </div>
                </div>`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTargetLegend = targetLegend.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTargetLegend)) {
    content = normalizedContent.replace(normalizedTargetLegend, replacementLegend);
    console.log("Successfully added Boundary & Marker Legend!");
} else {
    console.error("Could not find Target Legend insertion point!");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved successfully!");
