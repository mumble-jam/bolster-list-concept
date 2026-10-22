// Timeline concept: every job's plan on a line of days, as the “Timeline · research” board draws it (TL-rules, Figma,
// 19 Oct) with your answers (22 Oct): stages with their items folded, finish-to-start links, later work keeping its gap
// when something moves, finished jobs muted left of today. The calendar's jobs and dates (kit.SCHEDULE). Made-up data.
(() => {
  const { TODAY, esc, kit } = window.BDS_CONCEPT;
  const { OWNERS, SUBS, avatar } = kit;
  const ic = (n, s = 16, o) => window.BolsterIcons(n, s, o);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const say = (t) => { $("#live").textContent = t; };
  const toast = (message, undo) => BolsterShell.toast(message, { undo });

  BolsterShell.mount({ current: "timeline", links: { timeline: "index.html", calendar: "../calendar/", pipeline: "../pipeline/", tasks: "../tasks/", "job-list": "../index.html#jobs", "vendor-orders": "../index.html?d=pages/list/vendor-orders.json", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog" } });

  // ---------- days: offsets from today (0 today, -3 three days ago) ----------
  const DAY = 864e5;
  const dateOf = (n) => new Date(+TODAY + n * DAY);
  const iso = (n) => { const d = dateOf(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const offsetOf = (s) => Math.round((new Date(`${s}T12:00:00`) - TODAY) / DAY);
  // weeks start on Monday, the shell's (D76); days off are weekends here (the company's settings, in Bolster)
  const dow = (n) => BolsterShell.week.dayOf(dateOf(n));
  const isOff = (n) => dow(n) >= 5;
  const weekStart = (n) => n - dow(n);
  const workDays = (a, b) => { let k = 0; for (let n = a; n <= b; n++) if (!isOff(n)) k++; return k; };
  const short = (n) => dateOf(n).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const long = (n) => dateOf(n).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const span = (a, b) => (a === b ? long(a) : `${long(a)} – ${long(b)}`);
  const who = (id) => OWNERS.find((o) => o.id === id) || SUBS.find((o) => o.id === id);
  const together = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

  // ---------- the plan: the shared schedule's stages, their labor and materials ----------
  // a stage's items, as an estimate would have them (labor and materials, D50's kinds): they follow their stage
  const ITEMS = [
    [/demolition/i, [["Demolition crew", "labor"], ["Dumpster", "materials"]]],
    [/steel/i, [["Frame steel studs", "labor"], ["Steel studs and track", "materials"]]],
    [/framing/i, [["Frame walls", "labor"], ["2×4 studs", "materials"], ["Fasteners", "materials"]]],
    [/drywall|hang|board|type x/i, [["Hang and tape", "labor"], ["½″ drywall", "materials"], ["Joint compound", "materials"]]],
    [/insulation|blown/i, [["Install insulation", "labor"], ["Insulation", "materials"]]],
    [/paint|finish|skim/i, [["Prime and paint", "labor"], ["Primer and paint", "materials"]]],
  ];
  const itemsFor = (name) => (ITEMS.find(([re]) => re.test(name))?.[1] || [["Labor", "labor"], ["Materials", "materials"]]).map(([n, kind]) => ({ name: n, kind }));
  let seq = 0;
  let stages = kit.SCHEDULE.map((x) => ({ id: `s${++seq}`, job: x.job, client: x.client, place: x.place, phase: x.phase, name: x.stage, start: x.start, days: x.days, who: [...x.who], sub: x.sub, owner: x.owner, waitsName: x.waits, items: itemsFor(x.stage) }));
  for (const s of stages) { s.waits = s.waitsName ? stages.find((x) => x.job === s.job && x.name === s.waitsName)?.id || null : null; delete s.waitsName; }
  let unscheduled = kit.UNSCHEDULED.map((u) => ({ id: `u${++seq}`, ...u }));
  const byId = (id) => stages.find((s) => s.id === id);
  const isMilestone = (s) => s.days === 0;
  const endOf = (s) => (isMilestone(s) ? s.start : s.start + s.days - 1);
  const holdsUp = (s) => stages.filter((x) => x.waits === s.id);
  // broken: it starts before what it waits for has finished
  const broken = (s) => { const p = s.waits && byId(s.waits); return !!p && (isMilestone(p) ? s.start < p.start : isMilestone(s) ? s.start <= endOf(p) : s.start <= endOf(p)); };

  // a job's and a phase's dates and progress are their stages' (TL-levels), never typed
  const PHASE_ORDER = ["Pre-construction", "Construction", "Finishing"];
  function jobsOf() {
    const m = new Map();
    for (const s of stages) {
      if (!m.has(s.job)) m.set(s.job, { name: s.job, client: s.client, place: s.place, owner: s.owner, stages: [] });
      m.get(s.job).stages.push(s);
    }
    return [...m.values()].map((j) => {
      const phases = PHASE_ORDER.map((p) => ({ name: p, stages: j.stages.filter((s) => s.phase === p).sort((a, b) => a.start - b.start) })).filter((p) => p.stages.length);
      return { ...j, phases, ...extent(j.stages) };
    }).sort((a, b) => a.start - b.start);
  }
  function extent(list) {
    const start = Math.min(...list.map((s) => s.start)), end = Math.max(...list.map(endOf));
    const work = list.filter((s) => !isMilestone(s));
    const total = work.reduce((n, s) => n + workDays(s.start, endOf(s)), 0);
    const done = work.reduce((n, s) => n + (endOf(s) < 0 ? workDays(s.start, endOf(s)) : s.start <= 0 ? workDays(s.start, Math.min(endOf(s), 0)) : 0), 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const status = end < 0 ? "Completed" : start <= 0 ? "In progress" : "Booked";
    return { start, end, pct, status, work: workDays(start, end) };
  }

  // ---------- what's shown, and how far in ----------
  const keep = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const kept = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const st = {
    scale: ["weeks", "months", "quarters", "fit"].includes(kept("tl-scale")) ? kept("tl-scale") : "weeks",
    completed: kept("tl-completed") !== "off", links: kept("tl-links") !== "off",
    // jobs and phases open, a finished job folded; a stage's items folded
    shut: new Set(), items: new Set(),
  };
  for (const j of jobsOf()) if (j.status === "Completed") st.shut.add(`job:${j.name}`);
  const isOpen = (key) => !st.shut.has(key);

  // ---------- what's narrowed (TL-filter): which jobs (the toolbar's Jobs), then Add filter's (L-filters): the job's
  // owner, who's assigned, our crew or a subcontractor, a stage's status. A job's own filters drop the job; a stage's
  // keep its job and phase as the rows around it, their brackets still the whole job's, so you see where the work sits
  const STATUS = [["coming", "Coming up"], ["under", "Under way"], ["done", "Done"], ["early", "Starts too early"]];
  const stageStatus = (s) => (endOf(s) < 0 ? "done" : s.start <= 0 ? "under" : "coming");
  const nameOf = (p) => (p.me ? `${p.name} (you)` : p.name);
  const personOpt = (p) => ({ value: p.id, label: nameOf(p), html: `<span class="menu-icon">${avatar(p, "sm")}</span>${esc(nameOf(p))}` });
  const FILTERS = [
    { key: "owner", label: "Owner", icon: "user", job: true, test: (j, v) => v.includes(j.owner), groups: () => [[null, OWNERS.map(personOpt)]] },
    { key: "who", label: "Assigned to", icon: "user", test: (s, v) => s.who.some((p) => v.includes(p)) || v.includes(s.sub),
      groups: () => [["Team", OWNERS.map(personOpt)], ["Subcontractors", SUBS.map(personOpt)]] },
    // a milestone is no one's work: neither ours nor a subcontractor's
    { key: "by", label: "Done by", icon: "handshake", test: (s, v) => !isMilestone(s) && v.includes(s.sub ? "sub" : "crew"),
      groups: () => [[null, [{ value: "crew", label: "Our crew" }, { value: "sub", label: "Subcontractors" }]]] },
    { key: "status", label: "Status", icon: "status", test: (s, v) => v.includes(stageStatus(s)) || (v.includes("early") && broken(s)),
      groups: () => [[null, STATUS.map(([value, label]) => ({ value, label }))]] },
  ];
  const filterDef = (k) => FILTERS.find((f) => f.key === k);
  // kept in this browser, as the scale is
  {
    let k = null; try { k = JSON.parse(kept("tl-filters")); } catch {}
    const names = new Set(stages.map((s) => s.job));
    st.jobs = Array.isArray(k?.jobs) && k.jobs.some((n) => names.has(n)) ? k.jobs.filter((n) => names.has(n)) : null;
    st.filters = Object.fromEntries(Object.entries(k?.filters || {}).filter(([key, v]) => filterDef(key) && Array.isArray(v) && v.length));
  }
  const save = () => keep("tl-filters", JSON.stringify({ jobs: st.jobs, filters: st.filters }));
  const filtered = () => !!st.jobs || FILTERS.some((f) => st.filters[f.key]);
  const stageFiltered = () => FILTERS.some((f) => !f.job && st.filters[f.key]);
  // what passes, all but one filter when an option counts what it would show (except)
  const jobPass = (j, except) => (st.completed || j.status !== "Completed") && (except === "jobs" || !st.jobs || st.jobs.includes(j.name))
    && FILTERS.every((f) => !f.job || f.key === except || !st.filters[f.key] || f.test(j, st.filters[f.key]));
  const stagePass = (s, except) => FILTERS.every((f) => f.job || f.key === except || !st.filters[f.key] || f.test(s, st.filters[f.key]));
  // the jobs shown, each phase with only the stages that pass (all its stages kept, for its bracket)
  function shownJobs(except) {
    return jobsOf().filter((j) => jobPass(j, except)).map((j) => {
      const phases = j.phases.map((p) => ({ ...p, all: p.stages, stages: p.stages.filter((s) => stagePass(s, except)) })).filter((p) => p.stages.length);
      return { ...j, phases, shown: phases.flatMap((p) => p.stages) };
    }).filter((j) => j.shown.length);
  }

  // ---------- the scale ----------
  // the grid's width: 400, or 300 without its Start column where the card is narrow, so the chart keeps room
  const ROW = 36;
  let GRID = 400, narrow = false;
  const DW = { weeks: 40, months: 16, quarters: 5 };
  let R0 = 0, N = 0, dw = 40;
  function range() {
    const shown = shownJobs(), all = shown.length ? shown : jobsOf();
    const a = Math.min(0, ...all.map((j) => j.start)), b = Math.max(28, ...all.map((j) => j.end));
    R0 = weekStart(a - 14); N = weekStart(b + 35) - R0;
    const scroller = $(".tl-scroll"), cardW = scroller?.clientWidth || $("#tl").clientWidth || 1000;
    narrow = cardW < 1000; GRID = narrow ? 300 : 400;
    const room = cardW - GRID - 2;
    dw = st.scale === "fit" ? Math.max(3, room / N) : DW[st.scale];
  }
  const X = (n) => (n - R0) * dw;
  const tier = () => (dw >= 28 ? "days" : dw >= 9 ? "weeks" : "months");
  function scaleHtml() {
    const top = [], bottom = [];
    // months across the top (quarters when far out), then days, weeks or months under them
    let n = R0;
    while (n < R0 + N) {
      const d = dateOf(n), q = tier() === "months";
      const next = q ? new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 1) : new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const m = Math.min(R0 + N, Math.round((next - TODAY) / DAY));
      const label = q ? `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}` : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      top.push(`<span style="left:${X(n)}px;width:${(m - n) * dw}px"><b>${esc(label)}</b></span>`);
      n = m;
    }
    if (tier() === "days") for (let k = R0; k < R0 + N; k++) bottom.push(`<span style="left:${X(k)}px;width:${dw}px"${k === 0 ? " data-today" : isOff(k) ? " data-off" : ""}><small>${dateOf(k).toLocaleDateString("en-GB", { weekday: "narrow" })}</small>${dateOf(k).getDate()}</span>`);
    else if (tier() === "weeks") for (let k = R0; k < R0 + N; k += 7) bottom.push(`<span style="left:${X(k)}px;width:${7 * dw}px"${k <= 0 && 0 < k + 7 ? " data-today" : ""}>${dateOf(k).getDate()}</span>`);
    else { let k = R0; while (k < R0 + N) { const d = dateOf(k), nx = Math.min(R0 + N, Math.round((new Date(d.getFullYear(), d.getMonth() + 1, 1) - TODAY) / DAY)); bottom.push(`<span style="left:${X(k)}px;width:${(nx - k) * dw}px">${d.toLocaleDateString("en-GB", { month: "short" })}</span>`); k = nx; } }
    return `<div class="tl-scale" style="width:${N * dw}px"><div class="tl-scale-top">${top.join("")}</div><div class="tl-scale-bottom" data-tier="${tier()}">${bottom.join("")}</div></div>`;
  }

  // ---------- rows: a job, its phases, their stages, a stage's items ----------
  function rows() {
    const out = [];
    for (const j of shownJobs()) {
      out.push({ type: "job", key: `job:${j.name}`, j, level: 0 });
      if (!isOpen(`job:${j.name}`)) continue;
      for (const p of j.phases) {
        out.push({ type: "phase", key: `phase:${j.name}:${p.name}`, j, p, level: 1, ...extent(p.all) });
        if (!isOpen(`phase:${j.name}:${p.name}`)) continue;
        for (const s of p.stages) {
          out.push({ type: "stage", key: s.id, j, s, level: 2 });
          if (st.items.has(s.id) && !isMilestone(s)) for (const it of s.items) out.push({ type: "item", key: `${s.id}:${it.name}`, j, s, it, level: 3 });
        }
      }
    }
    return out;
  }
  const chev = (key, open, label) => `<button type="button" class="tl-fold" data-fold="${esc(key)}" aria-expanded="${open}" aria-label="${esc(`${open ? "Fold" : "Unfold"} ${label}`)}" data-tip="${open ? "Fold" : "Unfold"}">${ic("chevron-down", 12, { optical: true })}</button>`;
  function rowHtml(r, i) {
    const y = i * ROW, past = r.j.status === "Completed";
    let cells = "", bar = "";
    if (r.type === "job") {
      const j = r.j, open = isOpen(r.key);
      cells = `${chev(r.key, open, j.name)}<button type="button" class="tl-name" data-open-job="${esc(j.name)}" aria-haspopup="dialog" aria-expanded="false"><b>${esc(j.name)}</b><span>${esc(j.client)}</span></button><span class="tl-start">${short(j.start)}</span><span class="tl-days">${j.work} d</span>`;
      bar = `<div class="tl-bracket" data-drag="job" data-key="${esc(j.name)}" style="left:${X(j.start)}px;width:${(j.end - j.start + 1) * dw}px" title="${esc(`${j.name}: ${span(j.start, j.end)}`)}"></div><span class="tl-bar-label" style="left:${X(j.end + 1) + 8}px">${esc(j.status)} · ${j.pct}%</span>`;
    } else if (r.type === "phase") {
      const open = isOpen(r.key);
      cells = `${chev(r.key, open, r.p.name)}<span class="tl-name tl-name-phase">${esc(r.p.name)}</span><span class="tl-start">${short(r.start)}</span><span class="tl-days">${r.work} d</span>`;
      bar = `<div class="tl-bracket" data-drag="phase" data-key="${esc(`${r.j.name}|${r.p.name}`)}" data-phase style="left:${X(r.start)}px;width:${(r.end - r.start + 1) * dw}px"></div>`;
    } else if (r.type === "stage") {
      const s = r.s, ms = isMilestone(s), end = endOf(s), wd = ms ? 0 : workDays(s.start, end);
      const pct = ms ? 0 : end < 0 ? 100 : s.start <= 0 ? Math.round((workDays(s.start, 0) / wd) * 100) : 0;
      const label = `${s.name}, ${ms ? `milestone, ${long(s.start)}` : `${span(s.start, end)}, ${wd} working ${wd === 1 ? "day" : "days"}`}${broken(s) ? ", starts before what it waits for ends" : ""}`;
      cells = `${!ms ? chev(`items:${s.id}`, st.items.has(s.id), `${s.name}'s labor and materials`) : '<span class="tl-fold-space"></span>'}<button type="button" class="tl-name" data-open="${s.id}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(label)}">${esc(s.name)}</button><span class="tl-start">${short(s.start)}</span><span class="tl-days">${ms ? "—" : `${wd} d`}</span>`;
      if (ms) bar = `<button type="button" class="tl-milestone" data-open="${s.id}" data-drag="stage" data-key="${s.id}" tabindex="-1" aria-hidden="true" style="left:${X(s.start) + dw / 2}px" data-tip="${esc(`${s.name} · ${long(s.start)}`)}"></button><span class="tl-bar-label" style="left:${X(s.start) + dw / 2 + 12}px">${esc(s.name)}</span>`;
      else {
        const w = (s.days) * dw, out = w < 84;
        bar = `<button type="button" class="tl-bar" data-open="${s.id}" data-drag="stage" data-key="${s.id}" tabindex="-1" aria-hidden="true" style="left:${X(s.start)}px;width:${w}px;--_pct:${pct}%"${broken(s) ? " data-broken" : ""}>${out ? "" : `<span>${esc(s.name)}</span>`}<i class="tl-end" data-stretch="${s.id}"></i><i class="tl-link-handle" data-link-from="${s.id}" data-tip="Drag onto a stage to link it"></i></button>${out ? `<span class="tl-bar-label" style="left:${X(s.start) + w + 8}px">${esc(s.name)}</span>` : ""}`;
      }
    } else {
      const s = r.s, it = r.it;
      cells = `<span class="tl-fold-space"></span><span class="tl-name tl-name-item">${ic(it.kind === "labor" ? "hard-hat" : "box", 14, { optical: true })}<span>${esc(it.name)}</span></span><span class="tl-start">${short(s.start)}</span><span class="tl-days">${workDays(s.start, endOf(s))} d</span>`;
      bar = `<div class="tl-item-bar" data-kind="${it.kind}" style="left:${X(s.start)}px;width:${s.days * dw}px"></div>`;
    }
    return `<div class="tl-row" data-type="${r.type}" data-level="${r.level}"${past ? " data-past" : ""} style="top:${y}px"><div class="tl-cells" style="--_lvl:${r.level}">${cells}</div><div class="tl-track">${bar}</div></div>`;
  }
  // the links: finish to start, an elbow from one's end to the other's start (TL-links)
  function linksSvg(list) {
    if (!st.links) return "";
    const rowOf = new Map(list.map((r, i) => [r.type === "stage" ? r.s.id : null, i]).filter(([k]) => k));
    const paths = [];
    for (const r of list) {
      if (r.type !== "stage" || !r.s.waits || !rowOf.has(r.s.waits)) continue;
      const s = r.s, p = byId(s.waits);
      const x1 = isMilestone(p) ? X(p.start) + dw / 2 + 7 : X(p.start + p.days), y1 = rowOf.get(p.id) * ROW + ROW / 2;
      const x2 = isMilestone(s) ? X(s.start) + dw / 2 - 7 : X(s.start), y2 = rowOf.get(s.id) * ROW + ROW / 2;
      const d = x2 - 8 >= x1 + 6 ? `M${x1} ${y1} H${x1 + 6} V${y2} H${x2 - 1}` : `M${x1} ${y1} H${x1 + 6} V${y1 + ROW / 2} H${x2 - 10} V${y2} H${x2 - 1}`;
      paths.push(`<path d="${d}"${broken(s) ? ' data-broken' : ""} marker-end="url(#tl-arrow${broken(s) ? "-broken" : ""})"/>`);
    }
    return `<svg class="tl-links" width="${N * dw}" height="${list.length * ROW}" aria-hidden="true"><defs><marker id="tl-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 6 3 0 6z"/></marker><marker id="tl-arrow-broken" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 6 3 0 6z"/></marker></defs>${paths.join("")}</svg>`;
  }

  // ---------- phones: no chart, a list (TL-phone) ----------
  const phone = matchMedia("(max-width: 767px)");
  function phoneHtml() {
    return `<div class="tl-phone">${shownJobs().map((j) => {
      const len = j.end - j.start + 1;
      const track = (a, b) => `<span class="tl-ptrack" aria-hidden="true"><i style="left:${((a - j.start) / len) * 100}%;width:${Math.max(2, ((b - a + 1) / len) * 100)}%"></i></span>`;
      return `<section class="tl-pjob"${j.status === "Completed" ? " data-past" : ""}><button type="button" class="tl-pjob-head" data-open-job="${esc(j.name)}" aria-haspopup="dialog"><b>${esc(j.name)}</b><span>${esc(j.client)} · ${esc(span(j.start, j.end))}</span><span>${esc(j.status)} · ${j.pct}%</span></button>
        ${j.phases.map((p) => `<h3>${esc(p.name)}</h3>${p.stages.map((s) => `<button type="button" class="tl-pstage" data-open="${s.id}" aria-haspopup="dialog"${broken(s) ? " data-broken" : ""}><b>${isMilestone(s) ? '<i class="tl-pdiamond" aria-hidden="true"></i>' : ""}${esc(s.name)}</b><span>${esc(isMilestone(s) ? long(s.start) : `${span(s.start, endOf(s))} · ${workDays(s.start, endOf(s))} working days`)}</span>${s.waits ? `<span class="tl-pwaits">Waits for ${esc(byId(s.waits).name)}${broken(s) ? ", which ends after it starts" : ""}</span>` : ""}${track(s.start, endOf(s))}</button>`).join("")}`).join("")}</section>`;
    }).join("")}</div>`;
  }

  // ---------- drawing ----------
  const tl = $("#tl");
  function render() {
    const sc = $(".tl-scroll"), keepDay = sc ? R0 + Math.round(sc.scrollLeft / dw) : null, keepTop = sc?.scrollTop || 0;
    range();
    if (!shownJobs().length) {
      tl.dataset.view = "empty";
      tl.innerHTML = `<div class="state"><span class="state-icon">${ic("filter", 20)}</span><h3>No work matches</h3><p>Nothing scheduled fits ${filtered() ? "these filters" : "what's shown"}.</p>${filtered() ? `<div class="state-actions"><button type="button" class="button" data-variant="secondary" data-size="sm" data-clear-all>Clear all filters</button></div>` : ""}</div>`;
    } else if (phone.matches) { tl.dataset.view = "list"; tl.innerHTML = phoneHtml(); }
    else {
      const list = rows();
      tl.dataset.view = "chart";
      // each job its own card (your call, 22 Oct), under the scale's own card, all on one scroll: a card's frame stays at
      // the chart's edges while its days scroll inside it (timeline.css); a job's header row folds the card to itself
      const jobs = []; for (const r2 of list) { if (r2.type === "job") jobs.push([]); jobs.at(-1).push(r2); }
      const frame = '<i class="card tl-frame" aria-hidden="true"></i>';
      tl.innerHTML = `<div class="tl-scroll" data-tier="${tier()}"${narrow ? " data-narrow" : ""} style="--_day:${dw}px;--_grid:${GRID}px;--_w:${N * dw}px;--_wk:${7 * dw}px;--_off0:${(5 - dow(R0) + 7) % 7}">
        <div class="tl-head">${frame}<div class="tl-window"><div class="tl-corner"><span>Name</span><span class="tl-start">Start</span><span class="tl-days">Days</span></div>${scaleHtml()}</div></div>
        <div class="tl-body">${jobs.map((rs) => `<div class="tl-job" role="group" aria-label="${esc(rs[0].j.name)}">${frame}<div class="tl-window" style="block-size:${rs.length * ROW}px"><div class="tl-grid-bg" aria-hidden="true"></div>${rs.map(rowHtml).join("")}<div class="tl-overlay" aria-hidden="true">${linksSvg(rs)}<i class="tl-today" style="left:${X(0) + dw / 2}px"></i></div></div></div>`).join("")}</div></div>`;
      const s2 = $(".tl-scroll");
      cardWindow(s2);
      s2.scrollTop = keepTop;
      if (keepDay != null && !moved.scale) s2.scrollLeft = (keepDay - R0) * dw; else { goToday(false); moved.scale = false; }
    }
    // a card around it only when it's one piece (nothing matches); the chart's cards and the phone's are their own
    tl.classList.toggle("card", tl.dataset.view === "empty");
    BolsterShell.hydrateIcons(tl);
    // the toolbar reads back its values
    const showText = [st.completed ? null : "Active jobs", st.links ? null : "no links"].filter(Boolean).join(", ") || "Everything";
    $("#show-text").textContent = showText; $("#pick-show").setAttribute("aria-label", `Show: ${showText}`);
    $$("#scales input").forEach((r) => (r.checked = r.value === st.scale));
    renderFilters();
    const un = `Unscheduled, ${unscheduled.length ? `${unscheduled.length} ${unscheduled.length === 1 ? "job" : "jobs"}` : "none"}`;
    $("#tray-toggle").setAttribute("aria-label", un); $("#tray-toggle").dataset.tip = un;
    period(); fit();
  }
  // the toolbar's Jobs reads back its value; Add filter's are chips, with the count and Clear all (L-filters)
  function renderFilters() {
    const jt = !st.jobs ? "All jobs" : st.jobs.length === 1 ? st.jobs[0] : `${st.jobs.length} jobs`;
    $("#jobs-text").textContent = jt; $("#pick-jobs").setAttribute("aria-label", `Jobs: ${jt}`);
    const text = (f, v) => v.map((x) => f.groups().flatMap(([, o]) => o).find((o) => o.value === x)?.label.replace(" (you)", "") ?? x).join(", ");
    const chips = FILTERS.filter((f) => st.filters[f.key]).map((f) => { const t = text(f, st.filters[f.key]);
      return `<span class="chip" data-active><button type="button" class="chip-main" data-chip="${f.key}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(`${f.label}: ${t}. Change filter`)}"><span class="chip-field">${esc(f.label)}:</span><span class="chip-value">${esc(t)}</span></button><button type="button" class="chip-remove" data-remove="${f.key}" aria-label="${esc(`Remove ${f.label.toLowerCase()} filter`)}" data-tip="Remove filter">${ic("xmark", 14)}</button></span>`; });
    if (filtered()) chips.push(`<button type="button" class="button clear-all" data-variant="ghost" data-size="sm" data-clear-all>Clear all</button>`);
    $("#filters").innerHTML = chips.join("");
    // how much is left: jobs, and stages once a stage's filter is set
    const all = jobsOf().filter((j) => st.completed || j.status !== "Completed"), shown = shownJobs();
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    $("#result-count").innerHTML = `<strong>${shown.length}</strong> of ${plural(all.length, "job", "jobs")}${stageFiltered() ? `, <strong>${shown.reduce((n, j) => n + j.shown.length, 0)}</strong> of ${plural(all.reduce((n, j) => n + j.stages.length, 0), "stage", "stages")}` : ""}`;
    $("#list-chips").hidden = !filtered();
    $("#add-filter").disabled = FILTERS.every((f) => st.filters[f.key]);
  }
  const moved = { scale: true };
  function period() {
    const sc = $(".tl-scroll");
    if (!sc) { const js = jobsOf(); $("#period").textContent = js.length ? `${short(Math.min(...js.map((j) => j.start)))} – ${dateOf(Math.max(...js.map((j) => j.end))).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""; return; }
    const a = R0 + Math.floor(sc.scrollLeft / dw), b = Math.min(R0 + N - 1, R0 + Math.floor((sc.scrollLeft + sc.clientWidth - GRID) / dw));
    $("#period").textContent = `${short(a)} – ${dateOf(b).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  // today a quarter of the way in
  function goToday(smooth = true) {
    const sc = $(".tl-scroll"); if (!sc) return;
    const left = Math.max(0, X(0) - (sc.clientWidth - GRID) * 0.25);
    sc.scrollTo({ left, behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
  }
  // the cards' frames are as wide as the chart's view, and their insides are shown through a window that moves with
  // the scroll (timeline.css); both need the view's width and how far it scrolls
  function cardWindow(sc) {
    sc.style.setProperty("--_vw", `${sc.clientWidth}px`);
    sc.style.setProperty("--_range", `${Math.max(0, sc.scrollWidth - sc.clientWidth)}px`);
  }
  // the chart fills the screen to its foot and scrolls both ways inside, the grid and the scale staying put
  function fit() {
    const sc = $(".tl-scroll"); if (!sc) return;
    sc.style.maxBlockSize = `${Math.max(320, innerHeight - sc.getBoundingClientRect().top - scrollY - 24)}px`;
    cardWindow(sc);
  }

  // ---------- changes, every one with Undo ----------
  function change(mutate, message) {
    const was = structuredClone(stages), wasU = structuredClone(unscheduled);
    mutate();
    render(); say(message);
    toast(message, () => { stages = was; unscheduled = wasU; render(); say("Undone"); });
  }
  // what waits on a moved stage keeps its gap: moved later, everything after it moves by as much (your call, 22 Oct)
  function cascade(ids, delta) {
    if (delta <= 0) return [];
    const moved = new Set(ids), out = [];
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of stages) if (!moved.has(s.id) && s.waits && moved.has(s.waits)) { moved.add(s.id); out.push(s); s.start += delta; grew = true; }
    }
    return out;
  }
  // what moved with it, by name: “; Inspection and Finish moved with it”
  const after = (more, n = 1) => (more.length ? `; ${together(more.map((s) => s.name))} moved with ${n === 1 ? "it" : "them"}` : "");
  function applyMove(list, delta, name) {
    if (!delta) return;
    const was = structuredClone(stages);
    for (const s of list) s.start += delta;
    const more = cascade(list.map((s) => s.id), delta);
    render();
    const first = Math.min(...list.map((s) => s.start)), last = Math.max(...list.map(endOf));
    const message = `${name} moved to ${span(first, last)}${after(more, list.length)}`;
    say(message); toast(message, () => { stages = was; render(); say("Undone"); });
  }
  function applyStretch(s, days) {
    if (days === s.days || days < 1) return;
    const was = structuredClone(stages), delta = days - s.days;
    s.days = days;
    const more = cascade([s.id], delta);
    render();
    const message = `${s.name} now runs to ${long(endOf(s))}, ${workDays(s.start, endOf(s))} working days${after(more)}`;
    say(message); toast(message, () => { stages = was; render(); say("Undone"); });
  }
  // a link: one stage waits for another of the same job; never round in a circle
  function link(fromId, toId) {
    const a = byId(fromId), b = byId(toId);
    if (!a || !b || a === b) return;
    if (a.job !== b.job) return toast("A stage waits only for a stage of its own job.");
    for (let p = a; p; p = p.waits && byId(p.waits)) if (p.id === b.id) return toast(`${b.name} already comes before ${a.name}: that would make a circle.`);
    change(() => (b.waits = a.id), `${b.name} now waits for ${a.name}${broken(b) ? ". It starts before that ends: move it, or it shows red" : ""}`);
  }
  const unlink = (s) => { const p = byId(s.waits); change(() => (s.waits = null), `${s.name} no longer waits for ${p.name}`); };

  // ---------- the summary, Show, Unscheduled: one shared popover (the calendar's) ----------
  const pop = $("#pop");
  let popFor = null, byKey = false;
  function openPop(kind, from, fill, { start = false, label } = {}) {
    if (pop.matches(":popover-open") && popFor?.from === from && popFor.kind === kind) { pop.hidePopover(); return; }
    if (pop.matches(":popover-open")) pop.hidePopover();
    popFor = { kind, from, fill };
    pop.dataset.kind = kind; pop.setAttribute("role", kind === "add" ? "menu" : "dialog"); pop.setAttribute("aria-label", label || kind);
    pop.innerHTML = fill(); BolsterShell.hydrateIcons(pop);
    pop.showPopover();
    from?.setAttribute("aria-expanded", "true");
    BolsterShell.placePopover(pop, from, { start });
    ($("h3[tabindex]", pop) || $("input, button:not([data-close-pop])", pop) || $("[data-close-pop]", pop))?.focus({ preventScroll: true, focusVisible: byKey });
  }
  let refocus = null;
  pop.addEventListener("beforetoggle", (e) => {
    if (e.newState !== "closed") return;
    const from = popFor?.from; popFor = null;
    from?.setAttribute("aria-expanded", "false");
    refocus = from?.isConnected && (pop.contains(document.activeElement) || document.activeElement === document.body) ? from : null;
  });
  pop.addEventListener("toggle", (e) => { if (e.newState === "closed" && refocus?.isConnected && !pop.matches(":popover-open")) refocus.focus({ preventScroll: true }); refocus = null; });
  const closeBtn = () => `<button type="button" class="button cal-pop-close" data-variant="ghost" data-size="sm" data-icon-only data-close-pop aria-label="Close" data-tip="Close">${ic("xmark", 16, { optical: true })}</button>`;
  const dd = (term, html) => `<dt>${term}</dt><dd>${html}</dd>`;
  // the team on it, and the subcontractor doing it, named as one
  const crew = (ids, sub) => { const ps = [...ids, ...(sub ? [sub] : [])].map(who);
    return ps.length ? `<span class="cal-faces" aria-hidden="true">${ps.map((p) => avatar(p, "sm")).join("")}</span><span>${esc(together(ps.map((p) => (p.me ? "You" : p.sub ? `${p.name} (subcontractor)` : p.name))))}</span>` : `<span class="text-secondary">No one yet</span>`; };
  function stageHtml(s) {
    const ms = isMilestone(s), end = endOf(s), wd = ms ? 0 : workDays(s.start, end), on = !ms && s.start <= 0 && end >= 0;
    const p = s.waits && byId(s.waits), holds = holdsUp(s);
    return `<div class="cal-sum"><div class="cal-sum-top"><p class="cal-sum-kind">${ic(ms ? "calendar" : "briefcase", 14)}${ms ? "Milestone" : "Stage"} · ${esc(s.phase)}</p>${closeBtn()}</div>
      <h3 tabindex="-1">${esc(s.name)}</h3>
      <p class="cal-sum-when">${esc(ms ? long(s.start) : span(s.start, end))}<small>${ms ? "A date, no length" : `${wd} working ${wd === 1 ? "day" : "days"}${on ? ` · day ${workDays(s.start, 0)} of ${wd} today` : end < 0 ? " · done" : ""}`}</small></p>
      <dl>${dd("Job", `${esc(s.job)} · ${esc(s.client)}`)}${ms ? "" : dd("Crew", crew(s.who, s.sub))}
        ${dd("Waits for", p ? `<span class="tl-link-name${broken(s) ? " tl-late" : ""}">${esc(p.name)}${broken(s) ? " (ends after this starts)" : ""}</span><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-unlink="${s.id}" aria-label="${esc(`Stop ${s.name} waiting for ${p.name}`)}" data-tip="Remove link">${ic("xmark", 14, { optical: true })}</button>` : '<span class="text-secondary">Nothing</span>')}
        ${dd("Holds up", holds.length ? esc(together(holds.map((x) => x.name))) : '<span class="text-secondary">Nothing</span>')}</dl>
      <form class="cal-sum-move" data-move="${s.id}"><div class="field" data-size="sm"><label class="field-label" for="mv-date">Starts</label><input class="input" type="date" id="mv-date" name="date" value="${iso(s.start)}" required></div><button type="submit" class="button" data-variant="secondary" data-size="sm">Move</button></form>
      <p class="cal-sum-note">${holds.length ? "Later, what waits on it keeps its gap." : "It keeps its length."}</p>
      <div class="cal-sum-actions"><a class="button" data-size="sm" href="../index.html#jobs">Open job</a></div></div>`;
  }
  function jobHtml(name) {
    const j = jobsOf().find((x) => x.name === name);
    return `<div class="cal-sum"><div class="cal-sum-top"><p class="cal-sum-kind">${ic("briefcase", 14)}Job</p>${closeBtn()}</div>
      <h3 tabindex="-1">${esc(j.name)}</h3>
      <p class="cal-sum-when">${esc(span(j.start, j.end))}<small>${j.work} working days · ${esc(j.status)} · ${j.pct}%</small></p>
      <dl>${dd("Owner", crew([j.owner]))}${dd("Client", esc(j.client))}${dd("Where", esc(j.place))}${dd("Plan", `${j.phases.length} ${j.phases.length === 1 ? "phase" : "phases"}, ${j.stages.length} ${j.stages.length === 1 ? "stage" : "stages"}`)}</dl>
      <p class="cal-sum-note">Its dates are its stages': move a stage, or drag the job's bracket to move all of it.</p>
      <div class="cal-sum-actions"><a class="button" data-size="sm" href="../index.html#jobs">Open job</a></div></div>`;
  }
  const checks = (title, rows2) => `<div class="pop-head"><h3>${title}</h3>${closeBtn()}</div><div class="pop-body">${rows2.map((r) => `<label class="option"><input type="checkbox" class="checkbox" ${r.attr}${r.on ? " checked" : ""}><span class="option-label"><span class="menu-icon">${ic(r.icon, 14)}</span>${esc(r.label)}</span></label>`).join("")}</div>`;
  const showHtml = () => checks("Show", [{ attr: 'data-show="completed"', on: st.completed, icon: "circle-check", label: "Finished jobs" }, { attr: 'data-show="links"', on: st.links, icon: "link", label: "Links between stages" }]);
  // Jobs: found by name, grouped by where they stand; none ticked is all of them
  function jobsHtml() {
    const all = jobsOf().filter((j) => st.completed || j.status !== "Completed"), on = new Set(st.jobs || []);
    const opt = (j) => `<label class="option"><input type="checkbox" class="checkbox" data-job-pick="${esc(j.name)}"${on.has(j.name) ? " checked" : ""}><span class="option-label"><span class="tl-opt">${esc(j.name)}<small>${esc(j.client)} · ${esc(`${short(j.start)} – ${short(j.end)}`)}</small></span></span></label>`;
    return `<div class="pop-head"><h3>Jobs</h3>${st.jobs ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-clear-jobs>Clear</button>` : ""}${closeBtn()}</div>
      <div class="pop-find"><input class="input" data-size="sm" type="search" data-opt-find placeholder="Find a job or client" aria-label="Find a job or client" autocomplete="off"></div>
      <div class="pop-body tl-jobs-pick" role="group" aria-label="Jobs">${[["In progress", "Under way"], ["Booked", "Coming up"], ["Completed", "Finished"]].map(([status, title]) => {
        const list = all.filter((j) => j.status === status);
        return list.length ? `<div class="pop-section">${title}</div>${list.map(opt).join("")}` : ""; }).join("")}<p class="tl-find-none" hidden>No job or client by that name.</p></div>`;
  }
  const addHtml = () => `<div class="pop-body"><div class="pop-section">Filter by</div>${FILTERS.filter((f) => !st.filters[f.key]).map((f) => `<button type="button" class="menu-item" role="menuitem" data-add-filter="${f.key}"><span class="menu-icon">${ic(f.icon, 14)}</span>${esc(f.label)}</button>`).join("")}</div>`;
  // a filter's options, each with how many it would show among what the other filters let through (jobs for the
  // owner, stages for the rest)
  function filterHtml(key) {
    const f = filterDef(key), v = st.filters[key] || [], base = shownJobs(key);
    const n = (value) => (f.job ? base.filter((j) => f.test(j, [value])).length : base.flatMap((j) => j.shown).filter((x) => f.test(x, [value])).length);
    return `<div class="pop-head"><h3>${esc(f.label)}</h3>${v.length ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-remove="${key}">Clear</button>` : ""}${closeBtn()}</div>
      <div class="pop-body" role="group" aria-label="${esc(f.label)}">${f.groups().map(([title, opts]) => `${title ? `<div class="pop-section">${title}</div>` : ""}${opts.map((o) => `<label class="option"><input type="checkbox" class="checkbox" data-opt="${esc(o.value)}"${v.includes(o.value) ? " checked" : ""}><span class="option-label">${o.html || esc(o.label)}</span><span class="option-count">${n(o.value)}</span></label>`).join("")}`).join("")}</div>`;
  }
  // a pick redraws the popover where it is, keeping the focus and what's typed in Find
  function refill() {
    if (!popFor) return;
    const a = document.activeElement, key = pop.contains(a) ? a.dataset.opt ?? a.dataset.jobPick : null, find = $("[data-opt-find]", pop)?.value;
    pop.innerHTML = popFor.fill(); BolsterShell.hydrateIcons(pop);
    if (find) { $("[data-opt-find]", pop).value = find; findIn(find); }
    if (key != null) $(`[data-opt="${CSS.escape(key)}"], [data-job-pick="${CSS.escape(key)}"]`, pop)?.focus({ preventScroll: true });
    // a chip drawn again is a new element: the popover stays at the new one
    if (!popFor.from?.isConnected) popFor.from = (popFor.key && $(`[data-chip="${popFor.key}"]`)) || $("#add-filter");
    popFor.from.setAttribute("aria-expanded", "true");
    BolsterShell.placePopover(pop, popFor.from, { start: popFor.kind === "filter" && !!popFor.from.closest(".chip") });
  }
  function findIn(text) {
    const q = text.trim().toLowerCase();
    $$(".option", pop).forEach((o) => (o.hidden = !!q && !o.textContent.toLowerCase().includes(q)));
    $$(".pop-section", pop).forEach((h) => { let el = h.nextElementSibling, any = false; while (el?.classList.contains("option")) { any ||= !el.hidden; el = el.nextElementSibling; } h.hidden = !any; });
    const none = $(".tl-find-none", pop); if (none) none.hidden = $$(".option", pop).some((o) => !o.hidden);
  }
  const openFilter = (key, from) => { openPop("filter", from, () => filterHtml(key), { label: `Filter by ${filterDef(key).label.toLowerCase()}`, start: !!from.closest(".chip") }); if (popFor) popFor.key = key; };
  const trayHtml = () => `<div class="pop-head"><h3>Unscheduled</h3>${closeBtn()}</div><div class="pop-body"><p class="cal-tray-help">Booked jobs with no dates yet. Open one to give it a start.</p><ul class="cal-tray-list">${unscheduled.length ? unscheduled.map((u) => `<li><button type="button" class="cal-tray-item" data-schedule="${u.id}"><b>${esc(u.job)}</b><span>${esc(u.stage)} · ${u.days} ${u.days === 1 ? "day" : "days"} · ${esc(u.client)}</span></button></li>`).join("") : '<li><p class="cal-tray-empty">Every job has its dates.</p></li>'}</ul></div>`;
  const scheduleHtml = (u) => `<div class="cal-sum"><div class="cal-sum-top"><p class="cal-sum-kind">${ic("briefcase", 14)}Unscheduled</p>${closeBtn()}</div><h3 tabindex="-1">${esc(u.job)}</h3>
    <p class="cal-sum-when">${esc(u.stage)}<small>${u.days} ${u.days === 1 ? "day" : "days"} · ${esc(u.client)}, ${esc(u.place)}</small></p>
    <form class="cal-sum-move" data-schedule-form="${u.id}"><div class="field" data-size="sm"><label class="field-label" for="sc-date">Start on</label><input class="input" type="date" id="sc-date" name="date" value="${iso(weekStart(7))}" required></div><button type="submit" class="button" data-size="sm">Schedule</button></form></div>`;
  function schedule(u, start) {
    change(() => { unscheduled = unscheduled.filter((x) => x !== u); stages.push({ id: `s${++seq}`, job: u.job, client: u.client, place: u.place, phase: "Construction", name: u.stage, start, days: u.days, who: [], sub: null, owner: u.owner, waits: null, items: itemsFor(u.stage) }); }, `${u.job} scheduled from ${long(start)}`);
  }

  // ---------- dragging: a stage, its end, a job's or phase's bracket, or a link from a bar's end (TL-move, TL-links) ----------
  // Mouse and pen only: on touch a press scrolls, and phones move stages in the summary (TL-phone).
  let drag = null, swallow = false;
  const ghost = $("#ghost");
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch" || phone.matches) return;
    const linkFrom = e.target.closest("[data-link-from]"), stretch = e.target.closest("[data-stretch]"), el = e.target.closest("[data-drag]");
    if (!linkFrom && !stretch && !el) return;
    e.preventDefault();
    if (linkFrom) drag = { mode: "link", id: linkFrom.dataset.linkFrom, x: e.clientX, y: e.clientY };
    else if (stretch) drag = { mode: "stretch", id: stretch.dataset.stretch, x: e.clientX, y: e.clientY };
    else {
      const kind = el.dataset.drag, key = el.dataset.key;
      const list = kind === "stage" ? [byId(key)] : kind === "job" ? stages.filter((s) => s.job === key) : stages.filter((s) => `${s.job}|${s.phase}` === key);
      drag = { mode: "move", kind, key, list, x: e.clientX, y: e.clientY, name: kind === "stage" ? byId(key).name : kind === "job" ? key : key.split("|").join(" · ") };
    }
  });
  const dayDelta = (e) => Math.round((e.clientX - drag.x) / dw);
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
      drag.started = true;
      if (pop.matches(":popover-open")) pop.hidePopover();
      document.documentElement.setAttribute("data-tl-dragging", drag.mode);
      ghost.hidden = false;
      if (drag.mode === "link") { const r = $(`.tl-bar[data-key="${drag.id}"]`).getBoundingClientRect(); drag.line = document.createElementNS("http://www.w3.org/2000/svg", "svg"); drag.line.classList.add("tl-link-draft"); drag.line.innerHTML = `<line x1="${r.right}" y1="${r.top + r.height / 2}" x2="${r.right}" y2="${r.top + r.height / 2}"/>`; document.body.append(drag.line); }
    }
    let text = "";
    if (drag.mode === "move") {
      const d = dayDelta(e);
      for (const s of drag.list) { const b = $(`[data-drag][data-key="${s.id}"]`); if (b) b.style.translate = `${d * dw}px 0`; }
      $$(`.tl-bracket`).forEach((b) => { if (drag.kind !== "stage" && b.dataset.key === drag.key) b.style.translate = `${d * dw}px 0`; });
      const a = Math.min(...drag.list.map((s) => s.start)) + d, b2 = Math.max(...drag.list.map(endOf)) + d;
      text = `<b>${esc(drag.name)}</b><span>${esc(span(a, b2))}, ${workDays(a, b2)} working days</span>`;
      drag.delta = d;
    } else if (drag.mode === "stretch") {
      const s = byId(drag.id), days = Math.max(1, s.days + dayDelta(e));
      const b = $(`.tl-bar[data-key="${s.id}"]`); if (b) b.style.width = `${days * dw}px`;
      text = `<b>${esc(s.name)}</b><span>To ${esc(long(s.start + days - 1))}, ${workDays(s.start, s.start + days - 1)} working days</span>`;
      drag.days = days;
    } else {
      const ln = drag.line.querySelector("line"); ln.setAttribute("x2", e.clientX); ln.setAttribute("y2", e.clientY);
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".tl-bar, .tl-milestone");
      $$("[data-link-over]").forEach((x) => x.removeAttribute("data-link-over"));
      const s = byId(drag.id), t = over && byId(over.dataset.key);
      if (t && t !== s) { over.setAttribute("data-link-over", ""); text = t.job === s.job ? `<b>${esc(t.name)}</b><span>Waits for ${esc(s.name)}</span>` : `<b>${esc(t.name)}</b><span>Another job: can't wait for ${esc(s.name)}</span>`; drag.to = t.job === s.job ? t.id : null; }
      else { text = `<b>${esc(s.name)}</b><span>Drop on the stage that waits for it</span>`; drag.to = null; }
    }
    ghost.innerHTML = text;
    ghost.style.translate = `${Math.min(e.clientX + 14, innerWidth - ghost.offsetWidth - 8)}px ${e.clientY + 14}px`;
    // near the chart's edges, it scrolls
    const sc = $(".tl-scroll"), r = sc.getBoundingClientRect();
    if (e.clientX > r.right - 40) sc.scrollLeft += 12; else if (e.clientX < r.left + GRID + 40) sc.scrollLeft -= 12;
  });
  function endDrag() {
    $$("[data-link-over]").forEach((x) => x.removeAttribute("data-link-over"));
    drag?.line?.remove();
    document.documentElement.removeAttribute("data-tl-dragging");
    ghost.hidden = true; drag = null;
  }
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag;
    if (!d.started) { drag = null; return; }
    swallow = true; setTimeout(() => (swallow = false), 0);
    endDrag();
    if (d.mode === "move") { if (d.delta) applyMove(d.list, d.delta, d.name); else render(); }
    else if (d.mode === "stretch") { const s = byId(d.id); if (d.days && d.days !== s.days) applyStretch(s, d.days); else render(); }
    else if (d.to) link(d.id, d.to);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drag?.started) { endDrag(); render(); say("Cancelled"); } });
  document.addEventListener("click", (e) => { if (swallow) { swallow = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const q = (s) => e.target.closest(s);
    let el;
    byKey = e.detail === 0;
    if (q("[data-close-pop]")) return pop.hidePopover();
    if ((el = q("[data-fold]"))) {
      const k = el.dataset.fold;
      if (k.startsWith("items:")) { const id = k.slice(6); st.items.has(id) ? st.items.delete(id) : st.items.add(id); }
      else st.shut.has(k) ? st.shut.delete(k) : st.shut.add(k);
      render(); $(`[data-fold="${CSS.escape(k)}"]`)?.focus({ focusVisible: byKey }); return;
    }
    if ((el = q("[data-unlink]"))) { pop.hidePopover(); return unlink(byId(el.dataset.unlink)); }
    // a stage's summary opens at its bar, beside its dates, not over the grid (on phones, a sheet)
    if ((el = q("[data-open]"))) { const s = byId(el.dataset.open), row = q(".tl-row"), from = row?.querySelector(".tl-bar, .tl-milestone") || el; return openPop("summary", from, () => stageHtml(s), { label: s.name, start: true }); }
    if ((el = q("[data-open-job]"))) { const name = el.dataset.openJob; return openPop("summary", el, () => jobHtml(name), { label: name, start: true }); }
    if ((el = q("#pick-show"))) return openPop("show", el, showHtml, { label: "Show" });
    if ((el = q("#pick-jobs"))) return openPop("jobs", el, jobsHtml, { label: "Jobs" });
    if ((el = q("#add-filter"))) return openPop("add", el, addHtml, { label: "Add a filter" });
    if ((el = q("[data-add-filter]"))) return openFilter(el.dataset.addFilter, $("#add-filter"));
    if ((el = q("[data-chip]"))) return openFilter(el.dataset.chip, el);
    if ((el = q("[data-remove]"))) { const k = el.dataset.remove; delete st.filters[k]; save(); if (pop.matches(":popover-open")) pop.hidePopover(); render(); return (filtered() ? $("[data-chip]") || $("[data-clear-all]") : $("#add-filter"))?.focus({ preventScroll: true, focusVisible: byKey }); }
    if (q("[data-clear-all]")) { st.jobs = null; st.filters = {}; save(); if (pop.matches(":popover-open")) pop.hidePopover(); render(); say("Filters cleared"); return $("#pick-jobs").focus({ preventScroll: true, focusVisible: byKey }); }
    if (q("[data-clear-jobs]")) { st.jobs = null; save(); render(); refill(); return $("[data-opt-find]", pop)?.focus({ preventScroll: true }); }
    if ((el = q("#tray-toggle")) || (el = q("#create"))) return openPop("tray", el, trayHtml, { label: "Unscheduled" });
    if ((el = q("[data-schedule]"))) { const u = unscheduled.find((x) => x.id === el.dataset.schedule), from = popFor?.from || $("#tray-toggle"); return openPop("schedule", from, () => scheduleHtml(u), { label: `Schedule ${u.job}` }); }
    if (q("#go-today")) return goToday();
    if ((el = q("#go-prev, #go-next"))) { const sc = $(".tl-scroll"); if (sc) sc.scrollBy({ left: (el.id === "go-next" ? 1 : -1) * (sc.clientWidth - GRID) * 0.8, behavior: "smooth" }); return; }
  });
  document.addEventListener("change", (e) => {
    const sh = e.target.closest("[data-show]");
    const jp = e.target.closest("[data-job-pick]"), op = e.target.closest("[data-opt]");
    if (jp) { const set = new Set(st.jobs || []); jp.checked ? set.add(jp.dataset.jobPick) : set.delete(jp.dataset.jobPick); st.jobs = set.size ? [...set] : null; save(); render(); return refill(); }
    if (op && popFor?.key) { const k = popFor.key, set = new Set(st.filters[k] || []); op.checked ? set.add(op.dataset.opt) : set.delete(op.dataset.opt); if (set.size) st.filters[k] = [...set]; else delete st.filters[k]; save(); render(); return refill(); }
    if (sh) { st[sh.dataset.show] = sh.checked; keep(`tl-${sh.dataset.show}`, sh.checked ? "on" : "off"); render(); popFor.from = $("#pick-show"); popFor.from.setAttribute("aria-expanded", "true"); return; }
  });
  document.addEventListener("input", (e) => { if (e.target.matches("#pop [data-opt-find]")) findIn(e.target.value); });
  $("#scales").addEventListener("change", (e) => { st.scale = e.target.value; keep("tl-scale", st.scale); moved.scale = true; render(); });
  document.addEventListener("submit", (e) => {
    const mv = e.target.closest("[data-move]"), sc = e.target.closest("[data-schedule-form]");
    if (!mv && !sc) return;
    e.preventDefault();
    const n = offsetOf(e.target.date.value);
    pop.hidePopover();
    if (sc) return schedule(unscheduled.find((x) => x.id === sc.dataset.scheduleForm), n);
    const s = byId(mv.dataset.move);
    if (n !== s.start) applyMove([s], n - s.start, s.name);
  });
  document.addEventListener("scroll", (e) => { if (e.target.classList?.contains("tl-scroll")) period(); }, { capture: true, passive: true });
  phone.addEventListener("change", () => { moved.scale = true; render(); });
  addEventListener("resize", () => { fit(); if (st.scale === "fit") { moved.scale = true; render(); } if (popFor) BolsterShell.placePopover(pop, popFor.from); });
  BolsterShell.scrolling({ into: (top) => tl.getBoundingClientRect().top < top, busy: () => !!drag?.started });
  render();
})();
