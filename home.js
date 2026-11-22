/* =========================================================
   ECOGUARD | HOME PAGE SCRIPT
   - "At a glance" report count from the shared report store
   - Map preview: top 3 stations from the team's formula (stations.js)
   - Recent reports: newest 3 from EcoGuard.getReports()
========================================================= */
(() => {
    "use strict";

    const EG = window.EcoGuard;
    if (!EG) return;
    const esc = EG.escapeHTML;
    const reports = EG.getReports();

    /* ---------- Report count (count-up handled by ecoguard.js) ---------- */
    const impact = document.getElementById("impactReports");
    if (impact) {
        impact.dataset.count = String(reports.length);
        impact.textContent = EG.reduceMotion ? String(reports.length) : "0";
    }

    /* ---------- Map preview ---------- */
    const preview = document.getElementById("previewRank");
    const ST = window.EcoGuardStations;
    if (preview && ST) {
        preview.innerHTML = ST.enrichedStations.slice(0, 3).map((st) => `
            <li>
                <span class="pr-pos">#${st.rank}</span>
                <span class="pr-name">${esc(st.name)}<small>${esc(st.sector)}</small></span>
                <span class="pr-score" style="background:${st.sevColor}">${st.score}</span>
            </li>`).join("");
    }

    /* ---------- Recent reports ---------- */
    const recent = document.getElementById("recentReports");
    if (recent) {
        const newest = reports
            .slice()
            // Newest date first; same-day reports fall back to the higher ID (submitted later).
            .sort((a, b) => (b.submitted || "").localeCompare(a.submitted || "") || b.id.localeCompare(a.id))
            .slice(0, 3);
        recent.innerHTML = newest.map((r) => `
            <article class="recent-card" data-reveal="fade-up">
                <div class="recent-card-top">
                    <span class="status-badge ${EG.statusClass(r.status)}">${esc(r.status)}</span>
                    <span class="recent-id">${esc(r.id)} ${r.demo ? '<span class="demo-chip">Demo</span>' : ""}</span>
                </div>
                <h3>${esc(r.title)}</h3>
                <p class="recent-loc"><span aria-hidden="true">&#9906;</span> ${esc(r.location)}</p>
                <p class="recent-date">Submitted ${esc(EG.formatDate(r.submitted))}</p>
                <div class="recent-links">
                    <a href="tracking.html?id=${encodeURIComponent(r.id)}">Track</a>
                    <a href="map.html?report=${encodeURIComponent(r.id)}">On map</a>
                </div>
            </article>`).join("");
        EG.observe(recent);
    }
})();
