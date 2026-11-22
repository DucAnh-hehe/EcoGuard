/* =========================================================
   ECOGUARD | SHARED STATION DATA + SEVERITY FORMULA
   The team's original monitoring-station dataset, severity
   score formula and ranking (first written in map.html).
   Shared by map.js (Interactive Map) and home.js (Home preview)
   so the numbers always match.
   All station readings are SIMULATED demonstration values.
========================================================= */
(() => {
    "use strict";

    const esc = (window.EcoGuard && window.EcoGuard.escapeHTML) || ((v) => String(v));
    /* =====================================================
       1. TEAM DATA (original) + approximate coordinates
       x / y = position on the team's schematic canvas map.
       lat / lng = APPROXIMATE demonstration positions added
       for the real map (exact station locations unknown).
       All readings are SIMULATED demo values.
    ===================================================== */
    function makeFallbackPhoto(title, subtitle, accentColor) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1b3c32"/>
            <stop offset="100%" stop-color="${accentColor}"/>
          </linearGradient>
        </defs>
        <rect width="600" height="300" fill="url(#g)"/>
        <path d="M0 195 Q150 165 300 195 T600 195 L600 300 L0 300 Z" fill="rgba(255,255,255,0.14)"/>
        <path d="M0 225 Q150 198 300 225 T600 225 L600 300 L0 300 Z" fill="rgba(255,255,255,0.2)"/>
        <text x="28" y="64" fill="#ffffff" font-family="Times New Roman, serif" font-size="26" font-weight="bold">${esc(title)}</text>
        <text x="28" y="98" fill="rgba(255,255,255,0.88)" font-family="Times New Roman, serif" font-size="17">${esc(subtitle)}</text>
      </svg>`;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    // Monitoring stations across Greater Ha Noi (inner urban canals/lakes, outer districts, and river corridors)
    const STATIONS = [
        {
            id: "st-1", name: "To Lich River – Thanh Xuan", sector: "Inner-City Canal • Thanh Xuan / Cau Giay",
            x: 1035, y: 745, lat: 20.995, lng: 105.815,
            ph: 6.2, do: 1.3, bod5: 56, cod: 152, tss: 144,
            stateNote: "Current state: Dark turbid canal flow • Low DO",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/S%C3%B4ng_T%C3%B4_L%E1%BB%8Bch_%E1%BB%9F_H%C3%A0_N%E1%BB%99i.jpg/640px-S%C3%B4ng_T%C3%B4_L%E1%BB%8Bch_%E1%BB%9F_H%C3%A0_N%E1%BB%99i.jpg"
        },
        {
            id: "st-2", name: "Kim Nguu & Yen So Basin", sector: "Southern Drainage • Hoang Mai",
            x: 1155, y: 895, lat: 20.970, lng: 105.860,
            ph: 6.4, do: 1.8, bod5: 47, cod: 131, tss: 128,
            stateNote: "Current state: Retention basin & pumping station",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Yen_So_Park%2C_Hanoi.jpg/640px-Yen_So_Park%2C_Hanoi.jpg"
        },
        {
            id: "st-3", name: "Nhue River – Ha Dong Reach", sector: "Western Corridor • Ha Dong",
            x: 930, y: 880, lat: 20.965, lng: 105.775,
            ph: 6.5, do: 2.5, bod5: 34, cod: 96, tss: 108,
            stateNote: "Current state: Elevated suspended sediment reach",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Red_River_Hanoi.jpg/640px-Red_River_Hanoi.jpg"
        },
        {
            id: "st-4", name: "West Lake (Ho Tay) – Tay Ho", sector: "Urban Lake • Tay Ho District",
            x: 1075, y: 585, lat: 21.055, lng: 105.818,
            ph: 7.5, do: 5.8, bod5: 9.5, cod: 26, tss: 32,
            stateNote: "Current state: Calm urban lake surface • Moderate clarity",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/West_Lake_Hanoi.jpg/640px-West_Lake_Hanoi.jpg"
        },
        {
            id: "st-5", name: "Long Bien – Gia Lam Sector", sector: "East Bank • Long Bien & Gia Lam",
            x: 1295, y: 635, lat: 21.040, lng: 105.900,
            ph: 7.0, do: 5.2, bod5: 14, cod: 38, tss: 54,
            stateNote: "Current state: Red River alluvial bank & bridge corridor",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Long_Bien_Bridge_Hanoi.jpg/640px-Long_Bien_Bridge_Hanoi.jpg"
        },
        {
            id: "st-6", name: "Dong Anh Industrial Outfall", sector: "North Bank • Dong Anh District",
            x: 1180, y: 390, lat: 21.135, lng: 105.850,
            ph: 6.7, do: 4.3, bod5: 22, cod: 61, tss: 74,
            stateNote: "Current state: North bank drainage & industrial zone",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Red_River_Hanoi.jpg/640px-Red_River_Hanoi.jpg"
        },
        {
            id: "st-7", name: "Soc Son Highland Reservoir", sector: "Northern Hills • Soc Son District",
            x: 1255, y: 175, lat: 21.255, lng: 105.850,
            ph: 7.3, do: 7.4, bod5: 2.8, cod: 9, tss: 14,
            stateNote: "Current state: Highland forest reservoir • High DO",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/West_Lake_Hanoi.jpg/640px-West_Lake_Hanoi.jpg"
        },
        {
            id: "st-8", name: "Ba Vi & Suoi Hai Watershed", sector: "Far West • Ba Vi & Son Tay",
            x: 340, y: 525, lat: 21.105, lng: 105.410,
            ph: 7.4, do: 7.6, bod5: 2.4, cod: 8, tss: 12,
            stateNote: "Current state: Foothill watershed • Cleanest baseline",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/West_Lake_Hanoi.jpg/640px-West_Lake_Hanoi.jpg"
        },
        {
            id: "st-9", name: "Chuong My – My Duc Rural Canal", sector: "South-West Plain • Chuong My & My Duc",
            x: 720, y: 1135, lat: 20.850, lng: 105.710,
            ph: 6.9, do: 4.9, bod5: 15, cod: 42, tss: 62,
            stateNote: "Current state: Agricultural irrigation & drainage canal",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Yen_So_Park%2C_Hanoi.jpg/640px-Yen_So_Park%2C_Hanoi.jpg"
        },
        {
            id: "st-10", name: "Thuong Tin – Phu Xuyen Reach", sector: "Southern Corridor • Thuong Tin & Phu Xuyen",
            x: 1185, y: 1180, lat: 20.800, lng: 105.880,
            ph: 6.8, do: 4.6, bod5: 18, cod: 49, tss: 69,
            stateNote: "Current state: Southern river reach • Seasonal runoff",
            photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Red_River_Hanoi.jpg/640px-Red_River_Hanoi.jpg"
        }
    ];

    /* =====================================================
       2. TEAM FORMULA (original, unchanged)
    ===================================================== */
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // Sub-scores are split out so the details panel can chart them.
    function computeSubScores(s) {
        return {
            ph: clamp((Math.abs(s.ph - 7.0) / 2.5) * 100, 0, 100),
            do: clamp(((8.0 - s.do) / 7.5) * 100, 0, 100),
            bod: clamp((s.bod5 / 60) * 100, 0, 100),
            cod: clamp((s.cod / 160) * 100, 0, 100),
            tss: clamp((s.tss / 180) * 100, 0, 100)
        };
    }
    const WEIGHTS = { ph: 0.12, do: 0.25, bod: 0.24, cod: 0.22, tss: 0.17 };

    function computeSeverityScore(s) {
        const sub = computeSubScores(s);
        return Math.round(clamp(
            sub.ph * WEIGHTS.ph +
            sub.do * WEIGHTS.do +
            sub.bod * WEIGHTS.bod +
            sub.cod * WEIGHTS.cod +
            sub.tss * WEIGHTS.tss,
            0, 100
        ));
    }

    function getSeverityMeta(score) {
        if (score >= 75) return { label: "Critical", color: "#c93b2b" };
        if (score >= 50) return { label: "High", color: "#df6d2d" };
        if (score >= 25) return { label: "Moderate", color: "#d49b27" };
        return { label: "Low", color: "#25845e" };
    }

    // Ranking: most polluted first (original logic).
    const enrichedStations = STATIONS
        .map((s) => {
            const score = computeSeverityScore(s);
            const sev = getSeverityMeta(score);
            return {
                ...s,
                score,
                sub: computeSubScores(s),
                sevLabel: sev.label,
                sevColor: sev.color,
                fallbackPhoto: makeFallbackPhoto(s.name, s.stateNote, sev.color)
            };
        })
        .sort((a, b) => b.score - a.score)
        .map((s, idx) => ({ ...s, rank: idx + 1 }));
    window.EcoGuardStations = {
        STATIONS,
        WEIGHTS,
        clamp,
        computeSubScores,
        computeSeverityScore,
        getSeverityMeta,
        makeFallbackPhoto,
        enrichedStations
    };
})();
