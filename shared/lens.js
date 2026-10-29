// The intent lens: an inspector for how intentional the design is. Switched on in Concept controls (or with I), it
// stops the page from acting on clicks; pointing at a part outlines it and shows who decided it and why (the level,
// your input, my part, what's kept from Bolster, what's still open, the decisions behind it); a click pins the card so
// its links can be followed; Esc unpins, then leaves. Its bar counts the page's parts by level, and each level can be
// painted over the page at once. The record is window.BolsterIntent: a page's own parts (its intent.js) before the
// shell's (shared/intent.js). Any concept page that loads its record and this file gets the lens; nothing per page.
(() => {
  const I = window.BolsterIntent || {};
  if (!I.page) return;
  const ENTRIES = [...I.page, ...(I.shared || [])];
  const DOCS = new URL("../docs/resources/", document.currentScript.src).href;
  const KEY = "bolster-concepts:lens";
  const LEVELS = {
    yours: { label: "You decided", mark: "full", about: "You specified how it looks or behaves." },
    steered: { label: "You steered", mark: "half", about: "You asked for it or set the direction; the details are mine." },
    mine: { label: "My call", mark: "dashed", about: "Never discussed: made up from the system, best practice or Bolster's habits." },
    bolster: { label: "Bolster's", mark: "empty", about: "Kept as Bolster's live product has it, not redesigned." },
  };
  const STATUS = { stable: "Stable, in the system", trying: "Trying out", draft: "Draft, in this concept", partial: "In the system, needs work" };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const icon = (n, s = 14) => (window.BolsterIcons ? window.BolsterIcons(n, s) : "");
  const root = document.documentElement;

  // ---------- the parts on the page: each element to its entry, the page's own first, the first match in order ----------
  let map = new Map();
  const scan = () => {
    map = new Map();
    for (const e of ENTRIES) for (const el of document.querySelectorAll(e.sel)) if (!map.has(el) && !el.closest(".lens-ui, .concept-controls")) map.set(el, e);
  };
  const resolve = (t) => { for (let n = t; n && n !== document.body; n = n.parentElement) { if (n.closest?.(".lens-ui, .concept-controls")) return null; const e = map.get(n); if (e) return { el: n, e }; } return null; };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };

  // ---------- the lens's own parts ----------
  const ui = document.createElement("div");
  ui.className = "lens-ui";
  ui.hidden = true;
  ui.innerHTML = `<div class="lens-paint" aria-hidden="true"></div>
    <div class="lens-box" aria-hidden="true" hidden><span class="lens-tag"></span></div>
    <section class="lens-card" hidden aria-live="polite"></section>
    <div class="lens-bar" role="toolbar" aria-label="Intent lens">
      <span class="lens-bar-name">${icon("eye", 14)}Intent lens</span>
      <span class="lens-bar-sep" aria-hidden="true"></span>
      <span class="lens-bar-levels"></span>
      <span class="lens-bar-sep" aria-hidden="true"></span>
      <button type="button" class="lens-bar-btn" data-lens-off aria-label="Turn the lens off" data-tip="Turn off (Esc)">${icon("xmark", 14)}</button>
    </div>`;
  document.body.append(ui);
  const paintLayer = ui.querySelector(".lens-paint"), box = ui.querySelector(".lens-box"), tag = ui.querySelector(".lens-tag"), card = ui.querySelector(".lens-card"), levelsEl = ui.querySelector(".lens-bar-levels");

  let on = false, pinned = null, hovered = null;
  const painted = new Set();

  const markHtml = (lv) => `<span class="mark lens-mark" data-mark="${LEVELS[lv].mark}" data-lens-level="${lv}" aria-hidden="true"></span>`;
  const refHtml = (id) => `<a class="lens-ref" href="${DOCS}${id[0] === "I" ? "interactions" : "decisions"}.html#${id.toLowerCase()}" target="_blank" rel="noopener">${esc(id)}</a>`;
  const selOf = (el) => (el.id ? `#${el.id}` : el.classList.length ? `.${[...el.classList].slice(0, 2).join(".")}` : el.tagName.toLowerCase());

  function cardHtml({ el, e }) {
    const lv = LEVELS[e.level];
    const row = (h, t, cls = "") => (t ? `<div class="lens-row${cls}"><dt>${h}</dt><dd>${esc(t)}</dd></div>` : "");
    return `<header class="lens-card-head"><span class="lens-level" data-lens-level="${e.level}">${markHtml(e.level)}${lv.label}</span>${pinned ? `<button type="button" class="lens-close" data-lens-unpin aria-label="Unpin" data-tip="Unpin (Esc)">${icon("xmark", 12)}</button>` : `<span class="lens-hint">Click to pin</span>`}</header>
      <h2 class="lens-name">${esc(e.name)}</h2>
      <p class="lens-meta">${e.status ? `<span>${esc(STATUS[e.status] || e.status)}</span>` : ""}<code>${esc(selOf(el))}</code></p>
      <dl class="lens-rows">${row("Your input", e.you)}${row("My part", e.me)}${row("From Bolster", e.bolster)}${row("Still open", e.open, " is-open")}</dl>
      ${e.refs?.length ? `<p class="lens-refs">${e.refs.map(refHtml).join("")}</p>` : ""}`;
  }

  // ---------- drawing ----------
  const place = (el, target) => { const r = target.getBoundingClientRect(); Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` }); return r; };
  function placeCard(r) {
    if (matchMedia("(max-width: 767px)").matches) { card.style.left = card.style.top = ""; return; }
    const w = card.offsetWidth, h = card.offsetHeight, gap = 12, m = 12;
    let left = r.right + gap, top = r.top;
    if (left + w > innerWidth - m) left = r.left - gap - w;
    if (left < m) { left = Math.min(Math.max(m, r.left), innerWidth - w - m); top = r.bottom + gap; if (top + h > innerHeight - 72) top = r.top - gap - h; }
    top = Math.min(Math.max(m, top), innerHeight - h - 72);
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  }
  function show(hit) {
    const cur = pinned || hit;
    if (!cur || !cur.el.isConnected || !visible(cur.el)) { box.hidden = true; card.hidden = true; return; }
    box.hidden = false; box.dataset.lensLevel = cur.e.level;
    const r = place(box, cur.el);
    tag.innerHTML = `${markHtml(cur.e.level)}${esc(cur.e.name)}`;
    box.toggleAttribute("data-below", r.top < 28);
    const key = cur.el;
    if (card.hidden || card._for !== key || card._pinned !== !!pinned) { card.innerHTML = cardHtml(cur); card._for = key; card._pinned = !!pinned; card.dataset.lensLevel = cur.e.level; }
    card.hidden = false; card.toggleAttribute("data-pinned", !!pinned);
    placeCard(r);
  }
  function paint() {
    const els = [...map.keys()].filter((el) => painted.has(map.get(el).level) && visible(el) && ![...map.keys()].some((o) => o !== el && el.contains(o) && painted.has(map.get(o).level)));
    paintLayer.innerHTML = els.map(() => `<span class="lens-paint-box"></span>`).join("");
    els.forEach((el, i) => { const b = paintLayer.children[i]; b.dataset.lensLevel = map.get(el).level; place(b, el); });
  }
  function counts() {
    const present = new Set([...map].filter(([el]) => visible(el)).map(([, e]) => e));
    levelsEl.innerHTML = Object.entries(LEVELS).map(([k, lv]) => { const n = [...present].filter((e) => e.level === k).length; return `<button type="button" class="lens-bar-btn lens-lv" data-lens-paint="${k}" aria-pressed="${painted.has(k)}" data-tip="${esc(lv.about)} Click to show them all."${n ? "" : " disabled"}>${markHtml(k)}<span>${lv.label}</span><b>${n}</b></button>`; }).join("");
  }
  let raf = 0;
  const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!on) return; if (painted.size) paint(); show(hovered); }); };

  // ---------- switching ----------
  function set(v, quiet = false) {
    on = v; ui.hidden = !v; root.toggleAttribute("data-lens", v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch {}
    const t = document.getElementById("cc-lens-on"); if (t) t.checked = v;
    pinned = hovered = null; box.hidden = card.hidden = true;
    if (v) { scan(); counts(); if (painted.size) paint(); } else paintLayer.innerHTML = "";
    if (!quiet) window.BolsterShell?.toast?.(v ? "Intent lens on: point at anything. Click to pin, Esc to leave" : "Intent lens off");
  }

  // concept controls: a section of its own, after the page's own controls
  const cc = document.querySelector("#concept-controls .concept-body");
  if (cc) {
    const sec = document.createElement("section");
    sec.className = "cc-sec"; sec.id = "cc-lens";
    sec.innerHTML = `<h3 class="cc-h">Intent lens</h3><div class="cc-field"><div class="cc-row"><label for="cc-lens-on">Inspect how intentional each part is</label><input type="checkbox" role="switch" class="toggle" id="cc-lens-on"></div><p class="cc-help">Point at anything to see who decided it and why; click to pin it. <kbd>I</kbd> switches it, <kbd>Esc</kbd> leaves.</p></div>`;
    const after = cc.querySelector("#cc-page");
    if (after) after.after(sec); else cc.prepend(sec);
    sec.querySelector("input").addEventListener("change", (ev) => set(ev.target.checked));
  }

  // ---------- inspecting ----------
  const inLens = (t) => t.closest?.(".lens-ui");
  const inControls = (t) => t.closest?.(".concept-controls, .tip");
  document.addEventListener("pointermove", (ev) => {
    if (!on || pinned || inLens(ev.target) || inControls(ev.target)) return;
    const hit = resolve(ev.target);
    if (hit?.el !== hovered?.el) { hovered = hit; show(hovered); }
  }, true);
  document.addEventListener("focusin", (ev) => { if (!on || pinned || inLens(ev.target) || inControls(ev.target)) return; hovered = resolve(ev.target); show(hovered); }, true);
  // the page doesn't act while the lens is on: a press inspects instead (and starts no drag)
  const swallow = (ev) => {
    if (!on || inLens(ev.target) || inControls(ev.target)) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (ev.type !== "click") return;
    const hit = resolve(ev.target);
    pinned = hit && pinned?.el !== hit.el ? hit : null;
    hovered = hit;
    show(hovered);
    if (pinned) card.querySelector("[data-lens-unpin]")?.focus({ preventScroll: true });
  };
  for (const t of ["pointerdown", "mousedown", "click", "dblclick", "dragstart", "auxclick"]) document.addEventListener(t, swallow, true);
  ui.addEventListener("click", (ev) => {
    const p = ev.target.closest("[data-lens-paint]");
    if (p) { const k = p.dataset.lensPaint; painted.has(k) ? painted.delete(k) : painted.add(k); p.setAttribute("aria-pressed", painted.has(k)); if (painted.size) paint(); else paintLayer.innerHTML = ""; return; }
    if (ev.target.closest("[data-lens-unpin]")) { pinned = null; show(hovered); return; }
    if (ev.target.closest("[data-lens-off]")) set(false);
  });
  document.addEventListener("keydown", (ev) => {
    const typing = /^(input|textarea|select)$/i.test(ev.target.tagName) || ev.target.isContentEditable;
    if (!typing && !ev.metaKey && !ev.ctrlKey && !ev.altKey && (ev.key === "i" || ev.key === "I")) { ev.preventDefault(); set(!on); return; }
    if (!on || ev.key !== "Escape") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (pinned) { const el = pinned.el; pinned = null; show(hovered); if (el.matches("a, button, input, [tabindex]")) el.focus({ preventScroll: true }); }
    else set(false);
  }, true);
  addEventListener("scroll", redraw, { capture: true, passive: true });
  addEventListener("resize", redraw);
  // the board draws itself again (a filter, a fold, a resize): read the page again
  new MutationObserver(() => { if (!on) return; const before = map.size; scan(); if (map.size !== before) counts(); if (pinned && !pinned.el.isConnected) pinned = null; if (hovered && !hovered.el.isConnected) hovered = null; redraw(); })
    .observe(document.querySelector(".app-main") || document.body, { childList: true, subtree: true });

  let start = false; try { start = localStorage.getItem(KEY) === "1"; } catch {}
  if (start) set(true, true);
  window.BolsterLens = { set, get on() { return on; } };
})();
