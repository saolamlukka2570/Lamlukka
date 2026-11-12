const fs = require('fs');
const path = require('path');

const filePath = 'e:/ANTIGRAVITY/Smart governance/digital-infrastructure-map.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert URL Focus Check Logic and close the repairs.forEach loop
const targetFocus = `                layers.repairs.addLayer(marker);
            
        } catch(e) {`;

const targetFocusAlt = `                layers.repairs.addLayer(marker);

        } catch(e) {`;

const replacementFocus = `                layers.repairs.addLayer(marker);
            });

            // Check URL focus parameters
            const urlParams = new URLSearchParams(window.location.search);
            const focusType = urlParams.get('focus');
            const focusId = urlParams.get('id');

            if (focusType && focusId) {
                console.log(\`Focusing map on \${focusType} with ID: \${focusId}\`);
                let targetLayer = null;
                let targetGroupKey = null;

                // ค้นหา Layer ใน FeatureGroups
                Object.entries(layers).forEach(([groupKey, group]) => {
                    group.eachLayer(layer => {
                        let match = false;
                        if (layer.options && layer.options.customId === focusId && (layer.options.customType === focusType || focusType === 'boundary' || focusType === 'marker')) {
                            match = true;
                        }
                        
                        if (match) {
                            targetLayer = layer;
                            targetGroupKey = groupKey;
                        } else if (layer.eachLayer) {
                            layer.eachLayer(subLayer => {
                                if (subLayer.options && subLayer.options.customId === focusId) {
                                    targetLayer = subLayer;
                                    targetGroupKey = groupKey;
                                }
                            });
                        }
                    });
                });

                if (targetLayer && targetGroupKey) {
                    // หากปิดฟิลเตอร์ชั้นนี้ ให้สั่งเปิดอัตโนมัติ
                    const checkboxId = 'layer' + targetGroupKey.charAt(0).toUpperCase() + targetGroupKey.slice(1);
                    const checkbox = document.getElementById(checkboxId);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        activeFilters[targetGroupKey] = true;
                        map.addLayer(layers[targetGroupKey]);
                    }

                    if (targetLayer.getBounds) {
                        // แปลงรูปปิดโพลีกอน/เส้นขอบเขต
                        map.fitBounds(targetLayer.getBounds(), { padding: [50, 50] });
                        setTimeout(() => targetLayer.openPopup(), 600);
                    } else if (targetLayer.getLatLng) {
                        // หลักหมุดจุดพิกัดภูมิศาสตร์
                        map.setView(targetLayer.getLatLng(), 16);
                        setTimeout(() => targetLayer.openPopup(), 600);
                    }
                } else {
                    fitMapBounds();
                }
            } else {
                fitMapBounds();
            }
        } catch(e) {`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTargetFocus = targetFocus.replace(/\r\n/g, '\n');
const normalizedTargetFocusAlt = targetFocusAlt.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTargetFocus)) {
    content = normalizedContent.replace(normalizedTargetFocus, replacementFocus);
    console.log("Successfully replaced URL Focus Check Logic (Primary)!");
} else if (normalizedContent.includes(normalizedTargetFocusAlt)) {
    content = normalizedContent.replace(normalizedTargetFocusAlt, replacementFocus);
    console.log("Successfully replaced URL Focus Check Logic (Alternative)!");
} else {
    // Let's do a fallback replace searching for `layers.repairs.addLayer(marker);` and the `catch`
    const searchStr = `                layers.repairs.addLayer(marker);`;
    const catchStr = `        } catch(e) {`;
    const searchIdx = normalizedContent.indexOf(searchStr);
    const catchIdx = normalizedContent.indexOf(catchStr, searchIdx);
    if (searchIdx !== -1 && catchIdx !== -1) {
        const textBefore = normalizedContent.substring(0, searchIdx + searchStr.length);
        const textAfter = normalizedContent.substring(catchIdx);
        content = textBefore + "\n            });\n\n" + replacementFocus.split("\n").slice(2).join("\n");
        console.log("Successfully replaced URL Focus Check Logic (Index boundary fallback)!");
    } else {
        console.error("Could not find Target Focus string via index fallback!");
    }
}

// Write the repaired content back
fs.writeFileSync(filePath, content, 'utf8');
console.log("Map HTML successfully written!");
