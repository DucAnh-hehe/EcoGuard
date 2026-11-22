ECOGUARD - STUDENT PROTOTYPE WEBSITE
====================================

EcoGuard helps Ha Noi residents learn about industrial wastewater pollution,
explore a map of demonstration water-quality stations, record observations
and follow each report with a tracking ID.

IMPORTANT: this is a learning project. It is NOT an official service.
- Station readings on the map are SIMULATED demonstration values, and the
  station locations are APPROXIMATE.
- Reports are saved only in your own browser (localStorage). They are not
  sent to, or reviewed by, any authority. The tracking stages are a demo.

HOW TO RUN (VS Code + Live Server)
----------------------------------
1. Open the Ecoguard folder in VS Code (File > Open Folder).
2. Install the "Live Server" extension (by Ritwick Dey) if needed.
3. Right-click index.html > "Open with Live Server".
4. The site opens at http://127.0.0.1:5500/index.html.
An internet connection is needed for the map tiles (Leaflet + OpenStreetMap).
Without it, the map page switches to a built-in drawn map automatically.
(Alternative: run "python -m http.server" in this folder and open
http://localhost:8000.)

PAGES
-----
index.html     Home: hero, About EcoGuard + The Problem, prototype at a glance,
               4-step reporting guide, map preview (top 3 stations), recent
               reports, the team's further-reading links, call to action.
map.html       Interactive map: 10 demo stations + reports, filters, severity
               ranking, station details with sub-score chart, formula section.
report.html    Report form with validation, photo previews, saves a report and
               shows its tracking ID with links to Track and Map.
tracking.html  Search by ID, filter by status, progress timeline per report.
about.html     About, Inspirations, Mission, Learn (water quality, tips),
               Community, FAQ (accordion), Resources, Contact (Microsoft Teams).
home.html, more.html  Old addresses - they now redirect to index.html and
               about.html so old links keep working.

FILES
-----
ecoguard.css / ecoguard.js  Shared header, footer, colours, buttons, badges,
                            scroll animations and the shared report store
                            (window.EcoGuard).
stations.js                 The team's original station data, sub-score
                            formula, weights, severity score and ranking.
                            Used by both the map and the home page.
<page>.css / <page>.js      Styles and scripts for each page
                            (home.*, map.*, report.*, tracking.*, about.css).
assets/ecoguard-logo.png    Logo.
assets/images/              Photos - see assets/images/IMAGE-GUIDE.txt.
_original-backup/           The team's untouched original files. Do not edit.

RESETTING DEMO DATA
-------------------
The Track Reports page has a button to clear your own saved reports. Or, in
the browser DevTools console: localStorage.removeItem("ecoguard.reports.v1")
The six sample reports (EG-2026-001 to 006) are always shown as "Demo".

DESIGN NOTES
------------
- Font: Times New Roman on every page.
- Animations are switched off automatically when the device asks for
  reduced motion.
- Tested at 1440, 1280, 768 and 390 px wide with no sideways scrolling.
