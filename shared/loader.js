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
  const SWAP = 2100, SLOW_SWAP = 2400, SLOW_AFTER = 10000;
  let timers = [];

  // plays one load in #bs-loader (the shell puts it up): a stand-in wait of about 4 s, or, slow, one that runs on
  // until it says so plainly and offers Retry. then() runs once the screen has gone.
  function play({ page = "this page", slow = false, then = () => {}, retry = () => {} } = {}) {
    timers.forEach(clearTimeout); timers = [];
    const T = window.BolsterTape, L = document.getElementById("bs-loader"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = ""; try { last = localStorage.getItem(KEY) || ""; } catch {}
    const option = pick(SHORTLIST, [last]); try { localStorage.setItem(KEY, option); } catch {}
    // the first line is always the drawing's own; after it, one in three from the site or the office
    const said = [], own = LINES[trade(option)];
    const next = () => { const line = pick(said.length && Math.random() < 0.35 ? ANY : own, said); said.push(line); return line; };
    const lines = Array.from({ length: slow ? 5 : 2 }, next);

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
    const say = (t) => {
      line.textContent = t;
      if (!still) line.animate([{ opacity: 0, translate: "0 3px" }, { opacity: 1, translate: "0 0" }], { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0, 1)" });
    };
    say(lines[0]);
    const close = () => { L.setAttribute("data-leaving", ""); timers.push(setTimeout(() => { L.hidden = true; then(); }, 260)); };
    if (slow) {
      lines.slice(1).forEach((t, i) => timers.push(setTimeout(() => say(t), SLOW_SWAP * (i + 1))));
      timers.push(setTimeout(() => {
        box.querySelector(".dash-loader-text").textContent = `${T.SLOW(page)}…`;
        box.style.removeProperty("inline-size");
        box.insertAdjacentHTML("beforeend", '<button type="button" class="button dash-loader-retry" data-variant="secondary" data-size="sm">Retry</button>');
        box.querySelector(".dash-loader-retry").addEventListener("click", retry);
        L.querySelector(".visually-hidden").textContent = `${T.SLOW(page)}.`;
      }, SLOW_AFTER));
      return;
    }
    timers.push(setTimeout(() => say(lines[1]), SWAP));
    // her finishes: a scene settles into its end (3.8 s), a tape runs its blade out, then snaps shut (4.2 s)
    if (T.isMark(option)) timers.push(setTimeout(() => T.finish(L, option, close), 3800));
    else timers.push(setTimeout(() => T.letGo(L, close), 4200));
  }
  return { play, SHORTLIST, LINES, ANY };
})();
