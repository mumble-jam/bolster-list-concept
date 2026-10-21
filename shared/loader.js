// The loading screen (D90): Anna's drawings (tape.js, loaders.css, her shortlist), one picked at random each time,
// never the same twice running, and under it a line in the drawing's own trade, swapped every couple of seconds as
// a game's loading screen does, now and then one from the site or the office. Dry, specific, the odd bit of the
// trade's own talk; never a promise of speed. When it's done, Anna's finish: the tape snaps shut or the scene
// settles, with her done line. Loaded by the shell only when it plays (BolsterShell.loading).
window.BolsterLoader = (() => {
  // her shortlist (scripts/build-loaders.mjs carries only these into loaders.css)
  const SHORTLIST = ["box-blue", "wrench-bolt", "wrench-swing", "brick-house", "compass-walk", "hammer-nail", "hammer-build",
    "screw-drive", "screw-four", "compass-wave", "roller-wall", "drill-board", "knife-seam", "level-board", "roller-stripes", "roller-lines"];
  // each drawing's trade: a line names what the tool in it is doing, about one in five in that trade's own words
  const LINES = {
    tape: ["Measuring twice", "Hooking the tape on the far wall", "Reading the sixteenths", "Checking the room is square", "Allowing for the kerf"],
    wrench: ["Snugging the bolts", "Finding the right socket", "A quarter turn more", "Torquing to spec", "Righty tighty"],
    brick: ["Laying the first course", "Framing the walls", "Striking the mortar joints", "Waiting on the inspector", "Topping out"],
    compass: ["Laying out the job", "Marking the studs", "Sixteen on centre", "Stepping off the spacing", "Scribing to a wavy wall"],
    hammer: ["Driving the last few nails", "Setting the heads flush", "Knocking it plumb", "Toenailing a stud", "Persuading it into place"],
    screw: ["Driving screws just under the paper", "Seating the heads", "Backing out the one that stripped", "Finding the screw that fell in the wall", "Dimpling, not tearing"],
    roller: ["Cutting in the corners", "Taping off the trim", "Back-rolling the second coat", "Keeping a wet edge", "Letting the primer dry"],
    drill: ["Pre-drilling so nothing splits", "Swapping in a charged battery", "Finding the stud on the first try", "Changing the bit"],
    knife: ["Bedding the tape", "Feathering the edges", "Skimming a second coat of mud", "Sanding to a level 4 finish", "Waiting for the mud to dry"],
    level: ["Chasing the bubble", "Shimming it plumb", "Splitting the difference", "Checking it's dead level"],
  };
  // the site and the office, for any drawing
  const ANY = ["Pulling the permits", "Loading the truck", "Waiting on the lumber yard", "Sweeping up before the walkthrough",
    "Ordering one more box of screws", "Going over the change orders", "Calling the homeowner back", "Counting sheets of drywall", "Grabbing coffee for the crew"];
  const trade = (option) => ({ box: "tape", round: "tape" })[option.split("-")[0]] || option.split("-")[0];
  const pick = (list, not = []) => { const pool = list.filter((x) => !not.includes(x)); return (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))]; };
  const KEY = "bolster-concepts:loader-last";
  const SLOW_AFTER = 10000;
  let timers = [];
  const run = (fn, ms) => timers.push(setTimeout(fn, ms));
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  // concept controls (shell.js): how a line comes in, how often a new one does, and which drawing (or any)
  const setting = (k, d) => { try { return localStorage.getItem(`bolster-concepts:loader-${k}`) || d; } catch { return d; } };
  const EASE = "cubic-bezier(0.2, 0.8, 0, 1)";
  // the ways a line comes in, each replacing what the line says with t; under reduced motion every one is "none"
  const IN = {
    none: (el, t) => { el.textContent = t; },
    // up from below, as it fades in (the first take)
    rise: (el, t) => { el.textContent = t; el.animate([{ opacity: 0, translate: "0 3px" }, { opacity: 1, translate: "0 0" }], { duration: 220, easing: EASE }); },
    // out of focus into focus
    blur: (el, t) => { el.textContent = t; el.animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 480, easing: EASE }); },
    // a ticker: the old line rolls up and out as the new one rolls up into its place
    roll: (el, t) => {
      const old = el.textContent;
      el.innerHTML = `<span class="bs-roll">${old ? `<span>${esc(old)}</span>` : ""}<span>${esc(t)}</span></span>`;
      const parts = el.querySelectorAll(".bs-roll > span"), now = parts[parts.length - 1];
      if (old) parts[0].animate([{ translate: "0 0", opacity: 1 }, { translate: "0 -110%", opacity: 0 }], { duration: 380, easing: EASE, fill: "forwards" });
      now.animate([{ translate: "0 110%", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 380, easing: EASE }).onfinish = () => { if (el.contains(now)) el.textContent = t; };
    },
    // typed: the old line backspaced, the new one typed at a person's uneven pace, a caret while it's going
    type: (el, t) => {
      let old = el.textContent; el.classList.add("bs-typing");
      const step = () => {
        if (old.length) { old = old.slice(0, -1); el.textContent = old; return run(step, 12); }
        const n = el.textContent.length;
        if (n < t.length) { el.textContent = t.slice(0, n + 1); return run(step, t[n] === " " ? 70 : 28 + Math.random() * 46); }
        el.classList.remove("bs-typing");
      };
      step();
    },
    // decoded: the letters not yet settled flicker through others, settling left to right
    scramble: (el, t) => {
      const start = performance.now(), D = 260 + t.length * 18, abc = "abcdefghijklmnopqrstuvwxyz";
      const frame = () => {
        const k = Math.min(1, (performance.now() - start) / D), shown = Math.floor(k * t.length);
        el.innerHTML = esc(t.slice(0, shown)) + (shown < t.length ? `<span class="bs-scramble">${[...t.slice(shown)].map((c) => (c === " " ? " " : abc[(Math.random() * 26) | 0])).join("")}</span>` : "");
        if (k < 1) run(frame, 45);
      };
      frame();
    },
    // letter by letter, each rising into place a moment after the one before (shell.css, bs-ch)
    wave: (el, t) => { el.innerHTML = [...t].map((c, i) => (c === " " ? " " : `<span class="bs-ch" style="--i:${i}">${esc(c)}</span>`)).join(""); },
  };

  // plays one load in #bs-loader (the shell puts it up): a stand-in wait of about 4 s, or, slow, one that runs on
  // until it says so plainly and offers Retry. then() runs once the screen has gone.
  function play({ page = "this page", slow = false, then = () => {}, retry = () => {} } = {}) {
    timers.forEach(clearTimeout); timers = [];
    const T = window.BolsterTape, L = document.getElementById("bs-loader"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = ""; try { last = localStorage.getItem(KEY) || ""; } catch {}
    const chosen = setting("drawing", "any");
    const option = SHORTLIST.includes(chosen) ? chosen : pick(SHORTLIST, [last]); try { localStorage.setItem(KEY, option); } catch {}
    const every = Math.max(800, parseFloat(setting("every", "2.1")) * 1000);
    const mode = still ? "none" : setting("text", "rise");
    // the first line is always the drawing's own; after it, one in three from the site or the office
    const said = [], own = LINES[trade(option)];
    const next = () => { const line = pick(said.length && Math.random() < 0.35 ? ANY : own, said); said.push(line); return line; };
    // as many lines as fit in the wait: a stand-in 3.8 s, or 10 s before a slow load says so
    const lines = Array.from({ length: 1 + Math.floor((slow ? SLOW_AFTER - 400 : 3400) / every) }, next);

    L.hidden = false; L.removeAttribute("data-leaving");
    L.querySelector(".visually-hidden").textContent = `Opening ${page}`;
    const box = L.querySelector(".dash-loader-inner");
    box.dataset.kind = T.isMark(option) ? "logo" : "tape"; box.style.removeProperty("inline-size");
    box.innerHTML = `${T.svg(option, "bs-tape")}<p class="dash-loader-text"><span class="bs-loader-line"></span><span class="dash-loader-dots"><span>.</span><span>.</span><span>.</span></span></p>`;
    const line = box.querySelector(".bs-loader-line");
    // a tape is as wide as its sentence (Anna's layout): held at the widest line it will say, so the tape doesn't jump
    if (box.dataset.kind === "tape") {
      const w = Math.max(...lines.map((t) => { line.textContent = t; return box.getBoundingClientRect().width; }));
      box.style.inlineSize = `${Math.ceil(w)}px`;
    }
    // a line comes in as the controls say; it's held at the width it will end at, so a centred line doesn't sway
    // as it types or decodes, and starts where it will start
    let lineEl = line;
    const say = (t) => {
      lineEl.style.removeProperty("inline-size"); lineEl.textContent = t;
      lineEl.style.inlineSize = `${lineEl.getBoundingClientRect().width}px`;
      lineEl.textContent = lineEl.dataset.said || "";
      lineEl.dataset.said = t;
      (IN[mode] || IN.rise)(lineEl, t);
    };
    // Anna's finishes write their done line straight into the sentence: it comes in the same way
    const text = box.querySelector(".dash-loader-text");
    new MutationObserver(() => {
      if (text.querySelector(".bs-loader-line") || !text.isConnected) return;
      const done = text.textContent.trim();
      text.innerHTML = '<span class="bs-loader-line"></span>'; lineEl = text.firstChild; say(done);
    }).observe(text, { childList: true });
    say(lines[0]);
    const close = () => { L.setAttribute("data-leaving", ""); timers.push(setTimeout(() => { L.hidden = true; then(); }, 260)); };
    lines.slice(1).forEach((t, i) => run(() => say(t), every * (i + 1)));
    if (slow) {
      run(() => {
        box.style.removeProperty("inline-size");
        lineEl.classList.add("bs-wrap"); // the one long line: it may wrap on a phone
        say(T.SLOW(page));
        box.insertAdjacentHTML("beforeend", '<button type="button" class="button dash-loader-retry" data-variant="secondary" data-size="sm">Retry</button>');
        box.querySelector(".dash-loader-retry").addEventListener("click", retry);
        L.querySelector(".visually-hidden").textContent = `${T.SLOW(page)}.`;
      }, SLOW_AFTER);
      return;
    }
    // her finishes: a scene settles into its end (3.8 s), a tape runs its blade out, then snaps shut (4.2 s)
    if (T.isMark(option)) timers.push(setTimeout(() => T.finish(L, option, close), 3800));
    else timers.push(setTimeout(() => T.letGo(L, close), 4200));
  }
  return { play, SHORTLIST, LINES, ANY, MODES: Object.keys(IN) };
})();
