// Tooltips for anything that carries data-tip="…" (D52): every icon that stands without a label, in a
// control (an icon button) or in content (an icon in a table cell), names itself here.
//   <button class="button" data-icon-only aria-label="Close" data-tip="Close">…svg…</button>
//   <span data-tip="Materials">…svg…</span>
// One tooltip in the top layer, so a card's or a table's overflow never clips it. It shows after a
// short pause under a mouse, at once on keyboard focus, and goes on leave, blur, scroll, a press or
// Escape. It's for sighted pointer and keyboard users: the element keeps its own accessible name
// (aria-label), so the tooltip itself is hidden from screen readers. Touch has no hover: never put
// the only copy of something important in a tooltip.
(() => {
  if (window.BolsterTips) return;
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.setAttribute("popover", "manual");
  tip.setAttribute("aria-hidden", "true");
  let on = null, timer = 0;
  const host = () => [...document.querySelectorAll("dialog:modal")].pop() || document.body;
  function place(el) {
    const r = el.getBoundingClientRect(), gap = 6, pad = 8;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let top = r.top - gap - h;
    if (top < pad) top = r.bottom + gap;
    const left = Math.max(pad, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - pad));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function show(el) {
    clearTimeout(timer);
    const text = el.dataset.tip;
    if (!text || !el.isConnected) return;
    on = el;
    // inside a modal sheet the tooltip lives in it, or the sheet would cover it
    if (tip.parentElement !== host()) { if (tip.matches(":popover-open")) tip.hidePopover(); host().append(tip); }
    tip.textContent = text;
    // focus can land while another popover is still opening (a page moving focus as its menu opens or closes),
    // and the browser refuses a second one mid-show: then the tip comes a frame later, if it's still wanted
    if (!tip.matches(":popover-open")) {
      try { tip.showPopover(); } catch { requestAnimationFrame(() => { if (on === el && el.isConnected && !tip.matches(":popover-open")) { tip.showPopover(); place(el); } }); return; }
    }
    place(el);
  }
  function hide() {
    clearTimeout(timer);
    on = null;
    if (tip.isConnected && tip.matches(":popover-open")) tip.hidePopover();
  }
  // a control that shows its own label needs no tooltip: only an icon standing alone gets one (the
  // phone's search and Add filter, the Create button folded to its +)
  const labelled = (el) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      const p = t.parentElement, b = p.getBoundingClientRect(), cs = getComputedStyle(p);
      if (/[\p{L}\p{N}]/u.test(t.textContent) && !p.closest(".avatar") && b.width > 3 && b.height > 3 && cs.clipPath === "none" && +cs.opacity > 0) return true;
    }
    return false;
  };
  const target = (e) => { const el = e.target.closest?.("[data-tip]"); return el && !labelled(el) ? el : null; };
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const el = target(e);
    if (el === on) return;
    if (!el) return hide();
    clearTimeout(timer);
    timer = setTimeout(() => show(el), on ? 0 : 300);
  });
  document.addEventListener("pointerout", (e) => { if (e.pointerType === "mouse" && target(e) && !target(e).contains(e.relatedTarget)) hide(); });
  document.addEventListener("focusin", (e) => { const el = target(e); if (el && el.matches(":focus-visible")) show(el); });
  document.addEventListener("focusout", (e) => { if (target(e) === on) hide(); });
  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && on) hide(); });
  addEventListener("scroll", hide, { passive: true, capture: true });
  const mount = () => document.body.append(tip);
  document.body ? mount() : addEventListener("DOMContentLoaded", mount);
  window.BolsterTips = { show, hide };
})();
