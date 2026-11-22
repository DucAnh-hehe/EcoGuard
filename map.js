/* =========================================================
   ECOGUARD | INTERACTIVE MAP SCRIPT
   - Station dataset, severity formula and ranking (stations.js) are the
     team's original work (from the first map.html), unchanged.
   - Leaflet + OpenStreetMap shows stations and community reports.
   - Filters: layers, report category, report status, severity.
   - Details panel with a sub-score bar chart.
   - map.html?report=EG-2026-007 focuses one report.
   - If Leaflet cannot load, the team's original schematic
     canvas map is drawn instead, so the page still works.
========================================================= */
(() => {
    "use strict";

    const EG = window.EcoGuard;
    if (!EG) return;
    const esc = EG.escapeHTML;

    /* =====================================================
       1-2. TEAM DATA + FORMULA now live in stations.js
       (loaded before this file), unchanged.
    ===================================================== */
    const ST = window.EcoGuardStations;
    if (!ST) return;
    const { STATIONS, WEIGHTS, enrichedStations } = ST;


    // Colours for report severities (demo reports carry a label, new ones are "Unassessed").
    const REPORT_SEV_COLOR = { High: "#df6d2d", Moderate: "#d49b27", Low: "#25845e", Critical: "#c93b2b", Unassessed: "#7b8a8f" };
    const reports = EG.getReports();

    /* =====================================================
       3. PAGE ELEMENTS + FILTER STATE
    ===================================================== */
    const mapEl = document.getElementById("map");
    const notice = document.getElementById("mapNotice");
    const detailPanel = document.getElementById("detailPanel");
    const rankList = document.getElementById("rankList");
    const mapCount = document.getElementById("mapCount");
    const ctl = {
        stations: document.getElementById("layerStations"),
        reports: document.getElementById("layerReports"),
        category: document.getElementById("categoryFilter"),
        status: document.getElementById("statusFilter"),
        severity: document.getElementById("severityFilter")
    };

    let selected = null; // { kind: "station" | "report", id }

    function stationVisible(st) {
        if (!ctl.stations.checked) return false;
        const sev = ctl.severity.value;
        return sev === "all" || sev === st.sevLabel;
    }
    function reportVisible(r) {
        if (!ctl.reports.checked) return false;
        if (ctl.category.value !== "all" && r.category !== ctl.category.value) return false;
        if (ctl.status.value !== "all" && EG.statusGroup(r.status) !== ctl.status.value) return false;
        const sev = ctl.severity.value;
        if (sev !== "all" && (r.severity || "Unassessed") !== sev) return false;
        return true;
    }

    /* =====================================================
       4. DETAILS PANEL (with sub-score bar chart)
    ===================================================== */
    function stationDetailHTML(st) {
        const rows = [
            ["pH deviation", "ph", `pH ${st.ph.toFixed(1)}`],
            ["DO depletion", "do", `${st.do.toFixed(1)} mg/L`],
            ["BOD₅", "bod", `${st.bod5} mg/L`],
            ["COD", "cod", `${st.cod} mg/L`],
            ["TSS (turbidity)", "tss", `${st.tss} mg/L`]
        ];
        const bars = rows.map(([label, key, reading]) => {
            const sub = Math.round(st.sub[key]);
            const points = (st.sub[key] * WEIGHTS[key]).toFixed(1);
            return `<li>
                <span class="bar-label">${label}<small>${reading}</small></span>
                <span class="bar-track"><span class="bar-fill" style="--w:${sub}%"></span></span>
                <span class="bar-value">${sub}<small>&times;${WEIGHTS[key]} = ${points}</small></span>
            </li>`;
        }).join("");

        return `
        <div class="detail-grid">
            <figure class="detail-photo">
                <img src="${st.photo}" alt="${esc(st.name)}" loading="lazy"
                     onerror="this.onerror=null;this.src='${st.fallbackPhoto}';">
                <figcaption>${esc(st.stateNote)}</figcaption>
            </figure>
            <div class="detail-body">
                <div class="detail-top">
                    <div>
                        <p class="detail-kind">Monitoring station &middot; <span class="demo-chip">Simulated</span></p>
                        <h3>${esc(st.name)}</h3>
                        <p class="detail-sub">${esc(st.sector)}</p>
                    </div>
                    <div class="score-pill" style="background:${st.sevColor}">${st.score}/100 &middot; ${st.sevLabel}</div>
                </div>
                <p class="detail-rank">Pollution Rank #${st.rank} of ${enrichedStations.length}</p>
                <h4>Sub-scores (0&ndash;100) and weighted points</h4>
                <ul class="subscore-chart">${bars}</ul>
                <p class="detail-foot">Simulated demonstration values &middot; approximate location &middot; heavy metals not measured in demo dataset.
                    <a href="#water-quality">How is this calculated?</a></p>
            </div>
        </div>`;
    }

    function reportDetailHTML(r) {
        const progress = EG.progressFor(r.status);
        const thumb = (r.thumbnails || [])[0];
        return `
        <div class="detail-grid ${thumb ? "" : "no-photo"}">
            ${thumb ? `<figure class="detail-photo"><img src="${thumb}" alt="Photo attached to report ${esc(r.id)}"><figcaption>Photo from report</figcaption></figure>` : ""}
            <div class="detail-body">
                <div class="detail-top">
                    <div>
                        <p class="detail-kind">Community report &middot; ${r.demo ? '<span class="demo-chip">Demo</span>' : '<span class="origin-mine">Your report</span>'}</p>
                        <h3>${esc(r.title)}</h3>
                        <p class="detail-sub">${esc(r.location)} (approximate marker)</p>
                    </div>
                    <span class="status-badge ${EG.statusClass(r.status)}">${esc(r.status)}</span>
                </div>
                <p>${esc(r.description)}</p>
                <dl class="detail-facts">
                    <div><dt>Report ID</dt><dd>${esc(r.id)}</dd></div>
                    <div><dt>Type</dt><dd>${esc(r.typeLabel)}</dd></div>
                    <div><dt>Observed</dt><dd>${esc(EG.formatDate(r.dateObserved))}</dd></div>
                    <div><dt>Severity</dt><dd>${esc(r.severity || "Unassessed")}</dd></div>
                </dl>
                <div class="detail-progress">
                    <span>Progress ${progress}%</span>
                    <span class="bar-track"><span class="bar-fill" style="--w:${progress}%"></span></span>
                </div>
                <a class="btn btn-primary btn-small" href="tracking.html?id=${encodeURIComponent(r.id)}">Track report &rarr;</a>
            </div>
        </div>`;
    }

    function showDetails(kind, id, scroll) {
        selected = { kind, id };
        const item = kind === "station" ? enrichedStations.find((s) => s.id === id) : reports.find((r) => r.id === id);
        if (!item) return;
        detailPanel.innerHTML = kind === "station" ? stationDetailHTML(item) : reportDetailHTML(item);
        // Let the bars grow from 0 (CSS transition on width).
        requestAnimationFrame(() => requestAnimationFrame(() => detailPanel.classList.add("bars-ready")));
        detailPanel.classList.remove("bars-ready");
        renderRanking();
        if (scroll) detailPanel.scrollIntoView({ behavior: EG.reduceMotion ? "auto" : "smooth", block: "nearest" });
    }

    /* =====================================================
       5. RANKING SIDEBAR (original list, now buttons)
    ===================================================== */
    function renderRanking() {
        rankList.innerHTML = enrichedStations.map((st) => {
            const active = selected && selected.kind === "station" && selected.id === st.id;
            const hidden = !stationVisible(st);
            return `<li>
                <button type="button" class="rank-card ${active ? "active" : ""} ${hidden ? "is-filtered" : ""}" data-station="${st.id}" aria-pressed="${active}">
                    <span class="rc-row1">
                        <span class="rc-left">
                            <span class="rc-pos">#${st.rank}</span>
                            <span class="rc-name" title="${esc(st.name)}">${esc(st.name)}</span>
                        </span>
                        <span class="rc-score" style="background:${st.sevColor}">${st.score}/100</span>
                    </span>
                    <span class="rc-meta">
                        <span>pH <b>${st.ph.toFixed(1)}</b></span>
                        <span>DO <b>${st.do.toFixed(1)}</b> mg/L</span>
                        <span>BOD₅ <b>${st.bod5}</b></span>
                        <span>COD <b>${st.cod}</b></span>
                        <span>TSS <b>${st.tss}</b></span>
                    </span>
                </button>
            </li>`;
        }).join("");
    }

    rankList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-station]");
        if (!button) return;
        const st = enrichedStations.find((s) => s.id === button.dataset.station);
        // If the station is hidden by filters, show the stations layer again.
        if (!stationVisible(st)) { ctl.stations.checked = true; ctl.severity.value = "all"; applyFilters(); }
        focusStation(st.id);
    });

    /* =====================================================
       6. WATER-QUALITY RANGES (from the demo dataset)
    ===================================================== */
    document.querySelectorAll("[data-range]").forEach((el) => {
        const key = el.dataset.range;
        const values = STATIONS.map((s) => s[key]);
        const unit = key === "ph" ? "" : " mg/L";
        el.textContent = `Demo dataset range: ${Math.min(...values)} – ${Math.max(...values)}${unit}`;
    });

    /* =====================================================
       7. LEAFLET MAP
    ===================================================== */
    let map = null;
    const stationMarkers = new Map();
    const reportMarkers = new Map();

    function stationPopup(st) {
        return `<div class="popup">
            <p class="popup-kind">Station (simulated)</p>
            <strong>${esc(st.name)}</strong>
            <p><span class="score-pill" style="background:${st.sevColor}">${st.score}/100 &middot; ${st.sevLabel}</span> Rank #${st.rank}</p>
            <button type="button" class="popup-btn" data-detail="station" data-id="${st.id}">View details</button>
        </div>`;
    }
    function reportPopup(r) {
        return `<div class="popup">
            <p class="popup-kind">${r.demo ? "Demo report" : "Your report"} &middot; ${esc(r.id)}</p>
            <strong>${esc(r.title)}</strong>
            <p><span class="status-badge ${EG.statusClass(r.status)}">${esc(r.status)}</span></p>
            <p class="popup-loc">${esc(r.location)} (approx.)</p>
            <div class="popup-actions">
                <button type="button" class="popup-btn" data-detail="report" data-id="${esc(r.id)}">View details</button>
                <a class="popup-link" href="tracking.html?id=${encodeURIComponent(r.id)}">Track report</a>
            </div>
        </div>`;
    }

    function initLeaflet() {
        const L = window.L;
        map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true }).setView([21.02, 105.80], 10);

        // Scroll-zoom only after the user clicks the map (so the page still scrolls normally).
        map.on("click focus", () => map.scrollWheelZoom.enable());
        mapEl.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());

        const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // If many tiles fail (e.g. offline), keep markers on a plain background and say so.
        let tileErrors = 0;
        tiles.on("tileerror", () => {
            tileErrors += 1;
            if (tileErrors === 4) {
                mapEl.classList.add("tiles-failed");
                showNotice("Map tiles could not load (are you offline?). Markers are still shown on a plain background.");
            }
        });

        enrichedStations.forEach((st) => {
            const icon = L.divIcon({
                className: "station-icon",
                html: `<span class="pin" style="background:${st.sevColor}"><span>${st.score}</span></span>`,
                iconSize: [34, 34],
                iconAnchor: [17, 34],
                popupAnchor: [0, -30]
            });
            const marker = L.marker([st.lat, st.lng], { icon, title: `${st.name} – ${st.score}/100`, riseOnHover: true })
                .bindPopup(stationPopup(st))
                .bindTooltip(`#${st.rank} ${esc(st.name)} (${st.score})`, { direction: "top", offset: [0, -32] });
            marker.on("click", () => showDetails("station", st.id, false));
            stationMarkers.set(st.id, marker);
        });

        reports.forEach((r) => {
            const color = REPORT_SEV_COLOR[r.severity] || REPORT_SEV_COLOR.Unassessed;
            const icon = L.divIcon({
                className: "report-icon",
                html: `<span class="report-pin ${r.demo ? "" : "mine"}" style="--c:${color}">!</span>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
                popupAnchor: [0, -12]
            });
            const marker = L.marker([r.lat, r.lng], { icon, title: `${r.id}: ${r.title}`, riseOnHover: true })
                .bindPopup(reportPopup(r));
            marker.on("click", () => showDetails("report", r.id, false));
            reportMarkers.set(r.id, marker);
        });

        // Buttons inside popups.
        map.on("popupopen", (event) => {
            const button = event.popup.getElement().querySelector("[data-detail]");
            if (button) button.addEventListener("click", () => showDetails(button.dataset.detail, button.dataset.id, true));
        });

        applyFilters();
    }

    function focusStation(id) {
        const st = enrichedStations.find((s) => s.id === id);
        showDetails("station", id, false);
        if (map) {
            map.flyTo([st.lat, st.lng], Math.max(map.getZoom(), 12), { duration: EG.reduceMotion ? 0 : 0.8 });
            stationMarkers.get(id).openPopup();
        } else {
            highlightFallbackMarker(id);
        }
    }

    function focusReport(id) {
        const r = reports.find((x) => x.id === id);
        if (!r) return false;
        // Make sure filters do not hide it.
        if (!reportVisible(r)) {
            ctl.reports.checked = true;
            ctl.category.value = "all";
            ctl.status.value = "all";
            ctl.severity.value = "all";
            applyFilters();
        }
        showDetails("report", id, false);
        if (map) {
            map.setView([r.lat, r.lng], 14);
            reportMarkers.get(id).openPopup();
        }
        return true;
    }

    /* =====================================================
       8. FILTERS
    ===================================================== */
    function applyFilters() {
        let shownStations = 0;
        let shownReports = 0;
        enrichedStations.forEach((st) => {
            const show = stationVisible(st);
            if (show) shownStations += 1;
            if (map) {
                const marker = stationMarkers.get(st.id);
                if (show && !map.hasLayer(marker)) marker.addTo(map);
                if (!show && map.hasLayer(marker)) marker.remove();
            } else {
                const el = mapEl.querySelector(`[data-fallback="${st.id}"]`);
                if (el) el.hidden = !show;
            }
        });
        reports.forEach((r) => {
            const show = reportVisible(r);
            if (show) shownReports += 1;
            if (map) {
                const marker = reportMarkers.get(r.id);
                if (show && !map.hasLayer(marker)) marker.addTo(map);
                if (!show && map.hasLayer(marker)) marker.remove();
            }
        });
        mapCount.textContent = `Showing ${shownStations} of ${enrichedStations.length} stations · ${shownReports} of ${reports.length} reports`;
        renderRanking();
    }

    Object.values(ctl).forEach((input) => input.addEventListener("change", applyFilters));
    document.getElementById("resetFilters").addEventListener("click", () => {
        ctl.stations.checked = true;
        ctl.reports.checked = true;
        ctl.category.value = "all";
        ctl.status.value = "all";
        ctl.severity.value = "all";
        applyFilters();
        if (map) map.setView([21.02, 105.80], 10);
        EG.toast("Filters reset.");
    });

    function showNotice(text) {
        notice.textContent = text;
        notice.hidden = false;
    }

    /* =====================================================
       9. FALLBACK: the team's original schematic canvas map
       (used only if the Leaflet library cannot be loaded)
    ===================================================== */
    const WORLD_W = 2100;
    const WORLD_H = 1400;

    function drawHanoiMetropolitanMap(canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#e7efe9";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);

        ctx.strokeStyle = "rgba(28, 66, 52, 0.065)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= WORLD_W; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); }
        for (let y = 0; y <= WORLD_H; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); }

        const hanoiBoundary = [[1180, 95], [1420, 190], [1520, 440], [1460, 790], [1310, 1295], [980, 1320], [620, 1255], [220, 820], [250, 430], [690, 320], [980, 145]];
        ctx.save();
        ctx.beginPath();
        hanoiBoundary.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.closePath();
        const landGrad = ctx.createLinearGradient(220, 95, 1520, 1320);
        landGrad.addColorStop(0, "#dce9df");
        landGrad.addColorStop(0.5, "#e6f0e8");
        landGrad.addColorStop(1, "#dce8e0");
        ctx.fillStyle = landGrad;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#3f755e";
        ctx.stroke();
        ctx.restore();

        const regions = [
            { x: 1040, y: 120, w: 340, h: 220, fill: "rgba(174, 208, 184, 0.34)", label: "SOC SON" },
            { x: 700, y: 340, w: 340, h: 210, fill: "rgba(182, 212, 190, 0.28)", label: "ME LINH & PHUC THO" },
            { x: 250, y: 410, w: 360, h: 420, fill: "rgba(164, 201, 176, 0.36)", label: "BA VI & SON TAY" },
            { x: 960, y: 530, w: 255, h: 390, fill: "rgba(232, 224, 196, 0.42)", label: "INNER HA NOI" },
            { x: 1220, y: 470, w: 270, h: 360, fill: "rgba(184, 214, 194, 0.28)", label: "LONG BIEN & GIA LAM" },
            { x: 640, y: 840, w: 460, h: 410, fill: "rgba(184, 212, 192, 0.26)", label: "HA DONG • CHUONG MY • MY DUC" },
            { x: 1110, y: 890, w: 320, h: 380, fill: "rgba(180, 210, 190, 0.26)", label: "THANH TRI • THUONG TIN • PHU XUYEN" }
        ];
        regions.forEach((r) => {
            ctx.fillStyle = r.fill;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 22); else ctx.rect(r.x, r.y, r.w, r.h);
            ctx.fill();
            ctx.fillStyle = "rgba(25, 64, 49, 0.36)";
            ctx.font = "700 16px 'Times New Roman', serif";
            ctx.fillText(r.label, r.x + 18, r.y + 30);
        });

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#76b8ce"; ctx.lineWidth = 34;
        ctx.beginPath(); ctx.moveTo(520, 360); ctx.bezierCurveTo(790, 440, 1020, 520, 1185, 650); ctx.bezierCurveTo(1275, 730, 1220, 960, 1285, 1295); ctx.stroke();
        ctx.strokeStyle = "#83c1d5"; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.moveTo(1165, 585); ctx.quadraticCurveTo(1340, 540, 1515, 485); ctx.stroke();
        ctx.strokeStyle = "#8bc6d9"; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(770, 430); ctx.bezierCurveTo(860, 630, 910, 820, 955, 1050); ctx.quadraticCurveTo(980, 1180, 1025, 1305); ctx.stroke();
        ctx.strokeStyle = "#5c9eb5"; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(1035, 575); ctx.lineTo(1035, 760); ctx.quadraticCurveTo(1065, 865, 1155, 910); ctx.stroke();
        ctx.fillStyle = "#6fb3ca"; ctx.strokeStyle = "#488da6"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(1075, 585, 44, 32, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(330, 635, 34, 24, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1e6178";
        ctx.font = "italic 700 18px 'Times New Roman', serif";
        ctx.fillText("Red River (Sông Hồng)", 1195, 765);
        ctx.fillText("Đuống River", 1315, 518);
        ctx.fillText("Nhuệ River", 830, 945);
        ctx.fillText("Tô Lịch Canal", 918, 720);
        ctx.fillText("West Lake (Hồ Tây)", 1015, 544);
        ctx.fillStyle = "#124c38";
        ctx.font = "800 24px 'Times New Roman', serif";
        ctx.fillText("HA NOI METROPOLITAN TERRITORY", 760, 115);
        ctx.restore();
    }

    function initFallback() {
        mapEl.classList.add("is-fallback");
        mapEl.innerHTML = `<div class="fallback-world">
            <canvas width="${WORLD_W}" height="${WORLD_H}" aria-hidden="true"></canvas>
            ${enrichedStations.map((st) => `
                <button type="button" class="fallback-marker" data-fallback="${st.id}"
                        style="left:${(st.x / WORLD_W) * 100}%;top:${(st.y / WORLD_H) * 100}%"
                        aria-label="#${st.rank} ${esc(st.name)}, score ${st.score}">
                    <span class="pin" style="background:${st.sevColor}"><span>${st.score}</span></span>
                </button>`).join("")}
        </div>`;
        drawHanoiMetropolitanMap(mapEl.querySelector("canvas"));
        mapEl.addEventListener("click", (event) => {
            const button = event.target.closest("[data-fallback]");
            if (button) focusStation(button.dataset.fallback);
        });
        // Community reports cannot be placed on the schematic map.
        ctl.reports.checked = false;
        ctl.reports.disabled = true;
        showNotice("The online map could not load, so the team's schematic map of Ha Noi is shown instead. Community reports are listed on the Track Reports page.");
        applyFilters();
    }

    function highlightFallbackMarker(id) {
        mapEl.querySelectorAll(".fallback-marker").forEach((el) => el.classList.toggle("active", el.dataset.fallback === id));
    }

    /* =====================================================
       10. START
    ===================================================== */
    if (window.L && typeof window.L.map === "function") initLeaflet();
    else initFallback();

    const wanted = new URLSearchParams(window.location.search).get("report");
    if (wanted) {
        if (focusReport(wanted)) {
            setTimeout(() => mapEl.scrollIntoView({ behavior: EG.reduceMotion ? "auto" : "smooth", block: "center" }), 200);
        } else {
            EG.toast(`Report ${wanted} was not found in this browser.`);
            showDetails("station", enrichedStations[0].id, false);
        }
    } else {
        // Start with the most polluted station selected (original behaviour).
        showDetails("station", enrichedStations[0].id, false);
    }
})();
