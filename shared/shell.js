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
      <a class="bs-logo" href="#" data-not-built="home" aria-label="Bolster home" data-tip="Home">${LOGO}</a>
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


  // The logo grows from the mark into the wordmark as the menu opens, and back as it closes (D91): both stand on one
  // yellow plate with a notch at its bottom right, nearly the same width at the same height, so the plate stretches
  // to the right and the notch rides out with it; the mark's cut-out turns into the B; the other letters rise into
  // place one after another as the plate reaches them. Drawn in the wordmark's units (32 tall); one number, from 0
  // (the mark) to 1 (the wordmark), draws it all. Settled in a playground (21 Oct): the menu's ease-out, 420ms.
  const LETTERS = ["M8.25391 6.30725H16.3611C19.6264 6.30725 22.0888 8.91092 22.0888 11.7915C22.0888 13.5364 21.12 15.1429 19.5984 15.9181C21.4246 16.6384 22.5317 18.4383 22.5317 20.4607C22.5317 23.2303 20.1523 25.9724 16.7766 25.9724H8.25391V6.30725ZM16.0015 14.5056C17.5785 14.5056 18.5193 13.2595 18.5193 12.0129C18.5193 10.7113 17.5785 9.52022 16.0015 9.52022H11.685V14.5056H16.0015ZM16.444 22.7314C17.9935 22.7314 18.9623 21.6238 18.9623 20.2662C18.9623 18.8536 18.0769 17.718 16.3062 17.718H11.685V22.7308H16.444V22.7314Z", "M23.3047 18.2998C23.3047 13.7852 26.957 10.2399 31.4398 10.2399C35.9227 10.2399 39.575 13.7852 39.575 18.2998C39.575 22.7033 35.9227 26.3596 31.4398 26.3596C26.957 26.3596 23.3047 22.7033 23.3047 18.2998ZM36.1439 18.2998C36.1439 15.3362 34.0411 13.5083 31.4398 13.5083C28.8666 13.5083 26.7913 15.3362 26.7913 18.2998C26.7913 21.1523 28.8666 23.0912 31.4398 23.0912C34.0411 23.0912 36.1439 21.1523 36.1439 18.2998Z", "M41.0137 6.30725H44.4448V25.9444H41.0137V6.30725Z", "M45.9941 21.4574H49.4527C49.4802 22.4545 50.4764 23.1743 51.7493 23.1743C53.1051 23.1743 53.963 22.5095 53.963 21.5123C53.963 20.2382 52.6072 19.9613 51.2235 19.6014C48.3456 18.8812 46.2982 17.6906 46.2982 14.893C46.2982 12.2618 48.6777 10.2125 51.8047 10.2125C54.8209 10.2125 57.3112 12.2899 57.3112 15.004L53.8527 14.9765C53.8527 13.9518 52.8839 13.37 51.8047 13.37C50.6982 13.37 49.7574 13.9238 49.7574 14.8655C49.7574 16.0011 51.0857 16.278 52.4689 16.6379C54.5168 17.1642 57.3387 17.8565 57.3387 21.4574C57.3387 24.1715 54.7929 26.3598 51.6939 26.3598C48.429 26.3598 45.9941 24.144 45.9941 21.4574Z", "M59.8852 13.8683H57.5332V10.6278H59.8852V6.30725H63.3438V10.6278H65.7787V13.8683H63.3438V22.7034H65.6958V25.9444H59.8847V13.8683H59.8852Z", "M66.2752 18.2169C66.2752 13.7299 69.9276 10.2125 74.6041 10.2125C79.2807 10.2125 82.9331 13.7299 82.9331 18.3279C82.9331 18.5773 82.9056 19.0202 82.8222 19.4355H69.983C70.3705 21.5403 72.335 23.1193 74.6596 23.1193C76.4857 23.1193 78.0078 22.2606 78.7274 20.7096H82.5461C81.467 24.0055 78.4233 26.3598 74.6047 26.3598C69.9276 26.3598 66.2752 22.7034 66.2752 18.2169ZM79.0864 16.8044C78.7818 14.9765 76.9836 13.453 74.5482 13.453C72.1133 13.453 70.2871 14.8655 70.0379 16.8044H79.0864Z", "M84.3438 10.6281H93.558V13.8685H87.8303V25.9446H84.3438V10.6281Z", "M95.2227 12.2596C95.2227 11.3508 95.9615 10.6179 96.8628 10.6179C97.7706 10.6179 98.5166 11.3503 98.5166 12.2596C98.5166 13.1683 97.7706 13.9007 96.8628 13.9007C95.9615 13.9007 95.2227 13.1683 95.2227 12.2596ZM98.1082 12.2596C98.1082 11.5761 97.545 11.0267 96.8628 11.0267C96.1799 11.0267 95.631 11.5761 95.631 12.2596C95.631 12.943 96.1799 13.4996 96.8628 13.4996C97.545 13.499 98.1082 12.9425 98.1082 12.2596ZM96.3347 11.4212H96.9187C97.2563 11.4283 97.5308 11.675 97.5308 12.0343C97.5308 12.2947 97.3688 12.4568 97.1789 12.5343L97.5028 13.098H97.0878L96.792 12.5557H96.6866V13.098H96.3347V11.4212ZM96.9396 12.2947C97.0735 12.2804 97.1789 12.1958 97.1789 12.0343C97.1789 11.8579 97.0735 11.7739 96.9396 11.7667H96.6794V12.2953H96.9396V12.2947Z"];
  const LS = 32 / 491, MARK = { w: 381 * LS, n: 258 * LS, nw: 113 * LS }, WORD = { w: 104, n: 20.0563, nw: 7.4803 };
  const LOGO = `<svg class="bs-logo-svg" viewBox="0 0 104 32" aria-hidden="true"><defs><clipPath id="bs-logo-clip"><path class="bs-logo-clip"/></clipPath></defs><path class="bs-logo-plate"/>`
    + `<g clip-path="url(#bs-logo-clip)">${LETTERS.map((d) => `<path class="bs-logo-letter" d="${d}"/>`).join("")}</g>`
    + `<g class="bs-logo-cut"><path d="M150 92h214v78H233v271h-83z" transform="scale(${LS}) translate(-62 -10)"/></g></svg>`;
  function logoMotion() {
    const svg = shell.querySelector(".bs-logo-svg"), rail = shell.querySelector(".rail");
    if (!svg || !rail) return;
    const clamp = (x) => Math.min(1, Math.max(0, x)), lerp = (a, b, t) => a + (b - a) * t;
    const plate = svg.querySelector(".bs-logo-plate"), clip = svg.querySelector(".bs-logo-clip"), cut = svg.querySelector(".bs-logo-cut");
    const ls = [...svg.querySelectorAll(".bs-logo-letter")];
    let box, cb; // measured once it's on screen (a hidden logo has no boxes)
    const draw = (e) => {
      if (!box) { box = ls.map((l) => l.getBBox()); cb = cut.getBBox(); if (!cb.width) box = null; }
      const w = lerp(MARK.w, WORD.w, e), n = lerp(MARK.n, WORD.n, e), nw = lerp(MARK.nw, WORD.nw, e), d = `M0 0H${w}V${n}H${w - nw}V32H0Z`;
      plate.setAttribute("d", d); clip.setAttribute("d", d);
      if (!box) return;
      // the cut-out turns into the B: moved and stretched onto the B's box as it fades, the B coming up through it
      const k = clamp(e / 0.45), B = box[0];
      cut.setAttribute("transform", `translate(${lerp(cb.x, B.x, k)} ${lerp(cb.y, B.y, k)}) scale(${lerp(1, B.width / cb.width, k)} ${lerp(1, B.height / cb.height, k)}) translate(${-cb.x} ${-cb.y})`);
      cut.style.opacity = 1 - k; ls[0].style.opacity = clamp((k - 0.25) / 0.75);
      // the rest rise one after another as the plate's edge reaches each
      ls.slice(1).forEach((l, i) => { const b = box[i + 1], a = clamp((w - nw * 0.5 - b.x) / b.width * 0.9 - 0.1); l.style.opacity = a; l.setAttribute("transform", a < 1 ? `translate(0 ${(1 - a) * 4})` : ""); });
    };
    // the menu's ease-out, cubic-bezier(0.2, 0.8, 0, 1)
    const ease = (t) => { let u = t; for (let i = 0; i < 8; i++) { const x = 3 * (1 - u) ** 2 * u * 0.2 + u ** 3 - t, dx = 3 * (1 - u) ** 2 * 0.2 + 6 * (1 - u) * u * -0.2 + 3 * u ** 2; if (Math.abs(x) < 1e-5 || !dx) break; u = clamp(u - x / dx); } return 3 * (1 - u) ** 2 * u * 0.8 + 3 * (1 - u) * u ** 2 + u ** 3; };
    const open = () => !shell.hasAttribute("data-sidebar-hidden") || rail.hasAttribute("data-expanded");
    let e = open() ? 1 : 0, to = e, raf;
    draw(e);
    const go = () => {
      if (open() === !!to) return;
      to = open() ? 1 : 0; cancelAnimationFrame(raf);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { e = to; return draw(e); }
      const e0 = e, t0 = performance.now(), D = 420 * Math.max(0.35, Math.abs(to - e0));
      const tick = (now) => { const k = clamp((now - t0) / D); e = e0 + (to - e0) * ease(k); draw(e); if (k < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    };
    const watch = new MutationObserver(go);
    watch.observe(shell, { attributes: true, attributeFilter: ["data-sidebar-hidden"] });
    watch.observe(rail, { attributes: true, attributeFilter: ["data-expanded"] });
    // measured late: draw again once it can be (the top bar shows from 1024 wide)
    addEventListener("resize", () => { if (!box) draw(e); });
  }

  // the menu folds and unfolds from its own foot (D88), with the old pin's icon: Bolster's own, a panel with a
  // chevron that points the way the menu will move
  const foldIcon = (dir) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="18" y="18" width="476" height="476" rx="52"/><line x1="148" y1="18" x2="148" y2="494"/><path stroke-width="44" d="${dir === "in" ? "M362 168 L262 256 L362 344" : "M262 168 L362 256 L262 344"}"/></svg>`;
  const FOLD_KEY = "bolster-concepts:menu-folded";

  function rail() {
    const item = (s) => s.id === "settings"
      ? `<button class="rail-item" type="button" data-open-settings data-section="${s.id}">${chrome(s.icon)}<span class="rail-label">${esc(s.label)}</span></button>`
      : `<a class="rail-item" ${sectionHref(s)} data-section="${s.id}">${chrome(s.icon)}<span class="rail-label">${esc(s.label)}</span>${s.items ? `<span class="bs-rail-more" aria-hidden="true">${chrome("chevron-right", 12)}</span>` : ""}</a>`; // a chevron where a section has pages (D88)
    return `<nav class="rail" aria-label="Main">${NAV.main.map(item).join("")}<span class="rail-spacer"></span>${NAV.bottom.map(item).join("")}<hr class="rail-separator bs-fold"><button class="rail-item bs-fold" type="button" data-collapse-sidebar>${foldIcon("out")}<span class="rail-label">Expand menu</span></button></nav>`;
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

    // folded (D88), a section's pages open beside it as you point at it: a navigation popup, not an action menu,
    // the menu's own dark a step lifted. It hangs off the section's row by a notch (the row stays lit), names the
    // section, and lists its pages with their icons in their groups, the page you're on in the menu's pill;
    // pointing away from both, Escape or a choice closes it
    const flyout = document.createElement("nav");
    flyout.className = "bs-navpop"; flyout.setAttribute("popover", "manual"); flyout.dataset.surface = "raised";
    shell.append(flyout);
    let flyTimer, flyFor = null, lit = null;
    const light = (item) => { lit?.removeAttribute("data-flying"); lit = item; item?.setAttribute("data-flying", ""); };
    const hidden = () => shell.hasAttribute("data-sidebar-hidden") && desktop.matches;
    const close = () => { if (flyout.matches(":popover-open")) flyout.hidePopover(); flyFor = null; light(null); };
    const groups = (items) => items.reduce((g, x) => (x === "-" ? g.push([]) : g.at(-1).push(x), g), [[]]).filter((g) => g.length);
    const fly = (item, delay = 0) => {
      clearTimeout(flyTimer);
      flyTimer = setTimeout(() => {
        const s = item && sections.find((x) => x.id === item.dataset.section);
        if (!s || !hidden() || !s.items) return close();
        if (flyFor !== s.id) {
          flyout.setAttribute("aria-label", s.label);
          flyout.innerHTML = `<p class="bs-navpop-title">${esc(s.label)}</p>${groups(s.items).map((g) => `<div class="bs-navpop-group">${g.map((x) =>
            `<a class="bs-navpop-link" ${linkAttrs(x.id)}${x.id === opts.current ? ' aria-current="page"' : ""}>${chrome(x.icon, 16)}<span>${esc(x.label)}</span></a>`).join("")}</div>`).join("")}`;
          flyFor = s.id;
        }
        light(item);
        if (!flyout.matches(":popover-open")) flyout.showPopover();
        // beside the rail as it stands open, its top near the section's row, kept on screen; the notch on the row
        const r = item.getBoundingClientRect(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const open = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-rail-expanded-width")) * rem; // the rail's width as it stands open
        const top = Math.round(Math.max(8, Math.min(r.top - 8, innerHeight - flyout.offsetHeight - 8)));
        flyout.style.left = `${Math.round(rail.getBoundingClientRect().left + open + 8)}px`; // the notch's tip on the rail's edge
        flyout.style.top = `${top}px`;
        flyout.style.setProperty("--_notch", `${Math.round(r.top + r.height / 2 - top)}px`);
      }, delay);
    };
    rail.addEventListener("pointerover", (e) => { if (e.pointerType !== "mouse" || !hidden()) return; const item = e.target.closest(".rail-item[data-section]"); if (item) fly(item, rail.hasAttribute("data-expanded") ? 60 : 200); });
    flyout.addEventListener("pointerenter", () => { clearTimeout(flyTimer); expand(true); });
    flyout.addEventListener("pointerleave", (e) => { if (!rail.contains(e.relatedTarget)) { fly(null, 150); expand(false, 150); } });
    flyout.addEventListener("click", (e) => { if (e.target.closest("a")) { close(); expand(false); } });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && flyout.matches(":popover-open")) { close(); expand(false); } });

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
    let n = 0; // each page's place in its section, for the stagger as it opens
    const page = (x) => `<a class="sidebar-item bs-sub" style="--i:${n++}" ${linkAttrs(x.id)} data-item="${x.id}"${x.id === opts.current ? ' aria-current="page"' : ""}><span>${esc(x.label)}</span></a>`;
    const row = (s) => {
      const head = `${chrome(s.icon, 18)}<span>${esc(s.label)}</span>`;
      if (s.id === "settings") return `<button type="button" class="sidebar-item" data-open-settings>${head}</button>`;
      if (s.items) { n = 0; return `<details class="bs-acc" name="bs-nav"${s.id === cur ? " open" : ""}><summary class="sidebar-item"${s.id === cur ? " data-current" : ""}>${head}</summary><div class="bs-acc-body">${s.items.map((x) => (x === "-" ? `<span class="bs-gap" aria-hidden="true"></span>` : page(x))).join("")}</div></details>`; }
      return `<a class="sidebar-item" ${sectionHref(s)} data-section="${s.id}"${s.id === cur ? ' aria-current="page" data-current' : ""}>${head}</a>`;
    };
    const extra = [...document.querySelectorAll("[data-more-entry]")].map((el) => `<button type="button" class="sidebar-item bs-extra" data-more-open="${el.id}">${chrome(el.dataset.moreIcon || "sliders", 18)}<span>${esc(el.dataset.moreEntry)}</span></button>`).join("");
    // phones have no top bar (D88): its search, help, Bolton and your account are in the menu
    const search = `<button type="button" class="sidebar-item bs-phone" data-not-built="search">${chrome("search", 16)}<span>Search</span></button>`;
    const you = `<button type="button" class="sidebar-item bs-phone" data-not-built="help">${chrome("circle-help", 18)}<span>Help</span></button>`
      + `<button type="button" class="sidebar-item bs-phone" data-not-built="assistant"><img class="bs-bolton" src="${ASSETS}bolton-head.svg" alt=""><span>Ask Bolton</span></button>`
      + `<details class="bs-acc bs-phone" name="bs-nav"><summary class="sidebar-item"><span class="avatar" data-size="sm" data-color="${USER.color}" aria-hidden="true">${USER.initials}</span><span>${esc(USER.name)}</span></summary><div class="bs-acc-body">${[["profile", "Edit profile"], ["users", "Manage users"], ["logout", "Log out"]].map(([id, l]) => `<a class="sidebar-item bs-sub" href="#" data-not-built="${id}"><span>${l}</span></a>`).join("")}</div></details>`;
    // the foot (Messages, Files, Settings, folding) stays put; everything above scrolls under it
    return `<div class="bs-nav-main">${search}${NAV.main.map(row).join("")}${you}${extra}</div><div class="bs-nav-bottom">${NAV.bottom.map(row).join("")}<hr class="bs-sep bs-fold"><button type="button" class="sidebar-item bs-fold" data-collapse-sidebar>${foldIcon("in")}<span>Collapse menu</span></button></div>`;
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
    const show = (id, picked) => {
      const x = all.find((i) => i.id === id) || all[0];
      d.querySelectorAll("[data-settings-page]").forEach((b) => (b.dataset.settingsPage === x.id ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
      const built = opts.links[x.id], slot = d.querySelector(".bs-settings-page");
      // a page sits in the slot as it does in the app (D89)
      // one that isn't built yet is a page all the same: its name in the header, the empty state (not-built.html)
      {
        const u = built ? new URL(built, location.href) : new URL(`${SHARED}not-built.html`);
        if (built) u.searchParams.delete("d"); else { u.searchParams.set("p", x.id); u.searchParams.set("t", x.label); u.searchParams.set("i", x.icon || "inbox"); }
        u.searchParams.set("embed", "settings");
        if (slot.querySelector("iframe")?.dataset.page !== x.id) {
          slot.innerHTML = `<iframe class="bs-settings-frame" title="${esc(x.label)}" data-page="${x.id}" src="${u.href}"></iframe>`;
          // the page takes the window's theme, when one is picked
          slot.querySelector("iframe").addEventListener("load", (e) => { const t = document.documentElement.dataset.theme; try { if (t) e.target.contentDocument.documentElement.dataset.theme = t; } catch {} });
        }
        // on phones the page and the list of pages take turns at the window: the page once one is picked
        if (picked && matchMedia("(max-width: 767px)").matches) d.setAttribute("data-nav-hidden", "");
      }
      slot.toggleAttribute("data-frame", true);
    };
    // it always opens with its list of pages out, however it was left
    if (!d.open) d.removeAttribute("data-nav-hidden");
    show(pageId);
    if (!d.open) d.showModal();
    d.onclick = (e) => {
      const b = e.target.closest("[data-settings-page]");
      if (b) show(b.dataset.settingsPage, true);
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
    if (!side) return; // embedded: no menu to mark
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

  // A page can sit in the Settings window's page slot (?embed=settings, D89): the slot is the shell's page area
  // in miniature, so the page builds as everywhere, with no menu, rail or top bar of its own; its header's
  // button folds the window's navigation, as Collapse menu folds the app's
  const EMBED = new URLSearchParams(location.search).get("embed") === "settings";
  const host = () => { try { return window.parent !== window ? window.parent.BolsterShell : null; } catch { return null; } };
  function mountEmbedded() {
    document.documentElement.setAttribute("data-embed", "settings");
    hydrateIcons();
    canvas.start();
    const title = document.querySelector(".page-title");
    if (title && host()) {
      title.insertAdjacentHTML("afterbegin", `<button class="button page-tool bs-embed-fold" data-variant="ghost" data-size="sm" data-icon-only type="button"></button>`);
      const btn = title.querySelector(".bs-embed-fold");
      const sync = (hidden) => { const l = hidden ? "Show settings menu" : "Hide settings menu"; btn.innerHTML = foldIcon(hidden ? "out" : "in"); btn.setAttribute("aria-label", l); btn.dataset.tip = l; };
      sync(host().settingsNav());
      btn.addEventListener("click", () => sync(host().settingsNav("toggle")));
      // the window can show or hide its list without this page (it opens with it out): the button follows
      const win = window.parent.document.getElementById("bs-settings");
      if (win) new MutationObserver(() => sync(win.hasAttribute("data-nav-hidden"))).observe(win, { attributes: true, attributeFilter: ["data-nav-hidden"] });
    }
    // Escape with nothing open in the page closes the window around it
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector(":popover-open, dialog[open]")) host()?.closeSettings(); });
  }
  // the Settings window's side of it: fold its navigation, say whether it's folded, close
  function settingsNav(op) { const d = document.getElementById("bs-settings"); if (!d) return false; if (op === "toggle") d.toggleAttribute("data-nav-hidden"); return d.hasAttribute("data-nav-hidden"); }
  function closeSettings() { document.getElementById("bs-settings")?.close(); }

  // The loading screen (D90): Anna's drawings, one at random, with a line from its trade (loader.js). It plays on
  // the first page of a session, and from the concept controls; its files (her drawings, their animations, the
  // lines) load only then, so a page without it stays light. The cover goes up at once, so the page never flashes.
  const SHARED = new URL("./", document.currentScript.src).href;
  const LOADED_KEY = "bolster-concepts:loaded";
  let loaderFiles;
  const fetchLoader = () => loaderFiles ||= new Promise((res, rej) => {
    document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: `${SHARED}loaders.css` }));
    const add = (f) => new Promise((ok, no) => document.head.append(Object.assign(document.createElement("script"), { src: `${SHARED}${f}`, onload: ok, onerror: no })));
    Promise.all([add("tape.js"), add("loader.js")]).then(res, rej);
  });
  function loading({ slow = false } = {}) {
    const main = document.querySelector(".app-main");
    let L = document.getElementById("bs-loader");
    if (!L) {
      document.body.insertAdjacentHTML("beforeend", `<div class="dash-loader bs-loader" id="bs-loader"><div class="canvas-layers dash-loader-net" aria-hidden="true"><div class="canvas-glow"></div><div class="canvas-net"></div></div><div class="dash-loader-inner" aria-hidden="true"></div><p class="visually-hidden" role="status"></p></div>`);
      L = document.getElementById("bs-loader");
    }
    L.hidden = false; L.removeAttribute("data-leaving"); main?.setAttribute("aria-busy", "true");
    const done = () => main?.removeAttribute("aria-busy");
    fetchLoader().then(() => window.BolsterLoader.play({ page: label(opts.current) || document.title.split(" · ")[0], slow, then: done, retry: () => loading() }))
      .catch(() => { L.hidden = true; done(); });
  }

  function mount(o) {
    opts = { ...opts, ...o };
    shell = document.querySelector(".app-shell");
    if (EMBED) return mountEmbedded();
    shell.insertAdjacentHTML("afterbegin", `${topBar()}${rail()}<nav class="sidebar bs-sidebar" aria-label="Main"></nav>`);
    // no tab bar and no top bar on phones (D88): a floating menu button opens the same sidebar, and closes it
    shell.insertAdjacentHTML("beforeend", `<button class="bs-menu-fab" type="button" data-toggle-sidebar aria-label="Menu" aria-expanded="false" data-tip="Menu">${chrome("menu", 20)}${chrome("xmark", 20)}</button>`);
    document.body.insertAdjacentHTML("beforeend", settingsHtml());
    try { if (localStorage.getItem(FOLD_KEY)) shell.setAttribute("data-sidebar-hidden", ""); } catch {}
    hydrateIcons();
    setCurrent(opts.current);
    // a section you open eases its pages in (shell.css); one open on arrival or redrawn doesn't: a details
    // created open fires toggle too, so only a toggle right after a click on a section's row counts
    const side = shell.querySelector(".sidebar");
    let picked = -Infinity;
    side.addEventListener("click", (e) => { if (e.target.closest(".bs-acc > summary")) picked = performance.now(); }, true);
    side.addEventListener("toggle", (e) => {
      if (!e.target.matches?.(".bs-acc") || performance.now() - picked > 400) return;
      e.target.setAttribute("data-touched", "");
      e.target.toggleAttribute("data-anim", e.newState === "open");
    }, true);
    railBehaviour();
    logoMotion();
    canvas.start();
    let seen = false; try { seen = sessionStorage.getItem(LOADED_KEY) === "1"; sessionStorage.setItem(LOADED_KEY, "1"); } catch {}
    if (!seen) loading();
    // the concept controls, on every page that has them: a new loading screen each press, or a slow one
    const cc = document.querySelector("#concept-controls .concept-body");
    if (cc) {
      // and how its line comes in, how often a new one does, and which drawing: a change plays it again, the
      // controls left open under it to try the next (D90)
      const get = (k, d) => { try { return localStorage.getItem(`bolster-concepts:loader-${k}`) || d; } catch { return d; } };
      const WAYS = [["rise", "Rise, fading up"], ["roll", "Roll, like a ticker"], ["type", "Typed"], ["scramble", "Decoded"], ["wave", "Letter by letter"], ["blur", "Into focus"], ["none", "No animation"]];
      const every = get("every", "2.1");
      cc.insertAdjacentHTML("afterbegin", `<div class="bs-cc-loader">
        <div class="field" data-size="sm"><label class="field-label" for="cc-loader-text">Loading screen: how a line comes in</label>
          <div class="select"><select class="input" id="cc-loader-text" data-loader-set="text">${WAYS.map(([v, l]) => `<option value="${v}"${v === get("text", "rise") ? " selected" : ""}>${l}</option>`).join("")}</select></div></div>
        <div class="field" data-size="sm"><label class="field-label" for="cc-loader-every">A new line every <output for="cc-loader-every">${(+every).toFixed(1)} s</output></label>
          <input type="range" id="cc-loader-every" data-loader-set="every" min="1" max="4" step="0.1" value="${every}"></div>
        <div class="field" data-size="sm"><label class="field-label" for="cc-loader-drawing">Drawing</label>
          <div class="select"><select class="input" id="cc-loader-drawing" data-loader-set="drawing"><option value="any">Any, at random</option></select></div></div>
        <div class="cluster"><button class="button" data-variant="secondary" data-size="sm" data-loading>Show a loading screen</button><button class="button" data-variant="secondary" data-size="sm" data-loading="slow">Show a slow load</button></div></div>`);
      // the drawings' names are Anna's (tape.js): listed once the controls first open
      cc.closest("details").addEventListener("toggle", () => fetchLoader().then(() => {
        const sel = cc.querySelector("#cc-loader-drawing");
        if (sel.options.length > 1) return;
        const names = Object.fromEntries(window.BolsterTape.OPTIONS);
        sel.insertAdjacentHTML("beforeend", window.BolsterLoader.SHORTLIST.map((id) => `<option value="${id}"${id === get("drawing", "any") ? " selected" : ""}>${esc(names[id] || id)}</option>`).join(""));
      }), { once: true });
      cc.addEventListener("click", (e) => { const b = e.target.closest("[data-loading]"); if (b) loading({ slow: b.dataset.loading === "slow" }); });
      cc.addEventListener("input", (e) => { if (e.target.id === "cc-loader-every") cc.querySelector("output[for=cc-loader-every]").textContent = `${(+e.target.value).toFixed(1)} s`; });
      cc.addEventListener("change", (e) => {
        const k = e.target.dataset?.loaderSet; if (!k) return;
        try { localStorage.setItem(`bolster-concepts:loader-${k}`, e.target.value); } catch {}
        loading();
      });
    }

    const narrow = matchMedia("(max-width: 1023px)");
    const phone = matchMedia("(max-width: 767px)");
    // however the menu closes (a link, a tap outside, Escape), its buttons say so: the floating one shows ☰ again
    new MutationObserver(() => {
      const open = shell.querySelector(".sidebar").hasAttribute("data-open");
      shell.querySelectorAll("[data-toggle-sidebar]").forEach((b) => b.setAttribute("aria-expanded", open));
      const fab = shell.querySelector(".bs-menu-fab"); fab.setAttribute("aria-label", open ? "Close menu" : "Menu"); fab.dataset.tip = open ? "Close menu" : "Menu";
    })
      .observe(shell.querySelector(".sidebar"), { attributes: true, attributeFilter: ["data-open"] });
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
      // the menu's foot folds it to the icon rail and unfolds it again (desktop), remembered in this browser
      if (e.target.closest("[data-collapse-sidebar]")) {
        const folded = shell.toggleAttribute("data-sidebar-hidden");
        try { folded ? localStorage.setItem(FOLD_KEY, "1") : localStorage.removeItem(FOLD_KEY); } catch {}
        shell.querySelector(folded ? ".rail .bs-fold" + ".rail-item" : ".bs-sidebar button.bs-fold")?.focus({ preventScroll: true });
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
    // embedded in the Settings window there's no top bar: nothing sits above the page
    const html = document.documentElement, top = document.querySelector(".top-bar") || document.createElement("div"), DOWN = 24, UP = 6;
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

  return { mount, setCurrent, label, hydrateIcons, toast, placePopover, icon, scrolling, week, canvas, settingsNav, closeSettings, loading };
})();
