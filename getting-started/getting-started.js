// Getting started concept: Bolton in his vest leads; all eight setup steps sit side by side, in any order (he still
// suggests the next one). Sample data; ticking a step's circle is how the concept shows him reacting.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Bolster's setup steps. `path` ones go in order; `soft` means better first, `needs` means can't start before
  const PATH = [
    { id: "rates", act: "Set rates", icon: "hard-hat", tone: "danger", title: "Set your labor rates", body: "The hourly crew costs behind every estimate, priced to your area.",
      tip: "Do this first and your estimates price themselves right the first time.", time: "2 min" },
    { id: "estimate", act: "Start estimate", icon: "table", tone: "info", title: "Create your first estimate", body: "Build the scope, price it, and watch the proposal take shape.",
      tip: "Tell me the job in a sentence. I'll draft the scope; you check the numbers.", time: "10 min", soft: "rates" },
    { id: "proposal", act: "Send proposal", icon: "file-signature", tone: "success", title: "Send your first proposal", body: "Share the estimate with your client to approve and sign.",
      tip: "I'll write the cover note. You press send.", time: "3 min", needs: "estimate" },
  ];
  const REST = [
    { id: "migrate", act: "Import work", icon: "upload", tone: "active", featured: true, title: "Bring in your current work", body: "Move jobs and open proposals over from another app or a spreadsheet.",
      tip: "Drop me a spreadsheet and I'll sort it into jobs and proposals.", time: "15 min" },
    { id: "verify", act: "Verify business", icon: "badge-check", tone: "purple", title: "Verify your business", body: "A few details so your clients can pay you through Bolster.",
      tip: "About five minutes. Keep your tax number handy.", time: "5 min" },
    { id: "leadform", act: "Add lead form", icon: "clipboard-list", tone: "warning", title: "Add a lead form to your website", body: "New inquiries from your website land straight in your pipeline, ready to quote.",
      tip: "One line of code on your site, and leads find their own way in.", time: "5 min" },
    { id: "integrations", act: "Connect apps", icon: "plug", tone: "booked", title: "Connect your integrations", body: "QuickBooks, AutoCost, Google Calendar and more.",
      tip: "Connect QuickBooks and I'll keep your books in step with your jobs.", time: "5 min", optional: true },
    { id: "team", act: "Invite team", icon: "users", tone: "outstanding", title: "Invite your team", body: "Add your crew and office. Everyone works from the same jobs.",
      tip: "Invite the office first. They'll thank you by Friday.", time: "2 min", optional: true },
  ];
  const ALL = [...PATH, ...REST];

  // what a step opens, as Bolster's own Getting started does it (your screens, 27 Oct): a guide in the corner, with a
  // coach mark at the menu, for the steps done elsewhere in Bolster; a dialog for labor rates, done right here
  const FLOWS = {
    estimate: { kind: "guide", coach: ["Head to Jobs", "Estimates live inside jobs. Open the Jobs section: Pipeline is the default view."], steps: [
      ["Open your Pipeline", "It's under Jobs"], ["Create a new job", "The Create new button"], ["Pick a starting point", "Upload recommended, or Bolton, scratch, catalog"],
      ["Add a new item", "The Add new item button"], ["Name your item", "The side panel's Name field"], ["Set the quantity", "The Measurements section"],
      ["Set the cost", "The Pricing section"], ["Save something to your catalog", "A row's ⋯ menu"], ["Add from the catalog", "More, then Browse full item catalog"]] },
    proposal: { kind: "guide", coach: ["Head to Jobs", "Proposals live inside jobs. Open the Jobs section: your Pipeline holds every job you've got."], steps: [
      ["Open your Pipeline", "It's under Jobs"], ["Open your job", "Any job card works"], ["Open the proposal presentation", "In the job's side menu"],
      ["Send your proposal", "The envelope in the footer"], ["Send it to yourself first", "A dress rehearsal"]] },
    rates: { kind: "dialog" },
  };
  const RATES = [["Interior doors", "Carpenter, residential", "49.59"], ["Customer satisfaction", "Project manager, residential", "82.20"],
    ["Pre construction", "General labour, residential", "40.22"], ["Surveying and staking", "General labour, residential", "40.22"],
    ["General", "General labour, residential", "40.22"], ["Sales and estimating", "Estimator, residential", "58.75"],
    ["Framing", "Framer, residential", "46.10"], ["Drywall", "Drywall installer, residential", "44.35"]];
  const DEFAULT_DONE = ["estimate", "proposal", "leadform"];   // where the sample account is today
  const KEY = "bolster-concepts:getting-started";
  let done;
  try { done = new Set(JSON.parse(localStorage.getItem(KEY)) || DEFAULT_DONE); } catch { done = new Set(DEFAULT_DONE); }
  let donePlace = "fold";   // the defaults (4 Nov): done actions fold away, the banner centred with Bolton in the box
  // the drawings: blueprint (4 Nov, the default, the look chosen in the illustration studio), printed or the line
  // drawings; a concept control switches them
  let artStyle = "blueprint";
  try { const v = localStorage.getItem("gs-art-style-2"); if (["line", "printed", "blueprint"].includes(v)) artStyle = v; if (v === "beige") artStyle = "blueprint"; } catch {}
  const isBP = () => artStyle === "blueprint";
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch {} };

  // ---------- the steps ----------
  const icon = (n, s = 16) => `<i data-icon="${n}" data-size="${s}"></i>`;
  // the step's icon is its tick (research, 27 Oct: HoneyBook, Uxcel, Google Workspace): press it and the icon becomes a
  // check in a green well; pointing at it shows the check it would become
  // the drawing of what you do in the step; no tick on the cards (your call, 27 Oct): a step is done when you've done it
  // a done action carries its check, a white check on green in the drawing's corner (your call, 29 Oct): it shows only
  // once the action is actually done; pressing it takes the action back to not done (your call, 29 Oct), so a done card
  // needs no undo in its corner
  const mark = (s) => `<span class="gs-art-well">${(artStyle === "printed" ? window.GS_N3?.prodlabel?.[s.id] : window.GS_ART?.[s.id]) || ""}${isBP() ? `<span class="gs-sheen" aria-hidden="true"></span>` : ""}${done.has(s.id) ? `<button type="button" class="gs-art-check" aria-label="Mark ${esc(s.title)} as not done" data-tip="Not done yet" data-undo="${s.id}">${icon("check", 14)}</button>` : ""}</span>`;
  // the step's heading carries how long it takes (feedback, 27 Oct); its drawing shows what you do, and moves when you
  // point at the card. Steps you can do without (integrations, your team) can be hidden, and brought back one by one
  // every action can be hidden (feedback, 29 Oct), not only the optional ones
  const dismiss = (s) => true ? `<button type="button" class="button gs-dismiss" data-variant="ghost" data-size="sm" data-icon-only aria-label="Hide ${esc(s.title)}" data-tip="Hide this action" data-dismiss="${s.id}">${icon("xmark", 14)}</button>` : "";
  // a done step can go back on the list (feedback, 27 Oct): the same corner, an undo
  const undo = (s) => `<button type="button" class="button gs-dismiss" data-variant="ghost" data-size="sm" data-icon-only aria-label="Move ${esc(s.title)} back to your actions" data-tip="Not done yet" data-undo="${s.id}">${icon("undo", 14)}</button>`;
  // a hidden action is the same card, without its colour, its corner button bringing it back (feedback, 29 Oct)
  function card(s, isHidden = false) {
    const locked = s.needs && !done.has(s.needs);
    return `<article class="card gs-card" data-step="${s.id}"${isHidden ? " data-hidden" : ` data-tone="${s.tone}"`}${s.featured && !done.has(s.id) && !isHidden ? " data-featured" : ""}${done.has(s.id) ? " data-done" : ""}${locked ? " data-locked" : ""}${s.optional ? " data-optional" : ""}>
      <div class="gs-card-top">
        ${mark(s)}
      </div>${isHidden ? restoreBtn(s) : done.has(s.id) ? "" : dismiss(s)}
      <h3><span class="gs-h-check" aria-hidden="true">${done.has(s.id) ? icon("check", 12) : ""}</span><button type="button" class="gs-open" data-open-step="${s.id}">${esc(s.title)}</button>${done.has(s.id) ? `<span class="gs-h-sp"> </span><span class="gs-h-done">Done</span>` : s.time ? `<span class="gs-h-sp"> </span><span class="gs-h-time"><span class="visually-hidden">, about </span>${s.time}</span>` : ""}</h3>
      <p>${esc(s.body)}</p>
    </article>`;
  }
  // what's done folds away into Completed at the end of the page; a step ticked just now stays where it was until the
  // next visit (or a reset), so it doesn't vanish under your pointer
  const fresh = new Set();
  // hidden steps: out of the grid, into a fold under it (one fold for all of them, or one each: concept panel); each
  // comes back on its own
  const HKEY = "bolster-concepts:getting-started:hidden", MKEY = "gs-hidden-mode";
  let hidden, hideMode = "one";
  try { hidden = new Set(JSON.parse(localStorage.getItem(HKEY)) || []); } catch { hidden = new Set(); }
  try { if (["one", "each"].includes(localStorage.getItem(MKEY))) hideMode = localStorage.getItem(MKEY); } catch {}
  const saveHidden = () => { try { localStorage.setItem(HKEY, JSON.stringify([...hidden])); } catch {} };
  const restoreBtn = (s) => `<button type="button" class="button gs-dismiss" data-variant="ghost" data-size="sm" data-icon-only data-restore="${s.id}" aria-label="Show ${esc(s.title)} again" data-tip="Show again">${icon("eye", 14)}</button>`;
  const hiddenRow = (s) => `<li data-hidden-step="${s.id}">${card(s, true)}</li>`;
  const chev = `<span class="gs-done-chev" aria-hidden="true">${icon("chevron-down", 14)}</span>`;
  // Completed (under the grid) and Hidden actions (last, under All set): each a toggle that opens its list; one open at a time
  let moreOpen = null;
  function renderMore(finished) {
    const list = ALL.filter((s) => hidden.has(s.id)), box = $("#gs-more"), boxH = $("#gs-more-h");
    if (moreOpen === "done" && !finished.length) moreOpen = null;
    if (moreOpen === "hidden" && !list.length) moreOpen = null;
    box.hidden = !finished.length; boxH.hidden = !list.length;
    const btn = (key, label, n, panel) => n ? `<button type="button" class="gs-more-btn" data-more="${key}" aria-expanded="${moreOpen === key}" aria-controls="${panel}"><span>${label}</span><span class="gs-done-count">${n}</span>${chev}</button>` : "";
    $("#gs-more-bar").innerHTML = btn("done", "Completed", finished.length, "gs-done-grid");
    $("#gs-more-h-bar").innerHTML = btn("hidden", "Hidden actions", list.length, "gs-hidden-list");
    $("#gs-done-grid").innerHTML = finished.map((s) => `<li>${card(s)}</li>`).join("");
    $("#gs-hidden-list").innerHTML = list.map(hiddenRow).join("");
    $("#gs-done-grid").hidden = moreOpen !== "done";
    $("#gs-hidden-list").hidden = moreOpen !== "hidden";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-more]"); if (!b) return;
    moreOpen = moreOpen === b.dataset.more ? null : b.dataset.more;
    render(); $(`[data-more="${b.dataset.more}"]`)?.focus();
  });
  function render() {
    // done actions stay where they are by default (your call, 29 Oct); the concept panel can fold them into Completed
    const inCompleted = (s) => donePlace === "fold" && done.has(s.id) && !fresh.has(s.id);
    const shown = ALL.filter((s) => !hidden.has(s.id));
    $("#gs-grid").innerHTML = shown.filter((s) => !inCompleted(s)).map((s) => `<li>${card(s)}</li>`).join("");
    renderMore(shown.filter(inCompleted));
    renderDoneCtl();
    window.BolsterShell?.hydrateIcons?.();
  }
  // concept controls: tick any step done or not, to see the cards in each state (feedback, 29 Oct)
  function renderDoneCtl() {
    const box = $("#gs-done-ctl"); if (!box) return;
    box.innerHTML = ALL.map((s) => `<label class="choice"><input type="checkbox" class="checkbox" data-done-ctl="${s.id}"${done.has(s.id) ? " checked" : ""}> ${esc(s.title)}</label>`).join("");
  }
  const setDone = (ids, on) => { ids.forEach((id) => { if (on) done.add(id); else { done.delete(id); fresh.delete(id); } }); save(); render(); };
  document.addEventListener("change", (e) => { const c = e.target.closest("[data-done-ctl]"); if (c) setDone([c.dataset.doneCtl], c.checked); });
  $("#gs-all-done")?.addEventListener("click", () => setDone(ALL.map((s) => s.id), true));
  $("#gs-none-done")?.addEventListener("click", () => setDone(ALL.map((s) => s.id), false));
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-dismiss]");
    if (d) {
      const s = ALL.find((x) => x.id === d.dataset.dismiss);
      const li = d.closest("li"), next = li?.nextElementSibling || li?.previousElementSibling;
      hidden.add(s.id); saveHidden(); render();
      (next && $(`[data-step="${next.querySelector(".gs-card")?.dataset.step}"] .gs-open`) || $('[data-more="hidden"]'))?.focus({ preventScroll: true });
      // hid it by mistake? Undo puts it straight back where it was (feedback, 30 Oct)
      window.BolsterShell?.toast(`Hidden “${s.title}”. It's under Hidden actions.`, { undo: () => {
        hidden.delete(s.id); saveHidden(); render();
        const c = $(`[data-step="${s.id}"]`);
        if (c) { c.classList.remove("gs-just"); void c.offsetWidth; c.classList.add("gs-just"); c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); c.querySelector(".gs-open")?.focus({ preventScroll: true }); }
      } });
      return;
    }
    const u = e.target.closest("[data-undo]");
    if (u) {
      const s = ALL.find((x) => x.id === u.dataset.undo);
      done.delete(s.id); fresh.delete(s.id); save(); render();
      const c = $(`[data-step="${s.id}"]`);
      if (c) { c.classList.remove("gs-just"); void c.offsetWidth; c.classList.add("gs-just"); c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); c.querySelector(".gs-open")?.focus({ preventScroll: true }); }
      say(`Okay, ${s.title.toLowerCase()} is back on the list.`, "thinking");
      return;
    }
    const r = e.target.closest("[data-restore]");
    if (r) {
      const s = ALL.find((x) => x.id === r.dataset.restore);
      hidden.delete(s.id); saveHidden(); render();
      const c = $(`[data-step="${s.id}"]`);
      if (c) { c.classList.remove("gs-just"); void c.offsetWidth; c.classList.add("gs-just"); c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); c.querySelector(".gs-open")?.focus({ preventScroll: true }); }
    }
  });

  // ---------- Bolton: what he says, and how he looks while he says it ----------
  const fig = $(".gs-bolton"), sayEl = $("#gs-say .gs-say-text"), bubble = $("#gs-say");
  let typing = [], back = 0, sizing = null;
  // what he says: the bubble eases to the new message's size, and its words fade up one after another (the whole
  // message is laid out at once, so nothing reflows or jumps while it appears)
  function say(text, state = "talking", after = "idle", step = null) {
    typing.forEach(clearTimeout); typing = [];
    setAct(step);
    if (reduce) { sayEl.textContent = text; fig.dataset.state = after; return; }
    // he doesn't talk on this page (your call, 26 Oct): no moving mouth, only his face reacts (a wink, a nod, a laugh)
    fig.dataset.state = state === "talking" ? "idle" : state;
    const from = bubble.getBoundingClientRect(), wasEmpty = !sayEl.textContent;
    sizing?.cancel();
    const words = text.split(" ");
    sayEl.innerHTML = words.map((w, i) => `<span class="gs-w" style="--i:${i}">${esc(w)}</span>`).join(" ");
    const to = bubble.getBoundingClientRect();
    if (wasEmpty) bubble.animate([{ opacity: 0, scale: .94 }, { opacity: 1, scale: 1 }], { duration: 320, easing: "cubic-bezier(.2, .9, .3, 1.2)" });
    else if (Math.abs(from.width - to.width) > 1 || Math.abs(from.height - to.height) > 1)
      sizing = bubble.animate([{ inlineSize: `${from.width}px`, blockSize: `${from.height}px` }, { inlineSize: `${to.width}px`, blockSize: `${to.height}px` }],
        { duration: 260, easing: "cubic-bezier(.3, 0, .2, 1)" });
    typing.push(setTimeout(() => { fig.dataset.state = after; }, words.length * 45 + (state === "done" ? 2200 : 400)));
  }
  // the bubble's button: the step he's pointing you to, on its right; it takes you to that step's card
  const actBtn = $("#gs-say-act");
  function setAct(step) {
    actBtn.hidden = !step;
    if (step) { actBtn.textContent = step.act; actBtn.dataset.step = step.id; }
  }
  actBtn.addEventListener("click", () => {
    const c = $(`[data-step="${actBtn.dataset.step}"]`); if (!c) return;
    c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    c.classList.remove("gs-just"); void c.offsetWidth; c.classList.add("gs-just");
    c.focus({ preventScroll: true });
  });
  // the step to suggest: the next one on the path, then the first of the rest
  const nextStep = () => PATH.find((s) => !done.has(s.id)) || REST.find((s) => !done.has(s.id)) || null;
  function status() {
    const n = ALL.filter((s) => done.has(s.id)).length, left = ALL.length - n;
    if (!n) return "Hi, I'm Bolton. Let's get you sending proposals. Start with your labor rates and the rest follows.";
    if (!left) return "That's everything. You're all set up! Hide this page whenever you like.";
    const next = PATH.find((s) => !done.has(s.id));
    if (next) return `Next up: ${next.title.toLowerCase()}. ${next.id === "rates" ? "Two minutes, and every estimate prices itself." : ""}`.trim();
    return "Your first job's out the door. Point at any action and I'll tell you the shortcut.";
  }

  // pointing at a step: he gives its tip; leave and he goes back to where you're at
  function hover(id) {
    clearTimeout(back);
    const s = ALL.find((x) => x.id === id); if (!s) return;
    if (fig.dataset.tip === id) return;
    fig.dataset.tip = id;
    say(done.has(id) ? `${s.title}: done. ${["Nice.", "Tick.", "Sorted."][id.length % 3]}` : s.tip);
  }
  function leave() { clearTimeout(back); back = setTimeout(() => { delete fig.dataset.tip; say(status(), "talking", "idle", nextStep()); }, 1400); }
  document.addEventListener("pointerover", (e) => { const c = e.target.closest(".gs-card"); if (c) hover(c.dataset.step); });
  document.addEventListener("pointerout", (e) => { const c = e.target.closest(".gs-card"); if (c && !c.contains(e.relatedTarget)) leave(); });
  document.addEventListener("focusin", (e) => { const c = e.target.closest(".gs-card"); if (c) hover(c.dataset.step); });

  // ---------- what a step opens ----------
  const PIPELINE = "../pipeline/";
  let guide = null, coach = null;
  function closeGuide() { guide?.remove(); coach?.remove(); guide = coach = null; removeEventListener("resize", placeCoach); }
  function placeCoach() {
    if (!coach) return;
    const jobs = document.querySelector('.rail-item[data-section="jobs"]'), r = jobs?.getBoundingClientRect();
    if (!r || !r.width) { coach.hidden = true; return; }   // no rail (phones): the guide alone
    coach.hidden = false;
    coach.style.insetBlockStart = `${Math.max(8, r.top + r.height / 2 - 28)}px`; coach.style.insetInlineStart = `${r.right + 12}px`;
  }
  function openGuide(id) {
    closeGuide();
    const s = ALL.find((x) => x.id === id), f = FLOWS[id];
    guide = document.createElement("aside");
    guide.className = "gs-guide"; guide.setAttribute("aria-label", `${s.title}: guide`);
    guide.innerHTML = `<header class="gs-guide-head"><span class="gs-guide-av" aria-hidden="true"></span><h2>${esc(s.title)}</h2>
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Minimize guide" data-tip="Minimize guide" aria-expanded="true" data-guide-min><span class="gs-guide-chev">${icon("chevron-down", 14)}</span></button></header>
      <ol class="gs-guide-steps">${f.steps.map(([t, h], i) => `<li${i === 0 ? ' data-current' : ""}><span class="gs-guide-dot" aria-hidden="true"></span>
        <div>${i === 0 ? `<a href="${PIPELINE}" target="_top">${esc(t)}</a>` : `<b>${esc(t)}</b>`}<span>${esc(h)}</span></div></li>`).join("")}</ol>
      <footer class="gs-guide-foot"><span>0 of ${f.steps.length} complete</span><button type="button" class="button" data-variant="ghost" data-size="sm" data-guide-close>Dismiss guide</button></footer>`;
    document.body.append(guide);
    window.BoltonEmbed?.avatar(24).then((a) => guide?.querySelector(".gs-guide-av")?.append(a));
    coach = document.createElement("div");
    coach.className = "gs-coach"; coach.setAttribute("role", "note");
    coach.innerHTML = `<span class="gs-coach-step">Step 1 of ${f.steps.length}</span><b>${esc(f.coach[0])}</b><p>${esc(f.coach[1])}</p>`;
    document.body.append(coach); placeCoach(); addEventListener("resize", placeCoach);
    window.BolsterShell?.hydrateIcons?.(guide);
    guide.querySelector("a")?.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    // going where it points (the guide's first step, or Jobs in the menu) puts the guide and its coach mark away; a click
    // anywhere else puts the coach mark away (feedback, 27 Oct)
    if (guide && e.target.closest('.gs-guide a, .rail-item[data-section="jobs"]')) { closeGuide(); return; }
    if (coach && !e.target.closest(".gs-coach, [data-open-step]")) { coach.remove(); coach = null; }
    if (e.target.closest("[data-guide-close]")) { closeGuide(); return; }
    const min = e.target.closest("[data-guide-min]");
    if (min) { const open = guide.toggleAttribute("data-min"); min.setAttribute("aria-expanded", String(!open)); min.setAttribute("aria-label", open ? "Expand guide" : "Minimize guide"); min.dataset.tip = open ? "Expand guide" : "Minimize guide"; if (coach) coach.hidden = open || !coach.style.insetInlineStart; return; }
    const o = e.target.closest("[data-open-step]"); if (!o) return;
    const id = o.dataset.openStep, f = FLOWS[id], s = ALL.find((x) => x.id === id);
    if (f?.kind === "guide") openGuide(id);
    else if (f?.kind === "dialog") openRates();
    else window.BolsterShell?.toast(`${s.title}: what Bolster opens here isn't in the concept yet.`);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && coach) { coach.remove(); coach = null; } });

  // labor rates: AutoCost's defaults for the area, each crew renamable and repriced; saving ticks the step
  const rates = $("#gs-rates");
  function openRates() {
    $("#gs-rates-list").innerHTML = RATES.map(([stage, crew, rate], i) => `<div class="gs-rate" data-q="${esc((stage + " " + crew).toLowerCase())}">
      <label class="gs-rate-stage" for="gs-crew-${i}">${esc(stage)}</label>
      <input class="input" id="gs-crew-${i}" value="${esc(crew)}" aria-label="${esc(stage)}: crew">
      <span class="input-group gs-rate-cost"><input class="input" data-numeric inputmode="decimal" value="${rate}" aria-label="${esc(stage)}: hourly cost"><span class="input-adornment" aria-hidden="true">$/hr</span></span></div>`).join("");
    $("#gs-rates-filter").value = "";
    rates.showModal();
  }
  $("#gs-rates-filter").addEventListener("input", (e) => { const q = e.target.value.trim().toLowerCase(); rates.querySelectorAll(".gs-rate").forEach((r) => { r.hidden = !!q && !r.dataset.q.includes(q); }); });
  rates.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) rates.close(); });
  $("#gs-rates-save").addEventListener("click", () => {
    rates.close();
    if (!done.has("rates")) { done.add("rates"); fresh.add("rates"); save(); render(); }
    window.BolsterShell?.toast("Labor rates saved");
  });

  $("#gs-reset").addEventListener("click", () => { done = new Set(DEFAULT_DONE); fresh.clear(); hidden.clear(); saveHidden(); save(); render(); say(status(), "talking", "idle", nextStep()); });

  // ---------- the banner's chat box: what you send there carries on in his chat ----------
  (function askBox() {
    if (!window.BoltonEmbed) return void setTimeout(askBox, 100);
    // what you send here, or a suggestion you pick, opens the chat with it already in the chat's box while he waves; it
    // goes once he has settled (your call, 27 Oct: no chat on the page itself)
    const form = window.BoltonEmbed.askBox($("#gs-ask"));
    form.querySelector('[aria-label="Attach files"]')?.remove();   // no attaching from the page's box (your call, 27 Oct)
    // his head at the start of the box, shown by the "in the box" banner
    // press his head and the chat's own suggestions come up under the box; picking one sends it, and the chat opens
    const slot = document.createElement("button"); slot.type = "button"; slot.className = "gs-ask-head";
    slot.setAttribute("aria-label", "Suggestions from Bolton"); slot.dataset.tip = "Suggestions from Bolton";
    slot.setAttribute("aria-expanded", "false"); slot.setAttribute("aria-controls", "gs-suggest");
    form.prepend(slot);
    // the big box's foot (4 Nov): attach beside the mic (Recents and its divider went, your call)
    const ico = (d) => `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    const mic = form.querySelector('[aria-label="Speak to Bolton"]');
    const plus = Object.assign(document.createElement("button"), { type: "button", className: "gs-ask-plus", innerHTML: ico("M9 3.5v11M3.5 9h11") });
    plus.setAttribute("aria-label", "Attach files"); plus.dataset.tip = "Attach files";
    mic.before(plus);
    window.BoltonEmbed.avatar(32).then((a) => { a.setAttribute("aria-hidden", "true"); slot.append(a); });
    const pop = document.createElement("div"); pop.id = "gs-suggest"; pop.className = "gs-suggest bt-chips-compact"; pop.hidden = true;
    pop.setAttribute("aria-label", "Suggestions"); pop.setAttribute("role", "group"); pop.innerHTML = `${window.BoltonEmbed.suggestions().map((q) => `<button type="button" class="bt-chip">${esc(q)}</button>`).join("")}`;
    form.after(pop);   // under the box (your call, 28 Oct), in its slot, so it's as wide as the box
    const input = form.querySelector(".bt-input");
    // the suggestions come up when you click into the box, and go when you leave it (4 Nov); his head just makes him laugh
    const showPop = (on) => { pop.hidden = !on; };
    input.addEventListener("focus", () => showPop(true)); input.addEventListener("click", () => showPop(true));
    input.addEventListener("blur", () => setTimeout(() => { if (!form.contains(document.activeElement) && !pop.contains(document.activeElement)) showPop(false); }, 150));
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") showPop(false); });
    pop.addEventListener("pointerdown", (e) => e.preventDefault());   // picking a suggestion keeps the box focused
    slot.setAttribute("aria-label", "Bolton"); slot.dataset.tip = "Bolton"; slot.removeAttribute("aria-expanded"); slot.removeAttribute("aria-controls");
    let laughT = 0;
    slot.addEventListener("click", () => { const av = slot.querySelector(".bt-state"); if (!av) return; clearTimeout(laughT);
      av.dataset.state = "laughing"; laughT = setTimeout(() => { av.dataset.state = "idle"; }, 1500);
      if (!still()) av.animate([{ translate: "0 0", rotate: "0deg" }, { translate: "0 -2px", rotate: "-7deg" }, { translate: "0 0", rotate: "5deg" }, { translate: "0 -1.5px", rotate: "-4deg" }, { translate: "0 0", rotate: "2deg" }, { translate: "0 0", rotate: "0deg" }], { duration: 900, easing: "ease-in-out" }); });   // a little chuckle
    pop.addEventListener("click", (e) => {
      const b = e.target.closest(".bt-chip"); if (!b) return;
      input.value = b.textContent; input.dispatchEvent(new Event("input")); form.requestSubmit();
    });
  })();

  // three banners to compare, from the concept panel; the choice is remembered in this browser
  const hero = $("#gs-hero"), BKEY = "gs-banner";
  const setBanner = (v) => { hero.dataset.banner = v; $("#gs-banner").value = v; };
  try { const v = localStorage.getItem(BKEY); if (["lead", "card", "open", "ask", "big", "dock", "bar", "pill", "none"].includes(v)) setBanner(v); } catch {}
  $("#gs-banner").addEventListener("change", (e) => { setBanner(e.target.value); try { localStorage.setItem(BKEY, e.target.value); } catch {} });
  // left or centred, for every banner
  const AKEY = "gs-banner-align";
  const setAlign = (v) => { hero.dataset.align = v; document.querySelector(`#gs-align input[value="${v}"]`).checked = true; };
  try { const v = localStorage.getItem(AKEY); if (["start", "center"].includes(v)) setAlign(v); } catch {}
  $("#gs-align").addEventListener("change", (e) => { setAlign(e.target.value); try { localStorage.setItem(AKEY, e.target.value); } catch {} });

  // the chat box: an outline in ink, or raised off the page with the system's shadow
  // how a done action looks, and where it goes (concept panel, 29 Oct)
  const LKEY = "gs-done-look", PKEY = "gs-done-place";
  const gsRoot = document.querySelector(".gs");
  // the drawings (2 Nov): printed by default, the line drawings a pick away
  const artData = (v) => { gsRoot.dataset.art = v; };
  const setArt = (v) => { artStyle = v; artData(v); $("#gs-art-style").value = v; render(); if (isBP()) enterCards(); };
  artData(artStyle); $("#gs-art-style").value = artStyle;
  // a completed card's blueprint paper: green (4 Nov, the default) or beige, from the concept panel
  const setDonePaper = (v) => { gsRoot.dataset.donepaper = v; document.querySelectorAll('input[name="donepaper"]').forEach((r) => (r.checked = r.value === v)); };
  try { setDonePaper(localStorage.getItem("gs-done-paper") === "beige" ? "beige" : "green"); } catch { setDonePaper("green"); }
  $("#gs-done-paper")?.addEventListener("change", (e) => { setDonePaper(e.target.value); try { localStorage.setItem("gs-done-paper", e.target.value); } catch {} });
  $("#gs-art-style").addEventListener("change", (e) => { setArt(e.target.value); try { localStorage.setItem("gs-art-style-2", e.target.value); } catch {} });
  // blueprint, as set in the studio (4 Nov): the lines draw themselves in, no story (speed 1.35, gaps 1.15, smooth);
  // the cards fade in one after another when the page opens (90 ms apart, 700 ms each), each drawing in as it lands;
  // pointed at, the drawing lifts 2 px, a wide soft light follows the pointer, a press sinks it to .98
  const BP = { speed: 1.9, stagger: 1.15, gap: 90, enter: 700, draw: false };   // just the story, no drawing in (4 Nov, trying)
  // pointed at, the lines draw in and then the story plays (4 Nov: the story came back), at the studio's speed and gaps
  function drawIn(card, story = false) {
    if (!isBP() || still()) return; let i = 0, end = 0;
    card.querySelectorAll(".gs-art :is(path, line, rect, circle, ellipse, polyline, polygon)").forEach((el) => {
      if (!BP.draw) return;
      if (el.closest('[class*="mv-"]')) return;   // the story's own parts come in with the story, once (4 Nov: they drew, vanished and came again)
      if (getComputedStyle(el).stroke === "none" || !el.getTotalLength) return;
      let len = 0; try { len = el.hasAttribute("pathLength") ? +el.getAttribute("pathLength") : el.getTotalLength(); } catch {} if (!len) return;
      el.getAnimations().forEach((a) => a.id === "draw" && a.cancel());
      const an = el.animate([{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }],
        { duration: 650 / BP.speed, delay: (i++ * 28 * BP.stagger) / BP.speed, easing: "cubic-bezier(.4,0,.2,1)", fill: "backwards" }); an.id = "draw";
      end = Math.max(end, (650 + (i - 1) * 28 * BP.stagger) / BP.speed); });
    // the story's own animations (CSS, started by the hover) wait for most of the drawing, then run at its speed
    if (story) requestAnimationFrame(() => card.querySelectorAll(".gs-art [class*='mv-']").forEach((el) => el.getAnimations().forEach((a) => { if (a.id === "draw") return;
      const t = a.effect.getTiming(); a.effect.updateTiming({ delay: (t.delay || 0) * BP.stagger + end * .7 * BP.speed }); a.playbackRate = BP.speed; }))); }
  function enterCards() {
    if (!isBP()) return;
    document.querySelectorAll(".gs-card").forEach((c, i) => { if (still()) return;
      c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: BP.enter, delay: i * BP.gap, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
      setTimeout(() => drawIn(c), i * BP.gap + BP.enter * .45); }); }
  document.addEventListener("pointerover", (e) => { const c = e.target.closest?.(".gs-card"); if (c && !c.contains(e.relatedTarget)) { keepPlaying(c); drawIn(c, true); } });
  // the pointer leaves and the story stops (4 Nov, your call): what's left of it runs out in a fifth of a second, so it
  // settles rather than snapping to its end, and the card lets go of .gs-playing
  document.addEventListener("pointerout", (e) => { const c = e.target.closest?.(".gs-card"); if (!c || c.contains(e.relatedTarget) || !c.classList.contains("gs-playing")) return;
    clearTimeout(c._pt); const left = 200;
    c.querySelectorAll(".gs-art *").forEach((el) => el.getAnimations().forEach((a) => { const t = a.effect.getComputedTiming(); if (!isFinite(t.endTime)) return;
      const rest = t.endTime - (a.currentTime || 0); if (rest > 0) a.playbackRate = Math.max(Math.abs(a.playbackRate || 1), rest / left); }));
    c._pt = setTimeout(() => c.classList.remove("gs-playing"), left + 40); });
  // a story plays while the card is pointed at: the card holds .gs-playing for its length, so leaving can run it out softly
  function keepPlaying(card) { if (card.classList.contains("gs-playing")) return; card.classList.add("gs-playing"); clearTimeout(card._pt);
    requestAnimationFrame(() => requestAnimationFrame(() => { let end = 0;
      card.querySelectorAll(".gs-art *").forEach((el) => el.getAnimations().forEach((a) => { const t = a.effect.getComputedTiming(); if (isFinite(t.endTime)) end = Math.max(end, (t.endTime - (a.currentTime || 0)) / Math.abs(a.playbackRate || 1)); }));
      card._pt = setTimeout(() => card.classList.remove("gs-playing"), end + 120); })); }
  // the light follows the pointer anywhere on the card: the card's link lies over its drawing, so the pointer is read from
  // the card and placed on the drawing's box (4 Nov: it stood still, the link took the events)
  document.addEventListener("pointermove", (e) => { if (!isBP()) return; const w = e.target.closest?.(".gs-card")?.querySelector(".gs-art-well"); if (!w) return; const r = w.getBoundingClientRect();
    w.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`); w.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`); });
  // the cards come in once the page's loader has gone (it marks the page busy while it plays)
  requestAnimationFrame(() => { const busy = document.querySelector('[aria-busy="true"]'); if (!busy) { enterCards(); return; }
    const mo = new MutationObserver(() => { if (busy.getAttribute("aria-busy") !== "true") { mo.disconnect(); enterCards(); } }); mo.observe(busy, { attributes: true, attributeFilter: ["aria-busy"] }); });
  // a printed scene plays its story when you point at its card: is-on restarts it, its parts following each other
  // closer than drawn (stagger .4, as set in the playground); its numbers count up and its fields type in
  const STAGGER = .4, still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function playScene(card) {
    if (!card.querySelector(".gs-art.n3")) return;
    card.classList.remove("is-on"); void card.offsetWidth; card.classList.add("is-on");
    requestAnimationFrame(() => card.querySelectorAll(".gs-art.n3 *").forEach((el) => el.getAnimations().forEach((a) => {
      const t = a.effect.getTiming(); if (t.delay) a.effect.updateTiming({ delay: t.delay * STAGGER }); })));
    if (still()) return;
    card.querySelectorAll("[data-count]").forEach((el) => { el._full ??= el.textContent; const full = el._full, to = +el.dataset.count, d = +(el.dataset.delay || .4) * 1000;
      const pre = full.match(/^[^\d]*/)[0], post = full.match(/[^\d,.]*$/)[0], fmt = (n) => pre + n.toLocaleString("en-US") + post;
      const t0 = performance.now() + d, dur = +(el.dataset.dur || .9) * 1000; el.textContent = fmt(0); cancelAnimationFrame(el._raf);
      const step = (t) => { const k = Math.min(1, Math.max(0, (t - t0) / dur)); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) el._raf = requestAnimationFrame(step); };
      el._raf = requestAnimationFrame(step); });
    card.querySelectorAll("[data-type]").forEach((el) => { const full = el.dataset.type, d = +(el.dataset.delay || .8) * 1000, gap = +(el.dataset.gap || .09) * 1000;
      clearTimeout(el._t); el.textContent = ""; let i = 0; const next = () => { el.textContent = full.slice(0, ++i); if (i < full.length) el._t = setTimeout(next, gap); }; el._t = setTimeout(next, d); });
  }
  document.addEventListener("pointerover", (e) => { const c = e.target.closest?.(".gs-card"); if (c && !c.contains(e.relatedTarget)) playScene(c); });
  const setLook = (v) => { gsRoot.dataset.donelook = v; document.querySelectorAll('input[name="donelook"]').forEach((r) => (r.checked = r.value === v)); };
  try { const v = localStorage.getItem(LKEY); setLook(["quiet", "blue", "word", "colour", "sunken", "struck", "compact"].includes(v) ? v : "quiet"); } catch { setLook("quiet"); }
  $("#gs-done-look")?.addEventListener("change", (e) => { setLook(e.target.value); try { localStorage.setItem(LKEY, e.target.value); } catch {} });
  const setPlace = (v) => { donePlace = v; document.querySelectorAll('input[name="doneplace"]').forEach((r) => (r.checked = r.value === v)); render(); };
  $("#gs-done-place")?.addEventListener("change", (e) => { setPlace(e.target.value); try { localStorage.setItem(PKEY, e.target.value); } catch {} });
  try { const v = localStorage.getItem(PKEY); if (v === "stay") setPlace("stay"); } catch {}
  const CKEY = "gs-box-2";   // raised is the default now (29 Oct), so an earlier pick of outline doesn't hold it back
  const setBox = (v) => { hero.dataset.box = v; document.querySelector(`#gs-box input[value="${v}"]`).checked = true; };
  try { const v = localStorage.getItem(CKEY); setBox(["outline", "raised"].includes(v) ? v : "raised"); } catch { setBox("raised"); }
  $("#gs-box").addEventListener("change", (e) => { setBox(e.target.value); try { localStorage.setItem(CKEY, e.target.value); } catch {} });

  // ---------- his figure: the drawings come from the chat's embed ----------
  function figure() {
    if (!window.BoltonEmbed) return void setTimeout(figure, 100);
    window.BoltonEmbed.figure(4.5, 0.3).then((svgs) => {
      svgs.forEach((s) => { s.removeAttribute("aria-label"); $(".gs-bolton-slot").append(s); });
      fig.classList.add("gs-in");
      setTimeout(() => say(status(), "talking", "idle", nextStep()), reduce ? 0 : 500);
    });
  }

  render();
  // the menu reaches every concept that exists, as the other concepts' menus do
  BolsterShell.mount({ current: "getting-started", links: { "getting-started": "index.html", calendar: "../calendar/", pipeline: "../pipeline/", timeline: "../timeline/", tasks: "../tasks/", "job-list": "../index.html#jobs", "vendor-orders": "../index.html?d=pages/list/vendor-orders.json", expenses: "../index.html?d=pages/list/expenses.json", "subs-and-vendors": "../index.html?d=pages/list/subs-and-vendors.json", "bid-requests": "../index.html?d=pages/list/bid-requests.json", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog" } });
  figure();
})();
