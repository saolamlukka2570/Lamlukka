// assets/js/services/air-quality-service.js

const AirQualityService = {
    async getCurrentAirQuality(paramLat = null, paramLon = null) {
        try {
            // Must fetch location from config (same as weather)
            // Using hardcoded for Ratchaburi if not provided by a global config
            const lat = paramLat || 13.5283;
            const lon = paramLon || 99.8134;
            const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi&timezone=Asia%2FBangkok`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            const current = data.current;
            const aqi = current.us_aqi;
            const pm25 = current.pm2_5;
            
            let levelText = 'คุณภาพอากาศดี';
            let recommendation = 'ประชาชนทั่วไปสามารถทำกิจกรรมกลางแจ้งได้ตามปกติ';
            let colorClass = 'text-success';
            let bgClass = 'bg-success';
            let icon = 'fa-face-smile';
            
            if (aqi > 50 && aqi <= 100) {
                levelText = 'คุณภาพอากาศปานกลาง';
                recommendation = 'ผู้ที่ไวต่อมลพิษควรลดระยะเวลาการทำกิจกรรมกลางแจ้ง';
                colorClass = 'text-warning';
                bgClass = 'bg-warning text-dark';
                icon = 'fa-face-meh';
            } else if (aqi > 100 && aqi <= 150) {
                levelText = 'เริ่มมีผลกระทบต่อสุขภาพ';
                recommendation = 'ควรลดระยะเวลาการทำกิจกรรมกลางแจ้ง และสวมหน้ากากอนามัย';
                colorClass = 'text-orange'; // might need custom css, fallback to warning
                bgClass = 'bg-warning text-dark'; 
                icon = 'fa-face-frown';
            } else if (aqi > 150) {
                levelText = 'มีผลกระทบต่อสุขภาพ';
                recommendation = 'งดกิจกรรมกลางแจ้งทุกชนิด สวมหน้ากาก N95 เมื่อออกนอกบ้าน';
                colorClass = 'text-danger';
                bgClass = 'bg-danger text-white';
                icon = 'fa-head-side-mask';
            }

            return {
                pm25: pm25,
                aqi: aqi,
                levelText: levelText,
                recommendation: recommendation,
                colorClass: colorClass,
                bgClass: bgClass,
                icon: icon,
                stationName: 'สถานีตรวจวัด ราชบุรี',
                updatedAt: current.time,
                source: 'Open-Meteo AQI'
            };
        } catch (error) {
            console.error("Error fetching air quality:", error);
            throw error;
        }
    }
};
