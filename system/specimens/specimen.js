// Specimen helpers (not required for styling). Vanilla, no dependencies.

// Global navigation: one list of every page in the back office, drawn as a sidebar on the left (the
// shell's sidebar items). From 1024 wide it's always there; narrower, a menu button in the page header
// opens it as a drawer (a popover, so Escape and a click outside close it). Links are worked out from
// this script's own address, so they hold wherever the folder is served.
(() => {
  const script = document.currentScript;
  if (!script || document.querySelector(".spec-nav")) return;
  const root = new URL("../", script.src); // system/
  const CONCEPT = "../index.html";
  const NAV = [
    ["Overview", [["Catalog", "index.html"]]],
    ["Foundations", [["Tokens", "specimens/tokens.html"], ["App shell", "specimens/shell.html"]]],
    ["Page types", [["List page", "specimens/list-page.html"], ["List recipe", "specimens/list-recipe.html"]]],
    ["List page parts", [["Summary cards", "specimens/summary-cards.html"], ["Table card", "specimens/table-card.html"], ["Record", "specimens/record.html"], ["Floating bar", "specimens/floating-bar.html"], ["Popover", "specimens/popover.html"], ["States", "specimens/states.html"]]],
    ["Components", [["Button", "specimens/button.html"], ["Badge", "specimens/badge.html"], ["Field", "specimens/field.html"], ["Checkbox, radio, toggle", "specimens/choice.html"], ["Segmented control", "specimens/segmented-control.html"], ["Tabs", "specimens/tabs.html"], ["Tooltip, menu, dialog", "specimens/overlays.html"], ["Data table, cards, avatars, thumbnails", "specimens/data.html"], ["Toast", "specimens/toast.html"], ["Calendar", "specimens/calendar.html"]]],
    ["Live", [["List concept ↗", CONCEPT]]],
  ];
  const here = location.pathname.replace(/\/$/, "/index.html");
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const nav = document.createElement("nav");
  nav.className = "spec-nav"; nav.id = "spec-nav"; nav.setAttribute("aria-label", "Design system"); nav.setAttribute("popover", "");
  nav.innerHTML = `<a class="sidebar-title spec-nav-title" href="${new URL("index.html", root).href}">Bolster design system</a>
    <p class="spec-nav-note"><span class="badge" data-tone="info">Status quo · Oct 2026</span></p>` +
    NAV.map(([group, items]) => `<p class="sidebar-group">${esc(group)}</p>` + items.map(([label, path]) => {
      const url = new URL(path, root);
      const on = url.pathname === here;
      return `<a class="sidebar-item" href="${url.href}"${on ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
    }).join("")).join("");
  document.body.prepend(nav);
  // narrow screens: a menu button at the start of the page header opens the drawer
  const header = document.querySelector(".spec-header");
  if (header) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "button spec-nav-toggle"; btn.dataset.variant = "ghost"; btn.dataset.size = "sm"; btn.dataset.iconOnly = ""; btn.dataset.tip = "Menu";
    btn.setAttribute("aria-label", "Menu"); btn.setAttribute("popovertarget", "spec-nav"); btn.setAttribute("aria-controls", "spec-nav");
    btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    header.prepend(btn);
    nav.addEventListener("toggle", (e) => btn.setAttribute("aria-expanded", e.newState === "open"));
  }
  nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
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
