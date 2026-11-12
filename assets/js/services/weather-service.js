// assets/js/services/weather-service.js

const WeatherService = {
    // Configuration for the municipality
    config: {
        province: 'ราชบุรี',
        district: 'เมืองราชบุรี',
        subdistrict: 'พลับพลาไชย',
        lat: 13.5283,
        lon: 99.8134
    },

    async getCurrentWeather(lat = null, lon = null) {
        try {
            const latitude = lat || this.config.lat;
            const longitude = lon || this.config.lon;
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok&forecast_days=4`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            const current = data.current;
            const daily = data.daily;
            
            // Map WMO Weather Codes to text and icons
            const wmoMap = this.getWmoDetails(current.weather_code);
            
            // Map forecast
            const forecast = [];
            for (let i = 1; i <= 3; i++) {
                const dateObj = new Date(daily.time[i]);
                const dayName = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
                const fWmoMap = this.getWmoDetails(daily.weather_code[i]);
                
                forecast.push({
                    day: dayName,
                    maxTemp: Math.round(daily.temperature_2m_max[i]),
                    minTemp: Math.round(daily.temperature_2m_min[i]),
                    icon: fWmoMap.icon,
                    color: fWmoMap.color
                });
            }

            return {
                temp: Math.round(current.temperature_2m),
                condition: wmoMap.condition,
                humidity: current.relative_humidity_2m,
                windSpeed: current.wind_speed_10m,
                rainVolume: current.precipitation,
                rainChance: current.precipitation > 0 ? 100 : 0, // Simplify for now
                icon: wmoMap.icon,
                color: wmoMap.color,
                updatedAt: current.time,
                forecast: forecast,
                source: 'Open-Meteo'
            };

        } catch (error) {
            console.error("Error fetching weather:", error);
            throw error;
        }
    },
    
    getWmoDetails(code) {
        // WMO Weather interpretation codes (WW)
        if (code === 0) return { condition: 'ท้องฟ้าแจ่มใส', icon: 'fa-sun', color: '#f59e0b' };
        if (code === 1 || code === 2 || code === 3) return { condition: 'มีเมฆบางส่วนถึงเมฆมาก', icon: 'fa-cloud-sun', color: '#64748b' };
        if (code === 45 || code === 48) return { condition: 'มีหมอก', icon: 'fa-smog', color: '#94a3b8' };
        if (code >= 51 && code <= 55) return { condition: 'ฝนปรอยๆ', icon: 'fa-cloud-rain', color: '#3b82f6' };
        if (code >= 61 && code <= 65) return { condition: 'ฝนตก', icon: 'fa-cloud-showers-heavy', color: '#2563eb' };
        if (code >= 71 && code <= 77) return { condition: 'หิมะตก (ไม่น่าเป็นไปได้)', icon: 'fa-snowflake', color: '#93c5fd' };
        if (code >= 80 && code <= 82) return { condition: 'ฝนตกหนัก', icon: 'fa-cloud-showers-water', color: '#1d4ed8' };
        if (code >= 95) return { condition: 'พายุฝนฟ้าคะนอง', icon: 'fa-cloud-bolt', color: '#b91c1c' };
        return { condition: 'ไม่ทราบสภาพอากาศ', icon: 'fa-cloud', color: '#64748b' };
    }
};
