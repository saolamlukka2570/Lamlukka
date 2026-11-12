// assets/js/services/flood-service.js

const FloodService = {
    async getFloodStatus(paramLat = null, paramLon = null) {
        try {
            const lat = paramLat || 13.5283;
            const lon = paramLon || 99.8134;
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation&timezone=Asia%2FBangkok`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            const rain = data.current.precipitation;
            
            let status = 'normal';
            let statusText = 'สถานการณ์ปกติ';
            let description = 'ไม่มีพื้นที่น้ำท่วมขังในเขตเทศบาล';
            let colorClass = 'text-success';
            let bgClass = 'bg-success';
            let icon = 'fa-check';

            if (rain > 5 && rain <= 15) {
                status = 'warning';
                statusText = 'เฝ้าระวังน้ำท่วมขัง';
                description = 'ฝนตกต่อเนื่อง อาจมีน้ำท่วมขังรอการระบายบนผิวจราจร';
                colorClass = 'text-warning';
                bgClass = 'bg-warning text-dark';
                icon = 'fa-triangle-exclamation';
            } else if (rain > 15) {
                status = 'critical';
                statusText = 'เตือนภัยน้ำท่วม';
                description = 'ฝนตกหนักมาก เสี่ยงเกิดน้ำท่วมฉับพลันในพื้นที่ลุ่มต่ำ';
                colorClass = 'text-danger';
                bgClass = 'bg-danger text-white';
                icon = 'fa-house-flood-water';
            }

            return {
                status: status,
                statusText: statusText,
                description: description,
                affectedAreas: [],
                colorClass: colorClass,
                bgClass: bgClass,
                icon: icon,
                updatedAt: data.current.time,
                source: 'วิเคราะห์จากปริมาณฝน (Open-Meteo)'
            };
        } catch (error) {
            console.error("Error fetching flood status:", error);
            throw error;
        }
    }
};
