/* =========================================================
   ECOGUARD | SHARED SCRIPT (loaded on every page, before page scripts)

   1. window.EcoGuard  - a small "data layer" that stores reports in
                         localStorage so the Report, Track and Map pages
                         share the same records (no server needed).
   2. Header shadow, mobile menu, scroll reveal and count-up animations.

   IMPORTANT: All reports and measurements in this prototype are DEMO or
   SIMULATED data. Nothing is sent to a real authority or database.
========================================================= */
(() => {
    "use strict";

    /* ---------------------------------------------------------
       1. DATA LAYER
    --------------------------------------------------------- */

    // localStorage key for reports created by the user in the Report form.
    const STORAGE_KEY = "ecoguard.reports.v1";

    // The report workflow, in order. Each step has a progress percentage.
    const STATUSES = ["Submitted", "Under Review", "Verified", "In Progress", "Resolved"];
    const PROGRESS = { "Submitted": 10, "Under Review": 30, "Verified": 50, "In Progress": 65, "Resolved": 100 };

    // CSS class for each status badge (colours are defined in ecoguard.css).
    const STATUS_CLASS = {
        "Submitted": "submitted",
        "Under Review": "review",
        "Verified": "verified",
        "In Progress": "progress",
        "Resolved": "resolved"
    };

    // Summary groups used by the Track page cards and the Map filters.
    // Pending Approval = Submitted / Under Review
    // In Progress      = Verified / In Progress
    // Completed        = Resolved
    function statusGroup(status) {
        if (status === "Resolved") return "completed";
        if (status === "Verified" || status === "In Progress") return "progress";
        return "pending";
    }

    const CATEGORY_LABEL = {
        industrial: "Industrial Wastewater",
        contamination: "Water Contamination",
        other: "Other Pollution"
    };

    // Helper to build a status history quickly: [["Submitted","2026-11-15"], ...]
    function history(steps) {
        return steps.map(([status, date, note]) => ({ status, date, note: note || "" }));
    }

    /* Six demo reports (kept from the team's original Track Reports page).
       Coordinates are APPROXIMATE demonstration locations, not exact sites. */
    const DEMO_REPORTS = [
        {
            id: "EG-2026-001",
            title: "Industrial Wastewater Discharge",
            location: "To Lich River, Hanoi",
            lat: 21.003, lng: 105.818,
            category: "industrial",
            typeLabel: "Industrial wastewater",
            source: "River",
            description: "Dark wastewater has been observed flowing from a nearby industrial facility into the river.",
            dateObserved: "2026-11-15",
            submitted: "2026-11-15",
            status: "In Progress",
            severity: "High",
            history: history([
                ["Submitted", "2026-11-15", "Report received by EcoGuard (demo)."],
                ["Under Review", "2026-11-16", "Details and photos checked (demo)."],
                ["Verified", "2026-11-17", "Report marked as verified (demo)."],
                ["In Progress", "2026-11-18", "Currently being addressed (demo)."]
            ])
        },
        {
            id: "EG-2026-002",
            title: "Polluted Water Near Residential Area",
            location: "Thanh Liet, Hanoi",
            lat: 20.968, lng: 105.817,
            category: "contamination",
            typeLabel: "Water contamination",
            source: "Canal",
            description: "Residents have noticed unusual water colour and an unpleasant smell near their neighbourhood.",
            dateObserved: "2026-11-17",
            submitted: "2026-11-17",
            status: "Under Review",
            severity: "Moderate",
            history: history([
                ["Submitted", "2026-11-17", "Report received by EcoGuard (demo)."],
                ["Under Review", "2026-11-18", "Awaiting review (demo)."]
            ])
        },
        {
            id: "EG-2026-003",
            title: "Unusual Wastewater Discharge",
            location: "Hoang Mai, Hanoi",
            lat: 20.975, lng: 105.858,
            category: "industrial",
            typeLabel: "Possible wastewater discharge",
            source: "Canal",
            description: "Possible wastewater discharge has been observed near a local drainage channel.",
            dateObserved: "2026-11-16",
            submitted: "2026-11-16",
            status: "Submitted",
            severity: "Moderate",
            history: history([
                ["Submitted", "2026-11-16", "Report received and waiting for review (demo)."]
            ])
        },
        {
            id: "EG-2026-004",
            title: "Wastewater Leakage Near Canal",
            location: "Dong Da, Hanoi",
            lat: 21.018, lng: 105.829,
            category: "industrial",
            typeLabel: "Wastewater leakage",
            source: "Canal",
            description: "Wastewater leakage was reported and the affected area has been addressed.",
            dateObserved: "2026-11-11",
            submitted: "2026-11-11",
            status: "Resolved",
            severity: "Low",
            history: history([
                ["Submitted", "2026-11-11"],
                ["Under Review", "2026-11-12"],
                ["Verified", "2026-11-13"],
                ["In Progress", "2026-11-14"],
                ["Resolved", "2026-11-18", "Report marked as completed (demo)."]
            ])
        },
        {
            id: "EG-2026-005",
            title: "Discoloured Water Near Industrial Zone",
            location: "Long Bien, Hanoi",
            lat: 21.044, lng: 105.888,
            category: "contamination",
            typeLabel: "Water discolouration",
            source: "River",
            description: "Unusual water discolouration was reported and the incident was investigated.",
            dateObserved: "2026-11-06",
            submitted: "2026-11-06",
            status: "Resolved",
            severity: "Moderate",
            history: history([
                ["Submitted", "2026-11-06"],
                ["Under Review", "2026-11-07"],
                ["Verified", "2026-11-08"],
                ["In Progress", "2026-11-10"],
                ["Resolved", "2026-11-13", "Report marked as completed (demo)."]
            ])
        },
        {
            id: "EG-2026-006",
            title: "Illegal Waste Disposal Near River",
            location: "Cau Giay, Hanoi",
            lat: 21.033, lng: 105.795,
            category: "other",
            typeLabel: "Illegal waste disposal",
            source: "River",
            description: "Improper waste disposal near the riverbank was reported and the incident was addressed.",
            dateObserved: "2026-10-29",
            submitted: "2026-10-29",
            status: "Resolved",
            severity: "Low",
            history: history([
                ["Submitted", "2026-10-29"],
                ["Under Review", "2026-10-30"],
                ["Verified", "2026-10-31"],
                ["In Progress", "2026-11-02"],
                ["Resolved", "2026-11-05", "Report marked as completed (demo)."]
            ])
        }
    ].map((report) => Object.assign({ demo: true, approx: true, photoCount: 0, additional: "" }, report));

    // Read the user's own reports from localStorage (safe if storage is blocked).
    function getUserReports() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    }

    // All reports: newest user reports first, then the demo reports.
    function getReports() {
        const user = getUserReports().sort((a, b) => (b.submitted || "").localeCompare(a.submitted || ""));
        return user.concat(DEMO_REPORTS);
    }

    function findReport(id) {
        const wanted = String(id || "").trim().toUpperCase();
        return getReports().find((report) => report.id.toUpperCase() === wanted) || null;
    }

    // Next unique ID in the form EG-<current year>-NNN (e.g. EG-2026-007).
    function nextId() {
        const year = new Date().getFullYear();
        const prefix = `EG-${year}-`;
        const highest = getReports()
            .filter((report) => report.id.startsWith(prefix))
            .map((report) => parseInt(report.id.slice(prefix.length), 10) || 0)
            .reduce((max, n) => Math.max(max, n), 0);
        return prefix + String(highest + 1).padStart(3, "0");
    }

    // Save a new report. Returns true on success, false if storage failed.
    function saveReport(report) {
        const list = getUserReports();
        list.push(report);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            return true;
        } catch (error) {
            // Storage may be full because of photo thumbnails: retry without them.
            try {
                report.thumbnails = [];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
                return true;
            } catch (secondError) {
                return false;
            }
        }
    }

    function clearUserReports() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    }

    /* Approximate coordinates for well-known Hanoi areas. Used to place new
       reports on the map from the typed location text. NOT exact positions. */
    const AREAS = [
        ["to lich", 21.003, 105.818], ["thanh liet", 20.968, 105.817],
        ["hoang mai", 20.975, 105.858], ["dong da", 21.018, 105.829],
        ["long bien", 21.044, 105.888], ["cau giay", 21.033, 105.795],
        ["ba dinh", 21.035, 105.814], ["hoan kiem", 21.028, 105.852],
        ["tay ho", 21.068, 105.821], ["ho tay", 21.055, 105.818], ["west lake", 21.055, 105.818],
        ["hai ba trung", 21.006, 105.858], ["thanh xuan", 20.994, 105.814],
        ["ha dong", 20.971, 105.776], ["nhue", 20.965, 105.775],
        ["nam tu liem", 21.017, 105.766], ["bac tu liem", 21.071, 105.758],
        ["dong anh", 21.137, 105.849], ["gia lam", 21.022, 105.940],
        ["soc son", 21.257, 105.849], ["thanh tri", 20.940, 105.845],
        ["yen so", 20.970, 105.860], ["kim nguu", 21.000, 105.862],
        ["red river", 21.045, 105.865], ["song hong", 21.045, 105.865]
    ];
    const HANOI_CENTRE = [21.028, 105.834];

    // Remove Vietnamese accents so "Cầu Giấy" matches "cau giay".
    function normalise(text) {
        return String(text || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/đ/gi, "d")
            .toLowerCase();
    }

    // Small repeatable offset so markers in the same area do not overlap.
    function jitter(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
        return [((hash % 100) / 100) * 0.008, (((hash >> 7) % 100) / 100) * 0.008];
    }

    function guessLocation(text, seed) {
        const clean = normalise(text);
        const match = AREAS.find(([name]) => clean.includes(name));
        const [dLat, dLng] = jitter(seed || clean);
        if (match) return { lat: match[1] + dLat, lng: match[2] + dLng, matched: true };
        return { lat: HANOI_CENTRE[0] + dLat, lng: HANOI_CENTRE[1] + dLng, matched: false };
    }

    /* Small helpers shared by page scripts */
    function escapeHTML(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    // "2026-11-15" -> "15 November 2026"
    function formatDate(iso, short) {
        if (!iso) return "";
        const [y, m, d] = iso.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        if (Number.isNaN(date.getTime())) return iso;
        return date.toLocaleDateString("en-GB", { day: "numeric", month: short ? "short" : "long", year: "numeric" });
    }

    // Today's date as "YYYY-MM-DD" in local time.
    function todayISO() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    function daysBetween(a, b) {
        const toDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
        return Math.round((toDate(b) - toDate(a)) / 86400000);
    }

    let toastTimer;
    function toast(message) {
        let el = document.querySelector(".eco-toast");
        if (!el) {
            el = document.createElement("div");
            el.className = "eco-toast";
            el.setAttribute("role", "status");
            document.body.appendChild(el);
        }
        el.textContent = message;
        requestAnimationFrame(() => el.classList.add("is-visible"));
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
    }

    // Make the data layer available to report.js, tracking.js, map.js and the Home page.
    window.EcoGuard = {
        STATUSES, PROGRESS, STATUS_CLASS, CATEGORY_LABEL, DEMO_REPORTS,
        statusGroup, getReports, getUserReports, findReport, nextId,
        saveReport, clearUserReports, guessLocation, escapeHTML,
        formatDate, todayISO, daysBetween, toast,
        progressFor: (status) => PROGRESS[status] || 0,
        statusClass: (status) => STATUS_CLASS[status] || "submitted"
    };

    /* ---------------------------------------------------------
       2. SHARED INTERACTIONS
    --------------------------------------------------------- */
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.EcoGuard.reduceMotion = reduceMotion;
    const header = document.querySelector(".site-header");

    // Soft shadow on the sticky navigation after the page begins scrolling.
    const updateHeader = () => {
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    // Mobile menu toggle (the button only shows under 900px wide).
    const toggle = document.querySelector(".nav-toggle");
    if (header && toggle) {
        const setOpen = (open) => {
            header.classList.toggle("nav-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        };
        toggle.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));
        header.querySelectorAll(".primary-nav a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
        document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
        window.addEventListener("resize", () => { if (window.innerWidth > 900) setOpen(false); });
    }

    // Count numbers up from 0 the first time they are seen: <span data-count="6">0</span>
    function runCountUp(el) {
        if (el.dataset.countDone) return;
        el.dataset.countDone = "1";
        const target = parseFloat(el.dataset.count) || 0;
        const decimals = (el.dataset.count.split(".")[1] || "").length;
        if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
        const start = performance.now();
        const duration = 1100;
        const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = (target * eased).toFixed(decimals);
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // Reveal content as it enters the viewport (only once, never replays).
    let revealObserver = null;
    if (!reduceMotion && "IntersectionObserver" in window) {
        document.body.classList.add("motion-ready");
        revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                if (entry.target.hasAttribute("data-count")) runCountUp(entry.target);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    }

    // Page scripts call EcoGuard.observe(container) after adding new cards.
    function observe(root) {
        const scope = root || document;
        const items = scope.querySelectorAll ? scope.querySelectorAll("[data-reveal]:not(.is-visible), [data-count]:not([data-counted])") : [];
        let index = 0;
        items.forEach((item) => {
            if (item.hasAttribute("data-count")) item.setAttribute("data-counted", "");
            if (revealObserver) {
                if (item.hasAttribute("data-reveal")) item.style.transitionDelay = `${Math.min(index++ % 4, 3) * 75}ms`;
                revealObserver.observe(item);
            } else {
                item.classList.add("is-visible");
                if (item.hasAttribute("data-count")) runCountUp(item);
            }
        });
    }
    window.EcoGuard.observe = observe;

    // Run after page scripts have built their dynamic content.
    document.addEventListener("DOMContentLoaded", () => observe(document));
})();
