// Specimen helpers (not required for styling). Vanilla, no dependencies.

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
