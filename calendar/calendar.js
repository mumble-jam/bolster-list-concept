// Calendar concept: the team's dated work on days, as the “Calendar · research” board suggests it (C-rules,
// Figma, 19 Oct). Jobs' phases as spans, appointments (site visits and meetings) at their times, other
// calendars' busy time; Month, Week, Day and Crew, a week strip over an agenda on phones. Made-up data.
(() => {
  const { TODAY, esc, kit } = window.BDS_CONCEPT;
  const { OWNERS, avatar } = kit;
  const ic = (n, s = 16, o) => window.BolsterIcons(n, s, o);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const toast = (message, undo) => BolsterShell.toast(message, { undo });
  const say = (t) => { $("#live").textContent = t; };

  BolsterShell.mount({ current: "calendar", links: { calendar: "index.html", tasks: "../tasks/", pipeline: "../pipeline/", "job-list": "../index.html#jobs", "vendor-orders": "../index.html?d=pages/list/vendor-orders.json", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog" } });

  // ---------- days: ISO dates, read at noon so a clock change never moves one ----------
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const day = (s) => new Date(`${s}T12:00:00`);
  const add = (s, n) => { const d = day(s); d.setDate(d.getDate() + n); return iso(d); };
  const diff = (a, b) => Math.round((day(b) - day(a)) / 864e5);
  const T = iso(TODAY);
  const D = (n) => add(T, n);
  // the week is the shell's, every page's: it starts on Monday (D76)
  const weekStart = (s) => iso(BolsterShell.week.start(day(s)));
  // days off come from the company's settings; here, weekends
  const isOff = (s) => [0, 6].includes(day(s).getDay());
  const f = {
    short: (s) => day(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    long: (s) => day(s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    dayWord: (s) => (s === T ? "Today" : s === D(1) ? "Tomorrow" : s === D(-1) ? "Yesterday" : null),
    time: (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`,
    span: (a, b) => `${f.time(a)}–${f.time(b)}`,
  };
  const minutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  // an event's time: its span, or All day (Bolster's events are one day long, all day or from a time to a time)
  const spanOf = (it) => (it.allDay ? "All day" : f.span(it.from, it.to));

  // ---------- sample data ----------
  const who = (id) => OWNERS.find((o) => o.id === id);
  const nameOf = (p) => (p.me ? "You" : p.name);
  const together = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
  const faces = (ids) => `<span class="cal-faces" aria-hidden="true">${ids.map(who).filter(Boolean).slice(0, 3).map((p) => avatar(p, "sm")).join("")}</span>`;
  let seq = 0;
  // a job's phases: [job, client, place, phase, start (days from today), length in days, who]
  const PHASES = [
    ["Lakeside kitchen", "Hale residence", "14 Birch Lane", "Demolition", -3, 2, ["mr"]],
    ["Lakeside kitchen", "Hale residence", "14 Birch Lane", "Framing", -1, 6, ["mr", "pn"]],
    ["Lakeside kitchen", "Hale residence", "14 Birch Lane", "Drywall", 5, 4, ["mr", "dc"]],
    ["Lakeside kitchen", "Hale residence", "14 Birch Lane", "Finish", 11, 3, ["dc"]],
    ["Garage drywall", "Ortiz", "88 Quarry Road", "Hang and tape", -9, 4, ["pn"]],
    ["Garage drywall", "Ortiz", "88 Quarry Road", "Prime and paint", -3, 2, ["pn"]],
    ["Basement finish", "Brennan", "3 Elm Street", "Framing", 4, 4, ["pn"]],
    ["Basement finish", "Brennan", "3 Elm Street", "Insulation", 8, 1, ["dc"]],
    ["Basement finish", "Brennan", "3 Elm Street", "Drywall", 11, 5, ["mr", "pn"]],
    ["Attic insulation", "Novak", "41 Hill Road", "Blown-in, R-49", 0, 2, ["dc"]],
    ["Stairwell skim coat", "Galloway", "9 Mill Lane", "Skim coat", 6, 2, []],
    ["Office build-out", "Northgate Property Group", "200 Harbor Way, suite 4", "Steel studs", 12, 4, ["mr"]],
    ["Office build-out", "Northgate Property Group", "200 Harbor Way, suite 4", "Board and tape", 18, 5, ["mr", "pn", "dc"]],
    ["Fire-rated walls", "Pinecrest Builders", "Lot 12, Pinecrest", "Two layers, type X", 19, 3, ["dc"]],
  ];
  // appointments: [type, title, place, day (from today), from, to, who]
  const APPTS = [
    ["Site visit", "Estimate visit · Delgado", "7 Pine Court", 0, "9:00", "10:00", ["hm"]],
    ["Meeting", "Walkthrough with the Hales", "14 Birch Lane", 0, "13:30", "14:00", ["hm", "mr"]],
    ["Meeting", "Supplier call · Gypsum Supply", "Phone", 0, "15:00", "15:30", ["dc"]],
    ["Meeting", "Northgate weekly", "Northgate office", 1, "11:00", "12:00", ["hm"]],
    ["Site visit", "Measure · Whitaker attic", "22 Ridge Road", 4, "10:00", "11:00", ["hm"]],
    ["Meeting", "Crew briefing", "Yard", 5, "7:30", "8:00", ["hm", "mr", "pn", "dc"]],
    ["Site visit", "Measure · Fontaine bathroom", "5 Lake Drive", 5, "8:30", "9:30", ["hm"]],
    ["Site visit", "Inspection · Basement framing", "3 Elm Street", 5, "11:00", "11:30", ["pn"]],
    ["Meeting", "Estimate review · Brennan", "Office", 5, "14:00", "15:00", ["hm", "dc"]],
    ["Site visit", "Estimate visit · Ashby kitchen", "60 Oak Avenue", -2, "10:00", "11:00", ["hm"]],
    ["Site visit", "Final walkthrough · Ortiz garage", "88 Quarry Road", -2, "15:00", "15:30", ["hm", "pn"]],
    ["Site visit", "Estimate visit · Calloway", "17 Bay Street", 12, "9:00", "10:00", ["hm"]],
    ["Meeting", "Pinecrest preconstruction", "Pinecrest site office", 15, "10:00", "11:30", ["hm", "dc"]],
  ];
  // other calendars: only that someone's busy, and when [day, from, to, who]
  const BUSY = [[0, "12:00", "13:00", "hm"], [1, "16:00", "17:00", "mr"], [7, "8:00", "12:00", "dc"], [5, "16:00", "17:30", "hm"]];
  let items = [
    ...PHASES.map(([job, client, place, phase, s, n, w]) => ({ id: `p${++seq}`, kind: "job", job, client, place, phase, start: D(s), days: n, who: w })),
    ...APPTS.map(([type, title, place, d, a, b, w]) => ({ id: `a${++seq}`, kind: "appt", type, title, place, date: D(d), from: minutes(a), to: minutes(b), who: w })),
    ...BUSY.map(([d, a, b, w]) => ({ id: `b${++seq}`, kind: "busy", date: D(d), from: minutes(a), to: minutes(b), who: [w], source: "Google Calendar" })),
  ];
  // jobs with no dates yet: [job, client, place, first phase, length]
  let tray = [
    ["Popcorn ceiling removal", "Lindqvist", "31 Cedar Street", "Scrape and skim", 3],
    ["Crawl space insulation", "Marsh", "12 Fern Road", "Vapour barrier", 2],
    ["Water damage repair", "Calloway", "17 Bay Street", "Demolition and dry-out", 4],
  ].map(([job, client, place, phase, days]) => ({ id: `u${++seq}`, job, client, place, phase, days }));
  // each job its own colour, so its phases read as one across the month, the week and the crew: the shared
  // sample's (kit.jobHue). Colour says which job, never what kind: the
  // job's name is on every bar
  const hueOf = kit.jobHue;
  const byId = (id) => items.find((x) => x.id === id);
  const endOf = (sp) => add(sp.start, sp.days - 1);
  const workDays = (sp) => { let n = 0; for (let i = 0; i < sp.days; i++) if (!isOff(add(sp.start, i))) n++; return n; };
  const workDayOn = (sp, s) => { if (isOff(s)) return 0; let n = 0; for (let d = sp.start; d <= s; d = add(d, 1)) if (!isOff(d)) n++; return n; };
  const isPast = (it) => (it.kind === "job" ? endOf(it) < T : it.date < T);
  const spanLabel = (sp) => `${sp.job} · ${sp.phase}`;
  const titleOf = (it) => (it.kind === "job" ? spanLabel(it) : it.kind === "busy" ? "Busy" : it.title);

  // ---------- what's shown (C-show) ----------
  const KINDS = [
    { key: "job", label: "Jobs", note: "Their phases, from each job's schedule", icon: "briefcase" },
    { key: "appt", label: "Appointments", note: "Site visits and meetings", icon: "calendar-check" },
    { key: "busy", label: "Other calendars", note: "When someone's busy elsewhere", icon: "clock" },
  ];
  let VIEW = "month";
  try { VIEW = localStorage.getItem("cal-view") || "month"; } catch {}
  // Unscheduled opens beside the calendar the first time (from 1024 wide; a sheet below it never opens on
  // its own), then stays as it was last left, in this browser
  let TRAY = true;
  try { TRAY = localStorage.getItem("cal-tray") !== "closed"; } catch {}
  const st = { view: VIEW, at: T, show: { job: true, appt: true, busy: true }, people: null, trayOpen: TRAY };
  const keepTray = () => { try { localStorage.setItem("cal-tray", st.trayOpen ? "open" : "closed"); } catch {} };
  const shown = (it) => it.draft || (st.show[it.kind] && (!st.people || it.who.some((p) => st.people.has(p))));
  const spansIn = (a, b, filter = () => true) => items.filter((it) => it.kind === "job" && shown(it) && it.start <= b && endOf(it) >= a && filter(it));
  const dayThings = (s, filter = () => true) => items.filter((it) => it.kind !== "job" && shown(it) && it.date === s && filter(it)).sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.from - b.from);
  const nameIt = (it) => (it.kind === "busy" ? "Busy" : it.title || "(No title)");

  // ---------- a week's row: day cells behind, spans in lanes, each day's items under them ----------
  // spans first, then appointments by time; past what fits, “+n more” (C-more). Used by Month, by the
  // all-day row of Week and Day, and by each person's row in Crew.
  const phone = matchMedia("(max-width: 767px)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  function weekRow({ start, n = 7, spans, things = () => [], dates = true, maxLanes = 3, lines = 5, person = null, month = null }) {
    const end = add(start, n - 1);
    const segs = spans.map((sp) => ({ sp, s: Math.max(0, diff(start, sp.start)), e: Math.min(n - 1, diff(start, endOf(sp))), contL: sp.start < start, contR: endOf(sp) > end }))
      .sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
    const lanes = [];
    for (const g of segs) { let l = lanes.findIndex((e) => e < g.s); if (l < 0) { l = lanes.length; lanes.push(-1); } lanes[l] = g.e; g.lane = l; }
    const shownLanes = Math.min(lanes.length, maxLanes), top = dates ? 2 : 1;
    let html = "";
    for (let i = 0; i < n; i++) {
      const d = add(start, i), other = month != null && day(d).getMonth() !== month;
      html += `<button type="button" class="cal-day" tabindex="-1" data-add-day="${d}" style="grid-column:${i + 1}"${isOff(d) ? " data-off" : ""} aria-label="Add on ${esc(f.short(d))}"></button>`;
      if (dates) html += `<span class="cal-date" style="grid-column:${i + 1}"${d === T ? " data-today" : d < T ? " data-past" : ""}${other ? " data-other" : ""}>${day(d).getDate() === 1 ? day(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : day(d).getDate()}</span>`;
    }
    for (const g of segs.filter((x) => x.lane < shownLanes)) {
      const sp = g.sp, first = !g.contL;
      html += `<button type="button" class="cal-span" data-item="${sp.id}" data-hue="${hueOf(sp.job)}"${person ? ` data-person="${person}"` : ""} style="grid-column:${g.s + 1} / ${g.e + 2};grid-row:${g.lane + top}"${g.contL ? " data-cont-l" : ""}${g.contR ? " data-cont-r" : ""}${isPast(sp) ? " data-past" : ""}
        aria-haspopup="dialog" aria-expanded="false" ${first ? `aria-label="${esc(`${spanLabel(sp)}, ${f.short(sp.start)} to ${f.short(endOf(sp))}, job phase`)}"` : `tabindex="-1" aria-hidden="true" data-tip="${esc(spanLabel(sp))}"`}>${ic("briefcase", 12)}<span>${esc(sp.job)}<span class="cal-sub"> · ${esc(sp.phase)}</span></span>${!g.contR && finePointer.matches ? `<span class="cal-resize" data-resize="${sp.id}" aria-hidden="true"></span>` : ""}</button>`;
    }
    for (let i = 0; i < n; i++) {
      const d = add(start, i), list = things(d);
      const hidden = segs.filter((g) => g.lane >= shownLanes && g.s <= i && g.e >= i).length;
      if (!list.length && !hidden) continue;
      const room = Math.max(1, lines - shownLanes);
      // a bar past the lanes always counts in “+n more”: nothing is left out without a count
      const over = hidden > 0 || list.length > room, show = over ? list.slice(0, Math.max(0, room - 1)) : list;
      html += `<div class="cal-items" style="grid-column:${i + 1}">${show.map((it) => itemBtn(it, person)).join("")}${over ? `<button type="button" class="cal-more" data-more="${d}"${person ? ` data-person="${person}"` : ""} aria-haspopup="dialog" aria-expanded="false" aria-label="${list.length - show.length + hidden} more on ${esc(f.short(d))}">+${list.length - show.length + hidden} more</button>` : ""}</div>`;
    }
    // the rows: the dates, a lane per span, then the day's items
    const rows = `${dates ? "auto " : ""}${shownLanes ? `repeat(${shownLanes}, var(--_lane)) ` : ""}${month != null ? "minmax(0, 1fr)" : "auto"}`;
    return `<div class="cal-week" style="--_n:${n};grid-template-rows:${rows}" data-start="${start}" data-n="${n}"${person ? ` data-person="${person}"` : ""}>${html}</div>`;
  }
  // an appointment, or busy time: its time, then what (C-show)
  function itemBtn(it, person) {
    const label = it.kind === "busy" ? `${f.short(it.date)}, ${spanOf(it)}, ${together(it.who.map((p) => who(p).name))} busy, from ${it.source}` : `${f.short(it.date)}, ${spanOf(it)}, ${it.draft ? "new event" : `${it.type}: ${it.title}`}`;
    return `<button type="button" class="cal-item" data-item="${it.id}" data-kind="${it.kind}"${person ? ` data-person="${person}"` : ""}${isPast(it) && !it.draft ? " data-past" : ""}${it.allDay ? " data-all-day" : ""}${it.draft ? " data-draft" : ""} aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(label)}">${it.allDay ? "" : `<span class="cal-time">${f.time(it.from)}</span>`}<span>${esc(nameIt(it))}</span></button>`;
  }
  const weekdayHead = (start, n, lead = "") => `<div class="cal-head" aria-hidden="true">${lead}${Array.from({ length: n }, (_, i) => { const d = add(start, i); return `<div${d === T ? " data-today" : ""}>${day(d).toLocaleDateString("en-GB", { weekday: "short" })}${n < 7 || lead ? `<span class="cal-head-num">${day(d).getDate()}</span>` : ""}</div>`; }).join("")}</div>`;

  // ---------- Month ----------
  // how many lines a month's day fits: the weeks share the screen's height, so taller rows fit more before
  // “+n more” (five at the least, the 8.75rem a week keeps); measured after each draw and on resize
  let monthLines = 5;
  function fitMonth() {
    const w = $("#cal[data-view='month'] .cal-week"), date = w?.querySelector(".cal-date");
    if (!w || !date) return;
    const cs = getComputedStyle(w), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const lane = parseFloat(cs.getPropertyValue("--_lane")) * rem, gap = parseFloat(cs.rowGap) || 0;
    const room = w.getBoundingClientRect().bottom - parseFloat(cs.paddingBlockEnd) - date.getBoundingClientRect().bottom - gap;
    const lines = Math.max(5, Math.floor((room + gap) / (lane + gap)));
    if (lines !== monthLines) { monthLines = lines; render(); }
  }
  function monthHtml() {
    const a = day(st.at), first = iso(new Date(a.getFullYear(), a.getMonth(), 1)), last = iso(new Date(a.getFullYear(), a.getMonth() + 1, 0));
    const start = weekStart(first), end = add(weekStart(last), 6);
    let weeks = "";
    for (let w = start; w <= end; w = add(w, 7)) weeks += weekRow({ start: w, spans: spansIn(w, add(w, 6)), things: (d) => dayThings(d), month: a.getMonth(), lines: monthLines, maxLanes: Math.max(3, monthLines - 2) });
    return `<div style="--_cols:repeat(7, minmax(0, 1fr))">${weekdayHead(start, 7)}</div>${weeks}`;
  }

  // ---------- Week and Day: spans in an all-day row over the hours (C-span) ----------
  const H0 = 7, H1 = 19;
  function timeHtml(n) {
    const start = n === 7 ? weekStart(st.at) : st.at, end = add(start, n - 1);
    let gutter = "", cols = "";
    for (let h = H0 + 1; h < H1; h++) gutter += `<span class="cal-gutter-label" style="top:calc(var(--_hour) * ${h - H0})">${h <= 12 ? h : h - 12} ${h < 12 ? "am" : "pm"}</span>`;
    for (let i = 0; i < n; i++) {
      const d = add(start, i), list = dayThings(d, (it) => !it.allDay);
      // side by side where they overlap
      const placed = []; let cluster = [], clusterEnd = -1;
      const flush = () => { const cs = []; for (const it of cluster) { let c = cs.findIndex((e) => e <= it.from); if (c < 0) { c = cs.length; cs.push(0); } cs[c] = it.to; it._c = c; } cluster.forEach((it) => placed.push({ it, c: it._c, of: cs.length })); cluster = []; };
      for (const it of list) { if (it.from >= clusterEnd) flush(); cluster.push(it); clusterEnd = Math.max(clusterEnd, it.to); }
      flush();
      const blocks = placed.map(({ it, c, of }) => {
        const a = Math.max(it.from, H0 * 60), b = Math.min(Math.max(it.to, a + 15), H1 * 60);
        return `<button type="button" class="cal-block" data-item="${it.id}" data-kind="${it.kind}"${isPast(it) && !it.draft ? " data-past" : ""}${it.draft ? " data-draft" : ""} style="--_top:calc(var(--_hour) * ${(a - H0 * 60) / 60});--_h:calc(var(--_hour) * ${(b - a) / 60});--_x:${c / of};--_w:${1 / of}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(`${f.short(d)}, ${f.span(it.from, it.to)}, ${it.kind === "busy" ? "busy, from another calendar" : it.draft ? "new event" : `${it.type}: ${it.title}`}`)}"><b>${esc(nameIt(it))}</b><span>${f.span(it.from, it.to)}${it.place ? ` · ${esc(it.place)}` : it.kind === "busy" ? ` · ${esc(together(it.who.map((p) => nameOf(who(p)))))}` : ""}</span></button>`;
      }).join("");
      const nowMin = 9 * 60 + 40; // the sample's “now”: twenty to ten
      const now = d === T ? `<span class="cal-now" style="--_top:calc(var(--_hour) * ${(nowMin - H0 * 60) / 60})" aria-hidden="true"></span>` : "";
      cols += `<div class="cal-col" data-col="${d}"${isOff(d) ? " data-off" : ""}>${blocks}${now}</div>`;
    }
    return `<div class="cal-time" style="--_n:${n}">${weekdayHead(start, n, "<div></div>")}
      <div class="cal-allday"><span class="cal-gutter-label">All day</span>${weekRow({ start, n, spans: spansIn(start, end), things: (d) => dayThings(d, (it) => it.allDay), dates: false, maxLanes: 6 })}</div>
      <div class="cal-hours" style="--_span-h:${H1 - H0}"><div class="cal-gutter" aria-hidden="true">${gutter}</div>${cols}</div></div>`;
  }

  // ---------- Crew: people down the side, the week across ----------
  function crewHtml() {
    const start = weekStart(st.at), end = add(start, 6);
    const people = OWNERS.filter((p) => !st.people || st.people.has(p.id));
    let rows = people.map((p) => {
      const mine = (it) => it.who.includes(p.id);
      const spans = spansIn(start, end, mine), things = (d) => dayThings(d, mine);
      let appts = 0; for (let i = 0; i < 7; i++) appts += things(add(start, i)).filter((x) => x.kind === "appt").length;
      const sum = [spans.length && `${spans.length} ${spans.length === 1 ? "phase" : "phases"}`, appts && `${appts} ${appts === 1 ? "appointment" : "appointments"}`].filter(Boolean).join(" · ") || "Nothing this week";
      return `<div class="cal-crew-row" data-person="${p.id}"><div class="cal-person">${avatar(p, "sm")}<p>${esc(p.me ? `${p.name} (you)` : p.name)}<small>${sum}</small></p></div>${weekRow({ start, spans, things, dates: false, person: p.id, lines: 5 })}</div>`;
    }).join("");
    const nobody = !st.people && st.show.job ? spansIn(start, end, (it) => !it.who.length) : [];
    if (nobody.length) rows += `<div class="cal-crew-row" data-person="none"><div class="cal-person"><span class="avatar" data-size="sm" aria-hidden="true">?</span><p>No one yet<small>${nobody.length} ${nobody.length === 1 ? "phase" : "phases"} to give someone</small></p></div>${weekRow({ start, spans: nobody, dates: false, person: "none" })}</div>`;
    return `<div class="cal-crew">${weekdayHead(start, 7, "<div>Crew</div>")}${rows}</div>`;
  }

  // ---------- phones: a week strip over an agenda of days (C-phone) ----------
  function phoneHtml() {
    const start = weekStart(st.at);
    let strip = "", days = "";
    for (let i = 0; i < 7; i++) {
      const d = add(start, i), any = spansIn(d, d).some((sp) => !isOff(d)) || dayThings(d).length > 0;
      strip += `<button type="button" data-pick-day="${d}"${d === st.at ? ' aria-current="date"' : ""}${d === T ? " data-today" : d < T ? " data-past" : ""} aria-label="${esc(f.long(d))}${any ? "" : ", nothing on"}"><small>${day(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</small><b>${day(d).getDate()}</b><i${any ? "" : " data-none"}></i></button>`;
      const spans = isOff(d) ? [] : spansIn(d, d), things = dayThings(d);
      const starts = spans.filter((sp) => sp.start === d || d === start), runs = spans.filter((sp) => !starts.includes(sp));
      const cards = [
        ...starts.map((sp) => `<button type="button" class="cal-card-item" data-item="${sp.id}" data-hue="${hueOf(sp.job)}" aria-haspopup="dialog"><b>${ic("briefcase", 16, { optical: true })}${esc(spanLabel(sp))}</b><span>${sp.start === d ? `${workDays(sp)} working ${workDays(sp) === 1 ? "day" : "days"}, to ${esc(f.short(endOf(sp)))}` : `Day ${workDayOn(sp, d)} of ${workDays(sp)}`}${sp.who.length ? ` · ${esc(together(sp.who.map((p) => nameOf(who(p)))))}` : " · No one yet"}</span></button>`),
        ...runs.map((sp) => `<button type="button" class="cal-line" data-item="${sp.id}" data-hue="${hueOf(sp.job)}" aria-haspopup="dialog">${ic("briefcase", 14)}${esc(spanLabel(sp))}, day ${workDayOn(sp, d)} of ${workDays(sp)}</button>`),
        ...things.filter((it) => !it.draft).map((it) => `<button type="button" class="cal-card-item" data-item="${it.id}" data-kind="${it.kind}" aria-haspopup="dialog"><b>${esc(nameIt(it))}</b><span>${spanOf(it)}${it.kind === "busy" ? ` · ${esc(together(it.who.map((p) => nameOf(who(p)))))}, ${esc(it.source)}` : it.place ? ` · ${esc(it.place)}` : ""}</span></button>`),
      ];
      const word = f.dayWord(d);
      days += `<section class="cal-agenda-day" id="ag-${d}" aria-labelledby="agh-${d}"><h3 id="agh-${d}"${d === T ? " data-today" : ""}>${word ? `${word} · ` : ""}${esc(f.short(d))}</h3>${cards.join("") || `<p class="cal-none">Nothing on${isOff(d) ? " · day off" : ""}</p>`}</section>`;
    }
    // the week again as a header: once the strip has scrolled away, a shorter copy comes down from the screen's top
    // edge, the width of the screen (stripHeader); only one of the two takes taps and focus at a time
    return `<div class="cal-phone"><nav class="cal-strip" aria-label="Days of the week">${strip}</nav><nav class="cal-strip" data-header aria-label="Days of the week" inert>${strip}</nav><div class="cal-agenda">${days}</div></div>`;
  }

  // ---------- drawing ----------
  const periodText = () => {
    const a = day(st.at);
    if (phone.matches || st.view === "week" || st.view === "crew") {
      const s = day(weekStart(st.at)), e = day(add(weekStart(st.at), 6)), same = s.getMonth() === e.getMonth();
      return `${s.getDate()}${same ? "" : ` ${s.toLocaleDateString("en-GB", { month: "short" })}`} – ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (st.view === "day") return a.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return a.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };
  function render() {
    const cal = $("#cal"), hoursTop = $(".cal-hours", cal)?.scrollTop || 0;
    cal.dataset.view = phone.matches ? "agenda" : st.view;
    cal.innerHTML = phone.matches ? phoneHtml() : `<div class="cal-desk">${st.view === "month" ? monthHtml() : st.view === "week" ? timeHtml(7) : st.view === "day" ? timeHtml(1) : crewHtml()}</div>`;
    if (phone.matches) stripHeader(); // a day picked from the header keeps it down
    $("#period").textContent = periodText();
    // the pickers read back their value; their names say what each picks
    const on = KINDS.filter((k) => st.show[k.key]), label = (id, name, text) => { $(`#${id}-text`).textContent = text; $(`#pick-${id}`).setAttribute("aria-label", `${name}: ${text}`); };
    label("show", "Show", on.length === KINDS.length ? "Everything" : on.length ? on.map((k) => k.label).join(", ") : "Nothing");
    label("people", "People", !st.people ? "Everyone" : together(OWNERS.filter((p) => st.people.has(p.id)).map((p) => (p.me ? "You" : p.name.split(" ")[0]))));
    $$("#views input").forEach((r) => (r.checked = r.value === st.view));
    const unscheduled = `Unscheduled, ${tray.length ? `${tray.length} ${tray.length === 1 ? "job" : "jobs"}` : "none"}`;
    $("#tray-toggle").setAttribute("aria-label", unscheduled); $("#tray-toggle").dataset.tip = unscheduled;
    renderTray();
    $("#go-today").setAttribute("aria-label", `Today, ${f.long(T)}`);
    if (cal.dataset.view === "month") fitMonth();
    const hours = $(".cal-hours", cal); if (hours) hours.scrollTop = hoursTop;
  }
  function renderTray() {
    $("#tray-list").innerHTML = tray.length ? tray.map((u) => `<li><button type="button" class="cal-tray-item" data-tray="${u.id}" data-hue="${hueOf(u.job)}" aria-haspopup="dialog"><b>${esc(u.job)}</b><span>${esc(u.phase)} · ${u.days} ${u.days === 1 ? "day" : "days"} · ${esc(u.client)}</span></button></li>`).join("")
      : `<li><p class="cal-tray-empty">Every job has its dates.</p></li>`;
    const wide = trayWide.matches;
    $("#tray").hidden = !(wide && st.trayOpen);
    $("#tray-toggle").setAttribute("aria-expanded", String(wide ? st.trayOpen : popFor?.kind === "tray"));
  }

  // ---------- changes, every one with Undo (C-move) ----------
  function change(it, mutate, message) {
    const was = JSON.stringify(it);
    mutate(it);
    render();
    say(message);
    toast(message, () => { Object.assign(it, JSON.parse(was)); render(); say("Undone"); });
  }
  const moveSpan = (sp, start) => change(sp, (x) => (x.start = start), `${spanLabel(sp)} moved to ${f.short(start)}`);
  const stretch = (sp, days) => change(sp, (x) => (x.days = days), `${spanLabel(sp)} now runs to ${f.short(add(sp.start, days - 1))}`);
  const moveThing = (it, date, from) => change(it, (x) => { const len = x.to - x.from; x.date = date; if (from != null) { x.from = from; x.to = from + len; } }, `${it.title} moved to ${f.short(date)}, ${f.time(from ?? it.from)}`);
  function giveTo(it, fromP, toP, date) {
    const msg = toP === "none" ? `${titleOf(it)} has no one yet` : `${titleOf(it)} given to ${who(toP).me ? "you" : who(toP).name}`;
    change(it, (x) => {
      let w = x.who.filter((p) => p !== fromP);
      if (toP !== "none" && !w.includes(toP)) w.push(toP);
      x.who = w;
      if (date) x.kind === "job" ? (x.start = date) : (x.date = date);
    }, date && (it.kind === "job" ? it.start : it.date) !== date ? `${msg}, ${f.short(date)}` : msg);
  }
  function schedule(u, start) {
    const sp = { id: `p${++seq}`, kind: "job", job: u.job, client: u.client, place: u.place, phase: u.phase, start, days: u.days, who: [] };
    const at = tray.indexOf(u);
    tray = tray.filter((x) => x !== u); items.push(sp);
    render();
    const message = `${u.job} scheduled from ${f.short(start)}`;
    say(message);
    toast(message, () => { items = items.filter((x) => x !== sp); tray.splice(at, 0, u); render(); say("Undone"); });
  }

  // ---------- the summary, the day's list, the pickers: one shared popover (C-open) ----------
  const pop = $("#pop");
  let popFor = null, byKey = false;
  function openPop(kind, from, fill, { start = false, label } = {}) {
    if (pop.matches(":popover-open") && popFor?.from === from && popFor.kind === kind) { pop.hidePopover(); return; }
    if (pop.matches(":popover-open")) pop.hidePopover();
    popFor = { kind, from };
    pop.dataset.kind = kind;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", label || kind);
    pop.innerHTML = fill();
    BolsterShell.hydrateIcons(pop);
    pop.showPopover();
    from?.setAttribute("aria-expanded", "true");
    BolsterShell.placePopover(pop, from, { start });
    ($("h3[tabindex]", pop) || $("input[type=radio]:checked", pop) || $("input, button:not([data-close-pop])", pop) || $("[data-close-pop]", pop))?.focus({ preventScroll: true, focusVisible: byKey });
  }
  // closing: the opener's state at once (beforetoggle, not toggle, which comes later: by then another picker
  // may own the popover, and the one that opened it would keep its open look); focus back once it's closed
  // (toggle: focusing sooner can show a tooltip while the next popover is opening), unless one has opened
  let refocus = null;
  pop.addEventListener("beforetoggle", (e) => {
    if (e.newState !== "closed") return;
    if (popFor?.kind === "create" && !keepDraft) setTimeout(() => { if (!dlgNew.open) { clearDraft(); nv = null; } }, 0);
    const from = popFor?.from; popFor = null;
    from?.setAttribute("aria-expanded", "false");
    if (from?.id === "tray-toggle") renderTray();
    refocus = from?.isConnected && (pop.contains(document.activeElement) || document.activeElement === document.body) ? from : null;
  });
  pop.addEventListener("toggle", (e) => {
    if (e.newState === "closed" && refocus?.isConnected && !pop.matches(":popover-open")) refocus.focus({ preventScroll: true });
    refocus = null;
  });
  // every popover closes from its corner as well as with Escape or a click outside
  const closeBtn = () => `<button type="button" class="button cal-pop-close" data-variant="ghost" data-size="sm" data-icon-only data-close-pop aria-label="Close" data-tip="Close">${ic("xmark", 16, { optical: true })}</button>`;
  const dd = (term, html) => `<dt>${term}</dt><dd>${html}</dd>`;
  const peopleHtml = (ids) => (ids.length ? `${faces(ids)}<span>${esc(together(ids.map((p) => nameOf(who(p)))))}</span>` : `<span class="text-secondary">No one yet</span>`);
  function summaryHtml(it) {
    if (it.kind === "job") {
      const wd = workDays(it), on = it.start <= T && endOf(it) >= T, k = workDayOn(it, T);
      return `<div class="cal-sum" data-hue="${hueOf(it.job)}"><div class="cal-sum-top"><p class="cal-sum-kind">${ic("briefcase", 14)}Job phase</p>${closeBtn()}</div>
        <h3 tabindex="-1">${esc(it.job)} · ${esc(it.phase)}</h3>
        <p class="cal-sum-when">${esc(f.short(it.start))} – ${esc(f.short(endOf(it)))}<small>${wd} working ${wd === 1 ? "day" : "days"}${on && k ? ` · day ${k} of ${wd} today` : isPast(it) ? " · done" : ""}</small></p>
        <dl>${dd("Client", esc(it.client))}${dd("Where", esc(it.place))}${dd("Crew", peopleHtml(it.who))}</dl>
        <form class="cal-sum-move" data-move="${it.id}"><div class="field" data-size="sm"><label class="field-label" for="mv-date">Starts</label><input class="input" type="date" id="mv-date" name="date" value="${it.start}" required></div><button type="submit" class="button" data-variant="secondary" data-size="sm">Move</button></form>
        <p class="cal-sum-note">It keeps its length. What follows it doesn't move yet (an open question).</p>
        <div class="cal-sum-actions"><a class="button" data-size="sm" href="../index.html#jobs">Open job</a></div></div>`;
    }
    if (it.kind === "appt") {
      const tool = (attr, icon, name) => `<button type="button" class="button cal-pop-close" data-variant="ghost" data-size="sm" data-icon-only ${attr}="${it.id}" aria-label="${name}" data-tip="${name}">${ic(icon, 16, { optical: true })}</button>`;
      return `<div class="cal-sum"><div class="cal-sum-top"><p class="cal-sum-kind">${ic("calendar-check", 14)}${esc(it.type)}</p><span class="cal-sum-tools">${tool("data-edit", "pen", "Edit")}${tool("data-delete", "trash", "Delete")}${closeBtn()}</span></div>
        <h3 tabindex="-1">${esc(it.title)}</h3>
        <p class="cal-sum-when">${esc(f.long(it.date))}<small>${spanOf(it)}</small></p>
        <dl>${it.place ? dd("Where", esc(it.place)) : ""}${it.client ? dd("Customer", esc(it.client)) : ""}${dd("With", peopleHtml(it.who))}${it.guests?.length ? dd("Guests", esc(together(it.guests))) : ""}${it.notes ? dd("Notes", esc(it.notes)) : ""}</dl>
        <form class="cal-sum-move" data-move="${it.id}"><div class="field" data-size="sm"><label class="field-label" for="mv-date">Day</label><input class="input" type="date" id="mv-date" name="date" value="${it.date}" required></div>
          <div class="field cal-move-time" data-size="sm"><label class="field-label" for="mv-time">Starts</label><input class="input" type="time" id="mv-time" name="time" step="900" value="${f.time(it.from).padStart(5, "0")}" required></div><button type="submit" class="button" data-variant="secondary" data-size="sm">Move</button></form></div>`;
    }
    return `<div class="cal-sum"><div class="cal-sum-top"><p class="cal-sum-kind">${ic("clock", 14)}Other calendar</p>${closeBtn()}</div>
      <h3 tabindex="-1">Busy</h3>
      <p class="cal-sum-when">${esc(f.long(it.date))}<small>${f.span(it.from, it.to)}</small></p>
      <dl>${dd("Who", peopleHtml(it.who))}${dd("From", esc(it.source))}</dl>
      <p class="cal-sum-note">Only the time shows: what it is stays in their own calendar, and it changes there.</p></div>`;
  }
  const openSummary = (id, from) => { const it = byId(id); openPop("summary", from, () => summaryHtml(it), { label: titleOf(it) }); pop.dataset.item = id; };
  function moreHtml(d, person) {
    const mine = person ? (it) => (person === "none" ? !it.who.length : it.who.includes(person)) : () => true;
    const spans = spansIn(d, d, mine), things = dayThings(d, mine);
    return `<div class="pop-head"><h3>${esc(f.long(d))}</h3>${closeBtn()}</div><div class="pop-body cal-day-list">${spans.map((sp) => `<button type="button" class="cal-span" data-item="${sp.id}" data-hue="${hueOf(sp.job)}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(`${spanLabel(sp)}, ${f.short(sp.start)} to ${f.short(endOf(sp))}, job phase`)}">${ic("briefcase", 12)}<span>${esc(sp.job)}<span class="cal-sub"> · ${esc(sp.phase)}</span></span></button>`).join("")}${things.map((it) => itemBtn(it)).join("")}</div>`;
  }
  function checksHtml(title, rows) {
    return `<div class="pop-head"><h3>${title}</h3>${closeBtn()}</div><div class="pop-body">${rows.map((r) => `<label class="option"><input type="checkbox" class="checkbox" ${r.attr}${r.on ? " checked" : ""}><span class="option-label"><span class="menu-icon">${r.icon}</span>${esc(r.label)}</span></label>`).join("")}</div>`;
  }
  const showHtml = () => checksHtml("Show", KINDS.map((k) => ({ attr: `data-show="${k.key}"`, on: st.show[k.key], icon: ic(k.icon, 14), label: k.label })));
  const peopleChecks = () => checksHtml("People", [OWNERS.find((p) => p.me), ...OWNERS.filter((p) => !p.me)].map((p) => ({ attr: `data-person-pick="${p.id}"`, on: !st.people || st.people.has(p.id), icon: avatar(p, "sm"), label: p.me ? `${p.name} (you)` : p.name })));
  function scheduleHtml(u) {
    return `<div class="cal-sum" data-hue="${hueOf(u.job)}"><div class="cal-sum-top"><p class="cal-sum-kind">${ic("briefcase", 14)}Unscheduled</p>${closeBtn()}</div><h3 tabindex="-1">${esc(u.job)}</h3>
      <p class="cal-sum-when">${esc(u.phase)}<small>${u.days} ${u.days === 1 ? "day" : "days"} · ${esc(u.client)}, ${esc(u.place)}</small></p>
      <form class="cal-sum-move" data-schedule="${u.id}"><div class="field" data-size="sm"><label class="field-label" for="sc-date">Start on</label><input class="input" type="date" id="sc-date" name="date" value="${st.at < T ? T : st.at}" required></div><button type="submit" class="button" data-size="sm">Schedule</button></form></div>`;
  }
  const trayListHtml = () => `<div class="pop-head"><h3>Unscheduled</h3>${closeBtn()}</div><div class="pop-body"><p class="cal-tray-help">Jobs with no dates yet. Open one to pick a start.</p><ul class="cal-tray-list">${$("#tray-list").innerHTML}</ul></div>`;

  // ---------- dragging: to another day, time or person; a bar's end to stretch it (C-move) ----------
  // Mouse and pen only: on touch a press scrolls, and phones move things in the summary (C-phone).
  let drag = null, swallow = false;
  const ghost = $("#ghost");
  function targetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const col = el?.closest?.("[data-col]");
    if (col) { const r = col.getBoundingClientRect(), hour = r.height / (H1 - H0); return { day: col.dataset.col, mins: H0 * 60 + Math.round(((y - r.top) / hour) * 60 / 15) * 15, col }; }
    const wk = el?.closest?.(".cal-week");
    if (!wk) return null;
    const r = wk.getBoundingClientRect(), n = +wk.dataset.n, i = Math.min(n - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * n)));
    return { day: add(wk.dataset.start, i), wk, person: wk.dataset.person || null };
  }
  function plan(t) {
    if (!t) return null;
    const it = drag.tray ? null : byId(drag.id);
    if (drag.mode === "resize") { const days = diff(it.start, t.day) + 1; return days >= 1 ? { days, from: it.start, to: t.day } : null; }
    if (drag.tray) { const u = tray.find((x) => x.id === drag.id); return t.col || t.wk ? { start: t.day, from: t.day, to: add(t.day, u.days - 1) } : null; }
    if (it.kind === "job") { const start = add(t.day, -drag.grab); return { start, from: start, to: endOf({ start, days: it.days }), person: t.person }; }
    const len = it.to - it.from;
    const from = t.col ? Math.min(Math.max(t.mins - drag.grabMins, H0 * 60), H1 * 60 - len) : null;
    return { date: t.day, mins: from, from: t.day, to: t.day, person: t.person };
  }
  function mark(p) {
    $$("[data-drop]").forEach((x) => x.removeAttribute("data-drop"));
    if (!p) return;
    $$(`.cal-week${drag.person ? `[data-person="${p.person || drag.person}"]` : ""} .cal-day, .cal-col`).forEach((c) => { const d = c.dataset.addDay || c.dataset.col; if (d >= p.from && d <= p.to && (!drag.person || c.closest("[data-person]")?.dataset.person === (p.person || drag.person))) c.setAttribute("data-drop", ""); });
  }
  function ghostText(p) {
    const name = drag.tray ? tray.find((x) => x.id === drag.id).job : titleOf(byId(drag.id));
    if (!p) return `<b>${esc(name)}</b><span>Drop on a day</span>`;
    const who2 = p.person && p.person !== drag.person ? ` · ${p.person === "none" ? "no one" : nameOf(who(p.person))}` : "";
    if (drag.mode === "resize") return `<b>${esc(name)}</b><span>To ${esc(f.short(p.to))}, ${p.days} ${p.days === 1 ? "day" : "days"}</span>`;
    return `<b>${esc(name)}</b><span>${esc(f.short(p.from))}${p.from !== p.to ? ` – ${esc(f.short(p.to))}` : ""}${p.mins != null ? `, ${f.time(p.mins)}` : ""}${who2}</span>`;
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch" || phone.matches) return;
    const rz = e.target.closest("[data-resize]"), el = e.target.closest(".cal-desk [data-item], [data-tray]");
    if (!rz && !el) return;
    const id = rz ? rz.dataset.resize : el.dataset.item || el.dataset.tray, it = byId(id);
    if (it?.kind === "busy" || it?.draft) return; // other calendars change there; a draft is being made
    const t0 = targetAt(e.clientX, e.clientY);
    drag = { id, x: e.clientX, y: e.clientY, started: false, el: rz ? rz.closest("[data-item]") : el, tray: !!el?.dataset.tray && !rz, mode: rz ? "resize" : "move",
      grab: it?.kind === "job" && t0 ? diff(it.start, t0.day) : 0, grabMins: it && it.kind !== "job" && t0?.mins != null ? t0.mins - it.from : 0, person: (rz || el).closest("[data-person]")?.dataset.person || null };
    if (rz) e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      drag.started = true;
      if (pop.matches(":popover-open")) pop.hidePopover();
      document.documentElement.setAttribute("data-cal-dragging", drag.mode);
      $$(`[data-item="${drag.id}"], [data-tray="${drag.id}"]`).forEach((x) => x.setAttribute("data-dragging-item", ""));
      ghost.hidden = false;
    }
    drag.plan = plan(targetAt(e.clientX, e.clientY));
    mark(drag.plan);
    ghost.innerHTML = ghostText(drag.plan);
    ghost.style.translate = `${Math.min(e.clientX + 14, innerWidth - ghost.offsetWidth - 8)}px ${e.clientY + 14}px`;
  });
  function endDrag() {
    $$("[data-drop]").forEach((x) => x.removeAttribute("data-drop"));
    $$("[data-dragging-item]").forEach((x) => x.removeAttribute("data-dragging-item"));
    document.documentElement.removeAttribute("data-cal-dragging");
    ghost.hidden = true;
    drag = null;
  }
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag, p = d.plan;
    if (!d.started) { drag = null; return; }
    swallow = true; setTimeout(() => (swallow = false), 0);
    endDrag();
    if (!p) return;
    if (d.tray) return schedule(tray.find((x) => x.id === d.id), p.start);
    const it = byId(d.id);
    if (d.mode === "resize") return p.days !== it.days && stretch(it, p.days);
    if (p.person && d.person && p.person !== d.person) return giveTo(it, d.person, p.person, it.kind === "job" ? p.start : p.date);
    if (it.kind === "job") return p.start !== it.start && moveSpan(it, p.start);
    if (p.date !== it.date || (p.mins != null && p.mins !== it.from)) moveThing(it, p.date, p.mins ?? it.from);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drag?.started) { endDrag(); say("Move cancelled"); } });
  document.addEventListener("click", (e) => { if (swallow) { swallow = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // ---------- creating (D96, I18): Bolster's own dialog (audit/patterns/create-event.md), an Event or a Sales
  // appointment, made the way Google Calendar makes one: draw it on the grid (a click, or a drag over the hours), a
  // short card beside it, More options for the whole dialog; Create event (or c) opens the dialog straight away ----------
  const NOW_MIN = 9 * 60 + 40; // the sample's “now”, as Week's line
  const LEN = 60; // the company's default length (a company setting; assumed an hour)
  const WORK = [8 * 60, 17 * 60]; // a person's work hours (a company setting; assumed 8 to 5)
  const APPT_TYPES = [["Estimate visit", 60], ["Measure", 60], ["Project consultation", 30]]; // the company's types (assumed)
  const KIND2 = [["appointment-schedule", "Sales appointment"], ["event", "Event"]]; // Bolster's order; it opens on the first
  const CUSTOMERS = [...kit.CLIENTS].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  const nextHalf = (m) => Math.floor(m / 30) * 30 + 30; // Bolster's default start: the next half hour
  const hhmm = (m) => f.time(Math.min(m, 24 * 60 - 1)).padStart(5, "0");
  const surname = (n) => n.split(" ").slice(-1)[0];
  let lastKind = "appointment-schedule";
  try { lastKind = localStorage.getItem("cal-new-kind") || lastKind; } catch {}
  // what's being made, its draft drawn on the calendar while it is
  let nv = null, draft = null, keepDraft = false, editing = null;
  const fresh = (o = {}) => ({ kind: lastKind, title: "", date: o.date || (st.at < T ? T : st.at), from: o.from ?? nextHalf(NOW_MIN), to: null, allDay: false, location: "", notes: "", guests: [],
    client: "", apptType: APPT_TYPES[0][0], with: o.person && o.person !== "none" ? o.person : "hm", address: "", anyway: false });
  const lenOf = () => (nv.kind === "event" ? LEN : APPT_TYPES.find(([t]) => t === nv.apptType)[1]);
  function syncDraft() {
    if (!nv.to || nv.to <= nv.from) nv.to = Math.min(nv.from + lenOf(), 24 * 60);
    if (editing) return; // an event being edited stays itself until it's saved
    if (!draft) { draft = { id: "draft", kind: "appt", draft: true, who: [] }; items.push(draft); }
    const c = CUSTOMERS.find((x) => x.name === nv.client);
    Object.assign(draft, { date: nv.date, from: nv.from, to: nv.kind === "event" ? nv.to : nv.from + lenOf(), allDay: nv.kind === "event" && nv.allDay,
      title: nv.kind === "event" ? nv.title : c ? `${nv.apptType} · ${surname(c.name)}` : "", who: [nv.kind === "event" ? "hm" : nv.with] });
  }
  function clearDraft(draw = true) { if (!draft) return; items = items.filter((x) => x !== draft); draft = null; if (draw) render(); }
  function startDraft(o) {
    clearDraft(false);
    nv = fresh(o);
    if (o.allDay) { nv.kind = "event"; nv.allDay = true; } // the all-day row makes an all-day event
    syncDraft(); render(); openQuick();
  }
  // the card sits beside the draft, as Google's does (a sheet on phones)
  function beside(el) {
    if (phone.matches || !el) return;
    const r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.right + 8;
    if (left + w > innerWidth - 12) left = r.left - w - 8;
    if (left < 12) left = Math.max(12, Math.min(r.left, innerWidth - w - 12));
    pop.style.left = `${left}px`; pop.style.top = `${Math.max(12, Math.min(r.top, innerHeight - h - 12))}px`;
  }
  const draftEl = () => $("#cal [data-draft]") || $(`#cal [data-add-day="${nv?.date}"]`) || $("#create");
  function openQuick() {
    const el = draftEl();
    if (pop.matches(":popover-open")) { keepDraft = true; pop.hidePopover(); keepDraft = false; }
    openPop("create", el, quickHtml, { label: "New event", start: true });
    beside(el);
    $(nv.kind === "event" ? "[name=title]" : "[name=client]", pop)?.focus();
  }
  // ---------- the forms (D96, after the event-forms research, 22 Oct): rows led by an icon instead of labelled
  // boxes, the title a large plain line, controls that read as text until pointed at (time in 15-minute lists, the
  // end saying the length), a sales appointment's times as a strip of days and only the free half hours ----------
  const KIND_ICON = { "appointment-schedule": "user", event: "calendar" };
  const kindTabs = () => `<div class="cal-tabs" role="radiogroup" aria-label="What to make">${KIND2.map(([v, l]) => `<label class="cal-tab"><input type="radio" name="kind" value="${v}"${v === nv.kind ? " checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
  const opt = (v, l, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? " selected" : ""}>${esc(l)}</option>`;
  // a picker that reads as text: the value, a small chevron after it
  const pick = (name, id, label, options, cls = "") => `<span class="cal-pick ${cls}"><label class="visually-hidden" for="${id}">${label}</label><select class="cal-txt" id="${id}" name="${name}">${options}</select>${ic("chevron-down", 12, { optical: true })}</span>`;
  const row = (icon, inner, cls = "") => `<div class="cal-row${cls ? ` ${cls}` : ""}"><span class="cal-row-icon" aria-hidden="true">${icon}</span><div class="cal-row-body">${inner}</div></div>`;
  const iconOf = (k) => ic(k, 16, { optical: true });
  const customerPick = (id) => pick("client", id, "Customer", `<option value="">Choose customer</option>${CUSTOMERS.map((c) => opt(c.name, c.name, nv.client)).join("")}<option value="+new">Create new customer…</option>`, `cal-pick-lead${nv.client ? "" : " cal-pick-empty"}`);
  const withPick = (id) => pick("with", id, "Appointment with", [OWNERS.find((p) => p.me), ...OWNERS.filter((p) => !p.me)].map((p) => opt(p.id, p.me ? `${p.name} (you)` : p.name, nv.with)).join(""));
  const typePick = (id) => pick("apptType", id, "Appointment type", APPT_TYPES.map(([t, m]) => opt(t, `${t} · ${m} min`, nv.apptType)).join(""));
  const lenText = (d) => (d < 60 ? `${d} min` : `${+(d / 60).toFixed(2)} ${d === 60 ? "hr" : "hrs"}`);
  // when: the date (it opens the browser's own picker), then from → to as lists, the end saying how long
  function whenRow(pre) {
    const ev = nv.kind === "event", all = ev && nv.allDay;
    const date = `<span class="cal-pick cal-pick-date"><button type="button" class="cal-txt" data-pick-date="${pre}-date" aria-label="Date, ${esc(f.long(nv.date))}">${esc(f.dayWord(nv.date) ? `${f.dayWord(nv.date)}, ${f.short(nv.date)}` : f.short(nv.date))}</button><input class="cal-date-input" type="date" id="${pre}-date" name="date" value="${nv.date}" tabindex="-1" aria-hidden="true"></span>`;
    const froms = Array.from({ length: 96 }, (_, i) => i * 15).map((m) => opt(m, f.time(m), nv.from)).join("");
    const tos = Array.from({ length: Math.floor((24 * 60 - 15 - nv.from) / 15) + 1 }, (_, i) => nv.from + 15 * (i + 1)).filter((m) => m < 24 * 60).map((m) => opt(m, `${f.time(m)}  (${lenText(m - nv.from)})`, nv.to)).join("");
    const time = all ? "" : `${pick("from", `${pre}-from`, "Starts", froms, "cal-pick-time")}${ev ? `<span class="cal-when-to" aria-hidden="true">→</span>${pick("to", `${pre}-to`, "Ends", tos, "cal-pick-time")}` : `<span class="cal-when-len">${lenText(lenOf())}</span>`}`;
    return row(iconOf("clock"), `${date}${time}${ev ? `<label class="cal-check"><input type="checkbox" class="checkbox" name="allDay"${nv.allDay ? " checked" : ""}> All day</label>` : ""}`, "cal-row-when");
  }
  const ghostInput = (name, id, label, placeholder, value) => `<label class="visually-hidden" for="${id}">${label}</label><input class="cal-txt cal-txt-input" id="${id}" name="${name}" value="${esc(value)}" placeholder="${placeholder}" autocomplete="off">`;
  const ghostArea = (name, id, label, placeholder, value) => `<label class="visually-hidden" for="${id}">${label}</label><textarea class="cal-txt cal-txt-input" id="${id}" name="${name}" rows="2" placeholder="${placeholder}">${esc(value)}</textarea>`;
  const titleInput = () => `<label class="visually-hidden" for="new-title-input">Title</label><input class="cal-new-title" id="new-title-input" name="title" value="${esc(nv.title)}" placeholder="Add title" autocomplete="off">`;
  // the person's own things that day, which a sales appointment shouldn't land on
  const busyAt = (person, date, a, b) => items.some((x) => !x.draft && x !== editing && x.date === date && (x.kind === "appt" || x.kind === "busy") && !x.allDay && x.who.includes(person) && x.from < b && x.to > a);
  function conflict() {
    if (nv.kind === "event") return "";
    const p = who(nv.with), a = nv.from, b = a + lenOf();
    if (a < WORK[0] || b > WORK[1]) return `Outside ${p.me ? "your" : `${p.name.split(" ")[0]}'s`} work hours (${f.time(WORK[0])}–${f.time(WORK[1])})`;
    return busyAt(nv.with, nv.date, a, b) ? `${p.me ? "You're" : `${p.name.split(" ")[0]}'s`} busy then` : "";
  }
  const withRow = (pre) => row(avatar(who(nv.with), "xs"), withPick(`${pre}-with`));
  function quickHtml() {
    const ev = nv.kind === "event", clash = conflict();
    // the tabs and the title in the rows' text column, the icons alone in the gutter (as Google's card)
    return `<form class="cal-new" data-new="quick" novalidate>${row("", kindTabs(), "cal-row-tabs")}${closeBtn()}
      ${ev ? row("", titleInput(), "cal-row-title") : row(iconOf("user"), customerPick("q-client"), "cal-row-lead")}
      ${whenRow("q")}
      ${ev ? row(iconOf("location"), ghostInput("location", "q-loc", "Location", "Add location", nv.location))
        : `${row(iconOf("tag"), typePick("q-type"))}${withRow("q")}${clash ? `<p class="cal-new-note" data-tone="warning">${esc(clash)}. You can still book it.</p>` : ""}`}
      <p class="cal-new-error" role="alert" hidden></p>
      <div class="cal-new-actions"><button type="button" class="button" data-variant="ghost" data-size="sm" data-more-options>More options</button><button type="submit" class="button" data-size="sm">${ev ? "Save" : clash ? "Book anyway" : "Schedule"}</button></div></form>`;
  }
  // the whole dialog: Bolster's fields, the same rows
  const dlgNew = $("#new-event");
  // a sales appointment's times: the week's days as a strip, the picked day's free half hours (busy ones too with
  // Book anyway, struck)
  function timesHtml() {
    const start = weekStart(nv.date), len = lenOf();
    const days = Array.from({ length: 7 }, (_, i) => add(start, i)).map((d) => {
      let free = 0; for (let m = WORK[0]; m + len <= WORK[1]; m += 30) if (!busyAt(nv.with, d, m, m + len)) free++;
      // past days and days off can't be picked, unless it's the day already picked (a past slot clicked, an edit)
      const off = (d < T || isOff(d)) && d !== nv.date;
      return `<button type="button" class="cal-slot-day" data-slot-day="${d}"${d === nv.date ? ' aria-pressed="true"' : ""}${off ? " disabled" : ""} aria-label="${esc(`${f.long(d)}${off ? "" : `, ${free} free`}`)}"><small>${day(d).toLocaleDateString("en-GB", { weekday: "short" })}</small><b>${day(d).getDate()}</b></button>`;
    }).join("");
    const slots = [];
    for (let m = WORK[0]; m + len <= WORK[1]; m += 30) {
      const busy = busyAt(nv.with, nv.date, m, m + len);
      if (busy && !nv.anyway) continue;
      slots.push(`<label class="cal-slot"${busy ? " data-busy" : ""}><input type="radio" name="slot" value="${m}"${m === nv.from ? " checked" : ""}><span>${f.time(m)}</span></label>`);
    }
    const p = who(nv.with);
    return `<div class="cal-slot-head"><p>${esc(f.long(nv.date))}</p><span><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-slot-week="-1" aria-label="Previous week" data-tip="Previous week">${ic("chevron-left", 16, { optical: true })}</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-slot-week="1" aria-label="Next week" data-tip="Next week">${ic("chevron-right", 16, { optical: true })}</button></span></div>
      <div class="cal-slot-days">${days}</div><input type="hidden" name="date" value="${nv.date}">
      ${slots.length ? `<div class="cal-slots" role="radiogroup" aria-label="Available times">${slots.join("")}</div>` : `<p class="cal-new-note">${isOff(nv.date) ? "A day off." : "No available times for this day."}</p>`}
      <label class="cal-check cal-anyway"><input type="checkbox" class="checkbox" name="anyway"${nv.anyway ? " checked" : ""}> Book anyway<span>Shows ${p.me ? "your" : `${esc(p.name.split(" ")[0])}'s`} busy times too, within ${p.me ? "your" : "their"} work hours</span></label>`;
  }
  function fullHtml() {
    const ev = nv.kind === "event", c = CUSTOMERS.find((x) => x.name === nv.client);
    if (!ev && c && !nv.address) nv.address = c.address;
    const me = OWNERS.find((p) => p.me);
    const guests = `<div class="cal-guests">${nv.guests.map((g, i) => `<span class="cal-guest">${esc(g)}<button type="button" data-guest-remove="${i}" aria-label="${esc(`Remove ${g}`)}" data-tip="Remove">${ic("xmark", 12, { optical: true })}</button></span>`).join("")}<label class="visually-hidden" for="f-guest">Guests</label><input class="cal-guest-input" id="f-guest" list="f-guest-list" placeholder="${nv.guests.length ? "Add another" : "Add customers or email addresses"}" autocomplete="off" enterkeyhint="done"></div>
      <datalist id="f-guest-list">${[...OWNERS.filter((p) => !p.me).map((p) => p.name), ...CUSTOMERS.map((x) => x.name)].map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
    return `<form class="cal-new-full" data-new="full" novalidate><header class="dialog-header"><h2 id="new-event-title">${editing ? "Edit" : "New"} ${ev ? "event" : "sales appointment"}</h2><button type="button" class="button" data-variant="ghost" data-icon-only data-close-new aria-label="Close" data-tip="Close">${ic("xmark", 16, { optical: true })}</button></header>
      <div class="dialog-body">${editing ? "" : row("", kindTabs(), "cal-row-tabs")}
      ${ev ? `${row("", titleInput(), "cal-row-title")}
        ${whenRow("f")}
        ${row(iconOf("users"), guests)}
        ${row(iconOf("location"), ghostInput("location", "f-loc", "Location", "Add location", nv.location))}
        ${row(iconOf("text"), ghostArea("notes", "f-notes", "Description", "Add description", nv.notes))}
        ${row(avatar(me, "xs"), `<p class="cal-new-owner"><b>${esc(me.name)}</b><span>Busy · Default visibility · Notify 30 minutes before</span></p>`)}`
      : `${row(iconOf("user"), customerPick("f-client"), "cal-row-lead")}
        ${row(iconOf("tag"), typePick("f-type"))}
        ${withRow("f")}
        ${row(iconOf("clock"), timesHtml(), "cal-row-times")}
        ${row(iconOf("location"), `${ghostInput("address", "f-addr", "Site visit address", "Site visit address", nv.address)}${c && !c.address ? '<p class="cal-new-note" data-tone="warning">This customer has no address saved.</p>' : ""}`)}
        ${row(iconOf("text"), ghostArea("notes", "f-notes", "Additional notes", "Add any additional information…", nv.notes))}`}
      <p class="cal-new-error" role="alert" hidden></p></div>
      <footer class="dialog-footer">${editing ? `<button type="button" class="button cal-new-delete" data-variant="ghost" data-delete="${editing.id}">Delete</button>` : ""}<button type="button" class="button" data-variant="ghost" data-close-new>Cancel</button><button type="submit" class="button">${ev || editing ? "Save" : "Schedule appointment"}</button></footer></form>`;
  }
  let saved = false;
  function openFull(seed) {
    if (!nv || seed) { clearDraft(false); nv = fresh(seed); }
    if (pop.matches(":popover-open")) { keepDraft = true; pop.hidePopover(); keepDraft = false; }
    saved = false;
    syncDraft(); render();
    dlgNew.innerHTML = fullHtml();
    BolsterShell.hydrateIcons(dlgNew);
    dlgNew.showModal();
    $(nv.kind === "event" ? "[name=title]" : "[name=client]", dlgNew)?.focus();
  }
  dlgNew.addEventListener("close", () => { if (!saved) { clearDraft(); nv = null; } editing = null; });
  // editing: the event's own values in the dialog; a sales appointment is one with a customer
  function openEdit(it) {
    if (pop.matches(":popover-open")) pop.hidePopover();
    clearDraft(false);
    editing = it; saved = false;
    const sales = !!it.client, type = it.title.split(" · ")[0];
    nv = { ...fresh({ date: it.date, from: it.from }), kind: sales ? "appointment-schedule" : "event", title: it.title === "(No title)" ? "" : it.title, to: it.to, allDay: !!it.allDay,
      location: sales ? "" : it.place || "", notes: it.notes || "", guests: [...(it.guests || [])], client: it.client || "", apptType: APPT_TYPES.some(([t]) => t === type) ? type : APPT_TYPES[0][0],
      with: it.who[0] || "hm", address: sales ? it.place || "" : "", anyway: true };
    dlgNew.innerHTML = fullHtml();
    BolsterShell.hydrateIcons(dlgNew);
    dlgNew.showModal();
    $(sales ? "[name=client]" : "[name=title]", dlgNew)?.focus();
  }
  // deleting: at once, with Undo (Google's way); a job's phases change in the job, busy time in its own calendar
  function removeItem(it) {
    const at = items.indexOf(it);
    if (pop.matches(":popover-open")) pop.hidePopover();
    if (dlgNew.open) { saved = true; dlgNew.close(); }
    items = items.filter((x) => x !== it);
    render();
    const message = `${it.client ? "Appointment" : "Event"} deleted: ${it.title}`;
    say(message);
    toast(message, () => { items.splice(at, 0, it); render(); say("Undone"); });
  }
  // read what's in a form into what's being made
  function read(form, changed = "") {
    const v = Object.fromEntries(new FormData(form));
    if (v.kind) { if (v.kind !== nv.kind) { nv.kind = v.kind; lastKind = v.kind; try { localStorage.setItem("cal-new-kind", v.kind); } catch {} } }
    if ("title" in v) nv.title = v.title;
    if (v.date) nv.date = v.date;
    if (v.from != null && v.from !== "") {
      const len = nv.to - nv.from;
      nv.from = +v.from;
      // a new start keeps the length; a new end is the end
      nv.to = changed === "from" || !v.to ? nv.from + len : +v.to;
      if (nv.to <= nv.from) nv.to = nv.from + 15;
      nv.to = Math.min(nv.to, 24 * 60 - 1);
    } else if (v.slot) nv.from = +v.slot;
    nv.allDay = !!v.allDay && nv.kind === "event";
    for (const k of ["location", "notes", "apptType", "with", "address"]) if (k in v) nv[k] = v[k];
    if ("client" in v) {
      if (v.client === "+new") { toast("Concept only: Create new customer isn't wired up."); }
      else { if (v.client !== nv.client) nv.address = CUSTOMERS.find((x) => x.name === v.client)?.address || ""; nv.client = v.client; }
    }
    nv.anyway = !!v.anyway;
    syncDraft();
  }
  function showError(form, text) { const e = $(".cal-new-error", form); e.textContent = text; e.hidden = !text; }
  function create(form) {
    read(form);
    if (nv.kind === "appointment-schedule" && !nv.client) return showError(form, "Choose a customer for the sales appointment.");
    if (nv.kind === "event" && !nv.allDay && nv.to <= nv.from) return showError(form, "Choose a valid date and time.");
    const ev = nv.kind === "event", c = CUSTOMERS.find((x) => x.name === nv.client);
    if (editing) {
      const it = editing, len = lenOf();
      saved = true; dlgNew.close();
      return change(it, (x) => Object.assign(x, ev
        ? { title: nv.title.trim() || "(No title)", place: nv.location.trim(), date: nv.date, from: nv.allDay ? 0 : nv.from, to: nv.allDay ? 24 * 60 - 1 : nv.to, allDay: nv.allDay, guests: [...nv.guests], notes: nv.notes.trim() }
        : { title: `${nv.apptType} · ${surname(c.name)}`, place: nv.address.trim(), date: nv.date, from: nv.from, to: nv.from + len, who: [nv.with], client: c.name, notes: nv.notes.trim() }),
        `${ev ? "Event" : "Appointment"} saved: ${ev ? nv.title.trim() || "(No title)" : `${nv.apptType} · ${surname(c.name)}`}`);
    }
    const it = ev ? { id: `a${++seq}`, kind: "appt", type: "Event", title: nv.title.trim() || "(No title)", place: nv.location.trim(), date: nv.date, from: nv.allDay ? 0 : nv.from, to: nv.allDay ? 24 * 60 - 1 : nv.to, allDay: nv.allDay, who: ["hm"], guests: [...nv.guests], notes: nv.notes.trim() }
      : { id: `a${++seq}`, kind: "appt", type: "Site visit", title: `${nv.apptType} · ${surname(c.name)}`, place: nv.address.trim(), date: nv.date, from: nv.from, to: nv.from + lenOf(), who: [nv.with], client: c.name, notes: nv.notes.trim() };
    saved = true;
    clearDraft(false); nv = null;
    if (pop.matches(":popover-open")) { keepDraft = true; pop.hidePopover(); keepDraft = false; }
    if (dlgNew.open) dlgNew.close();
    items.push(it);
    // show what was made where it went: its day, in the view you're in
    st.at = it.date; render();
    const message = ev ? `Event created: ${it.title}, ${f.short(it.date)}${it.allDay ? "" : `, ${f.time(it.from)}`}` : `Appointment scheduled: ${it.title}, ${f.short(it.date)}, ${f.time(it.from)}`;
    say(message);
    toast(message, () => { items = items.filter((x) => x !== it); render(); say("Undone"); });
  }
  // drawing it: a drag over the hours in Week and Day sets its start and end, 15 minutes at a time
  let making = null;
  const minsAt = (col, y) => { const r = col.getBoundingClientRect(); return H0 * 60 + ((y - r.top) / r.height) * (H1 - H0) * 60; };
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch" || phone.matches) return;
    const col = e.target.closest?.(".cal-desk [data-col]");
    if (!col || e.target !== col) return;
    making = { day: col.dataset.col, a: Math.floor(minsAt(col, e.clientY) / 15) * 15, y: e.clientY, moved: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (!making) return;
    if (!making.moved) {
      if (Math.abs(e.clientY - making.y) < 5) return;
      making.moved = true;
      if (pop.matches(":popover-open")) pop.hidePopover();
      clearDraft(false); nv = fresh({ date: making.day, from: making.a });
      document.documentElement.setAttribute("data-cal-dragging", "make");
    }
    const col = $(`.cal-desk [data-col="${making.day}"]`);
    const b = Math.max(H0 * 60, Math.min(H1 * 60 - 15, Math.floor(minsAt(col, e.clientY) / 15) * 15));
    const from = Math.min(making.a, b), to = Math.max(making.a, b) + 15;
    if (from === nv.from && to === nv.to) return;
    nv.from = from; nv.to = to; nv.kind = "event"; syncDraft(); render();
  });
  document.addEventListener("pointerup", () => {
    if (!making) return;
    const m = making; making = null;
    if (!m.moved) return; // a click: the click handler starts the draft at the half hour
    document.documentElement.removeAttribute("data-cal-dragging");
    swallow = true; setTimeout(() => (swallow = false), 0);
    openQuick();
  });
  // Google's keys: Delete (or Backspace) on an event's summary deletes it, with Undo
  document.addEventListener("keydown", (e) => {
    if (!["Delete", "Backspace"].includes(e.key) || popFor?.kind !== "summary" || e.target.closest?.("input, textarea, select")) return;
    const it = byId(pop.dataset.item);
    if (it?.kind !== "appt") return;
    e.preventDefault(); removeItem(it);
  });
  // Google's key: c creates
  document.addEventListener("keydown", (e) => {
    if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
    e.preventDefault(); openFull({});
  });
  // the card and the dialog: what changes, redraws the draft; switching what's made redraws the form
  document.addEventListener("input", (e) => {
    const form = e.target.closest?.("[data-new]");
    if (!form || e.target.name === "title" && form.dataset.new === "quick") { if (form) { nv.title = e.target.value; syncDraft(); const d = $("#cal [data-draft] b, #cal [data-draft] span:last-child"); if (d) d.textContent = nv.title || "(No title)"; } return; }
  });
  document.addEventListener("change", (e) => {
    const form = e.target.closest?.("[data-new]");
    if (!form) return;
    read(form, e.target.name);
    // typing only needs reading: a redraw on its change (which comes as you leave the field, say for Save) would
    // swap the button under the pointer
    if (e.target.matches("input[type=text], input:not([type]), input[type=search], textarea")) return;
    render();
    if (form.dataset.new === "quick") { pop.innerHTML = quickHtml(); BolsterShell.hydrateIcons(pop); popFor.from = draftEl(); beside(popFor.from); $(`[name="${e.target.name}"]`, pop)?.focus(); }
    else { const keep = e.target.name; dlgNew.innerHTML = fullHtml(); BolsterShell.hydrateIcons(dlgNew); $(`[name="${keep}"]${e.target.type === "radio" ? ":checked" : ""}`, dlgNew)?.focus(); }
  });
  document.addEventListener("keydown", (e) => {
    const inp = e.target.closest?.(".cal-guest-input");
    if (!inp) return;
    const v = inp.value.trim();
    if (e.key === "Enter") {
      e.preventDefault();
      if (!v) return;
      const known = [...OWNERS.map((p) => p.name), ...CUSTOMERS.map((x) => x.name)].find((n) => n.toLowerCase() === v.toLowerCase());
      if (!known && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return showError(dlgNew.querySelector("form"), "Select a customer or enter a valid email address.");
      read(dlgNew.querySelector("form")); nv.guests.push(known || v);
    } else if (e.key === "Backspace" && !v && nv.guests.length) { read(dlgNew.querySelector("form")); nv.guests.pop(); }
    else return;
    dlgNew.innerHTML = fullHtml(); BolsterShell.hydrateIcons(dlgNew); $(".cal-guest-input", dlgNew).focus();
  });
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-new]");
    if (!form) return;
    e.preventDefault(); e.stopImmediatePropagation();
    create(form);
  }, true);
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-more-options]")) { read(e.target.closest("form")); return openFull(); }
    if (e.target.closest("[data-close-new]")) return dlgNew.close();
    const pd = e.target.closest("[data-pick-date]");
    if (pd) { const inp = document.getElementById(pd.dataset.pickDate); try { inp.showPicker(); } catch { inp.focus(); } return; }
    const sd = e.target.closest("[data-slot-day]"), sw = e.target.closest("[data-slot-week]");
    if (sd || sw) {
      read(dlgNew.querySelector("form"));
      if (sd) nv.date = sd.dataset.slotDay;
      else { const d = add(nv.date, 7 * +sw.dataset.slotWeek); nv.date = d < T ? T : d; }
      syncDraft(); render();
      dlgNew.innerHTML = fullHtml(); BolsterShell.hydrateIcons(dlgNew);
      (sd ? $(`[data-slot-day="${nv.date}"]`, dlgNew) : $(`[data-slot-week="${sw.dataset.slotWeek}"]`, dlgNew))?.focus();
      return;
    }
    const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
    if (ed) return openEdit(byId(ed.dataset.edit));
    if (del) return removeItem(byId(del.dataset.delete));
    const rm = e.target.closest("[data-guest-remove]");
    if (rm) { read(dlgNew.querySelector("form")); nv.guests.splice(+rm.dataset.guestRemove, 1); dlgNew.innerHTML = fullHtml(); BolsterShell.hydrateIcons(dlgNew); $(".cal-guest-input", dlgNew).focus(); }
  });

  // ---------- events ----------
  function go(dir) {
    if (phone.matches || st.view === "week" || st.view === "crew") st.at = add(st.at, 7 * dir);
    else if (st.view === "day") st.at = add(st.at, dir);
    else { const a = day(st.at); st.at = iso(new Date(a.getFullYear(), a.getMonth() + dir, 1)); }
    render();
  }
  document.addEventListener("click", (e) => {
    const q = (s) => e.target.closest(s);
    let el;
    byKey = e.detail === 0; // a click from Enter or Space, not a pointer
    if (q("[data-close-pop]")) return pop.hidePopover();
    if (q("#go-prev")) return go(-1);
    if (q("#go-next")) return go(1);
    if (q("#go-today")) { st.at = T; render(); if (phone.matches) $(`#ag-${T}`)?.scrollIntoView({ block: "start" }); return; }
    if ((el = q("[data-pick-day]"))) { st.at = el.dataset.pickDay; render(); $(`#ag-${st.at}`)?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); return; }
    if ((el = q("#pick-show"))) return openPop("show", el, showHtml, { label: "Show" });
    if ((el = q("#pick-people"))) return openPop("people", el, peopleChecks, { label: "People" });
    if ((el = q("#tray-toggle"))) {
      if (trayWide.matches) { st.trayOpen = !st.trayOpen; keepTray(); return renderTray(); }
      return openPop("tray", el, trayListHtml, { label: "Unscheduled" });
    }
    if (q("[data-close-tray]")) { st.trayOpen = false; keepTray(); renderTray(); return $("#tray-toggle").focus(); }
    if ((el = q("[data-tray]"))) { const u = tray.find((x) => x.id === el.dataset.tray); return openPop("schedule", trayWide.matches ? el : $("#tray-toggle"), () => scheduleHtml(u), { label: `Schedule ${u.job}` }); }
    if ((el = q("[data-more]"))) { const d = el.dataset.more, person = el.dataset.person; return openPop("more", el, () => moreHtml(d, person), { start: true, label: f.long(d) }); }
    if (q("[data-draft]")) return openQuick();
    if ((el = q("[data-item]"))) { const from = pop.contains(el) && popFor ? popFor.from : el; if (pop.contains(el)) pop.hidePopover(); return openSummary(el.dataset.item, from.isConnected ? from : el); }
    if ((el = q("[data-add-day]"))) return startDraft({ date: el.dataset.addDay, person: el.closest("[data-person]")?.dataset.person, allDay: !!el.closest(".cal-allday") });
    if ((el = q(".cal-desk [data-col]")) && e.target === el) { const r = el.getBoundingClientRect(), hour = r.height / (H1 - H0); return startDraft({ date: el.dataset.col, from: H0 * 60 + Math.floor(((e.clientY - r.top) / hour) * 2) * 30 }); }
    if (q("#create")) return openFull({});
  });
  $("#views").addEventListener("change", (e) => { st.view = e.target.value; try { localStorage.setItem("cal-view", st.view); } catch {} render(); });
  document.addEventListener("change", (e) => {
    const s = e.target.closest("[data-show]");
    if (s) { st.show[s.dataset.show] = s.checked; render(); popFor.from = $("#pick-show"); popFor.from.setAttribute("aria-expanded", "true"); return; }
    const p = e.target.closest("[data-person-pick]");
    if (p) {
      const ids = $$("[data-person-pick]", pop).filter((x) => x.checked).map((x) => x.dataset.personPick);
      // none, or all of them, is everyone
      st.people = ids.length && ids.length < OWNERS.length ? new Set(ids) : null;
      render(); popFor.from = $("#pick-people"); popFor.from.setAttribute("aria-expanded", "true"); return;
    }
  });
  document.addEventListener("submit", (e) => {
    const mv = e.target.closest("[data-move]"), sc = e.target.closest("[data-schedule]");
    if (!mv && !sc) return;
    e.preventDefault();
    const date = e.target.date.value;
    if (!date) return;
    pop.hidePopover();
    if (sc) return schedule(tray.find((x) => x.id === sc.dataset.schedule), date);
    const it = byId(mv.dataset.move);
    if (it.kind === "job") { if (date !== it.start) moveSpan(it, date); return; }
    const from = minutes(e.target.time.value);
    if (date !== it.date || from !== it.from) moveThing(it, date, from);
  });
  const trayWide = matchMedia("(min-width: 1024px)");
  phone.addEventListener("change", render);
  trayWide.addEventListener("change", renderTray);
  finePointer.addEventListener("change", render);
  addEventListener("resize", () => { fitMonth(); if (popFor) BolsterShell.placePopover(pop, popFor.from); });

  // what hides and sticks as you scroll is the shell's (BolsterShell.scrolling): this page says where the
  // calendar starts, and that a drag counts as in use
  BolsterShell.scrolling({ into: (top) => $("#cal").getBoundingClientRect().top < top, busy: () => !!drag?.started });
  // phones: the week's header shows once the strip's days have gone under the top of the screen
  const stripHeader = () => {
    const full = $(".cal-strip:not([data-header])"), head = $(".cal-strip[data-header]");
    if (!full || !head) return;
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--list-toolbar-top")) || 0;
    const on = full.getBoundingClientRect().bottom < top + head.offsetHeight * 0.5;
    if (on === head.hasAttribute("data-shown")) return;
    head.toggleAttribute("data-shown", on); head.inert = !on; full.inert = on;
  };
  addEventListener("scroll", stripHeader, { passive: true });
  render();
  // on phones the agenda opens at today, earlier days a scroll up
  // (after load: the browser puts a reloaded page back where it was, after this script runs)
  if (phone.matches) { history.scrollRestoration = "manual"; addEventListener("load", () => $(`#ag-${T}`)?.scrollIntoView({ block: "start" })); }
})();
