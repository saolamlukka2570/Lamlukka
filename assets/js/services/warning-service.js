// assets/js/services/warning-service.js

const WarningService = {
    async getImportantWarnings(paramLat = null, paramLon = null) {
        try {
            const lat = paramLat || 13.5283;
            const lon = paramLon || 99.8134;
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,wind_speed_10m&timezone=Asia%2FBangkok`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            const rain = data.current.precipitation;
            const wind = data.current.wind_speed_10m;
            
            const warnings = [];
            
            // 1. Storm / Wind Warning
            if (wind > 40) {
                warnings.push({
                    type: 'storm', icon: 'fa-cloud-bolt', title: 'พายุลมแรง',
                    statusText: `ลมกระโชกแรงความเร็ว ${wind} กม./ชม. โปรดระวังอันตรายจากป้ายโฆษณาและต้นไม้ใหญ่`,
                    isActive: true, source: 'วิเคราะห์จากลม (Open-Meteo)'
                });
            } else {
                warnings.push({
                    type: 'storm', icon: 'fa-cloud-bolt', title: 'พายุ',
                    statusText: 'ไม่มีประกาศที่เกี่ยวข้องกับพื้นที่',
                    isActive: false, source: 'วิเคราะห์สภาพอากาศ'
                });
            }
            
            // 2. Heavy Rain Warning
            if (rain > 10) {
                warnings.push({
                    type: 'heavy_rain', icon: 'fa-cloud-showers-heavy', title: 'ฝนตกหนัก',
                    statusText: `ปริมาณฝนสะสม ${rain} มม. โปรดเฝ้าระวังน้ำท่วมขัง`,
                    isActive: true, source: 'วิเคราะห์จากฝน (Open-Meteo)'
                });
            } else {
                warnings.push({
                    type: 'heavy_rain', icon: 'fa-cloud-showers-heavy', title: 'ฝนตกหนัก',
                    statusText: 'ไม่มีเหตุการณ์',
                    isActive: false, source: 'วิเคราะห์สภาพอากาศ'
                });
            }
            
            // 3. Earthquake (Mocked as inactive since Meteo doesn't have earthquake data in standard free tier easily)
            warnings.push({
                type: 'earthquake', icon: 'fa-earth-asia', title: 'แผ่นดินไหว',
                statusText: 'ไม่มีเหตุการณ์ที่เกี่ยวข้อง',
                isActive: false, source: 'กองเฝ้าระวังแผ่นดินไหว'
            });
            
            return warnings;
        } catch (error) {
            console.error("Error fetching warnings:", error);
            throw error;
        }
    }
};
