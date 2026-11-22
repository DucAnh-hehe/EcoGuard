/* =========================================================
   ECOGUARD | REPORT POLLUTION PAGE SCRIPT
   - Photo previews (multiple files, each can be removed)
   - Form validation with clear messages (success is NEVER shown if invalid)
   - Saves the report to localStorage through window.EcoGuard
========================================================= */
(() => {
    "use strict";

    const EG = window.EcoGuard;
    const form = document.getElementById("pollutionForm");
    if (!form || !EG) return;

    const photoInput = document.getElementById("photos");
    const imagePreview = document.getElementById("imagePreview");
    const successPanel = document.getElementById("successMessage");
    const errorBox = document.getElementById("formErrors");
    const dateInput = document.getElementById("date");
    const description = document.getElementById("description");
    const descriptionCount = document.getElementById("description-count");

    const MAX_PHOTOS = 6;
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png"];
    const MIN_DESCRIPTION = 20;

    // Photos the user has chosen: [{ file, url }]
    let photos = [];

    // The observed date cannot be in the future.
    dateInput.max = EG.todayISO();

    /* ---------- Photo previews ---------- */
    function renderPreviews() {
        imagePreview.innerHTML = "";
        photos.forEach((photo, index) => {
            const item = document.createElement("figure");
            item.className = "preview-item";
            item.innerHTML = `
                <img src="${photo.url}" alt="Preview of uploaded evidence: ${EG.escapeHTML(photo.file.name)}" class="preview-image">
                <figcaption>${EG.escapeHTML(photo.file.name)}</figcaption>
                <button type="button" class="preview-remove" data-index="${index}" aria-label="Remove ${EG.escapeHTML(photo.file.name)}">&times;</button>`;
            imagePreview.appendChild(item);
        });
    }

    photoInput.addEventListener("change", () => {
        const rejected = [];
        Array.from(photoInput.files).forEach((file) => {
            if (!ALLOWED_TYPES.includes(file.type)) { rejected.push(`${file.name} is not a JPG or PNG image`); return; }
            if (file.size > MAX_SIZE) { rejected.push(`${file.name} is larger than 5 MB`); return; }
            if (photos.length >= MAX_PHOTOS) { rejected.push(`${file.name} was skipped (maximum ${MAX_PHOTOS} photos)`); return; }
            // Skip duplicates (same name and size).
            if (photos.some((p) => p.file.name === file.name && p.file.size === file.size)) return;
            photos.push({ file, url: URL.createObjectURL(file) });
        });
        // Clear the input so the same file can be chosen again after removal.
        photoInput.value = "";
        renderPreviews();
        setFieldError(photoInput, rejected.length ? rejected.join(". ") + "." : "");
    });

    imagePreview.addEventListener("click", (event) => {
        const button = event.target.closest(".preview-remove");
        if (!button) return;
        const [removed] = photos.splice(Number(button.dataset.index), 1);
        if (removed) URL.revokeObjectURL(removed.url);
        renderPreviews();
        EG.toast("Photo removed.");
    });

    function clearPhotos() {
        photos.forEach((photo) => URL.revokeObjectURL(photo.url));
        photos = [];
        renderPreviews();
    }

    /* ---------- Description character counter ---------- */
    function updateCount() {
        const length = description.value.trim().length;
        descriptionCount.textContent = length >= MIN_DESCRIPTION
            ? `${length} characters`
            : `${length} / at least ${MIN_DESCRIPTION} characters`;
        descriptionCount.classList.toggle("is-ok", length >= MIN_DESCRIPTION);
    }
    description.addEventListener("input", updateCount);

    /* ---------- Validation ---------- */
    function setFieldError(field, message) {
        const errorEl = document.getElementById(`${field.id}-error`);
        if (errorEl) errorEl.textContent = message;
        field.classList.toggle("is-invalid", Boolean(message));
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
    }

    // Returns a list of { field, message } for every problem found.
    function validate() {
        const problems = [];
        const value = (id) => document.getElementById(id).value.trim();
        const add = (id, message) => problems.push({ field: document.getElementById(id), message });

        if (!value("source")) add("source", "Please choose the type of water source.");
        if (!value("pollutionType")) add("pollutionType", "Please choose the suspected pollution type.");

        if (!value("location")) add("location", "Please enter where you observed the pollution.");
        else if (value("location").length < 3) add("location", "Please enter a more specific location (at least 3 characters).");

        const date = value("date");
        if (!date) add("date", "Please enter the date you observed the pollution.");
        else if (date > EG.todayISO()) add("date", "The observed date cannot be in the future.");

        if (photos.length === 0) add("photos", "Please upload at least one JPG or PNG photo.");

        const text = value("description");
        if (!text) add("description", "Please describe what you observed.");
        else if (text.length < MIN_DESCRIPTION) add("description", `Please add a little more detail (at least ${MIN_DESCRIPTION} characters).`);

        const email = value("email");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) add("email", "Please enter a valid email address, or leave it empty.");

        return problems;
    }

    function showErrors(problems) {
        // Clear previous messages first.
        form.querySelectorAll(".is-invalid").forEach((field) => setFieldError(field, ""));
        problems.forEach(({ field, message }) => setFieldError(field, message));

        if (!problems.length) { errorBox.hidden = true; errorBox.innerHTML = ""; return; }

        errorBox.innerHTML = `<strong>Please fix ${problems.length} ${problems.length === 1 ? "problem" : "problems"} before submitting:</strong>
            <ul>${problems.map((p) => `<li><a href="#${p.field.id}">${EG.escapeHTML(p.message)}</a></li>`).join("")}</ul>`;
        errorBox.hidden = false;
        errorBox.focus({ preventScroll: true });
        problems[0].field.focus({ preventScroll: true });
        problems[0].field.scrollIntoView({ behavior: EG.reduceMotion ? "auto" : "smooth", block: "center" });
    }

    // Links inside the error summary move focus to the field.
    errorBox.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;
        event.preventDefault();
        const field = document.querySelector(link.getAttribute("href"));
        if (field) { field.focus(); field.scrollIntoView({ block: "center" }); }
    });

    // Re-check a field as soon as the user fixes it.
    form.addEventListener("input", (event) => {
        if (!event.target.classList.contains("is-invalid")) return;
        const stillWrong = validate().find((p) => p.field === event.target);
        setFieldError(event.target, stillWrong ? stillWrong.message : "");
    });
    form.addEventListener("change", (event) => {
        if (!event.target.classList.contains("is-invalid") || event.target === photoInput) return;
        const stillWrong = validate().find((p) => p.field === event.target);
        setFieldError(event.target, stillWrong ? stillWrong.message : "");
    });

    /* ---------- Small photo thumbnails for the Track page ---------- */
    function makeThumbnail(file) {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const scale = Math.min(1, 240 / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    }

    /* ---------- Submit ---------- */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const problems = validate();
        showErrors(problems);
        if (problems.length) {
            successPanel.hidden = true;
            successPanel.classList.remove("is-visible");
            return; // Never show success when validation fails.
        }

        const submitButton = form.querySelector(".submit-report-btn");
        submitButton.disabled = true;
        submitButton.textContent = "Saving…";

        const get = (id) => document.getElementById(id).value.trim();
        const category = get("pollutionType");
        const typeLabel = EG.CATEGORY_LABEL[category];
        const location = get("location");
        const id = EG.nextId();
        const place = EG.guessLocation(location, id);
        const today = EG.todayISO();
        const thumbnails = (await Promise.all(photos.slice(0, 3).map((p) => makeThumbnail(p.file)))).filter(Boolean);

        const report = {
            id,
            title: `${typeLabel} near ${location}`,
            location,
            lat: place.lat,
            lng: place.lng,
            approx: true,
            locationMatched: place.matched,
            category,
            typeLabel,
            source: get("source"),
            description: get("description"),
            additional: get("additional"),
            dateObserved: get("date"),
            submitted: today,
            status: "Submitted",
            severity: "Unassessed",
            history: [{ status: "Submitted", date: today, note: "Report saved in this browser. In this prototype it is not sent to any authority." }],
            reporter: get("reporter"),
            email: get("email"),
            photoCount: photos.length,
            thumbnails,
            demo: false
        };

        const saved = EG.saveReport(report);
        submitButton.disabled = false;
        submitButton.textContent = "Submit Report";

        if (!saved) {
            errorBox.innerHTML = "<strong>Your report could not be saved.</strong> Your browser may be blocking local storage (for example in private mode). Please try again in a normal window.";
            errorBox.hidden = false;
            errorBox.focus();
            return;
        }

        // Show the success panel with the new tracking ID.
        document.getElementById("successId").textContent = id;
        document.getElementById("trackLink").href = `tracking.html?id=${encodeURIComponent(id)}`;
        document.getElementById("mapLink").href = `map.html?report=${encodeURIComponent(id)}`;
        form.hidden = true;
        successPanel.hidden = false;
        successPanel.classList.add("is-visible");
        successPanel.focus({ preventScroll: true });
        successPanel.scrollIntoView({ behavior: EG.reduceMotion ? "auto" : "smooth", block: "center" });

        form.reset();
        clearPhotos();
        updateCount();
    });

    // "Submit Another Report" brings the empty form back.
    document.getElementById("newReportBtn").addEventListener("click", () => {
        successPanel.hidden = true;
        successPanel.classList.remove("is-visible");
        form.hidden = false;
        form.classList.add("is-visible");
        document.getElementById("source").focus();
    });
})();
