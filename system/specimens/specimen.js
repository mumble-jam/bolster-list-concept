// Specimen helpers (not required for styling). Vanilla, no dependencies.

// One documentation (D133): the site (site/) is where the system is read; a specimen is its workbench, every variant
// and state working on the system's own CSS. Its way back is a link to the site's page for it, worked out here from
// the link's own address (`data-doc-link`), so it holds wherever the folders are served.
(() => {
  const DOC = {
    "address-field.html": "components/address-field.html", "badge.html": "components/badge.html", "button.html": "components/button.html", "calendar.html": "components/calendar.html",
    "choice.html": "components/choice.html", "combobox.html": "components/combobox.html", "data.html": "components/data-table.html", "field.html": "components/field.html",
    "floating-bar.html": "components/floating-bar.html", "form.html": "patterns/forms.html", "icons.html": "foundations/iconography.html",
    "list-page.html": "page-types/list.html", "list-recipe.html": "page-types/list.html", "overlays.html": "components/dialog.html",
    "popover.html": "components/popover.html", "record.html": "components/record.html", "segmented-control.html": "components/segmented-control.html",
    "shell.html": "components/app-shell.html", "states.html": "components/states.html", "summary-cards.html": "components/summary-cards.html",
    "table-card.html": "components/data-table.html", "tabs.html": "components/tabs.html", "toast.html": "components/toast.html",
    "tokens.html": "resources/tokens.html", "toolbar.html": "components/toolbar.html",
  };
  const page = DOC[location.pathname.split("/").pop()];
  const link = document.querySelector("a[data-doc-link]");
  if (link && page) link.href = new URL(page, link.href).href;
})();

// Inside the documentation: ?embed shows the specimen's examples without its header, intro, rules and markup notes
// (the page around it says those), or ?embed=id,id only those sections; it tells the page how tall it is, so the
// page stays the one scroller (D128), follows its theme, and opens links in the window, not the frame.
(() => {
  const q = new URLSearchParams(location.search);
  if (!q.has("embed")) return;
  const html = document.documentElement;
  html.classList.add("spec-embed");
  const want = (q.get("embed") || "").split(",").filter(Boolean);
  for (const s of document.querySelectorAll(".spec-section")) {
    const id = s.id || s.querySelector(":scope > h2[id]")?.id || "";
    const head = s.querySelector("h2")?.textContent.trim() || "";
    s.hidden = want.length ? !want.includes(id) : /^(Rules|Markup)$/.test(head);
  }
  const post = () => parent.postMessage({ bdsSpecimen: true, h: Math.ceil(document.body.getBoundingClientRect().height) }, "*");
  new ResizeObserver(post).observe(document.body);
  addEventListener("load", post);
  const theme = (t) => { if (!t || t === "auto") delete html.dataset.theme; else html.dataset.theme = t; };
  addEventListener("message", (e) => { if (e.source === parent && e.data?.bdsTheme) theme(e.data.bdsTheme); });
  addEventListener("storage", (e) => { if (e.key === "bds-theme") theme(e.newValue); });
  document.addEventListener("click", (e) => { const a = e.target.closest("a[href]"); if (a && !a.getAttribute("href").startsWith("#")) a.target = "_top"; });
})();

// Theme: auto → light → dark, remembered per browser.
(() => {
  const root = document.documentElement;
  const btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return; // no toggle: leave the theme to the page's host
  const modes = ["auto", "light", "dark"];
  let mode = "auto";
  try { mode = localStorage.getItem("bds-theme") || "auto"; } catch {}
  const apply = () => {
    if (mode === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", mode);
    if (btn) btn.textContent = `Theme: ${mode}`;
  };
  btn?.addEventListener("click", () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    try { localStorage.setItem("bds-theme", mode); } catch {}
    apply();
  });
  apply();
})();

// Dialogs: <button data-open-dialog="id">, and [data-close] inside a dialog.
document.addEventListener("click", (e) => {
  const opener = e.target.closest("[data-open-dialog]");
  if (opener) document.getElementById(opener.dataset.openDialog)?.showModal();
  const closer = e.target.closest("dialog [data-close]");
  if (closer) closer.closest("dialog").close();
});

