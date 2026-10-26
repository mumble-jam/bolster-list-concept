// The documentation site's behaviour: icons, the menu as a drawer on narrow screens, the theme, search (⌘K),
// copying code and tokens, the page's contents following the scroll, and the decision log's filter. Vanilla, small.
(() => {
  const root = window.DOC_ROOT || "";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // icons: <i data-icon="…" data-size="16"> becomes the Font Awesome glyph (concepts/shared/icons.js)
  if (window.BolsterIcons) $$("i[data-icon]").forEach((i) => (i.outerHTML = window.BolsterIcons(i.dataset.icon, +(i.dataset.size || 16), { optical: "optical" in i.dataset })));

  // examples: indeterminate checkboxes (only JS can set them), and tabs that switch (click, arrows, Home, End)
  $$("[data-indeterminate]").forEach((el) => (el.indeterminate = true));
  $$('.doc-ex [role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]:not(:disabled)', list);
    const select = (tab) => { tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; const panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls")); if (panel) panel.hidden = !on; }); tab.focus(); };
    list.addEventListener("click", (e) => { const t = e.target.closest('[role="tab"]'); if (t && !t.disabled) select(t); });
    list.addEventListener("keydown", (e) => { const i = tabs.indexOf(document.activeElement); const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (i < 0 || n === undefined) return; e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length]); });
  });

  // a table wider than its column scrolls sideways, so the keyboard can reach it
  $$(".doc-table-wrap").forEach((w) => { if (w.scrollWidth > w.clientWidth + 1) { w.tabIndex = 0; w.setAttribute("role", "region"); w.setAttribute("aria-label", w.querySelector("caption, th")?.textContent.trim() ? `Table: ${w.querySelector("th").textContent.trim()}` : "Table"); } });

  // the menu: a drawer under 1024
  const body = document.body;
  const openNav = () => { body.dataset.navOpen = ""; $(".doc-nav a[aria-current]")?.focus({ preventScroll: true }); };
  const closeNav = () => { delete body.dataset.navOpen; };
  $$("[data-nav-open]").forEach((b) => b.addEventListener("click", openNav));
  $$("[data-nav-close]").forEach((b) => b.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && "navOpen" in body.dataset) { closeNav(); $("[data-nav-open]")?.focus(); } });
  $(".doc-nav a[aria-current]")?.scrollIntoView({ block: "center" });

  // the theme: auto, light or dark, remembered per browser (the same key as the catalog's)
  const html = document.documentElement;
  let mode = "auto";
  try { mode = localStorage.getItem("bds-theme") || "auto"; } catch {}
  const apply = () => { if (mode === "auto") delete html.dataset.theme; else html.dataset.theme = mode; $$('input[name="doc-theme"]').forEach((r) => (r.checked = r.value === mode)); };
  $$('input[name="doc-theme"]').forEach((r) => r.addEventListener("change", () => { mode = r.value; try { localStorage.setItem("bds-theme", mode); } catch {} apply(); }));
  apply();

  // copying: code blocks, and anything with data-copy-text (tokens, palette steps)
  const copy = async (text, el) => {
    try { await navigator.clipboard.writeText(text); } catch { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); return; }
    el.dataset.copied = ""; setTimeout(() => delete el.dataset.copied, 1200);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (b) { const code = b.parentElement.querySelector("code"); copy(code.textContent, b); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); return; }
    const t = e.target.closest("[data-copy-text]");
    if (t) copy(t.dataset.copyText, t);
  });
  document.addEventListener("keydown", (e) => { const t = e.target.closest?.("[data-copy-text]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); copy(t.dataset.copyText, t); } });

  // on this page: the section you're reading
  const toc = $$(".doc-toc a");
  if (toc.length && "IntersectionObserver" in window) {
    const heads = toc.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const mark = () => {
      let cur = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top < innerHeight * 0.3) cur = h;
      toc.forEach((a) => a.setAttribute("aria-current", a.hash.slice(1) === cur?.id ? "true" : "false"));
    };
    addEventListener("scroll", mark, { passive: true }); mark();
  }

  // the decision log: filter by words and by status
  const log = $(".doc-log");
  const filter = $("[data-log-filter]");
  if (log && filter) {
    const entries = $$(".doc-entry", log);
    const run = () => {
      const q = filter.value.trim().toLowerCase();
      const st = $("[data-log-status] input:checked")?.value || "all";
      for (const en of entries) en.hidden = !((st === "all" || en.dataset.refStatus === st) && (!q || en.textContent.toLowerCase().includes(q)));
    };
    filter.addEventListener("input", run);
    $$("[data-log-status] input").forEach((r) => r.addEventListener("change", run));
  }

  // the backlog: by kind, and high priority only
  const blk = $("[data-bl-kind]");
  if (blk) {
    const items = $$(".bl-item"), high = $("[data-bl-high]");
    const run = () => {
      const k = $("input:checked", blk).value;
      for (const it of items) it.hidden = !((k === "all" || it.dataset.kind === k) && (!high.checked || it.dataset.prio === "high"));
      for (const g of $$(".bl-group")) { const its = $$(".bl-item", g); if (its.length) { g.hidden = its.every((i) => i.hidden); const c = $(".bl-count", g); if (c) c.textContent = its.filter((i) => !i.hidden).length; } else g.hidden = k !== "all" || high.checked; }
    };
    $$("input", blk).forEach((r) => r.addEventListener("change", run)); high.addEventListener("change", run);
  }

  // search: ⌘K or /, over every page, its headings and every token
  const dlg = $(".doc-search");
  const input = $(".doc-search input");
  const results = $(".doc-search-results");
  const index = window.DOC_INDEX || [];
  results.dataset.empty = "Type to search pages, headings and tokens";
  const escH = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const hi = (s, q) => { const i = s.toLowerCase().indexOf(q); return i < 0 ? escH(s) : escH(s.slice(0, i)) + "<mark>" + escH(s.slice(i, i + q.length)) + "</mark>" + escH(s.slice(i + q.length)); };
  let sel = 0;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = "";
    if (!q) return;
    const hits = [];
    for (const p of index) {
      const t = p.t.toLowerCase();
      if (t.includes(q)) hits.push({ score: t.startsWith(q) ? 0 : 1, title: p.t, url: p.u, group: p.g, sub: p.s });
      for (const [id, h] of p.h) if (h.toLowerCase().includes(q)) hits.push({ score: 2, title: h, url: `${p.u}#${id}`, group: p.t, sub: "" });
      if (!t.includes(q) && p.s.toLowerCase().includes(q)) hits.push({ score: 3, title: p.t, url: p.u, group: p.g, sub: p.s });
    }
    hits.sort((a, b) => a.score - b.score);
    const top = hits.slice(0, 40);
    if (!top.length) { results.dataset.empty = `Nothing matches “${input.value.trim()}”`; return; }
    results.innerHTML = top.map((h, k) => `<li role="option" aria-selected="${k === 0}"><a href="${root}${h.url}" tabindex="-1" aria-selected="${k === 0}"><b>${hi(h.title, q)}</b><small>${escH(h.group)}</small>${h.sub ? `<span>${hi(h.sub, q)}</span>` : ""}</a></li>`).join("");
    sel = 0;
  };
  const move = (d) => { const as = $$("a", results); if (!as.length) return; as[sel]?.setAttribute("aria-selected", "false"); sel = (sel + d + as.length) % as.length; as[sel].setAttribute("aria-selected", "true"); as[sel].scrollIntoView({ block: "nearest" }); };
  const openSearch = () => { closeNav(); dlg.showModal(); input.select(); };
  $$("[data-search-open]").forEach((b) => b.addEventListener("click", openSearch));
  document.addEventListener("keydown", (e) => {
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable)) { e.preventDefault(); dlg.open ? dlg.close() : openSearch(); }
  });
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { const a = $$("a", results)[sel]; if (a) { e.preventDefault(); location.href = a.href; dlg.close(); } }
  });
  results.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
})();
