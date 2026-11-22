/* =========================================================
   ECOGUARD | TRACK REPORTS PAGE SCRIPT
   - Builds report cards from EcoGuard.getReports() (demo + saved)
   - Summary counts, search, status/type filters, empty state
   - Timeline + status history inside "View Details"
   - Statistics: this month, last month, average resolution time
   - tracking.html?id=EG-2026-007 opens and highlights one report
========================================================= */
(() => {
    "use strict";

    const EG = window.EcoGuard;
    const grid = document.getElementById("reportsGrid");
    if (!grid || !EG) return;

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const typeFilter = document.getElementById("typeFilter");
    const emptyState = document.getElementById("emptyState");
    const resultsCount = document.getElementById("resultsCount");
    const esc = EG.escapeHTML;

    let reports = EG.getReports();

    /* ---------- Summary cards ---------- */
    function renderSummary() {
        const count = (group) => reports.filter((r) => EG.statusGroup(r.status) === group).length;
        const set = (id, value) => {
            const el = document.getElementById(id);
            el.dataset.count = String(value);
            delete el.dataset.countDone;
            delete el.dataset.counted;
            el.textContent = EG.reduceMotion ? String(value) : "0";
        };
        set("countTotal", reports.length);
        set("countProgress", count("progress"));
        set("countPending", count("pending"));
        set("countCompleted", count("completed"));
        EG.observe(document.querySelector(".summary-cards"));
    }

    /* ---------- One report card ---------- */
    function timelineHTML(report) {
        const reachedIndex = EG.STATUSES.indexOf(report.status);
        return EG.STATUSES.map((status, index) => {
            const entry = (report.history || []).find((h) => h.status === status);
            let cls = "";
            let small = "";
            if (index < reachedIndex || (index === reachedIndex && status === "Resolved")) {
                cls = "done";
                small = entry ? EG.formatDate(entry.date) : "";
            } else if (index === reachedIndex) {
                cls = "current";
                small = entry ? `${EG.formatDate(entry.date)} &middot; current stage` : "Current stage";
            } else {
                small = "Awaiting this step";
            }
            const label = status === "Submitted" ? "Report Submitted" : status === "Verified" ? "Report Verified" : status;
            return `<li class="${cls}">${label}<small>${small}</small></li>`;
        }).join("");
    }

    function historyHTML(report) {
        const notes = (report.history || []).filter((h) => h.note);
        if (!notes.length) return "";
        return `<h4>Status History</h4>
            <ul class="status-history">
                ${notes.slice().reverse().map((h) => `
                    <li><span class="status-badge ${EG.statusClass(h.status)}">${esc(h.status)}</span>
                    <span>${esc(EG.formatDate(h.date, true))} &mdash; ${esc(h.note)}</span></li>`).join("")}
            </ul>`;
    }

    function cardHTML(report) {
        const progress = EG.progressFor(report.status);
        const thumbs = (report.thumbnails || []).map((src) => `<img src="${src}" alt="Photo attached to report ${esc(report.id)}">`).join("");
        const origin = report.demo
            ? `<span class="origin-tag demo">Demo</span>`
            : `<span class="origin-tag mine">Your report</span>`;
        return `
        <article class="report-card" id="card-${esc(report.id)}" data-id="${esc(report.id)}" data-reveal="fade-up">
            <div class="report-card-heading">
                <h3>${esc(report.title)}</h3>
                <span class="status-badge ${EG.statusClass(report.status)}">${esc(report.status)}</span>
            </div>
            <p class="report-description">${esc(report.description)}</p>
            <p class="report-location"><span aria-hidden="true">&#9906;</span> ${esc(report.location)}</p>

            <div class="progress-info">
                <span>Progress</span>
                <strong>${progress}%</strong>
            </div>
            <div class="report-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="Progress of ${esc(report.id)}">
                <span style="--progress:${progress}%"></span>
            </div>

            <div class="report-footer">
                <span>${esc(EG.formatDate(report.submitted))}</span>
                <span class="report-id">${esc(report.id)} ${origin}</span>
            </div>

            <details class="report-details">
                <summary>View Details &#8594;</summary>
                <div class="report-detail-content">
                    <p><strong>Report ID:</strong> ${esc(report.id)}</p>
                    <p><strong>Pollution Type:</strong> ${esc(report.typeLabel)}</p>
                    <p><strong>Water Source:</strong> ${esc(report.source || "Not specified")}</p>
                    <p><strong>Date Observed:</strong> ${esc(EG.formatDate(report.dateObserved))}</p>
                    <p><strong>Submitted:</strong> ${esc(EG.formatDate(report.submitted))}</p>
                    <p><strong>Severity:</strong> ${esc(report.severity || "Unassessed")}${report.demo ? " (demo value)" : " (not yet assessed)"}</p>
                    ${report.additional ? `<p><strong>Additional Observations:</strong> ${esc(report.additional)}</p>` : ""}
                    ${report.photoCount ? `<p><strong>Photos attached:</strong> ${report.photoCount}</p>` : ""}
                    ${thumbs ? `<div class="detail-thumbs">${thumbs}</div>` : ""}

                    <h4>Tracking Timeline</h4>
                    <ol class="mini-timeline">${timelineHTML(report)}</ol>
                    ${historyHTML(report)}

                    <a class="detail-map-link" href="map.html?report=${encodeURIComponent(report.id)}">View approximate location on map &rarr;</a>
                </div>
            </details>
        </article>`;
    }

    /* ---------- Filtering ---------- */
    function matches(report) {
        const query = searchInput.value.trim().toLowerCase();
        const status = statusFilter.value;
        const type = typeFilter.value;

        if (query) {
            const haystack = `${report.id} ${report.title} ${report.location}`.toLowerCase();
            // Also match without Vietnamese accents ("cau giay" finds "Cầu Giấy").
            const plain = haystack.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
            if (!haystack.includes(query) && !plain.includes(query)) return false;
        }
        if (status !== "all") {
            if (status.startsWith("group:")) {
                if (EG.statusGroup(report.status) !== status.slice(6)) return false;
            } else if (report.status !== status) return false;
        }
        if (type !== "all" && report.category !== type) return false;
        return true;
    }

    function renderList() {
        const visible = reports.filter(matches);
        grid.innerHTML = visible.map(cardHTML).join("");
        emptyState.hidden = visible.length > 0;
        resultsCount.textContent = `Showing ${visible.length} of ${reports.length} reports`;

        grid.querySelectorAll(".report-details").forEach((details) => {
            details.addEventListener("toggle", () => details.classList.toggle("details-open", details.open));
        });
        EG.observe(grid);
    }

    function clearFilters() {
        searchInput.value = "";
        statusFilter.value = "all";
        typeFilter.value = "all";
        renderList();
        searchInput.focus();
    }

    searchInput.addEventListener("input", renderList);
    statusFilter.addEventListener("change", renderList);
    typeFilter.addEventListener("change", renderList);
    document.getElementById("clearFilters").addEventListener("click", clearFilters);
    document.getElementById("emptyClear").addEventListener("click", clearFilters);

    /* ---------- Statistics sidebar ---------- */
    function renderStats() {
        const today = EG.todayISO();
        const thisMonth = today.slice(0, 7);
        const [y, m] = thisMonth.split("-").map(Number);
        const previous = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;

        const inMonth = (key) => reports.filter((r) => (r.submitted || "").startsWith(key)).length;
        const thisCount = inMonth(thisMonth);
        const lastCount = inMonth(previous);
        const maxCount = Math.max(thisCount, lastCount, 1);

        const durations = reports
            .filter((r) => r.status === "Resolved")
            .map((r) => {
                const resolved = (r.history || []).find((h) => h.status === "Resolved");
                return resolved ? EG.daysBetween(r.submitted, resolved.date) : null;
            })
            .filter((d) => d !== null);
        const average = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

        const plural = (n) => `${n} ${n === 1 ? "report" : "reports"}`;
        document.getElementById("statThisMonth").textContent = plural(thisCount);
        document.getElementById("statLastMonth").textContent = plural(lastCount);
        document.getElementById("statAverage").textContent = average === null ? "No completed reports" : `${Math.round(average * 10) / 10} days`;

        // Bars animate from 0 to their width (CSS transition).
        const setBar = (id, percent) => requestAnimationFrame(() => {
            document.getElementById(id).style.width = `${Math.min(100, percent)}%`;
        });
        setBar("barThisMonth", (thisCount / maxCount) * 100);
        setBar("barLastMonth", (lastCount / maxCount) * 100);
        setBar("barAverage", average === null ? 0 : (average / 14) * 100); // 14 days = full bar

        // Tools for reports saved in this browser.
        const mine = EG.getUserReports().length;
        document.getElementById("myReportsTools").hidden = mine === 0;
        document.getElementById("myReportsCount").textContent = mine;
    }

    document.getElementById("clearMine").addEventListener("click", () => {
        const mine = EG.getUserReports().length;
        if (!mine) return;
        if (!window.confirm(`Delete the ${mine} report(s) you submitted in this browser? Demo reports are not affected. This cannot be undone.`)) return;
        EG.clearUserReports();
        reports = EG.getReports();
        renderAll();
        EG.toast("Your submitted reports were removed from this browser.");
    });

    function renderAll() {
        renderSummary();
        renderList();
        renderStats();
    }

    renderAll();

    /* ---------- Open a specific report from ?id= ---------- */
    const wantedId = new URLSearchParams(window.location.search).get("id");
    if (wantedId) {
        const report = EG.findReport(wantedId);
        if (report) {
            const card = document.getElementById(`card-${report.id}`);
            if (card) {
                card.classList.add("is-highlighted", "is-visible");
                card.querySelector(".report-details").open = true;
                setTimeout(() => card.scrollIntoView({ behavior: EG.reduceMotion ? "auto" : "smooth", block: "center" }), 250);
            }
        } else {
            EG.toast(`Report ${wantedId} was not found in this browser.`);
        }
    }
})();
