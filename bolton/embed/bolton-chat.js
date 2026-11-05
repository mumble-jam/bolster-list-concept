// Bolton in the top bar: his head replaces the static "Ask Bolton" icon and plays his idle loop; clicking it slides the
// chat in from the right, he pops up in its corner to wave, and says hello in the log while the small head talks.
// Include after shell.js: <link rel="stylesheet" href="../bolton/embed/bolton.css">, bolton-chat.css and this script.
(() => {
  // a published single-file copy carries the drawings inline (window.BOLTON_EMBED); otherwise they're fetched beside this script
  const INLINE = window.BOLTON_EMBED || null;
  const BASE = INLINE ? "" : new URL(".", document.currentScript.src).href;
  const HELLO = "Hi, I'm Bolton. Ask me about a job, an estimate or an invoice.";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fetched = {};   // one download of each drawing, however many parts ask for it (the chat and the page's figure)
  const get = (f) => (INLINE ? Promise.resolve(INLINE[f]) : (fetched[f] ??= fetch(BASE + f).then((r) => (r.ok ? r.text() : Promise.reject(new Error(f))))));
  const frag = (html) => { const t = document.createElement("template"); t.innerHTML = html; return [...t.content.querySelectorAll("svg")]; };
  let heads = [], bodies = null;
  // at chat and page sizes (13-15rem) his traced lines come out near two pixels and look soft on a 1x screen: every ink
  // shape gets a thin stroke of its own ink, laid over the colours it outlines (so the line grows inward as well as
  // out), which takes a 13-unit line to about 3.5px and keeps the thin outer lines from going grey. Later layers (the elbow patches, the moving arm's pieces) still sit
  // on top, as drawn
  const INK = "#232021", PAINT = /^#(FEFEFE|FFFFFF|FDFE03|F[0-9A-F]{5})$/i;
  // every copy of him gets ids of its own: his arm is cut by clip paths found by id, and the page may hold several
  // copies (the banner's, the chat's, the dark chat's outline). With shared ids each copy uses the first one in the page,
  // and when that copy is hidden its clips stop working, so a second hand shows through
  let uid = 0;
  function uniq(svg) {
    const n = ++uid, ids = [...svg.querySelectorAll("[id]")].map((e) => e.id);
    if (!ids.length) return svg;
    const re = new RegExp(`#(${ids.sort((a, b) => b.length - a.length).map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w-])`, "g");
    svg.querySelectorAll("[id]").forEach((e) => { e.id = `${e.id}-b${n}`; });
    svg.querySelectorAll("*").forEach((e) => [...e.attributes].forEach((a) => {
      if (a.value.includes("#") && a.name !== "id") e.setAttribute(a.name, a.value.replace(re, (_, id) => `#${id}-b${n}`));
    }));
    svg.querySelectorAll("style").forEach((st) => { st.textContent = st.textContent.replace(re, (_, id) => `#${id}-b${n}`); });
    return svg;
  }
  // the wave, made from your drawn salute (Bolton 1): the arm is cut in two places, at the wrist and at the elbow.
  // The forearm turns about the elbow's centre E, and the hand, on it, about the wrist's centre P, a beat behind, so the
  // whole forearm waves and the hand follows through (feedback, 28 Oct: "not only the hand"). At each joint a disc
  // (white face, ink ring the weight of his outline) lies under both pieces and shows only in the crook as the joint
  // opens, so the joint stays one round line at any angle; the piece nearer his body is drawn over the other, so the
  // moving end tucks under it. At 0° the pieces are the drawing itself, so the wave starts and ends exactly on your salute.
  // Cut lines run through empty space (and across the arm only inside the discs), and between his fingertips and his
  // face, where they touch, so the hand leaves whole
  const SAL = { P: [217.05, 385.35], r: 57.3, E: [170, 512], er: 59,
    fore: "M128.6 302.1 L60 250 L60 150 L372 150 L380 214 L399 226 L410 243 L413 262 L410 286 L398 298 L395.5 315 L395 340 L394 365 L391 386 L374 392 L330 416 L292 436 L272 447 L272 437.1 Z",
    arm: "M128.6 302.1 L272 437.1 L272 447 L290.7 475.4 L300 512 L170 512 L146 482 L100 478 L0 478 L0 250 L60 250 Z",
    // the forearm's own clip reaches a little past the elbow's cut, under the upper arm, so the upper arm's soft edge
    // lies over the forearm's white and no hairline shows along the cut. Both cuts leave the joint along a radius, through
    // the inside of the elbow's bend, where its disc meets his outline, so the line's cut end slides along the disc's
    // ring as the elbow opens. The disc is as far from the elbow's outer edge as from that bend, so the outer edge stays
    // tangent to it as it turns; on the outside the cut leaves just above the elbow's mark, which stays with the upper arm; the centre and the disc come from his outline as drawn (measured, 28 Oct)
    armOver: "M128.6 302.1 L272 437.1 L272 447 L290.7 475.4 L300 512 L226 516 L170 524 L146 492 L126 489 L110 479 L100 478 L0 478 L0 250 L60 250 Z" };
  function salRig(svg) {
    if (svg.classList.contains("v2")) return;   // Bolton 2's arm is drawn differently: it keeps its own
    const fulls = [...svg.querySelectorAll(".h-all > .body-full")];
    const art = fulls[0], hand = fulls.find((g) => g.querySelector('[clip-path*="salute-hand"]'));
    if (!art || !hand) return;
    const n = ++uid, kids = (g) => [...g.childNodes].map((c) => c.cloneNode(true));
    svg.querySelector("defs").insertAdjacentHTML("beforeend",
      `<clipPath id="sal-fore-${n}"><path d="${SAL.fore}"/></clipPath>` +
      `<clipPath id="sal-arm-${n}"><path d="${SAL.armOver}"/></clipPath>` +
      `<clipPath id="sal-tips-${n}"><path d="M340 150 H430 V266 H340 Z"/></clipPath>` +
      `<clipPath id="sal-rest-${n}"><path clip-rule="evenodd" d="M-500 -500 H1600 V2100 H-500 Z ${SAL.fore} ${SAL.arm}"/></clipPath>`);
    const g = (cls, attrs = {}) => { const e = document.createElementNS("http://www.w3.org/2000/svg", "g"); if (cls) e.setAttribute("class", cls); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
    const cap = (p, r) => `<circle class="sal-cap" cx="${p[0]}" cy="${p[1]}" r="${r}" fill="#FEFEFE" stroke="#232021" stroke-width="10"/>`;
    const sal = g("body-sal");
    sal.insertAdjacentHTML("beforeend", cap(SAL.E, SAL.er));
    const arm = g("sal-arm");
    arm.insertAdjacentHTML("beforeend", cap(SAL.P, SAL.r));
    const fore = g("sal-fore"), foreArt = g("", { "clip-path": `url(#sal-fore-${n})` }); foreArt.append(...kids(art)); fore.append(foreArt);
    const armArt = g("", { "clip-path": `url(#sal-arm-${n})` }); armArt.append(...kids(art));
    arm.append(fore, armArt);
    // each piece's cut is soft-edged, and there a little of the ink shape under his white shows through as a grey
    // hairline: a white face inside each joint's lines covers both cuts (it touches no line at rest)
    arm.insertAdjacentHTML("beforeend", `<circle cx="${SAL.P[0]}" cy="${SAL.P[1]}" r="48.5" fill="#FEFEFE"/>`);
    const rest = g("", { "clip-path": `url(#sal-rest-${n})` }); rest.append(...kids(art));
    sal.append(arm, rest);
    // the cut's soft edge shows a grey hairline inside the arm: a white stroke along it, inside his lines, covers it
    // (it lies on the joint's white, so it never shows)
    sal.insertAdjacentHTML("beforeend", `<path d="M221 512 H${SAL.E[0]} L147 482 L126 481" fill="none" stroke="#FEFEFE" stroke-width="5" stroke-linecap="round"/>`);
    art.after(sal);
    // the salute's hand over his hair (drawn for the salute) is there only while the hand is at his brow: it fades out as
    // the arm leaves and back in as it lands (bt-sal-tips); only its top, where it lies over the hair
    const sal2 = g("body-sal sal-tips"), arm2 = g("sal-arm"), fore2 = g("sal-fore"), tips = g("", { "clip-path": `url(#sal-tips-${n})` });
    tips.append(...kids(hand)); fore2.append(tips); arm2.append(fore2); sal2.append(arm2); hand.after(sal2);
  }
  function crisp(svg, w = 6, mouth = 1 + 4 / w) {   // w: extra line weight, in the drawing's units
    uniq(svg);
    svg.querySelectorAll(`path[fill="${INK}"]`).forEach((ink) => {
      let at = ink;
      while (at.nextElementSibling?.tagName === "path" && PAINT.test(at.nextElementSibling.getAttribute("fill") || "")) at = at.nextElementSibling;
      const line = ink.cloneNode(false);
      // the line keeps the shape's class, so whatever shows, hides or reshapes it (a mouth, a blink) does the same to its line
      // his mouth is drawn finer than his outline: at these sizes it goes faint first, so it gets the most
      const face = ink.closest(".h-mouth") ? mouth : 1;   // the mouth's share of the extra weight
      Object.entries({ fill: "none", stroke: INK, "stroke-width": w * face, "stroke-linejoin": "round", "stroke-linecap": "round", "data-crisp": "" }).forEach(([k, v]) => line.setAttribute(k, v));
      at.after(line);
    });
    svg.querySelectorAll(`[stroke="${INK}"]:not([data-crisp])`).forEach((l) => {   // lines, and outlined shapes (an open mouth)
      const sw = +l.getAttribute("stroke-width"); if (sw >= 10) l.setAttribute("stroke-width", sw + w);
    });
    // the armpit corner continues the sleeve's underside, whose line only grows outward (downward) because the arm's
    // white covers its inner side: the corner takes the same weight and sits the same half step lower, so they meet flush
    // (the same goes for his side line below it, which grows outward to the left)
    svg.querySelectorAll(".wave-pit").forEach((l) => { l.setAttribute("stroke-width", 13 + w * 0.6); l.setAttribute("transform", `translate(${-w / 4} ${w / 4})`); });
    svg.querySelectorAll(".wave-side").forEach((l) => { l.setAttribute("stroke-width", 13 + w / 2); l.setAttribute("transform", `translate(${-w / 4} 0)`);
      if (!l.closest(".v2")) l.setAttribute("d", "M401.5 809 L402 814 L401.5 830"); });   // starts inside the settled corner, so no cap shows past it
    // the moving arm's ink sits in its own layer under the arm's white, so those lines would only grow outward and the
    // forearm and fingers would stay thin: their lines are drawn once more over the white, everywhere but the elbow
    // (where patches hide the drawing's own joint)
    const inner = svg.querySelector(".arm-up .arm-move > g");
    const kids = inner ? [...inner.children] : [];
    const upInk = kids.find((g) => g.classList.contains("wave-fore") && g.querySelector(`path[fill="${INK}"]`));
    const upWhite = upInk && kids.slice(kids.indexOf(upInk) + 1).find((g) => g.classList.contains("wave-fore"));
    if (upInk && upWhite) {
      const id = `bt-noelbow-${++crispN}`;
      const defs = svg.querySelector("defs") || svg.insertBefore(document.createElementNS(svg.namespaceURI, "defs"), svg.firstChild);
      defs.insertAdjacentHTML("beforeend", `<clipPath id="${id}"><path clip-rule="evenodd" d="M-500 -500 H1600 V2000 H-500 Z M107.55 500 a75 75 0 1 0 150 0 a75 75 0 1 0 -150 0 Z"/></clipPath>`);
      const lines = upInk.cloneNode(true);
      lines.querySelectorAll("[data-crisp]").forEach((x) => x.remove());
      lines.querySelectorAll(`path[fill="${INK}"]`).forEach((x) => Object.entries({ fill: "none", stroke: INK, "stroke-width": w, "stroke-linejoin": "round" }).forEach(([k, v]) => x.setAttribute(k, v)));
      const wrap = document.createElementNS(svg.namespaceURI, "g"); wrap.setAttribute("clip-path", `url(#${id})`);
      [...lines.childNodes].forEach((n) => wrap.append(n)); lines.replaceChildren(wrap);
      lines.setAttribute("data-crisp", ""); upWhite.after(lines);
    }
    return svg;
  }
  let crispN = 0;
  // attach and speak: drawn here (proposed icons, not in the system's icon set yet, D58)
  const CLIP = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10.5 4.5 5.6 9.4a1.5 1.5 0 0 0 2.1 2.1l5-5a3 3 0 0 0-4.2-4.2l-5.2 5.2a4.5 4.5 0 0 0 6.4 6.4L13.5 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MIC = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="5.6" y="1.6" width="4.8" height="8.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.4 7.6a4.6 4.6 0 0 0 9.2 0M8 12.3v2.2M5.8 14.5h4.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  // pretend conversations (sample data): what you ask, what he says while he works, what he answers, and the change he
  // makes on the page when he's done (if the page has it)
  // what he answers to anything else, in this preview
  const FALLBACK = (text) => ({ ask: text, wait: "Looking into it…", done: "In this preview I can only do the three things above. Pick one and watch me do it.", typed: true, nodone: true });
  // the chat's history, for a page that talks to him on its own (Getting started's box): set when the chat is built
  let remember = null;
  const SCENES = [
    { ask: "Send the 16 drafts to customers", wait: "Sending your drafts…", done: "Done. I sent all 16 drafts to their customers: $63,200 now waiting for approval.",
      page: () => tile("Drafts to send") },
    { ask: "Remind Katrina Olsen about her invoice", wait: "Writing to Katrina…", done: "Done. Katrina Olsen has a reminder for $29,644.95, 40 days late. I'll tell you when she pays.",
      page: () => remind("Katrina Olsen") },
    { ask: "Schedule Basement finish for Monday", wait: "Checking the crew's week…", done: "Done. Basement finish starts Monday 26 Oct, Vera Ashby's crew. It's on the schedule.",
      page: () => tile("Jobs to schedule", 1) },
  ];
  // the change on the dashboard: a tile counts down and turns done, or a Remind button says it's sent
  function tile(label, by) {
    const t = [...document.querySelectorAll(".dash-attn-tile")].find((x) => x.textContent.includes(label));
    if (!t) return;
    const c = t.querySelector(".dash-attn-count"); if (!c) return;
    c.dataset.was ??= c.textContent;
    const from = +c.dataset.was, to = by ? Math.max(0, from - by) : 0, steps = Math.min(from - to, 16);
    c.textContent = from;
    for (let k = 1; k <= steps; k++) setTimeout(() => { c.textContent = Math.round(from - (from - to) * k / steps); }, k * (700 / steps));
    setTimeout(() => flash(t), 760);
  }
  function remind(name) {
    const row = [...document.querySelectorAll(".dash-row, tr, li")].find((x) => x.textContent.includes(name) && /Remind/.test(x.textContent));
    const b = row && [...row.querySelectorAll("button, a")].find((x) => /Remind/.test(x.textContent));
    if (!b) return;
    b.dataset.was ??= b.innerHTML;
    b.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Reminded';
    flash(b);
  }
  function flash(el) { el.classList.remove("bt-done-flash"); void el.offsetWidth; el.classList.add("bt-done-flash"); setTimeout(() => el.classList.remove("bt-done-flash"), 1800); }

  // a head at size n: both drawings, the page's version picks one (html[data-version])
  function avatar(n, state = "idle", look = n) {
    const wrap = document.createElement("span");
    wrap.className = "stages bt-state"; Object.assign(wrap.dataset, { state, outfit: "polo", hat: "off" });
    const av = document.createElement("span"); av.className = "av"; av.dataset.size = look; av.style.width = av.style.height = n + "px";
    heads.forEach((h) => { const s = h.cloneNode(true); s.setAttribute("width", n); s.setAttribute("height", n); s.setAttribute("aria-hidden", "true"); s.removeAttribute("aria-label"); av.append(s); });
    wrap.append(av); return wrap;
  }

  // point at a head of his and, a moment later, he looks around (left, right, up, back), then his eyes keep still
  // again. It rides on `translate`, so his idle glance (`transform`) and the pointer-following (on the inner group)
  // don't fight it
  function lookAround(hoverEl) {
    if (reduce) return;
    let wait = 0, look = null;
    hoverEl.addEventListener("pointerenter", () => {
      clearTimeout(wait);
      wait = setTimeout(() => {
        look?.forEach((a) => a.cancel());
        look = [...hoverEl.querySelectorAll(".h-eyes")].map((e) => e.animate([
          { translate: "0 0" }, { translate: "-16px 2px", offset: .18 }, { translate: "-16px 2px", offset: .32 },
          { translate: "16px 2px", offset: .52 }, { translate: "16px 2px", offset: .64 },
          { translate: "4px -10px", offset: .8 }, { translate: "0 0" }],
          { duration: 2000, easing: "cubic-bezier(.45, 0, .3, 1)" }));
      }, 450);
    });
    hoverEl.addEventListener("pointerleave", () => clearTimeout(wait));
  }

  function panel() {
    const el = document.createElement("aside");
    el.className = "bt-chat"; el.id = "bt-chat"; el.setAttribute("aria-label", "Bolton"); el.hidden = true;
    el.innerHTML = `<div class="bt-chat-top"><span class="bt-chat-head"></span><b>Bolton</b>
        <button type="button" class="bt-chat-scheme" aria-pressed="false" aria-label="Dark chat" data-tip="Dark chat"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor"/></svg></button>
        <button type="button" class="bt-chat-x" aria-label="Close Bolton" data-tip="Close Bolton">&times;</button></div>
      <div class="bt-chat-log" aria-live="polite">
        <div class="bt-try"><span class="bt-try-label">Try asking</span><div class="bt-chips"></div></div>
        <ol class="bt-msgs"></ol>
      </div>
      <form class="bt-chat-input">
        <button type="button" class="bt-ib" aria-label="Attach files" data-tip="Attach files">${CLIP}</button>
        <input class="bt-input" type="text" autocomplete="off" placeholder="Ask Bolton or give him a job" aria-label="Message Bolton">
        <button type="button" class="bt-ib" aria-label="Speak to Bolton" data-tip="Speak to Bolton">${MIC}</button>
        <button type="submit" class="bt-send" aria-label="Send" data-tip="Send" disabled>${(window.BolsterIcons && window.BolsterIcons("send", 16)) || "➤"}</button>
      </form>
      <div class="bt-peek stages stage" data-state="idle" data-outfit="polo" data-hat="off" aria-hidden="true"><span class="bt-peek-slot"></span></div>
      <p class="bt-peek-say" aria-live="polite"><span class="bt-say-text"></span></p>`;
    el.querySelector(".bt-chat-head").append(avatar(40));
    return el;
  }

  async function init(btn) {
    heads = frag(await get("bolton-head.html"));
    btn.removeAttribute("data-not-built");
    btn.classList.add("bt-bar");
    btn.querySelector("img")?.remove();
    btn.append(avatar(33, "idle", "40"));   // a touch bigger (feedback, 29 Oct), 12 from the avatar circle beside him
    lookAround(btn);
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "bt-chat");
    const chat = panel(); document.body.append(chat); stickerFilter();
    const msg = chat.querySelector(".bt-say-text"), peek = chat.querySelector(".bt-peek"), small = chat.querySelector(".bt-chat-head .bt-state");
    const log = chat.querySelector(".bt-msgs"), input = chat.querySelector(".bt-input"), say = chat.querySelector(".bt-peek-say");
    const form = chat.querySelector(".bt-chat-input"), send = chat.querySelector(".bt-send");
    // what he says in his bubble: the whole message is laid out at once (so the bubble never jumps as it fills), its
    // words fade up one after another, and the bubble eases from its old size to the new one
    let sizing = null;
    const speak = (text, wait = 0) => {
      const from = say.getBoundingClientRect(), shown = getComputedStyle(say).opacity > 0.5 && msg.textContent;
      sizing?.cancel();
      msg.dataset.text = text;
      msg.innerHTML = text.split(" ").map((w, i) => `<span class="bt-w" style="animation-delay:${wait + i * 60}ms">${w.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</span>`).join(" ");
      if (!shown || reduce) return;
      const to = say.getBoundingClientRect();
      if (Math.abs(from.width - to.width) > 1 || Math.abs(from.height - to.height) > 1)
        sizing = say.animate([{ inlineSize: `${from.width}px`, blockSize: `${from.height}px` }, { inlineSize: `${to.width}px`, blockSize: `${to.height}px` }], { duration: 260, easing: "cubic-bezier(.3, 0, .2, 1)" });
    };
    // the send button wakes up (bright blue) as soon as there's something to send
    const sync = () => { send.disabled = !input.value.trim(); };
    input.addEventListener("input", sync);
    form.addEventListener("submit", (e) => {
      e.preventDefault(); const text = input.value.trim(); if (!text || busy) return;
      const sc = SCENES.find((x) => x.ask.toLowerCase() === text.toLowerCase()) || FALLBACK(text);
      run({ ...sc, typed: true });
    });
    const barState = btn.querySelector(".bt-state");
    const chips = chat.querySelector(".bt-chips");
    SCENES.forEach((sc) => { const b = document.createElement("button"); b.type = "button"; b.className = "bt-chip"; b.textContent = sc.ask; b.addEventListener("click", () => run(sc)); chips.append(b); });
    const add = (who, text) => { const li = document.createElement("li"); li.className = `bt-msg bt-${who}`; li.textContent = text; log.append(li); li.scrollIntoView({ block: "nearest" }); return li; };
    const states = (st) => { peek.dataset.state = st; small.dataset.state = st; };
    // a conversation held on the page goes into the history too, so the chat shows it when it opens
    remember = (who, text, ok) => { chat.querySelector(".bt-try")?.setAttribute("data-used", ""); const li = add(who, text); if (ok) li.classList.add("bt-ok"); };
    let busy = false;
    // a pretend run: the question types into the input and goes up; he thinks (dots, a tilt), answers, and goes Done:
    // a wink and a nod in the corner and in the top bar, a tick on his answer, and the change made on the page
    function run(sc) {
      if (busy) return; busy = true;
      chips.querySelectorAll("button").forEach((b) => (b.disabled = true));
      const chars = sc.typed ? [] : [...sc.ask];
      if (!sc.typed) { input.value = ""; sync(); }
      chars.forEach((ch, i) => later(i * 28, () => { input.value += ch; sync(); }));
      const t0 = chars.length * 28 + 250;
      later(t0 - 120, () => { send.classList.add("bt-press"); });
      later(t0, () => { send.classList.remove("bt-press"); input.value = ""; sync(); add("you", sc.ask); });
      later(t0 + 300, () => {
        states("thinking"); speak(sc.wait); say.dataset.mood = "wait";
        add("dots", ""); 
      });
      later(t0 + 2100, () => {
        log.querySelector(".bt-dots")?.remove();
        states("talking");
        // his answer arrives smoothly: the bubble eases in at its full size (laid out at once, so it never grows line by
        // line) and the words fade up in turn
        const li = add("bolton", "");
        const words = sc.done.split(" ");
        li.innerHTML = words.map((w, i) => `<span class="bt-w" style="--i:${i}">${w.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</span>`).join(" ");
        li.setAttribute("aria-label", sc.done);
        later(words.length * 70 + 350, () => {   // once the last word has faded up
          if (sc.nodone) { states("idle"); speak("Try one of those?"); busy = false; chips.querySelectorAll("button").forEach((b) => (b.disabled = false)); return; }
          li.classList.add("bt-ok");
          states("done"); barState.dataset.state = "done"; speak("Done!"); say.dataset.mood = "done";
          sc.page?.();
          later(2600, () => { states("idle"); barState.dataset.state = "idle"; delete say.dataset.mood; speak("Anything else?"); busy = false; chips.querySelectorAll("button").forEach((b) => (b.disabled = false)); });
        });
      });
    }
    // the chat starts under the top bar
    const place = () => { const bar = document.querySelector(".top-bar"); chat.style.top = (bar ? bar.getBoundingClientRect().bottom : 0) + "px"; };
    place(); addEventListener("resize", place);
    // the whole figure is heavy: fetched the first time it is needed (or soon after the page settles)
    const loadBody = () => (bodies ??= get("bolton-body.html").then((html) => { frag(html).forEach((s) => { s.removeAttribute("aria-label"); salRig(s); const slot = chat.querySelector(".bt-peek-slot"), fig = crisp(s, 6, 0.8);   // his mouth a touch under the other lines, as drawn
        // the dark chat's white outline: a vector copy of him underneath, every shape drawn thick in white, so he stays sharp
        // (a filter outline turns him into a picture). Both are the same drawing under the same animations, so they move together
        const halo = uniq(fig.cloneNode(true)); halo.classList.add("bt-halo"); halo.setAttribute("aria-hidden", "true");
        const fid = `bt-halo-f${++uid}`, NS = "http://www.w3.org/2000/svg", f = document.createElementNS(NS, "filter");
        f.id = fid; f.setAttribute("x", "-10%"); f.setAttribute("y", "-10%"); f.setAttribute("width", "120%"); f.setAttribute("height", "120%");
        // the flood in the softened shape: white, edge at a fixed distance from his line
        f.innerHTML = `<feGaussianBlur in="SourceAlpha" stdDeviation="8" result="b"/><feComponentTransfer in="b" result="m"><feFuncA type="linear" slope="40" intercept="-0.9"/></feComponentTransfer><feFlood flood-color="#fff"/><feComposite operator="in" in2="m"/>`;
        const g = document.createElementNS(NS, "g"); g.setAttribute("filter", `url(#${fid})`);   // on a group inside, so it's measured in the drawing's units
        [...halo.childNodes].filter((n) => n.nodeName !== "defs").forEach((n) => g.append(n)); halo.append(g);
        (halo.querySelector("defs") || halo).prepend(f);
        slot.append(halo, fig); }); }));
    setTimeout(loadBody, 2500);

    let timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    async function open() {
      timers.forEach(clearTimeout); timers = [];
      btn.classList.remove("bt-pop"); void btn.offsetWidth; btn.classList.add("bt-pop");
      place(); chat.hidden = false; void chat.offsetWidth;
      chat.dataset.open = ""; btn.setAttribute("aria-expanded", "true");
      msg.textContent = ""; delete msg.dataset.text; peek.getAnimations({ subtree: true }).forEach((x) => x.cancel()); delete peek.dataset.arm; delete peek.dataset.settled; peek.dataset.state = "waving"; delete say.dataset.mood; busy = false;
      chips.querySelectorAll("button").forEach((b) => (b.disabled = false));
      loadBody();
      wave();
      later(800, () => { small.dataset.state = "talking"; });
      speak(HELLO, 780);   // laid out now, so the bubble pops in at its full size; the words start with its pop (4 Nov)
      later(800 + HELLO.split(" ").length * 60 + 400, () => { small.dataset.state = "idle"; });
      chat.querySelector(".bt-chat-x").focus({ preventScroll: true });
    }
    // he greets with your salute: from it his forearm swings up, waves twice and comes back down onto it (bolton-chat.css,
    // bt-sal-wave); at the end the drawing itself is shown, which is what the pieces already are at 0°
    function wave() {
      if (reduce) { peek.dataset.arm = "rest"; peek.dataset.settled = ""; return; }
      const t = timers;   // a close or a new open in between stops it
      loadBody().then(() => { if (t !== timers) return;   // the wave starts once he's drawn (the first time he's fetched)
        void peek.offsetWidth; peek.dataset.arm = "sal";
        later(2150, () => { peek.dataset.state = "idle"; });   // eyes open as the arm starts down
        later(3450, () => { peek.dataset.arm = "rest"; peek.dataset.settled = ""; }); });
    }
    function close() {
      timers.forEach(clearTimeout); timers = [];
      delete chat.dataset.open; btn.setAttribute("aria-expanded", "false");
      later(reduce ? 0 : 420, () => { chat.hidden = true; delete peek.dataset.arm; delete peek.dataset.settled; peek.dataset.state = "idle"; });
    }
    // poke him too much and he laughs a little: rubbing the pointer back and forth over him in the corner builds up
    // (and drains away again in a moment); past a point he has a short laugh, then goes back to what he was doing
    let tickle = 0, lastT = 0, lastX = null, lastY = null, giggling = false;
    const GIGGLES = ["Ha! That tickles.", "Hey, that's my good shirt!", "Okay, okay, I'm awake!"];
    let gi = 0;
    function giggle() {
      giggling = true; tickle = 0;
      const was = msg.dataset.text || "", mood = say.dataset.mood;
      states("laughing"); delete say.dataset.mood; speak(GIGGLES[gi++ % GIGGLES.length]);
      setTimeout(() => {
        if (!busy && peek.dataset.state === "laughing") { states("idle"); speak(was); if (mood) say.dataset.mood = mood; }
        setTimeout(() => { giggling = false; }, 2500);
      }, 1500);
    }
    addEventListener("pointermove", (e) => {
      if (reduce || !isOpen() || busy || giggling || !("settled" in peek.dataset)) { lastX = null; return; }
      const box = peek.getBoundingClientRect();
      const inside = e.clientX >= box.left + 40 && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
      if (!inside) { lastX = null; return; }
      const now = e.timeStamp;
      if (lastX != null) {
        tickle = tickle * Math.exp(-(now - lastT) / 900) + Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (tickle > 700) giggle();
      }
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    }, { passive: true });
    // light or dark chat, remembered on this browser
    const sch = chat.querySelector(".bt-chat-scheme");
    const setScheme = (dark) => { chat.dataset.scheme = dark ? "dark" : "light"; sch.setAttribute("aria-pressed", dark); try { localStorage.setItem("bt-chat-scheme", chat.dataset.scheme); } catch (_) {} };
    let saved = null; try { saved = localStorage.getItem("bt-chat-scheme"); } catch (_) {}
    setScheme(saved === "dark");
    sch.addEventListener("click", () => setScheme(chat.dataset.scheme !== "dark"));
    const isOpen = () => "open" in chat.dataset;
    btn.addEventListener("click", (e) => { e.preventDefault(); isOpen() ? close() : open(); });
    chat.querySelector(".bt-chat-x").addEventListener("click", () => { close(); btn.focus(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) { close(); btn.focus(); } });
  }

  // his eyes follow the pointer: each visible pair turns toward it (up to a few units, less up and down), easing there;
  // when the pointer leaves the page they drift back to the middle. It rides on `translate`, so blinks and glances
  // (which animate `transform`) carry on underneath
  // the dark chat's white outline: his shape grown a couple of pixels and rounded off (a blur, then a soft edge), so
  // it reads as one smooth sticker edge instead of four offset copies with stepped corners. Nothing else is filtered:
  // pushing the contrast of his lines' edges makes them look sharper up close but stair-stepped at a normal size
  function stickerFilter() {
    if (document.getElementById("bt-sticker")) return;
    const d = document.createElement("div");
    d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <filter id="bt-sticker" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="grown"/>
      <feGaussianBlur in="grown" stdDeviation="0.8" result="soft"/>
      <feComponentTransfer in="soft" result="edge"><feFuncA type="linear" slope="3.5" intercept="-1.2"/></feComponentTransfer>
      <feFlood flood-color="#fff"/><feComposite in2="edge" operator="in" result="white"/>
      <feMerge><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge></filter></svg>`;
    document.body.append(d.firstElementChild);
  }
  function followEyes() {
    if (reduce) return;
    let px = null, py = null, raf = 0;
    const cur = new WeakMap();
    const tick = () => {
      raf = 0; let moving = false;
      document.querySelectorAll(".bt-state .h-blink, .bt-peek .h-blink, .bt-follow .h-blink").forEach((g) => {
        const r = g.getBoundingClientRect(); if (!r.width) return;
        let tx = 0, ty = 0;
        if (px != null) {
          const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, d / 160);          // close to his face the eyes move less
          // how far, in screen pixels, scaled to the pair (a fifth of its width across, an eighth down), then into the
          // drawing's own units
          const sc = g.ownerSVGElement?.getScreenCTM()?.a || 1;
          tx = (dx / d) * r.width * 0.2 * k / sc; ty = (dy / d) * r.width * 0.12 * k / sc;
        }
        const c = cur.get(g) || { x: 0, y: 0 };
        c.x += (tx - c.x) * 0.2; c.y += (ty - c.y) * 0.2; cur.set(g, c);
        if (Math.abs(tx - c.x) > 0.05 || Math.abs(ty - c.y) > 0.05) moving = true;
        g.style.translate = `${c.x.toFixed(2)}px ${c.y.toFixed(2)}px`;
      });
      if (moving) raf = requestAnimationFrame(tick);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; go(); }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { px = py = null; go(); });
  }
  followEyes();

  // for pages that put him elsewhere (Getting started): his drawings, and a way to open the chat
  let bodyFetch = null;
  window.BoltonEmbed = {
    figure: (weight = 6, mouth) => { stickerFilter(); return (bodyFetch ??= get("bolton-body.html")).then((html) => frag(html).map((s) => crisp(s, weight, mouth ?? 1 + 4 / weight))); },
    head: () => get("bolton-head.html").then((html) => frag(html)),
    // what he can do in this preview: the chat's own "Try asking" questions, for pages that offer them too
    suggestions: () => SCENES.map((sc) => sc.ask),
    // his head at size n, as in the top bar: still, blinking, eyes on the pointer, a look around when you point at it
    avatar: async (n) => { if (!heads.length) heads = frag(await get("bolton-head.html")); const a = avatar(n); lookAround(a); return a; },
    openChat: () => { const b = document.querySelector(".bs-assistant"); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); },
    // a chat box on the page itself (Getting started's banner): the same box as the chat's own, and what you send
    // there opens the chat and goes on in it (once he has finished saying hello)
    // what he answers, for a page that shows the conversation itself: { wait, done, nodone }, and a way to keep it in
    // the chat's history
    answer: (text) => ({ ...(SCENES.find((x) => x.ask.toLowerCase() === text.trim().toLowerCase()) || FALLBACK(text)) }),
    remember: (who, text, ok) => remember?.(who, text, ok),
    // the top bar's head reacts too (a wink and a nod when he's done)
    mood: (st) => { const b = document.querySelector(".bt-bar .bt-state"); if (b) b.dataset.state = st; },
    askBox(host, placeholder = "Ask Bolton or give him a job", onSend = null) {
      host.innerHTML = `<form class="bt-chat-input bt-ask">
          <button type="button" class="bt-ib" aria-label="Attach files" data-tip="Attach files">${CLIP}</button>
          <input class="bt-input" type="text" autocomplete="off" placeholder="${placeholder}" aria-label="Message Bolton">
          <button type="button" class="bt-ib" aria-label="Speak to Bolton" data-tip="Speak to Bolton">${MIC}</button>
          <button type="submit" class="bt-send" aria-label="Send" data-tip="Send" disabled>${(window.BolsterIcons && window.BolsterIcons("send", 16)) || "➤"}</button>
        </form>`;
      const form = host.firstElementChild, input = form.querySelector(".bt-input"), send = form.querySelector(".bt-send");
      input.addEventListener("input", () => { send.disabled = !input.value.trim(); });
      form.addEventListener("submit", (e) => {
        e.preventDefault(); const text = input.value.trim(); if (!text) return;
        input.value = ""; send.disabled = true;
        if (onSend) return onSend(text);   // the page holds the conversation itself
        window.BoltonEmbed.openChat();
        const chat = document.getElementById("bt-chat"), box = chat?.querySelector(".bt-input");
        if (!box) return;
        box.value = text; box.dispatchEvent(new Event("input"));
        const peek = chat.querySelector(".bt-peek"), t0 = Date.now();
        const go = () => ("settled" in peek.dataset || Date.now() - t0 > 6000) ? chat.querySelector(".bt-chat-input").requestSubmit() : setTimeout(go, 150);
        setTimeout(go, 300);
      });
      return form;
    },
  };

  // the shell draws the top bar from script: wait for the assistant button
  const find = () => document.querySelector(".bs-assistant");
  const go = () => { const b = find(); if (b) init(b).catch((err) => console.warn("Bolton:", err)); return !!b; };
  if (!go()) { const mo = new MutationObserver(() => { if (go()) mo.disconnect(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); }
})();
