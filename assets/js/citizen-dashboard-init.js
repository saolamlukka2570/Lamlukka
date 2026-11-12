// assets/js/citizen-dashboard-init.js

document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to get user's current location, fallback to default (Ratchaburi) if denied/error
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                loadDashboardData(lat, lon);
            },
            (error) => {
                console.warn("Geolocation denied or error, using default location.");
                loadDashboardData(13.5283, 99.8134); // Default: Ratchaburi
            },
            { timeout: 10000 }
        );
    } else {
        loadDashboardData(13.5283, 99.8134);
    }
});

async function loadDashboardData(lat, lon) {
    updateLocationText(lat, lon);
    initWeather(lat, lon);
    initAirQuality(lat, lon);
    initFlood(lat, lon);
    initWarnings(lat, lon);
    initNews();
    initAlerts();
}

async function updateLocationText(lat, lon) {
    const el = document.getElementById('userLocationText');
    if (!el) return;
    
    try {
        // Try Nominatim first for more detailed Thai address (Tambon, Amphoe, Province)
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=th`;
        const nomRes = await fetch(nomUrl, {
            headers: { 'Accept-Language': 'th' }
        });
        
        if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.address) {
                const addr = nomData.address;
                let parts = [];
                // Nominatim mapping for Thailand
                const tambon = addr.suburb || addr.town || addr.village;
                const amphoe = addr.city || addr.county || addr.city_district;
                const province = addr.state || addr.province;
                
                if (tambon) parts.push(tambon.startsWith('ต.') || tambon.startsWith('แขวง') ? tambon : `ต.${tambon}`);
                if (amphoe) parts.push(amphoe.startsWith('อ.') || amphoe.startsWith('เขต') ? amphoe : `อ.${amphoe}`);
                if (province) parts.push(province.startsWith('จ.') || province.startsWith('กรุงเทพ') ? province : `จ.${province}`);
                
                if (parts.length > 0) {
                    el.textContent = parts.join(' ');
                    return;
                }
            }
        }
        
        // Fallback to BigDataCloud
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`;
        const bdcRes = await fetch(bdcUrl);
        if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            let parts = [];
            if (bdcData.locality && !bdcData.locality.includes('จ.')) parts.push(bdcData.locality);
            else if (bdcData.city) parts.push(bdcData.city);
            if (bdcData.principalSubdivision) parts.push(bdcData.principalSubdivision);
            
            if (parts.length > 0) {
                el.textContent = parts.join(', ');
                return;
            }
        }
        
        el.textContent = 'ระบุตำแหน่งได้สำเร็จ แต่ไม่พบชื่อสถานที่';
        
    } catch (e) {
        console.error("Geocoding error:", e);
        el.textContent = 'พิกัด: ' + lat.toFixed(4) + ', ' + lon.toFixed(4);
    }
}

