// Loading (D142, I28): a part that's waiting for its data shows a skeleton in the shape of what's coming, and only
// when the wait is long enough to see. Styling never needs it; this is the timing.
//
//   BolsterLoading.load(region, work, { skeleton, render, error, label, reserve, note, announce })
//     region     the part that's loading: it keeps its place, aria-busy while it loads
//     work       () => Promise<data>
//     skeleton   () => html in the shape and size of what's coming, or draws it itself and returns nothing
//     render     (data) => puts the content in
//     error      () => html for the error state, its Try again a [data-retry] (a banner by default); or draws it
//                itself and returns nothing (its Try again is then the page's own)
//     label      what's loading, in the screen's words ("jobs"): "Loading jobs", "Still loading jobs…"
//     reserve    a first load: the skeleton is drawn at once but unseen, so its space is held while the wait is too
//                short to show it; otherwise what's there stays until the skeleton shows
//     note       where "Still loading…" goes (the region by default)
//     announce   false where the page says "Loading" itself (a live count)
//
// No flash: the skeleton waits 300 ms, and once shown stays at least 300 ms. After 10 s it says so in words. A failure
// puts the error state in its place, with Try again. Screen readers hear "Loading" once, not a bar at a time.
window.BolsterLoading = (() => {
  const DELAY = 300, MIN = 300, SLOW = 10000;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let live = null;
  const say = (text) => {
    if (!live) { live = document.createElement("p"); live.className = "visually-hidden"; live.setAttribute("aria-live", "polite"); document.body.append(live); }
    live.textContent = ""; setTimeout(() => (live.textContent = text), 50);
  };
  const banner = (label) => `<div class="banner" role="alert"><p>${label ? `${label[0].toUpperCase()}${label.slice(1)} didn't load` : "This didn't load"}. Check your connection and try again.</p><button type="button" class="button" data-variant="secondary" data-size="sm" data-retry>Try again</button></div>`;
  const draw = (region, html) => { if (typeof html === "string") region.innerHTML = html; };

  async function load(region, work, o = {}) {
    const name = o.label ? ` ${o.label}` : "";
    let shownAt = 0, slowTimer = 0, noteEl = null;
    region.setAttribute("aria-busy", "true");
    if (o.reserve) { region.dataset.wait = ""; draw(region, o.skeleton?.()); }
    const showTimer = setTimeout(() => {
      if (o.reserve) delete region.dataset.wait; else draw(region, o.skeleton?.());
      shownAt = performance.now();
      if (o.announce !== false) say(`Loading${name}`);
      slowTimer = setTimeout(() => {
        noteEl = Object.assign(document.createElement("p"), { className: "loading-note", textContent: `Still loading${name}…` });
        noteEl.setAttribute("role", "status");
        (o.note || region).prepend(noteEl);
      }, SLOW - DELAY);
    }, DELAY);
    const settle = async () => {
      clearTimeout(showTimer);
      if (shownAt) { const left = MIN - (performance.now() - shownAt); if (left > 0) await wait(left); }
      clearTimeout(slowTimer);
      noteEl?.remove();
      delete region.dataset.wait;
      region.removeAttribute("aria-busy");
    };
    try {
      const data = await work();
      await settle();
      o.render?.(data);
      return data;
    } catch (err) {
      await settle();
      const html = o.error ? o.error() : banner(o.label);
      if (typeof html === "string") {
        region.innerHTML = html;
        region.querySelector("[data-retry]")?.addEventListener("click", () => load(region, work, o));
      }
      return undefined;
    }
  }
  return { load };
})();
