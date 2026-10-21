// Bolster app shell for concepts: top bar, one sidebar with every section (the ones with pages as
// accordions), an icon rail when it's hidden, and Settings as a full-screen window (trying out, D88);
// the live product's sections and labels (read from next.bolsterbuilt.com, Oct 2026). On phones the
// top bar is a footer, and its menu button opens the same sidebar.
// Usage, in a page that has <div class="app-shell"><main class="app-main">…</main></div>:
//   BolsterShell.mount({ current: "job-list", links: { "job-list": "#jobs" } });
//   BolsterShell.setCurrent("invoices");
// Items without a link exist for realism and say they're not built yet.
// Icons in page markup: <i data-icon="refresh-cw"></i> is swapped for the SVG on mount.

window.BolsterShell = (() => {
  const icon = window.BolsterIcons;
  // the app shell's own chrome (top bar, rail, section sidebar, bottom bar) draws Light; the page draws Regular
  // (D84): its own icons are the l- copies, where an icon has one (search and help are Regular in both)
  const chrome = (k, ...a) => icon(`l-${k}`, ...a) || icon(k, ...a);
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
      <button class="bs-icon-btn bs-hamburger" type="button" data-toggle-sidebar aria-label="Open menu" data-tip="Menu">${chrome("menu")}</button>
      <a class="bs-logo" href="#" data-not-built="home" aria-label="Bolster home" data-tip="Home"><img src="${ASSETS}bolster-mark.svg" alt=""></a>
      <button class="bs-company" type="button" popovertarget="bs-company-menu" aria-haspopup="menu">${esc(COMPANY)}${chrome("chevron-down", 16)}</button>
      <div class="menu" id="bs-company-menu" popover role="menu" aria-label="Company">
        <button class="menu-item" role="menuitem" data-not-built="switch-company">${chrome("arrow-left-right", 16)}Switch company</button>
        <button class="menu-item" role="menuitem" data-open-settings="company-settings">${chrome("briefcase", 16)}Company settings</button>
      </div>
      <button class="top-bar-search" type="button" data-not-built="search" data-tip="Search">${chrome("search", 16)}<span>Search customers, jobs, invoices, files…</span><kbd>⌘K</kbd></button>
      <div class="bs-top-actions">
        <button class="bs-icon-btn" type="button" aria-label="Help" data-not-built="help" data-tip="Help">${chrome("circle-help", 18, { optical: true })}</button>
        <button class="bs-icon-btn bs-assistant" type="button" aria-label="Ask Bolton" data-not-built="assistant" data-tip="Ask Bolton"><img src="${ASSETS}bolton-head.svg" alt=""></button>
        <button class="bs-avatar" type="button" popovertarget="bs-user-menu" aria-haspopup="menu" aria-label="${esc(USER.name)}" data-tip="Your account"><span class="avatar" data-color="${USER.color}" aria-hidden="true">${USER.initials}</span></button>
        <div class="menu" id="bs-user-menu" popover role="menu" aria-label="Account">
          <button class="menu-item" role="menuitem" data-not-built="profile">${chrome("user", 16)}Edit profile</button>
          <button class="menu-item" role="menuitem" data-not-built="users">${chrome("users", 16)}Manage users</button>
          <hr class="menu-separator">
          <button class="menu-item" role="menuitem" data-not-built="logout">Log out</button>
        </div>
      </div>
    </header>`;
  }


  function rail() {
    const item = (s) => s.id === "settings"
      ? `<button class="rail-item" type="button" data-open-settings data-section="${s.id}">${chrome(s.icon)}<span class="rail-label">${esc(s.label)}</span></button>`
      : `<a class="rail-item" ${sectionHref(s)} data-section="${s.id}">${chrome(s.icon)}<span class="rail-label">${esc(s.label)}</span></a>`;
    return `<nav class="rail" aria-label="Main">${NAV.main.map(item).join("")}<span class="rail-spacer"></span>${NAV.bottom.map(item).join("")}</nav>`;
  }

  // The rail widens over the page on hover, after a short pause so passing the mouse across it
  // doesn't flash it open; keyboard focus opens it straight away. Pinned, it stays wide.
  function railBehaviour() {
    const rail = shell.querySelector(".rail");
    const desktop = matchMedia("(min-width: 1024px)");
    let timer;
    const expand = (on, delay = 0) => {
      clearTimeout(timer);
      timer = setTimeout(() => rail.toggleAttribute("data-expanded", on), delay);
    };

    // trying out: with the section sidebar hidden, a category's own pages open beside the expanded rail as you
    // point at it (the second level, on hover, and only then); pointing away from both closes it
    const flyout = document.createElement("nav");
    flyout.className = "bs-flyout"; flyout.hidden = true; flyout.setAttribute("aria-label", "Section");
    shell.append(flyout);
    let flyTimer, flyFor = null;
    const hidden = () => shell.hasAttribute("data-sidebar-hidden") && desktop.matches;
    const fly = (id, delay = 0) => {
      clearTimeout(flyTimer);
      flyTimer = setTimeout(() => {
        const s = id && sections.find((x) => x.id === id);
        if (!s || !hidden() || !(s.items || s.groups)) { flyout.hidden = true; flyFor = null; return; }
        if (flyFor !== id) { flyout.innerHTML = sidebarHtml(s); flyFor = id; }
        flyout.hidden = false;
      }, delay);
    };
    rail.addEventListener("pointerover", (e) => { if (e.pointerType !== "mouse" || !hidden()) return; const item = e.target.closest(".rail-item[data-section]"); if (item) fly(item.dataset.section, rail.hasAttribute("data-expanded") ? 60 : 200); });
    flyout.addEventListener("pointerenter", () => { clearTimeout(flyTimer); expand(true); });
    flyout.addEventListener("pointerleave", (e) => { if (!rail.contains(e.relatedTarget)) { fly(null, 150); expand(false, 150); } });
    flyout.addEventListener("click", (e) => { if (e.target.closest("a")) { fly(null); expand(false); } });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !flyout.hidden) { fly(null); expand(false); } });

    rail.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") expand(true, 150); });
    rail.addEventListener("pointerleave", (e) => { if (flyout.contains(e.relatedTarget)) return; expand(false, 100); fly(null, 100); });
    rail.addEventListener("focusin", () => { if (rail.querySelector(":focus-visible")) expand(true); });
    rail.addEventListener("focusout", (e) => { if (!rail.contains(e.relatedTarget)) expand(false); });
    rail.addEventListener("keydown", (e) => { if (e.key === "Escape") expand(false); });
    rail.addEventListener("click", (e) => {
      if (e.target.closest(".rail-item")) expand(false);
    });
  }


  // The one sidebar (D88): every section; one with pages is an accordion (one open at a time, the current
  // page's open on arrival), its pages as text in line with the labels; Settings opens its own window.
  // A page can add entries for phones at the end (data-more-entry="Label" on the element they open).
  function navHtml() {
    const cur = sectionOf(opts.current)?.id;
    const page = (x) => `<a class="sidebar-item bs-sub" ${linkAttrs(x.id)} data-item="${x.id}"${x.id === opts.current ? ' aria-current="page"' : ""}><span>${esc(x.label)}</span></a>`;
    const row = (s) => {
      const head = `${chrome(s.icon, 18)}<span>${esc(s.label)}</span>`;
      if (s.id === "settings") return `<button type="button" class="sidebar-item" data-open-settings>${head}</button>`;
      if (s.items) return `<details class="bs-acc" name="bs-nav"${s.id === cur ? " open" : ""}><summary class="sidebar-item">${head}</summary><div class="bs-acc-body">${s.items.map((x) => (x === "-" ? `<span class="bs-gap" aria-hidden="true"></span>` : page(x))).join("")}</div></details>`;
      return `<a class="sidebar-item" ${sectionHref(s)} data-section="${s.id}"${s.id === cur ? ' aria-current="page"' : ""}>${head}</a>`;
    };
    const extra = [...document.querySelectorAll("[data-more-entry]")].map((el) => `<button type="button" class="sidebar-item bs-extra" data-more-open="${el.id}">${chrome(el.dataset.moreIcon || "sliders", 18)}<span>${esc(el.dataset.moreEntry)}</span></button>`).join("");
    return `<div class="bs-nav-main">${NAV.main.map(row).join("")}</div><div class="bs-nav-bottom">${NAV.bottom.map(row).join("")}${extra}</div>`;
  }

  // Settings, a full-screen window with its own navigation (D88), as the job's workspace is
  function settingsHtml() {
    const s = sections.find((x) => x.id === "settings");
    const nav = s.groups.map((g) => `<p class="sidebar-group">${esc(g.label)}</p>${g.items.map((x) => `<button type="button" class="sidebar-item" data-settings-page="${x.id}">${icon(x.icon, 18)}<span>${esc(x.label)}</span></button>`).join("")}`).join("");
    return `<dialog class="dialog bs-settings" data-variant="workspace" id="bs-settings" aria-labelledby="bs-settings-t">
      <header class="dialog-header"><h2 id="bs-settings-t">Settings</h2>
        <button class="button" data-variant="ghost" data-size="sm" data-icon-only data-close aria-label="Close settings" data-tip="Close settings" style="--_fg:var(--color-content-on-chrome-muted);--_fg-hover:var(--color-content-on-chrome);--_bg-hover:var(--color-surface-chrome-hover)">${icon("xmark", 16)}</button></header>
      <div class="dialog-body"><nav class="sidebar bs-settings-nav" aria-label="Settings">${nav}</nav><section class="bs-settings-page" aria-live="polite"></section></div>
    </dialog>`;
  }
  function openSettings(pageId) {
    const d = document.getElementById("bs-settings"), all = sections.find((x) => x.id === "settings").groups.flatMap((g) => g.items);
    const show = (id) => {
      const x = all.find((i) => i.id === id) || all[0];
      d.querySelectorAll("[data-settings-page]").forEach((b) => (b.dataset.settingsPage === x.id ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
      const built = opts.links[x.id];
      d.querySelector(".bs-settings-page").innerHTML = `<h3>${esc(x.label)}</h3>${built ? `<p class="text-secondary">${esc(x.label)} is a page of its own in this prototype.</p><a class="button" data-variant="secondary" href="${built}" data-close-settings>Open ${esc(x.label.toLowerCase())}</a>` : `<p class="text-secondary">${esc(x.label)} isn't part of this prototype yet.</p>`}`;
    };
    show(pageId);
    if (!d.open) d.showModal();
    d.onclick = (e) => {
      const b = e.target.closest("[data-settings-page]");
      if (b) show(b.dataset.settingsPage);
      if (e.target.closest("[data-close-settings]")) d.close();
    };
  }

  function sidebarHtml(section) {
    const link = (x) => `<a class="sidebar-item" ${linkAttrs(x.id)} data-item="${x.id}"${x.id === opts.current ? ' aria-current="page"' : ""}>${chrome(x.icon, 18)}<span>${esc(x.label)}</span></a>`;
    let body = "";
    if (section.items) body = section.items.map((x) => (x === "-" ? `<hr class="bs-sep">` : link(x))).join("");
    if (section.groups) body = section.groups.map((g) => `<details class="bs-group"${g.closed && !g.items.some((x) => x.id === opts.current) ? "" : " open"}><summary class="sidebar-group">${esc(g.label)}${chrome("chevron-down", 14)}</summary>${g.items.map(link).join("")}</details>`).join("");
    return `<h2 class="sidebar-title">${esc(section.label)}</h2>${body}`;
  }


  function setCurrent(itemId) {
    opts.current = itemId;
    const section = sectionOf(itemId);
    const side = shell.querySelector(".sidebar");
    side.setAttribute("aria-label", "Main");
    side.innerHTML = navHtml();
    shell.querySelectorAll("[data-item]").forEach((a) => (a.dataset.item === itemId ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    shell.querySelectorAll(".rail [data-section]").forEach((a) => (a.dataset.section === section?.id ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  }

  function hydrateIcons(root = document) {
    root.querySelectorAll("i[data-icon]").forEach((i) => { i.outerHTML = icon(i.dataset.icon, +i.dataset.size || 20, { optical: "optical" in i.dataset }); });
  }

  // A toast, every page's: BolsterShell.toast("Task completed", { undo: () => … }). With Undo it stays a
  // little longer. Over an open sheet or dialog (a modal one covers everything outside it) the toasts move
  // in, and back out when it closes.
  function toast(message, { undo } = {}) {
    const region = document.querySelector(".toast-region");
    if (!region) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.dataset.tone = "info";
    t.setAttribute("role", "status");
    t.innerHTML = `<span class="toast-message"></span>${undo ? `<button class="toast-action">Undo</button>` : ""}<button class="toast-close" aria-label="Dismiss" data-tip="Dismiss">×</button>`;
    t.querySelector(".toast-message").textContent = message;
    t.querySelector(".toast-close").onclick = () => t.remove();
    if (undo) t.querySelector(".toast-action").onclick = () => { undo(); t.remove(); };
    const host = [...document.querySelectorAll("dialog:modal")].pop() || document.body;
    if (region.parentElement !== host) host.append(region);
    region.append(t);
    setTimeout(() => t.remove(), undo ? 5000 : 4000);
  }
  document.addEventListener("close", (e) => { const region = document.querySelector(".toast-region"); if (region && e.target.contains?.(region)) document.body.append(region); }, true);

  // The week, every page's (D76): it starts on Monday, the working week first and the weekend together at
  // its end. Whatever draws a month, groups by week or moves by week asks here, never getDay() itself.
  //   BolsterShell.week.dayOf(date) → 0 for Monday … 6 for Sunday;  week.start(date) → that week's Monday
  const week = {
    names: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    dayOf: (d) => (d.getDay() + 6) % 7,
    start: (d) => { const x = new Date(d); x.setDate(x.getDate() - week.dayOf(x)); return x; },
  };

  // Where a .pop opens, every page's: under its trigger, its left edge at the trigger's (start) or its right
  // edge at the trigger's right (the default), flipped above when there's no room below; on phones it's a
  // bottom sheet (popover.css), so it's left where the stylesheet puts it.
  //   BolsterShell.placePopover(pop, trigger, { start: true });
  const phoneWidth = matchMedia("(max-width: 767px)");
  function placePopover(pop, a, { start = false } = {}) {
    if (phoneWidth.matches || !a) { pop.style.left = pop.style.top = ""; return; }
    const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.max(12, Math.min(start ? r.left : r.right - w, innerWidth - w - 12));
    let top = r.bottom + 4;
    if (top + h > innerHeight - 12 && r.top - h - 4 > 12) top = r.top - h - 4;
    pop.style.left = `${left}px`; pop.style.top = `${Math.max(12, top)}px`;
  }


  // The canvas grid, every page's background (D81, shell.css): the shell puts its two layers in the main area,
  // sizes the cells from the page header and eases a light toward the pointer, one write per frame, on the
  // layers alone. data-grid="off" on the root (Concept controls, kept in this browser) turns it off. The
  // list's grid panel tunes it: canvas.set({ div, trail }); the rest are --net-* properties on the root.
  const canvas = (() => {
    const v = { div: 2, trail: 0.8 };
    let cell = () => {};
    function start() {
      const main = document.querySelector(".app-main"), head = main?.querySelector(".page-header");
      if (!main) return;
      try { if (localStorage.getItem("bolster-concepts:grid") === "off") document.documentElement.dataset.grid = "off"; } catch {}
      if (!main.querySelector(":scope > .canvas-layers")) main.insertAdjacentHTML("afterbegin", '<div class="canvas-layers" aria-hidden="true"><div class="canvas-glow"></div><div class="canvas-net"></div></div>');
      const layers = main.querySelector(":scope > .canvas-layers"), net = layers.querySelector(".canvas-net"), lay = layers.style;
      cell = () => head && document.documentElement.style.setProperty("--net-cell", `${head.offsetHeight / v.div}px`);
      if (head) new ResizeObserver(() => cell()).observe(head);
      const still = matchMedia("(prefers-reduced-motion: reduce)");
      let px = 0, py = 0, x = 0, y = 0, raf = 0, placed = false, over = false;
      const tick = () => {
        raf = 0;
        const n = net.getBoundingClientRect();
        // how far the layers have stuck below the top of the page, so the pattern stays on the page
        lay.setProperty("--_oy", `${Math.round(n.top - main.getBoundingClientRect().top)}px`);
        if (!over) return;
        const tx = px - n.left, ty = py - n.top, k = still.matches ? 0 : v.trail;
        if (!placed) { x = tx; y = ty; placed = true; }
        x += (tx - x) * (1 - k); y += (ty - y) * (1 - k);
        lay.setProperty("--_nx", `${x.toFixed(1)}px`); lay.setProperty("--_ny", `${y.toFixed(1)}px`);
        if (Math.abs(tx - x) + Math.abs(ty - y) > 0.3) go();
      };
      const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
      main.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch" || document.documentElement.dataset.grid === "off") return;
        px = e.clientX; py = e.clientY; over = true;
        lay.setProperty("--_vis", "1");
        go();
      });
      main.addEventListener("pointerleave", () => { lay.setProperty("--_vis", "0"); over = placed = false; });
      addEventListener("scroll", go, { passive: true });
      addEventListener("resize", go);
      go();
    }
    return { start, set: (o) => { Object.assign(v, o); cell(); }, get: () => ({ ...v }) };
  })();

  function mount(o) {
    opts = { ...opts, ...o };
    shell = document.querySelector(".app-shell");
    shell.insertAdjacentHTML("afterbegin", `${topBar()}${rail()}<nav class="sidebar bs-sidebar" aria-label="Main"></nav>`);
    // no tab bar on phones (D88): the menu button opens the same sidebar
    document.body.insertAdjacentHTML("beforeend", settingsHtml());
    hydrateIcons();
    setCurrent(opts.current);
    railBehaviour();
    canvas.start();

    const narrow = matchMedia("(max-width: 1023px)");
    const phone = matchMedia("(max-width: 767px)");
    document.addEventListener("click", (e) => {
      const nb = e.target.closest("[data-not-built]");
      if (nb) {
        e.preventDefault();
        const name = nb.getAttribute("aria-label") || nb.textContent.trim() || "That";
        nb.closest("[popover]")?.hidePopover();
        toast(`${name} isn't part of this prototype yet.`);
        return;
      }
      const side0 = shell.querySelector(".sidebar");
      // Settings, from the sidebar, the rail or the company menu: its own window (D88)
      const set = e.target.closest("[data-open-settings]");
      if (set) {
        e.preventDefault();
        set.closest("[popover]")?.hidePopover();
        side0.removeAttribute("data-open");
        shell.querySelectorAll("[data-toggle-sidebar]").forEach((b) => b.setAttribute("aria-expanded", false));
        openSettings(set.dataset.openSettings);
        return;
      }
      // the menu button: specimen.js has just toggled the overlay; it's the same sidebar at every width
      if (e.target.closest("[data-toggle-sidebar]")) {
        e.preventDefault();
        const open = side0.hasAttribute("data-open");
        if (open) side0.innerHTML = navHtml();
        shell.querySelectorAll("[data-toggle-sidebar]").forEach((b) => b.setAttribute("aria-expanded", open));
        return;
      }
      const extra = e.target.closest("[data-more-open]");
      if (extra) {
        side0.removeAttribute("data-open");
        shell.querySelectorAll("[data-toggle-sidebar]").forEach((b) => b.setAttribute("aria-expanded", false));
        const el = document.getElementById(extra.dataset.moreOpen);
        if (el) { el.open = true; el.querySelector("summary")?.focus(); }
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

  // What stays on screen as you scroll (option D of the "What stays on screen" board; D73), the shell's for
  // every page, so every page does the same: the page says where its content starts (into: true once
  // you've scrolled into it) and what else it keeps in use; the shell hides the top bar (and on phones the
  // tab bar, list-page.css) as you scroll down, brings them back as you scroll up, when a menu, a sheet or
  // the sidebar is open, or when focus goes up there, and keeps what sticks under them in place:
  // --list-toolbar-top is the top bar's height, --list-head-top that plus the page's sticky toolbar, if any.
  //   const chrome = BolsterShell.scrolling({ into: (top) => el.getBoundingClientRect().top < top, toolbar, busy, onScroll });
  function scrolling({ into, toolbar = null, busy = () => false, onScroll = () => {} }) {
    const html = document.documentElement, top = document.querySelector(".top-bar"), DOWN = 24, UP = 6;
    const set = (hidden) => { if (html.hasAttribute("data-chrome-hidden") !== hidden) html.toggleAttribute("data-chrome-hidden", hidden); };
    // what sticks under the top bar sits that far down; on phones the top bar is a footer (D88), so nothing
    // is above, unless the selection's bar has taken the top (D39) while rows are ticked
    const phone = matchMedia("(max-width: 767px)");
    const selectTop = () => document.body.hasAttribute("data-selecting") && html.hasAttribute("data-head-out") && !html.hasAttribute("data-chrome-hidden") && !!document.querySelector(".select-bar:not([hidden])");
    const stick = () => {
      const h = !phone.matches ? top.offsetHeight : selectTop() ? top.offsetHeight : 0;
      html.style.setProperty("--list-toolbar-top", `${h}px`);
      html.style.setProperty("--list-head-top", `${h + (toolbar && !toolbar.hidden ? toolbar.offsetHeight : 0)}px`);
    };
    new ResizeObserver(stick).observe(top);
    if (toolbar) new ResizeObserver(stick).observe(toolbar);
    addEventListener("resize", stick);
    phone.addEventListener("change", stick);
    new MutationObserver(stick).observe(html, { attributes: true, attributeFilter: ["data-head-out", "data-chrome-hidden"] });
    new MutationObserver(stick).observe(document.body, { attributes: true, attributeFilter: ["data-selecting"] });
    stick();
    const inUse = () => !!document.querySelector(":popover-open, dialog[open], .sidebar[data-open]") || !!document.activeElement?.closest?.(".top-bar") || !!toolbar?.contains(document.activeElement) || busy();
    let lastY = scrollY, travel = 0;
    addEventListener("scroll", () => {
      onScroll();
      const y = scrollY, dy = y - lastY;
      lastY = y;
      if (!into(phone.matches ? 0 : top.offsetHeight) || inUse()) { travel = 0; return set(false); }
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (travel > DOWN) set(true);
      else if (travel < -UP) set(false);
    }, { passive: true });
    // tabbing into the top bar or the page's toolbar brings them back
    document.addEventListener("focusin", (e) => { if (e.target.closest?.(".top-bar") || toolbar?.contains(e.target)) set(false); });
    return { show: () => set(false), stick };
  }

  return { mount, setCurrent, label, hydrateIcons, toast, placePopover, icon, scrolling, week, canvas };
})();