async function initWeather(lat, lon) {
    try {
        const w = await WeatherService.getCurrentWeather(lat, lon);
        document.getElementById('weatherIcon').innerHTML = `<i class="fa-solid ${w.icon}"></i>`;
        document.getElementById('weatherIcon').style.color = w.color;
        document.getElementById('weatherTemp').textContent = `${w.temp}°C`;
        document.getElementById('weatherCond').textContent = w.condition;
        document.getElementById('weatherHumid').textContent = `${w.humidity}%`;
        document.getElementById('weatherWind').textContent = `${w.windSpeed} km/h`;
        document.getElementById('weatherRain').textContent = `${w.rainVolume} mm`;
        document.getElementById('weatherSource').textContent = `แหล่งข้อมูล: ${w.source}`;
        
        // Render 3-Day Forecast
        const forecastContainer = document.getElementById('weatherForecastContainer');
        if (forecastContainer && w.forecast && w.forecast.length > 0) {
            forecastContainer.innerHTML = '';
            w.forecast.forEach(f => {
                const item = document.createElement('div');
                item.className = 'd-flex flex-column align-items-center';
                item.innerHTML = `
                    <div class="fw-bold mb-1" style="font-size: 0.85rem;">${f.day}</div>
                    <i class="fa-solid ${f.icon} mb-1" style="color: ${f.color}; font-size: 1.2rem;"></i>
                    <div style="font-size: 0.8rem;"><span class="text-danger">${f.maxTemp}°</span> <span class="text-muted">${f.minTemp}°</span></div>
                `;
                forecastContainer.appendChild(item);
            });
        }
        
        const timeStr = new Date(w.updatedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
        document.getElementById('weatherTime').textContent = timeStr;
    } catch (e) {
        document.getElementById('weatherCond').textContent = 'ไม่สามารถดึงข้อมูลได้';
    }
}

async function initAirQuality(lat, lon) {
    try {
        const a = await AirQualityService.getCurrentAirQuality(lat, lon);
        document.getElementById('pm25Val').textContent = a.pm25;
        document.getElementById('aqiVal').textContent = a.aqi;
        document.getElementById('aqiLevel').textContent = a.levelText;
        document.getElementById('aqiLevel').className = `fw-bold ${a.colorClass}`;
        document.getElementById('aqiRec').textContent = a.recommendation;
        
        const badge = document.getElementById('aqiBadge');
        badge.className = `text-center rounded px-3 py-2 text-white ${a.bgClass}`;
        
        const timeStr = new Date(a.updatedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
        document.getElementById('aqiTime').textContent = timeStr;
        document.getElementById('aqiSource').textContent = `แหล่งข้อมูล: ${a.source}`;
    } catch (e) {
        document.getElementById('aqiLevel').textContent = 'ไม่สามารถดึงข้อมูลได้';
    }
}

async function initFlood(lat, lon) {
    try {
        const f = await FloodService.getFloodStatus(lat, lon);
        document.getElementById('floodStatus').textContent = f.statusText;
        document.getElementById('floodStatus').className = `fw-bold ${f.colorClass}`;
        document.getElementById('floodDesc').textContent = f.description;
        
        const icon = document.getElementById('floodIcon');
        icon.className = `service-icon bg-opacity-10 ${f.bgClass} ${f.colorClass}`;
        icon.innerHTML = `<i class="fa-solid ${f.icon}"></i>`;
        
        const timeStr = new Date(f.updatedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
        document.getElementById('floodTime').textContent = timeStr;
        document.getElementById('floodSource').textContent = `แหล่งข้อมูล: ${f.source}`;
    } catch (e) {
        document.getElementById('floodStatus').textContent = 'ไม่สามารถดึงข้อมูลได้';
    }
}

async function initWarnings(lat, lon) {
    try {
        const warnings = await WarningService.getImportantWarnings(lat, lon);
        const container = document.getElementById('warningList');
        
        if (warnings.length === 0) {
            container.innerHTML = '<div class="text-center text-muted text-sm my-3">ไม่มีสถานการณ์สำคัญในขณะนี้</div>';
            return;
        }
        
        let html = '';
        warnings.forEach(w => {
            const activeClass = w.isActive ? 'border-danger bg-danger bg-opacity-10' : 'border-light bg-light';
            const iconColor = w.isActive ? 'text-danger' : 'text-secondary';
            const titleColor = w.isActive ? 'text-danger fw-bold' : 'text-dark fw-semibold';
            
            html += `
            <div class="d-flex align-items-center gap-3 p-2 rounded border ${activeClass}">
                <div class="${iconColor}" style="width:24px; text-align:center;"><i class="fa-solid ${w.icon} fs-5"></i></div>
                <div>
                    <div class="${titleColor} text-sm">${w.title}</div>
                    <div class="text-xs text-muted">${w.statusText}</div>
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
    } catch (e) {
        document.getElementById('warningList').innerHTML = '<div class="text-center text-muted text-sm my-3">ไม่สามารถดึงข้อมูลได้</div>';
    }
}

async function initNews() {
    try {
        const news = await NewsService.getPublishedNews(null, 4);
        const container = document.getElementById('newsContainer');
        
        if (news.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-4">ไม่มีข่าวสารในขณะนี้</div>';
            return;
        }
        
        let html = '';
        news.forEach(n => {
            const dateStr = new Date(n.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
            html += `
            <div class="col-12 col-md-6 col-lg-3">
                <a href="news-detail.html?id=${n.id}" class="text-decoration-none text-dark">
                    <div class="card h-100 border-0 shadow-sm" style="border-radius:12px; overflow:hidden;">
                        <img src="${n.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'}" class="card-img-top" alt="News Image" style="height:140px; object-fit:cover;">
                        <div class="card-body p-3">
                            <span class="badge bg-primary bg-opacity-10 text-primary mb-2" style="font-size:0.7rem;">${n.category}</span>
                            <h6 class="fw-bold mb-2" style="font-size:0.9rem; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${n.title}</h6>
                            <p class="text-muted text-xs mb-3" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${n.summary || ''}</p>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                <span class="text-xs text-muted"><i class="fa-regular fa-clock me-1"></i>${dateStr}</span>
                                <span class="text-xs text-muted"><i class="fa-regular fa-eye me-1"></i>${n.view_count || 0}</span>
                            </div>
                        </div>
                    </div>
                </a>
            </div>`;
        });
        
        container.innerHTML = html;
    } catch (e) {
        document.getElementById('newsContainer').innerHTML = '<div class="col-12 text-center text-muted py-4">ไม่สามารถดึงข่าวสารได้</div>';
    }
}

async function initAlerts() {
    try {
        const alerts = await NewsService.getActiveAlerts();
        const container = document.getElementById('citizenAlertsContainer');
        const list = document.getElementById('alertsList');
        
        if (!alerts || alerts.length === 0) {
            container.style.display = 'none'; // ซ่อนถ้าไม่มีแจ้งเตือน
            return;
        }
        
        container.style.display = 'block';
        let html = '';
        
        alerts.forEach(a => {
            let bg = 'bg-primary';
            let icon = 'fa-circle-info';
            let border = 'border-primary';
            
            if (a.severity === 'WARNING') { bg = 'bg-warning text-dark'; icon = 'fa-triangle-exclamation'; border = 'border-warning'; }
            if (a.severity === 'DANGER') { bg = 'bg-danger text-white'; icon = 'fa-skull-crossbones'; border = 'border-danger'; }
            if (a.severity === 'CRITICAL') { bg = 'bg-dark text-white'; icon = 'fa-radiation'; border = 'border-dark'; }
            
            html += `
            <div class="alert ${bg} bg-opacity-10 border border-start-0 border-end-0 border-top-0 ${border} mb-2 d-flex gap-3 align-items-start" style="border-radius:10px;">
                <div class="mt-1"><i class="fa-solid ${icon} fs-4" style="color:var(--bs-${a.severity === 'WARNING' ? 'warning' : (a.severity === 'DANGER' ? 'danger' : 'primary')})"></i></div>
                <div>
                    <h6 class="fw-bold mb-1">${a.title}</h6>
                    <div class="text-sm opacity-75 mb-1">${a.message}</div>
                    <div class="text-xs fw-semibold opacity-75"><i class="fa-solid fa-location-dot me-1"></i>พื้นที่: ${a.location_name} | แหล่งที่มา: ${a.source}</div>
                </div>
            </div>`;
        });
        
        list.innerHTML = html;
    } catch (e) {
        console.error("Alerts error:", e);
    }
}