// A part wider than its column scrolls sideways (D128), so the keyboard can reach it: focusable while it overflows,
// named by its section. Checked as sizes change (fonts and icons arrive, the frame narrows).
(() => {
  const focusable = "a[href], button, input, select, textarea, [tabindex]:not([data-scroll-stop])";
  const check = (el) => {
    const over = (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) && !el.querySelector(focusable);
    if (over && !el.hasAttribute("tabindex")) {
      el.tabIndex = 0; el.dataset.scrollStop = "";
      if (!el.getAttribute("role")) { el.setAttribute("role", "region"); el.setAttribute("aria-label", el.closest(".spec-section")?.querySelector("h2")?.textContent.trim() || "Example"); el.dataset.scrollRole = ""; }
    } else if (!over && "scrollStop" in el.dataset) {
      el.removeAttribute("tabindex"); delete el.dataset.scrollStop;
      if ("scrollRole" in el.dataset) { el.removeAttribute("role"); el.removeAttribute("aria-label"); delete el.dataset.scrollRole; }
    }
  };
  const ro = new ResizeObserver((entries) => entries.forEach((e) => check(e.target)));
  const scan = () => document.querySelectorAll(".spec-main *").forEach((el) => { if (/(auto|scroll)/.test(getComputedStyle(el).overflowX)) { ro.observe(el); check(el); } });
  if (document.readyState === "complete") scan(); else addEventListener("load", scan);
})();

// Indeterminate checkboxes can only be set from JS.
document.querySelectorAll("[data-indeterminate]").forEach((el) => (el.indeterminate = true));

// Tabs: arrow keys, Home and End move selection (roving tabindex).
document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]:not(:disabled)')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    tab.focus();
  };
  list.addEventListener("click", (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
  list.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(tabs[(next + tabs.length) % tabs.length]);
  });
});

// Menus (popover): sync aria-expanded, focus the first item, arrow keys between items.
document.querySelectorAll('[popover][role="menu"]').forEach((menu) => {
  const trigger = document.querySelector(`[popovertarget="${menu.id}"]`);
  const items = () => [...menu.querySelectorAll('[role^="menuitem"]:not(:disabled)')];
  menu.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    trigger?.setAttribute("aria-expanded", open);
    if (open) items()[0]?.focus();
  });
  menu.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    list[(next + list.length) % list.length].focus();
  });
  menu.addEventListener("click", (e) => { if (e.target.closest('[role="menuitem"]')) menu.hidePopover(); });
});

// Toast demo: <button data-toast="success|danger|…" data-message="…">
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-toast]");
  if (!b) return;
  const region = document.querySelector(".toast-region");
  const tone = b.dataset.toast;
  const t = document.createElement("div");
  t.className = "toast";
  t.dataset.tone = tone;
  t.setAttribute("role", tone === "danger" ? "alert" : "status");
  t.innerHTML = `<span class="toast-message"></span><button class="toast-close" aria-label="Dismiss">×</button>`;
  t.querySelector(".toast-message").textContent = b.dataset.message;
  t.querySelector(".toast-close").onclick = () => t.remove();
  region.append(t);
  if (tone !== "danger") {
    let timer = setTimeout(() => t.remove(), 5000);
    t.addEventListener("pointerenter", () => clearTimeout(timer));
    t.addEventListener("focusin", () => clearTimeout(timer));
    t.addEventListener("pointerleave", () => (timer = setTimeout(() => t.remove(), 5000)));
  }
});

// Sidebar overlay on narrow screens: <button data-toggle-sidebar>
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-toggle-sidebar]")) return;
  const s = document.querySelector(".sidebar");
  s?.toggleAttribute("data-open");
});

// Tooltips for data-tip="…" (D52), on every specimen and concept page that loads this file
if (!window.BolsterTips) document.head.append(Object.assign(document.createElement("script"), { src: new URL("../components/tooltip.js", document.currentScript.src).href }));

// Icons: <i data-icon="filter" data-size="16"></i> becomes the Font Awesome glyph, when the page loads
// (data-optical: drawn at that size whatever the control's icon box, D41)
// the concepts' icon set (../../concepts/shared/icons.js). Sized by height, as Font Awesome draws them.
if (window.BolsterIcons) document.querySelectorAll("i[data-icon]").forEach((i) => (i.outerHTML = window.BolsterIcons(i.dataset.icon, +(i.dataset.size || 16), { optical: "optical" in i.dataset })));
