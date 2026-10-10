// Bolster app shell for concepts: top bar, icon rail, section sidebar and phone tab bar,
// with the live product's sections and labels (read from next.bolsterbuilt.com, Oct 2026).
// Usage, in a page that has <div class="app-shell"><main class="app-main">…</main></div>:
//   BolsterShell.mount({ current: "job-list", links: { "job-list": "#jobs" } });
//   BolsterShell.setCurrent("invoices");
// Items without a link exist for realism and say they're not built yet.
// Icons in page markup: <i data-icon="refresh-cw"></i> is swapped for the SVG on mount.

window.BolsterShell = (() => {
  const icon = window.BolsterIcons;
  const ASSETS = new URL("./assets/", document.currentScript.src).href;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const COMPANY = "Ridgeline Drywall & Insulation";
  const USER = { name: "Hello Mublejam", initials: "HM", color: 1 };

  const NAV = {
    main: [
      { id: "getting-started", label: "Getting started", icon: "sunrise" },
      { id: "dashboard", label: "Dashboard", icon: "gauge" },
      { id: "jobs", label: "Jobs", icon: "drafting-compass", items: [
        { id: "pipeline", label: "Pipeline", icon: "columns-3" },
        { id: "job-list", label: "Job list", icon: "wrench" },
        "-",
        { id: "tasks", label: "Tasks", icon: "clipboard-list" },
        { id: "timeline", label: "Timeline", icon: "chart-gantt" },
        { id: "calendar", label: "Calendar", icon: "calendar" },
        "-",
        { id: "bid-requests", label: "Bid requests", icon: "send" },
        { id: "vendor-orders", label: "Vendor orders", icon: "package" },
        { id: "expenses", label: "Expenses", icon: "receipt" },
        { id: "subs-and-vendors", label: "Subs & vendors", icon: "truck" },
      ] },
      { id: "financial", label: "Financial", icon: "banknote", items: [
        { id: "overview", label: "Overview", icon: "chart-line" },
        { id: "business-account", label: "Business account", icon: "landmark" },
        { id: "customer-payments", label: "Customer payments", icon: "banknote" },
        { id: "invoices", label: "Invoices", icon: "file-text" },
        { id: "reports", label: "Reports", icon: "table" },
      ] },
      { id: "customers", label: "Customers", icon: "users", items: [
        { id: "leads-and-customers", label: "Leads and customers", icon: "contact" },
        { id: "appointments", label: "Appointments", icon: "calendar-check" },
      ] },
      { id: "marketing", label: "Marketing", icon: "megaphone" },
    ],
    bottom: [
      { id: "messages", label: "Messages", icon: "radio" },
      { id: "files", label: "Files", icon: "folder" },
      { id: "settings", label: "Settings", icon: "settings", groups: [
        { label: "General", items: [
          { id: "company-settings", label: "Company settings", icon: "briefcase" },
          { id: "estimating-settings", label: "Estimating settings", icon: "calculator" },
          { id: "schedule-settings", label: "Schedule settings", icon: "calendar" },
        ] },
        { label: "Assets", items: [
          { id: "catalog", label: "Catalog", icon: "book-open" },
          { id: "labor-rates", label: "Labor rates", icon: "hard-hat" },
          { id: "dimensions", label: "Dimensions", icon: "pencil-ruler" },
          { id: "tax-rates", label: "Tax rates", icon: "percent" },
          { id: "presentation-themes", label: "Presentation themes", icon: "palette" },
          { id: "construction-stages", label: "Construction stages", icon: "chart-gantt" },
        ] },
        { label: "Financial", items: [
          { id: "verification-settings", label: "Verification settings", icon: "badge-check" },
          { id: "payment-settings", label: "Payment settings", icon: "credit-card" },
        ] },
        { label: "Team", items: [
          { id: "users", label: "Users", icon: "user" },
          { id: "groups", label: "Groups", icon: "users" },
          { id: "roles", label: "Roles", icon: "lock" },
        ] },
        { label: "Integrations", closed: true, items: [{ id: "all-integrations", label: "All integrations", icon: "plug" }] },
        { label: "Your settings", closed: true, items: [{ id: "your-profile", label: "Profile", icon: "user-cog" }] },
        { label: "Import tools", closed: true, items: [{ id: "imports", label: "Imports", icon: "upload" }] },
      ] },
      { id: "switch-company", label: "Switch company", icon: "arrow-left-right" },
    ],
    phone: ["getting-started", "dashboard", "jobs", "customers"],
  };

  const sections = [...NAV.main, ...NAV.bottom];
  const itemsOf = (s) => (s.items || []).filter((x) => x !== "-").concat((s.groups || []).flatMap((g) => g.items));
  const sectionOf = (itemId) => sections.find((s) => s.id === itemId || itemsOf(s).some((x) => x.id === itemId));
  // the page title is the current menu item's own label (D28): pages ask the shell for it, never type their own
  const label = (itemId) => { const s = sectionOf(itemId); return (s && (s.id === itemId ? s : itemsOf(s).find((x) => x.id === itemId)))?.label || ""; };

  let opts = { current: null, links: {} };
  let shell;

  const href = (id) => opts.links[id] || "#";
  const linkAttrs = (id) => (opts.links[id] ? `href="${opts.links[id]}"` : `href="#" data-not-built="${id}"`);
  const sectionHref = (s) => {
    const built = itemsOf(s).find((x) => opts.links[x.id]);
    return built ? `href="${href(built.id)}"` : `href="#" data-not-built="${s.id}"`;
  };

  function topBar() {
    return `<header class="top-bar bs-top">
      <button class="bs-icon-btn bs-hamburger" type="button" data-toggle-sidebar aria-label="Open menu">${icon("menu")}</button>
      <a class="bs-logo" href="#" data-not-built="home" aria-label="Bolster home"><img src="${ASSETS}bolster-mark.svg" alt=""></a>
      <button class="bs-company" type="button" popovertarget="bs-company-menu" aria-haspopup="menu">${esc(COMPANY)}${icon("chevron-down", 16)}</button>
      <div class="menu" id="bs-company-menu" popover role="menu" aria-label="Company">
        <button class="menu-item" role="menuitem" data-not-built="switch-company">${icon("arrow-left-right", 16)}Switch company</button>
        <button class="menu-item" role="menuitem" data-not-built="company-settings">${icon("briefcase", 16)}Company settings</button>
      </div>
      <button class="top-bar-search" type="button" data-not-built="search">${icon("search", 16)}<span>Search customers, jobs, invoices, files…</span><kbd>⌘K</kbd></button>
      <div class="bs-top-actions">
        <button class="bs-icon-btn" type="button" aria-label="Help" data-not-built="help">${icon("circle-help")}</button>
        <button class="bs-icon-btn bs-assistant" type="button" aria-label="Ask Bolton" data-not-built="assistant"><img src="${ASSETS}bolton-head.svg" alt=""></button>
        <button class="bs-avatar" type="button" popovertarget="bs-user-menu" aria-haspopup="menu" aria-label="${esc(USER.name)}"><span class="avatar" data-color="${USER.color}" aria-hidden="true">${USER.initials}</span></button>
        <div class="menu" id="bs-user-menu" popover role="menu" aria-label="Account">
          <button class="menu-item" role="menuitem" data-not-built="profile">${icon("user", 16)}Edit profile</button>
          <button class="menu-item" role="menuitem" data-not-built="users">${icon("users", 16)}Manage users</button>
          <hr class="menu-separator">
          <button class="menu-item" role="menuitem" data-not-built="logout">Log out</button>
        </div>
      </div>
    </header>`;
  }

  // Bolster's own pin icon (not Font Awesome): a panel with a chevron that points the way it will move
  const PIN_CHEVRON = { out: "M262 168 L362 256 L262 344", in: "M362 168 L262 256 L362 344" };
  const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="18" y="18" width="476" height="476" rx="52"/><line x1="148" y1="18" x2="148" y2="494"/><path stroke-width="44" d="${PIN_CHEVRON.out}"/></svg>`;

  function rail() {
    const item = (s) => `<a class="rail-item" ${sectionHref(s)} data-section="${s.id}">${icon(s.icon)}<span class="rail-label">${esc(s.label)}</span></a>`;
    return `<nav class="rail" aria-label="Main">${NAV.main.map(item).join("")}<span class="rail-spacer"></span>${NAV.bottom.map(item).join("")}<hr class="rail-separator"><button class="rail-item bs-pin" type="button" aria-pressed="false">${pinIcon}<span class="rail-label">Pin sidebar</span></button></nav>`;
  }

  // The rail widens over the page on hover, after a short pause so passing the mouse across it
  // doesn't flash it open; keyboard focus opens it straight away. Pinned, it stays wide.
  const PIN_KEY = "bolster-concepts:rail-pinned";
  function railBehaviour() {
    const rail = shell.querySelector(".rail");
    const pin = rail.querySelector(".bs-pin");
    const desktop = matchMedia("(min-width: 1024px)");
    const pinned = () => shell.hasAttribute("data-rail-pinned") && desktop.matches;
    let timer;
    const expand = (on, delay = 0) => {
      clearTimeout(timer);
      timer = setTimeout(() => rail.toggleAttribute("data-expanded", on && !pinned()), delay);
    };
    const setPinned = (on) => {
      shell.toggleAttribute("data-rail-pinned", on);
      pin.setAttribute("aria-pressed", on);
      pin.querySelector(".rail-label").textContent = on ? "Unpin sidebar" : "Pin sidebar";
      pin.querySelector("path").setAttribute("d", on ? PIN_CHEVRON.in : PIN_CHEVRON.out);
      try { on ? localStorage.setItem(PIN_KEY, "1") : localStorage.removeItem(PIN_KEY); } catch {}
    };
    try { if (localStorage.getItem(PIN_KEY)) setPinned(true); } catch {}

    rail.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") expand(true, 150); });
    rail.addEventListener("pointerleave", () => expand(false, 100));
    rail.addEventListener("focusin", () => { if (rail.querySelector(":focus-visible")) expand(true); });
    rail.addEventListener("focusout", (e) => { if (!rail.contains(e.relatedTarget)) expand(false); });
    rail.addEventListener("keydown", (e) => { if (e.key === "Escape") expand(false); });
    rail.addEventListener("click", (e) => {
      if (e.target.closest(".bs-pin")) { setPinned(!shell.hasAttribute("data-rail-pinned")); expand(false); return; }
      if (e.target.closest(".rail-item")) expand(false);
    });
  }

  function sidebarHtml(section) {
    const link = (x) => `<a class="sidebar-item" ${linkAttrs(x.id)} data-item="${x.id}">${icon(x.icon, 18)}<span>${esc(x.label)}</span></a>`;
    let body = "";
    if (section.items) body = section.items.map((x) => (x === "-" ? `<hr class="bs-sep">` : link(x))).join("");
    if (section.groups) body = section.groups.map((g) => `<details class="bs-group"${g.closed && !g.items.some((x) => x.id === opts.current) ? "" : " open"}><summary class="sidebar-group">${esc(g.label)}${icon("chevron-down", 14)}</summary>${g.items.map(link).join("")}</details>`).join("");
    return `<h2 class="sidebar-title">${esc(section.label)}</h2>${body}`;
  }

  function bottomBar() {
    const byId = (id) => sections.find((s) => s.id === id);
    return `<nav class="bottom-bar" aria-label="Main">${NAV.phone.map((id) => { const s = byId(id); return `<a class="bottom-bar-item" ${sectionHref(s)} data-section="${s.id}">${icon(s.icon)}${esc(s.label)}</a>`; }).join("")}<a class="bottom-bar-item" href="#" data-toggle-sidebar data-section="more">${icon("ellipsis")}More</a></nav>`;
  }

  function setCurrent(itemId) {
    opts.current = itemId;
    const section = sectionOf(itemId);
    const side = shell.querySelector(".sidebar");
    side.setAttribute("aria-label", section?.label || "Section");
    side.innerHTML = section ? sidebarHtml(section) : "";
    shell.querySelectorAll("[data-item]").forEach((a) => (a.dataset.item === itemId ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    const onPhoneBar = NAV.phone.includes(section?.id);
    shell.querySelectorAll("[data-section]").forEach((a) => {
      const on = a.dataset.section === section?.id || (a.dataset.section === "more" && a.classList.contains("bottom-bar-item") && !onPhoneBar);
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
  }

  function hydrateIcons(root = document) {
    root.querySelectorAll("i[data-icon]").forEach((i) => { i.outerHTML = icon(i.dataset.icon, +i.dataset.size || 20); });
  }

  function toast(message) {
    const region = document.querySelector(".toast-region");
    if (!region) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.dataset.tone = "info";
    t.setAttribute("role", "status");
    t.innerHTML = `<span class="toast-message"></span><button class="toast-close" aria-label="Dismiss">×</button>`;
    t.querySelector(".toast-message").textContent = message;
    t.querySelector(".toast-close").onclick = () => t.remove();
    region.append(t);
    setTimeout(() => t.remove(), 4000);
  }

  function mount(o) {
    opts = { ...opts, ...o };
    shell = document.querySelector(".app-shell");
    shell.insertAdjacentHTML("afterbegin", `${topBar()}${rail()}<nav class="sidebar bs-sidebar" aria-label="Section"></nav>`);
    shell.insertAdjacentHTML("beforeend", bottomBar());
    hydrateIcons();
    setCurrent(opts.current);
    railBehaviour();

    const narrow = matchMedia("(max-width: 1023px)");
    document.addEventListener("click", (e) => {
      const nb = e.target.closest("[data-not-built]");
      if (nb) {
        e.preventDefault();
        const name = nb.getAttribute("aria-label") || nb.textContent.trim() || "That";
        nb.closest("[popover]")?.hidePopover();
        toast(`${name} isn't part of this prototype yet.`);
        return;
      }
      if (e.target.closest("[data-collapse-sidebar]")) {
        if (narrow.matches) shell.querySelector(".sidebar").toggleAttribute("data-open");
        else shell.toggleAttribute("data-sidebar-hidden");
        const btn = e.target.closest("[data-collapse-sidebar]");
        btn.setAttribute("aria-label", shell.hasAttribute("data-sidebar-hidden") ? "Show menu" : "Hide menu");
        return;
      }
      if (e.target.closest(".sidebar a[href^='#']:not([href='#'])")) shell.querySelector(".sidebar").removeAttribute("data-open");
      const side = shell.querySelector(".sidebar[data-open]");
      if (side && narrow.matches && !e.target.closest(".sidebar, [data-toggle-sidebar], [data-collapse-sidebar]")) side.removeAttribute("data-open");
    });
  }

  return { mount, setCurrent, label, hydrateIcons, toast, icon };
})();
