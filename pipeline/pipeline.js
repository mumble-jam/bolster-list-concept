// Pipeline concept: direction A of the “Pipeline boards · research” board (Figma, 21 Oct), “One lifecycle, made
// honest”: one board from the first enquiry to the paid invoice, people (leads, their visits) on one side and jobs
// on the other, said plainly; stages as shapes, colour only for the job's own and for stuck; the next step on
// every card; moving by dragging, where a stage that needs something asks for it. Made-up data.
(() => {
  const { TODAY, esc, fmt, kit } = window.BDS_CONCEPT;
  const { OWNERS, avatar } = kit;
  const ic = (n, s = 16, o) => window.BolsterIcons(n, s, o);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const say = (t) => { $("#live").textContent = t; };

  BolsterShell.mount({ current: "pipeline", links: { pipeline: "index.html", calendar: "../calendar/", timeline: "../timeline/", tasks: "../tasks/", "job-list": "../index.html#jobs", "vendor-orders": "../index.html?d=pages/list/vendor-orders.json", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog" } });

  // ---------- days: offsets from today; ISO only where a date field needs one ----------
  const DAY = 864e5;
  const dateOf = (n) => new Date(+TODAY + n * DAY);
  const iso = (n) => { const d = dateOf(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const offset = (s) => Math.round((new Date(`${s}T12:00:00`) - TODAY) / DAY);
  const short = (n) => (n === 0 ? "today" : n === 1 ? "tomorrow" : dateOf(n).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }));
  // times are 12-hour, for North America (your call, 22 Oct): lowercase, a space before am or pm, no “:00” on the hour
  // (“9 am”, “1:30 pm”, “12 pm”); kept as “13:30” underneath, for sorting and the pickers' values
  const clock = (t) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`; };
  const ago = (n) => (n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const money = (n) => fmt.whole(n);
  const who = (id) => OWNERS.find((o) => o.id === id);
  const nameOf = (p) => (p.me ? "You" : p.name);

  // ---------- the stages: two kinds of record (P-kinds), each stage's groups in the order they need doing (P-groups) ----------
  // three kinds of record (your answers, 21 and 22 Oct): people (a customer's record, no job yet), jobs, and invoices,
  // each with its own window. A job's stage is drawn with the job list's marks (D49), filling a quarter at a time; a
  // person's or an invoice's with an icon
  const STAGES = [
    { key: "leads", label: "Leads", kind: "person", icon: "user", groups: [["new", "New"], ["talking", "Talking"]] },
    { key: "visits", label: "Appointments", kind: "person", icon: "calendar-check", groups: [["visited", "Visited"], ["today", "Today"], ["coming", "Coming up"]] },
    { key: "pending", label: "Pending", kind: "job", mark: "quarter", dot: "var(--color-status-pending-mark)", groups: [["drafts", "Drafts"], ["unsent", "Never sent"], ["changed", "Changes not sent yet"], ["sent", "Sent"]] },
    { key: "booked", label: "Booked", kind: "job", mark: "half", dot: "var(--color-status-booked-dot)", groups: [["unscheduled", "Not scheduled"], ["scheduled", "Scheduled"]] },
    { key: "progress", label: "In progress", kind: "job", mark: "three", dot: "var(--color-status-in-progress-mark)", groups: [["done", "Work done"], ["underway", "Underway"]] },
    { key: "invoices", label: "Getting paid", kind: "invoice", icon: "file-invoice", groups: [["overdue", "Overdue"], ["unsent", "Not sent"], ["sent", "Sent"], ["paid", "Paid"]] },
  ];
  // what's lost waits in a column of its own after the last stage, out of the flow, shown only when Show asks for it
  // (P-closed, your call, 22 Oct): its groups are what it was, a lead or a job, since that's where it would reopen
  const LOST = { key: "lost", label: "Lost", kind: "lost", icon: "ban", groups: [["person", "Leads"], ["job", "Jobs"]] };
  const stageOf = (key) => (key === "lost" ? LOST : STAGES.find((s) => s.key === key));
  const groupLabel = (r) => stageOf(r.stage).groups.find(([g]) => g === r.group)[1];

  // ---------- sample: at is the day it got where it is (0 today, -3 three days ago) ----------
  let seq = 0;
  const person = (stage, group, name, ask, place, source, at, owner, extra = {}) => ({ id: `r${++seq}`, kind: "person", stage, group, name, ask, place, source, at, owner, ...extra });
  const job = (stage, group, name, client, place, value, at, owner, extra = {}) => ({ id: `r${++seq}`, kind: "job", stage, group, name, client, place, value, at, owner, ...extra });
  // an invoice is named by its client, then its number and its job (as the invoices list has it)
  let invNo = 1046;
  const invoice = (group, client, jobName, place, value, at, owner, { label, due } = {}) => ({ id: `r${++seq}`, kind: "invoice", stage: "invoices", group, name: client, client, job: jobName, number: `#${invNo++}`, label, place, value, at, owner, due });
  let records = [
    person("leads", "new", "Joe Johnson", "Basement, about 900 sq ft to hang and finish", "4 Alder Way", "Website", 0, "hm"),
    person("leads", "new", "Elena Sorensen", "Soundproofing a home office", "19 Summit Avenue", "Google", -3, "dc"),
    person("leads", "talking", "Kenji Tran", "Garage ceiling with a water stain", "8 Willow Way", "Referral, from the Hales", -1, "hm"),
    person("leads", "talking", "Harbor View HOA", "Hallway patching on three floors", "1 Harbor Road", "Repeat client", -5, "mr"),
    // the calendar's estimate visits and measures: the same people, the same times
    person("visits", "visited", "Cameron Ashby", "Kitchen drywall after a remodel", "60 Oak Avenue", "Home Depot", -2, "hm", { visit: { day: -2, time: "10:00", what: "Estimate visit" } }),
    person("visits", "today", "Lucia Delgado", "Kitchen ceiling, cracks along the seams", "7 Pine Court", "Website", 0, "hm", { visit: { day: 0, time: "9:00", what: "Estimate visit" } }),
    person("visits", "coming", "Drew Whitaker", "Attic insulation, R-49", "22 Ridge Road", "Google", -1, "hm", { visit: { day: 4, time: "10:00", what: "Measure" } }),
    person("visits", "coming", "Sage Fontaine", "Bathroom, moisture-resistant board", "5 Lake Drive", "Yard sign", -2, "hm", { visit: { day: 5, time: "8:30", what: "Measure" } }),
    job("pending", "drafts", "Ceiling repair", "Okafor", "33 Mill Lane", 0, -1, "dc"),
    job("pending", "drafts", "Spray foam", "Abernathy", "70 Orchard Lane", 6850, -3, "pn"),
    job("pending", "unsent", "Bathroom remodel", "Pike", "12 Lakeview Drive", 14200, -4, "hm"),
    job("pending", "changed", "Kitchen drywall", "Ferreira", "51 Elm Avenue", 9480, -2, "dc"),
    job("pending", "sent", "Blown-in insulation", "Mbeki", "6 Birch Street", 3950, -2, "mr"),
    job("pending", "sent", "Gym acoustic panels", "Brightwater Schools", "300 School Road", 186400, -5, "hm"),
    job("pending", "sent", "Skim coat", "Hollis", "27 Pine Court", 2600, -9, "pn"),
    // the calendar's jobs: booked ones on their days, the unscheduled tray's here with no dates
    job("booked", "unscheduled", "Water damage repair", "Calloway", "17 Bay Street", 11900, -1, "hm"),
    job("booked", "unscheduled", "Popcorn ceiling removal", "Lindqvist", "31 Cedar Street", 4100, -3, "dc"),
    job("booked", "unscheduled", "Crawl space insulation", "Marsh", "12 Fern Road", 5600, -12, "pn"),
    job("booked", "scheduled", "Basement finish", "Brennan", "3 Elm Street", 18600, -6, "pn", { start: 4, end: 20 }),
    job("booked", "scheduled", "Stairwell skim coat", "Galloway", "9 Mill Lane", 2150, -8, "mr", { start: 6, end: 7 }),
    job("booked", "scheduled", "Office build-out", "Northgate Property Group", "200 Harbor Way, suite 4", 64800, -14, "mr", { start: 12, end: 22 }),
    job("booked", "scheduled", "Fire-rated walls", "Pinecrest Builders", "Lot 12, Pinecrest", 22300, -10, "dc", { start: 19, end: 21 }),
    job("progress", "done", "Garage drywall", "Ortiz", "88 Quarry Road", 8400, -2, "pn", { start: -9, end: -2 }),
    job("progress", "underway", "Lakeside kitchen", "Hale residence", "14 Birch Lane", 27450, -3, "mr", { start: -3, end: 13 }),
    job("progress", "underway", "Attic insulation", "Novak", "41 Hill Road", 4800, 0, "dc", { start: 0, end: 1 }),
    invoice("overdue", "Oakline Rentals", "Unit turnover drywall", "Unit 3B, 40 River Road", 12940, -23, "hm", { label: "Final invoice", due: -9 }),
    invoice("unsent", "Ruiz-Ortega", "Basement soundproofing", "9 Summit Avenue", 9300, 0, "mr", { label: "Final invoice" }),
    invoice("sent", "Summit Dental Studio", "Treatment rooms soundproofing", "2 Main Street", 7200, -8, "dc", { label: "Progress invoice", due: 6 }),
    invoice("paid", "Kowalski", "Skylight drywall return", "60 Hillcrest Road", 1850, -2, "pn", { label: "Final invoice" }),
  ];
  // what left the board (P-closed), with its reason, to reopen
  let lost = [
    { rec: job("pending", "sent", "Ceiling tiles", "Fairview Café", "8 Market Square", 5400, -20, "dc"), reason: "Went with someone else", at: -6 },
    { rec: person("leads", "talking", "Morgan Reese", "Garage insulation, one wall", "3 Quarry Road", "Google", -15, "pn"), reason: "Not a fit", at: -12 },
  ];
  const lostOf = (r) => lost.find((x) => x.rec === r);
  const byId = (id) => records.find((r) => r.id === id) || lost.find((x) => x.rec.id === id)?.rec;

  // ---------- what a card says about time, and when it's stuck (P-stuck) ----------
  // stuck turns the line red and says what's waiting; the limits are the company's to set, assumed here
  const LIMIT = { "leads/new": 2, "visits/visited": 2, "pending/unsent": 3, "pending/sent": 7, "booked/unscheduled": 7, "progress/done": 3 };
  // on the card, short: what's waiting and for how long, the same shape everywhere ("No reply, 9 days"); the summary
  // says it in full
  function when(r, full = false) {
    const n = -r.at, over = n >= (LIMIT[`${r.stage}/${r.group}`] ?? Infinity);
    const late = (text, long) => ({ text: full ? long : text, late: true }), ok = (text) => ({ text, late: false });
    const days = (k) => `${k} ${k === 1 ? "day" : "days"}`;
    switch (`${r.stage}/${r.group}`) {
      case "leads/new": return over ? late(`Not contacted, ${days(n)}`, `New ${ago(n)}, not contacted yet`) : ok(`New ${ago(n)}`);
      case "leads/talking": return ok(`Contacted ${ago(n)}`);
      case "visits/visited": return over ? late(`No job, ${days(n)}`, `Visited ${ago(n)}, no job yet`) : ok(`Visited ${ago(n)}`);
      case "visits/today": return ok(full ? `${r.visit.what} today, ${clock(r.visit.time)}` : `Today, ${clock(r.visit.time)}`);
      case "visits/coming": return ok(full ? `${r.visit.what} ${short(r.visit.day)}, ${clock(r.visit.time)}` : `${cap(short(r.visit.day))}, ${clock(r.visit.time)}`);
      case "pending/drafts": return ok(`Started ${ago(n)}`);
      case "pending/unsent": return over ? late(`Not sent, ${days(n)}`, `Ready ${ago(n)}, never sent`) : ok(`Ready ${ago(n)}`);
      case "pending/changed": return ok(full ? `Changed ${ago(n)}, not sent` : `Changed ${ago(n)}`);
      case "pending/sent": return over ? late(`No reply, ${days(n)}`, `Sent ${ago(n)}, no reply since`) : ok(`Sent ${ago(n)}`);
      case "booked/unscheduled": return over ? late(`No dates, ${days(n)}`, `Booked ${ago(n)}, no dates yet`) : ok(`Booked ${ago(n)}`);
      case "booked/scheduled": return r.start < 0 ? late(`Not started, ${days(-r.start)}`, `Was to start ${short(r.start)}`) : ok(`Starts ${short(r.start)}`);
      case "progress/underway": return ok(full ? `${cap(short(r.start))} to ${short(r.end)}` : r.start === 0 ? "Started today" : `To ${short(r.end)}`);
      case "progress/done": return over ? late(`Not invoiced, ${days(n)}`, `Done ${ago(n)}, not invoiced yet`) : ok(`Done ${ago(n)}`);
      case "invoices/unsent": return ok(full ? `Created ${ago(n)}, not sent` : `Created ${ago(n)}`);
      case "invoices/sent": return ok(r.reminded ? "Reminded today" : `Due ${short(r.due)}`);
      case "invoices/overdue": return late(`Overdue, ${days(-r.due)}`, `Due ${short(r.due)}, overdue by ${days(-r.due)}${r.reminded ? ", reminded today" : ""}`);
      case "invoices/paid": return ok(`Paid ${ago(n)}`);
    }
    return ok("");
  }

  // ---------- each card's steps: the first is its next step, on the card (P-next); the rest in its summary ----------
  const STEP = {
    create: "Create job", visit: "Book visit", finish: "Finish estimate", send: "Send estimate", resend: "Send changes",
    book: "Mark as booked", schedule: "Schedule", start: "Mark as started", complete: "Mark work done", invoice: "Create invoice",
    sendInvoice: "Send invoice", pay: "Record payment", remind: "Send reminder", lose: "Mark as lost", reopen: "Reopen",
  };
  // a lost card's one step says where it goes back to
  const stepName = (step, r) => (step === "reopen" ? `Reopen in ${stageOf(r.stage).label}` : STEP[step]);
  function steps(r) {
    switch (`${r.stage}/${r.group}`) {
      case "leads/new": case "leads/talking": return ["create", "visit", "lose"];
      case "visits/visited": case "visits/today": return ["create", "lose"];
      case "visits/coming": return [null, "create", "lose"];
      case "pending/drafts": return ["finish", "lose"];
      case "pending/unsent": return ["send", "lose"];
      case "pending/changed": return ["resend", "book", "lose"];
      case "pending/sent": return ["book", "lose"];
      case "booked/unscheduled": return ["schedule", "start"];
      case "booked/scheduled": return r.start <= 0 ? ["start"] : [null, "start"];
      case "progress/underway": return r.end <= 0 ? ["complete", "invoice"] : [null, "complete", "invoice"];
      case "progress/done": return ["invoice"];
      case "invoices/unsent": return ["sendInvoice", "pay"];
      case "invoices/sent": return ["pay", "remind"];
      case "invoices/overdue": return ["remind", "pay"];
    }
    return [null];
  }

  // ---------- where a card may go (P-move): the next stage or back one; why not, said as you drag over ----------
  const ORDER = STAGES.map((s) => s.key);
  function canGo(r, to) {
    if (to === r.stage) return { ok: false, same: true };
    const a = ORDER.indexOf(r.stage), b = ORDER.indexOf(to), target = stageOf(to);
    if (r.kind === "invoice") return { ok: false, why: "An invoice changes in the invoice" };
    if (r.kind === "job" && target.kind === "person") return { ok: false, why: "A job doesn't go back to being a lead" };
    // a record crosses to the next kind by the step that makes it: Create job, Create invoice
    if (target.kind === "invoice") return r.stage === "progress" ? { ok: true, step: "invoice" } : { ok: false, why: r.kind === "person" ? "Create the job first, in Pending" : "Invoice it from In progress" };
    if (r.kind === "person" && target.kind === "job" && to !== "pending") return { ok: false, why: "Create the job first, in Pending" };
    if (r.kind === "person" && to === "pending") return { ok: true, step: "create" };
    if (Math.abs(b - a) > 1) return { ok: false, why: `One stage at a time: ${stageOf(ORDER[a + Math.sign(b - a)]).label} first` };
    if (to === "visits") return { ok: true, step: "visit" };
    if (to === "leads") return { ok: true, step: "unvisit" };
    if (to === "booked" && r.stage === "pending") return { ok: true, step: "book" };
    if (to === "progress") return { ok: true, step: "start" };
    if (to === "pending") return { ok: true, step: "unbook" };
    if (to === "booked") return { ok: true, step: "unstart" };
    return { ok: false, why: "Not from here" };
  }
  const canLose = (r) => r.stage === "leads" || r.stage === "visits" || r.stage === "pending";
  // where a card may be dropped, Lost too: what can be lost goes there with a reason; a lost card goes back only to the
  // stage it left, as Reopen does
  function canDrop(r, to) {
    if (lostOf(r)) return to === "lost" ? { ok: false, same: true } : to === r.stage ? { ok: true, step: "reopen" } : { ok: false, why: `It reopens where it was, in ${stageOf(r.stage).label}` };
    if (to === "lost") return canLose(r) ? { ok: true, step: "lose" } : { ok: false, why: r.kind === "invoice" ? "An invoice changes in the invoice" : "Only leads and estimates are lost" };
    return canGo(r, to);
  }

  // ---------- filters: search, and whose ----------
  const st = { q: "", people: null, folded: new Set(), tab: "leads", lost: false };
  try { st.folded = new Set(JSON.parse(localStorage.getItem("pl-folded") || "[]")); } catch {}
  // Show: the Lost column, off until it's asked for, remembered as the folds are
  try { st.lost = localStorage.getItem("pl-lost") === "on"; } catch {}
  const keepFolded = () => { try { localStorage.setItem("pl-folded", JSON.stringify([...st.folded])); } catch {} };
  // People and Show are filters under Add filter, each a chip once it's set (as Tasks', your call, 22 Oct): People when
  // it's not everyone, Show when Lost is in
  const FILTERS = [{ key: "people", label: "People", icon: "user" }, { key: "show", label: "Show", icon: "list" }];
  const isSet = (k) => (k === "people" ? !!st.people : st.lost);
  const keepLost = () => { try { localStorage.setItem("pl-lost", st.lost ? "on" : "off"); } catch {} };
  const shown = (r) => (!st.people || st.people.has(r.owner)) && (!st.q || `${r.name} ${r.client || ""} ${r.job || ""} ${r.number || ""} ${r.place} ${r.ask || ""}`.toLowerCase().includes(st.q));
  const filtered = () => st.q || st.people;

  // ---------- a column's line under its name (P-money): what its money adds up, in full ----------
  function figure(stage, rows) {
    const total = (list) => list.reduce((s, r) => s + r.value, 0);
    switch (stage.key) {
      case "pending": return `${money(total(rows.filter((r) => r.group === "sent" || r.group === "changed")))} quoted`;
      case "booked": case "progress": return `${money(total(rows))} contracted`;
      case "invoices": return `${money(total(rows.filter((r) => r.group !== "paid")))} owed`;
      case "lost": return `${money(total(rows.filter((r) => r.kind === "job")))} lost`;
    }
    return "";
  }

  // ---------- drawing ----------
  const markOf = (s, size = "") => (s.kind === "job" ? `<span class="mark${size}" data-mark="${s.mark}" style="--_dot:${s.dot}" aria-hidden="true"></span>` : ic(s.icon, 14, { optical: true }));
  // three ways to draw a card, to compare (Concept controls): Footer (the default, your pick for now), Quiet and Compact
  let LAYOUT = "footer";
  try { LAYOUT = localStorage.getItem("pl-cards") || "footer"; } catch {}
  if (!["quiet", "compact", "footer"].includes(LAYOUT)) LAYOUT = "footer";
  // the line under a card's name: who or what it's for
  const subOf = (r) => (r.kind === "job" ? `${r.client} · ${r.place}` : r.kind === "invoice" ? `${r.number} · ${r.job}` : r.ask);
  function card(r) {
    const gone = lostOf(r), w = gone ? lostWhen(gone) : when(r), [next] = gone ? ["reopen"] : steps(r), job = r.kind === "job", inv = r.kind === "invoice", priced = job || inv;
    const label = `${job ? `${r.name}, ${r.client}` : inv ? `Invoice ${r.number}, ${r.client}, ${r.job}` : r.name}, ${gone ? "lost from " : ""}${stageOf(r.stage).label}, ${groupLabel(r)}${priced ? `, ${r.value ? money(r.value) : "no price yet"}` : ""}. ${w.text}`;
    const attrs = `class="pl-card" data-id="${r.id}" data-kind="${r.kind}"${w.late ? " data-late" : ""}${r.group === "paid" && !gone ? " data-past" : ""}${gone ? " data-lost" : ""}`;
    // a job opens the job (its own window); its summary is Quick look, in the card's corner (your call, 22 Oct). A lead
    // or an invoice opens its summary
    const open = (inner) => job ? `<button type="button" class="pl-open" data-open-job="${r.id}" aria-label="${esc(label)}">${inner}</button>`
      : `<button type="button" class="pl-open" data-open="${r.id}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(label)}">${inner}</button>`;
    const quick = job ? `<button type="button" class="button pl-quick" data-variant="ghost" data-size="sm" data-icon-only data-open="${r.id}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(`Quick look: ${r.name}`)}" data-tip="Quick look">${ic("sidebar-right", 16, { optical: true })}</button>` : "";
    const value = (priced ? `<span class="pl-value">${r.value ? money(r.value) : '<span class="pl-none">No price</span>'}</span>` : "") + quick;
    const stepAria = next ? `aria-label="${esc(`${stepName(next, r)}: ${r.name}`)}" data-step="${next}" data-for="${r.id}"` : "";
    const who2 = avatar(who(r.owner), "xs");
    if (LAYOUT === "compact") {
      // two lines: the name and its money; who it's for and how long it's been, the owner and the next step as an icon
      const line = priced ? `${esc(inv ? r.number : r.client)} · <span class="pl-when-text">${esc(w.text)}</span>` : `<span class="pl-when-text">${esc(w.text)}</span>`;
      return `<article ${attrs}><div class="pl-row">${open(`<span>${esc(r.name)}</span>`)}${value}</div>
        <div class="pl-row pl-meta"><p class="pl-line">${line}</p>${who2}${next ? `<button type="button" class="button pl-next" data-variant="ghost" data-size="sm" data-icon-only ${stepAria} data-tip="${stepName(next, r)}">${ic("chevron-right", 14, { optical: true })}</button>` : '<span class="pl-next-slot" aria-hidden="true"></span>'}</div></article>`;
    }
    if (LAYOUT === "footer") {
      // the card's facts on top, quiet; its next step as a strip across its foot, the one thing on it that acts
      return `<article ${attrs}><div class="pl-row">${open(`<span>${esc(r.name)}</span>`)}${value}</div>
        <p class="pl-line pl-sub">${esc(subOf(r))}</p><p class="pl-line pl-when-text pl-meta">${esc(w.text)}</p>
        ${next ? `<button type="button" class="pl-next pl-strip" ${stepAria}><span>${stepName(next, r)}</span>${ic("chevron-right", 12, { optical: true })}</button>` : ""}</article>`;
    }
    // Quiet: the name and its money, who or what it's for, then how long it's been beside the next step as a link;
    // the owner is in the summary (and People picks whose)
    return `<article ${attrs}><div class="pl-row">${open(`<span>${esc(r.name)}</span>`)}${value}</div>
      <p class="pl-line pl-sub">${esc(subOf(r))}</p>
      <div class="pl-row pl-meta"><p class="pl-line pl-when-text">${esc(w.text)}</p>${next ? `<button type="button" class="pl-next pl-link" ${stepAria}>${stepName(next, r)}${ic("chevron-right", 12, { optical: true })}</button>` : ""}</div></article>`;
  }
  // within a group, the date's order (P-groups): scheduled jobs by their start, visits to come by their day and time,
  // the rest by when they got there
  const mins = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };
  const order = (key) => (key === "booked/scheduled" ? (a, b) => a.start - b.start
    : key === "visits/today" || key === "visits/coming" ? (a, b) => a.visit.day - b.visit.day || mins(a.visit.time) - mins(b.visit.time)
    : (a, b) => a.at - b.at);
  // a lost card says when it was lost and why; most recently lost first
  const lostWhen = (x) => ({ text: `Lost ${ago(-x.at)}: ${x.reason.toLowerCase()}`, late: false });
  const newest = (a, b) => lostOf(b).at - lostOf(a).at;
  const rowsOf = (key) => (key === "lost" ? lost.map((x) => x.rec) : records.filter((r) => r.stage === key)).filter(shown);
  function column(s) {
    const rows = rowsOf(s.key), gone = s === LOST;
    const groups = s.groups.map(([g, label]) => {
      const list = rows.filter((r) => (gone ? r.kind : r.group) === g).sort(gone ? newest : order(`${s.key}/${g}`));
      if (!list.length) return "";
      const key = `${s.key}/${g}`, folded = st.folded.has(key);
      return `<section class="pl-group" data-group="${key}"><h4 class="pl-group-head"><button type="button" class="pl-group-toggle" data-fold="${key}" aria-expanded="${!folded}" aria-controls="g-${s.key}-${g}">${ic("chevron-down", 12, { optical: true })}<span>${esc(label)}</span><span class="pl-n">${list.length}</span></button></h4>
        <div class="pl-cards" id="g-${s.key}-${g}"${folded ? " hidden" : ""}>${list.map(card).join("")}</div></section>`;
    }).join("");
    const empty = `<p class="pl-empty">${filtered() ? "No matches" : "Nothing here"}</p>`;
    return `<section class="pl-col" id="col-${s.key}" data-stage="${s.key}" data-kind="${s.kind}" aria-labelledby="h-${s.key}">
      <header class="pl-col-head"><h3 id="h-${s.key}">${markOf(s)}<span>${esc(s.label)}</span><span class="pl-n">${rows.length}</span></h3>${s.kind !== "person" ? `<p class="pl-figure">${figure(s, rows)}</p>` : ""}</header>
      <div class="pl-col-body" tabindex="-1">${groups || empty}</div></section>`;
  }
  const board = $("#board");
  function render() {
    const left = board.scrollLeft;
    // People, Jobs and Invoices over their columns, a seam where one kind becomes the next (P-kinds, P-cross)
    const KINDS = [["person", "user", "People, no job yet"], ["job", "briefcase", "Jobs"], ["invoice", "file-invoice", "Invoices"]];
    let col = 1, cols = "", heads = "";
    KINDS.forEach(([k, icon, name], i) => {
      if (i) cols += `<div class="pl-seam" style="grid-column:${col++}" aria-hidden="true"></div>`;
      const list = STAGES.filter((x) => x.kind === k);
      heads += `<p class="pl-kind" data-kind="${k}" style="grid-column:${col} / span ${list.length}">${ic(icon, 12, { optical: true })}${name}</p>`;
      cols += list.map((x) => column(x).replace('<section class="pl-col"', `<section class="pl-col" style="grid-column:${col++}"`)).join("");
    });
    // Lost after a seam, out of the flow, while Show has it
    if (st.lost) cols += `<div class="pl-seam" style="grid-column:${col++}" aria-hidden="true"></div>${column(LOST).replace('<section class="pl-col"', `<section class="pl-col" style="grid-column:${col++}"`)}`;
    board.toggleAttribute("data-lost", st.lost);
    board.innerHTML = heads + cols;
    board.scrollLeft = left;
    const n = records.filter(shown).length;
    // the count, as the list's: all of them, or how many of them a search or People lets through; the board's own
    // cards, never what's lost (its column counts those)
    const all = records.length;
    $("#count").innerHTML = filtered() ? `<strong>${fmt.count(n)}</strong> of ${fmt.plural(all, "card", "cards")}` : `<strong>${fmt.count(all)}</strong> ${all === 1 ? "card" : "cards"}`;
    if (!st.lost && st.tab === "lost") st.tab = "invoices";
    $("#tabs").innerHTML = [...STAGES, ...(st.lost ? [LOST] : [])].map((s) => `<button type="button" data-tab="${s.key}"${s.key === st.tab ? ' aria-current="true"' : ""}>${markOf(s)}<span>${esc(s.label)}</span><span class="pl-n">${rowsOf(s.key).length}</span></button>`).join("");
    chips();
    fit();
  }
  // the set filters as chips on the row under the bar, then Clear all; Add filter offers what isn't set
  function chips() {
    const text = (k) => (k === "people" ? OWNERS.filter((o) => st.people.has(o.id)).map((o) => (o.me ? "You" : o.name.split(" ")[0])).join(", ") : "Lost leads and jobs");
    const list = FILTERS.filter((f) => isSet(f.key)).map((f) => `<span class="chip" data-active><button type="button" class="chip-main" data-chip="${f.key}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(f.label)}: ${esc(text(f.key))}. Change filter"><span class="chip-field">${esc(f.label)}:</span><span class="chip-value">${esc(text(f.key))}</span></button><button type="button" class="chip-remove" data-remove="${f.key}" aria-label="Remove ${f.label.toLowerCase()} filter" data-tip="Remove filter">${ic("xmark", 14)}</button></span>`);
    if (list.length) list.push(`<button type="button" class="button clear-all" data-variant="ghost" data-size="sm" data-clear-all>Clear all</button>`);
    $("#filters").innerHTML = list.join("");
    $("#add-filter").disabled = FILTERS.every((f) => isSet(f.key));
  }
  const phone = matchMedia("(max-width: 767px)");
  // each column's head comes down its column under the toolbar (pipeline.css): how far it may go (the column's height
  // inside its edge, less the head's), and where the column's top is now, on every scroll
  // the toolbar takes the canvas's colour only while it's stuck under the top bar (pipeline.css)
  const toolbar = $(".pl-toolbar");
  const stuck = () => toolbar.toggleAttribute("data-stuck", !phone.matches && scrollY > 0 && toolbar.getBoundingClientRect().top <= (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--list-toolbar-top")) || 0) + 1);
  function follow() {
    stuck();
    keepPop();
    if (phone.matches) return;
    $$(".pl-col", board).forEach((c) => c.style.setProperty("--_col-top", `${c.getBoundingClientRect().top}px`));
  }
  function fit() {
    $$(".pl-col", board).forEach((c) => {
      const h = c.querySelector(".pl-col-head").offsetHeight;
      c.style.setProperty("--_room", `${Math.max(0, c.clientHeight - h)}px`);
    });
    edges();
    sizeBar();
    follow();
  }
  // the board's scrollbar at the window's foot (768 up, pipeline.css): as wide a scroll as the board's, there only
  // while the board has more sideways; each follows the other, and an equal one isn't set again, so neither loops
  const bar = $("#hscroll"), spacer = bar.firstElementChild;
  function sizeBar() {
    bar.hidden = phone.matches || board.scrollWidth <= board.clientWidth + 1;
    if (bar.hidden) return;
    spacer.style.inlineSize = `${board.scrollWidth - board.clientWidth + bar.clientWidth}px`;
    bar.scrollLeft = board.scrollLeft;
  }
  const mirror = (from, to) => { if (Math.abs(to.scrollLeft - from.scrollLeft) > 0.5) to.scrollTo({ left: from.scrollLeft, behavior: "instant" }); };
  bar.addEventListener("scroll", () => mirror(bar, board), { passive: true });
  new ResizeObserver(sizeBar).observe(board);
  // an edge with more beyond it fades (pipeline.css), as the table's
  function edges() {
    const max = board.scrollWidth - board.clientWidth;
    board.toggleAttribute("data-scrolled", board.scrollLeft > 1);
    board.toggleAttribute("data-more", board.scrollLeft < max - 1);
  }

  // ---------- changes, every one with Undo ----------
  // the board is drawn again, so focus goes to the card that moved (made, if the change made a new one), or back to
  // it on Undo; to its column if it's left the board
  function change(mutate, message, r, made = r) {
    const was = structuredClone({ records, lost }), home = r.stage;
    mutate();
    render();
    land(made.id, home);
    say(message);
    BolsterShell.toast(message, { undo: () => { ({ records, lost } = was); render(); land(r.id, home); say("Undone"); } });
  }
  function land(id, stage) {
    const card = $(`.pl-card[data-id="${id}"]`, board);
    // in a folded group, its group's toggle
    const to = card && (card.closest(".pl-cards[hidden]") ? $(`[aria-controls="${card.parentElement.id}"]`, board) : $(".pl-open", card));
    (to || $(`#col-${stage} .pl-col-body`, board))?.focus({ preventScroll: true });
    if (!to) return;
    const seen = to === card.querySelector(".pl-open") ? card : to;
    seen.scrollIntoView({ block: "nearest", inline: "nearest" });
    landed(seen);
  }
  // where it landed lights up for a moment, once it's in view (pipeline.css, your call, 22 Oct): the card, or its
  // folded group's toggle; after the dialog or the sheet that made the change has gone, so it's seen
  let landing = null;
  async function landed(el) {
    landing?.disconnect(); landing = null;
    const leaving = [dlg, pop].flatMap((x) => x.getAnimations({ subtree: true }));
    if (leaving.length) await Promise.allSettled(leaving.map((a) => a.finished));
    if (!el.isConnected) return;
    landing?.disconnect();
    landing = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      landing.disconnect(); landing = null;
      el.removeAttribute("data-landed"); void el.offsetWidth; el.setAttribute("data-landed", "");
      // gone when it's faded (with less motion, nothing fades: it's held still as long)
      clearTimeout(el.landTimer);
      el.landTimer = setTimeout(() => el.removeAttribute("data-landed"), (parseFloat(getComputedStyle(el).getPropertyValue("--duration-medium")) || 240) * 3);
    }, { threshold: 0.9 });
    landing.observe(el);
  }
  const set = (r, stage, group, extra = {}) => Object.assign(r, { stage, group, at: 0 }, extra);

  // ---------- the steps: some move at once (with Undo), some ask first in a short dialog ----------
  const dlg = $("#step");
  function ask({ title, body, submit, onSubmit, tone }) {
    dlg.innerHTML = `<form method="dialog" class="pl-step"><header class="dialog-header"><h2 id="step-title">${title}</h2>
      <button type="button" class="button" data-variant="ghost" data-icon-only aria-label="Close" data-close-step data-tip="Close">${ic("xmark", 16, { optical: true })}</button></header>
      <div class="dialog-body">${body}</div>
      <footer class="dialog-footer"><button type="button" class="button" data-variant="ghost" data-close-step>Cancel</button><button type="submit" class="button"${tone ? ` data-variant="${tone}"` : ""}>${submit}</button></footer></form>`;
    dlg.querySelector("form").onsubmit = (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); dlg.close(); onSubmit(v); };
    dlg.showModal();
    dlg.querySelector("input:not([type=radio]), input:checked, select")?.focus();
  }
  const field = (id, label, input, help = "") => `<div class="field"><label class="field-label" for="${id}">${label}</label>${input}${help ? `<p class="field-helper">${help}</p>` : ""}</div>`;
  const moneyInput = (id, v) => `<div class="input-group"><span class="input-adornment">$</span><input class="input" id="${id}" name="${id}" inputmode="decimal" data-numeric value="${v.toLocaleString("en-US")}" required></div>`;
  // a visit's time, picked from the working day in quarter hours and read as the board prints it (a time field reads
  // “09:00 AM”, the browser's way)
  const times = (at = "9:00") => Array.from({ length: (20 - 6) * 4 + 1 }, (_, i) => `${6 + Math.floor(i / 4)}:${String((i % 4) * 15).padStart(2, "0")}`)
    .map((t) => `<option value="${t}"${t === at ? " selected" : ""}>${clock(t)}</option>`).join("");
  const amount = (s) => Math.round(parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0);

  function run(step, r) {
    if (pop.matches(":popover-open")) pop.hidePopover();
    const s = (k) => stageOf(k).label;
    switch (step) {
      case "create": return ask({
        title: `Create a job for ${esc(r.name)}`, submit: "Create job",
        body: `${field("j-name", "Name this job", `<input class="input" id="j-name" name="name" value="${esc(r.place)}" placeholder="Use the address or the customer's name if you're not sure" required>`)}
          <p class="pl-step-note">${ic("briefcase", 14, { optical: true })}<span>It starts in ${s("pending")} as a draft estimate. ${esc(r.name)} is a customer from now on, so they leave ${s(r.stage)}.</span></p>`,
        onSubmit: (v) => {
          const made = job("pending", "drafts", v.name.trim() || r.place, r.name, r.place, 0, 0, r.owner);
          change(() => { records = records.filter((x) => x !== r); records.push(made); }, `${made.name} created for ${r.name}, in ${s("pending")}`, r, made);
        },
      });
      case "visit": return ask({
        title: `Book a visit with ${esc(r.name)}`, submit: "Book visit",
        body: `${field("v-what", "What for", `<div class="select"><select class="input" id="v-what" name="what"><option>Estimate visit</option><option>Measure</option></select></div>`)}
          <div class="pl-step-row">${field("v-day", "Day", `<input class="input" type="date" id="v-day" name="day" value="${iso(1)}" required>`)}${field("v-time", "Time", `<div class="select"><select class="input" id="v-time" name="time">${times()}</select></div>`)}</div>
          <p class="pl-step-note">${ic("calendar-check", 14, { optical: true })}<span>It goes on the calendar too.</span></p>`,
        onSubmit: (v) => { const d = offset(v.day); change(() => set(r, "visits", d < 0 ? "visited" : d === 0 ? "today" : "coming", { visit: { day: d, time: v.time, what: v.what } }), `Visit with ${r.name} booked for ${short(d)}, ${clock(v.time)}`, r); },
      });
      case "unvisit": return change(() => { set(r, "leads", "talking"); delete r.visit; }, `${r.name} back in ${s("leads")}, visit cancelled`, r);
      case "finish": return BolsterShell.toast(`Concept only: ${r.name}'s estimate opens in the job.`);
      case "send": case "resend": return change(() => set(r, "pending", "sent"), `${step === "send" ? "Estimate" : "Changes"} sent to ${r.client}`, r);
      case "book": return ask({
        title: `Mark ${esc(r.name)} as booked`, submit: "Mark as booked",
        body: `${field("b-value", "Contract", moneyInput("b-value", r.value), `The estimate's total. Change it if ${esc(r.client)} signed for something else.`)}
          ${field("b-start", "Starts", `<input class="input" type="date" id="b-start" name="start" value="">`, "Leave it empty to schedule it later.")}`,
        onSubmit: (v) => { const start = v.start ? offset(v.start) : null; change(() => set(r, "booked", start == null ? "unscheduled" : "scheduled", { value: amount(v["b-value"]), ...(start == null ? {} : { start, end: start + 4 }) }), `${r.name} booked${start == null ? ", not scheduled yet" : `, starting ${short(start)}`}`, r); },
      });
      case "unbook": return change(() => { set(r, "pending", "sent"); delete r.start; delete r.end; }, `${r.name} back in ${s("pending")}`, r);
      case "schedule": return ask({
        title: `Schedule ${esc(r.name)}`, submit: "Schedule",
        body: `<div class="pl-step-row">${field("s-start", "Starts", `<input class="input" type="date" id="s-start" name="start" value="${iso(4)}" required>`)}${field("s-days", "Working days", `<input class="input" type="number" id="s-days" name="days" min="1" max="60" value="3" data-numeric required>`)}</div>
          <p class="pl-step-note">${ic("calendar", 14, { optical: true })}<span>It goes on the calendar.</span></p>`,
        onSubmit: (v) => { const start = offset(v.start); change(() => set(r, "booked", "scheduled", { start, end: start + Math.max(1, +v.days) - 1 }), `${r.name} scheduled from ${short(start)}`, r); },
      });
      // started today, keeping the length it was scheduled for (four days if it had none)
      case "start": return change(() => set(r, "progress", "underway", { start: 0, end: r.start != null ? r.end - r.start : 4 }), `${r.name} started today`, r);
      case "unstart": return change(() => { set(r, "booked", "unscheduled"); delete r.start; delete r.end; }, `${r.name} back in ${s("booked")}, not scheduled`, r);
      case "complete": return change(() => set(r, "progress", "done", { end: 0 }), `${r.name}: work done`, r);
      case "invoice": {
        const final = r.group === "done";
        return ask({
          title: `${final ? "Final" : "Progress"} invoice for ${esc(r.name)}`, submit: "Create invoice",
          body: `${field("i-amount", "Amount", moneyInput("i-amount", final ? r.value : Math.round(r.value / 2)), final ? "What's left of the contract. Payments taken so far come off it in the invoice." : "What the work so far is worth.")}
            <p class="pl-step-note">${ic("file-invoice", 14, { optical: true })}<span>${final ? `An invoice of its own from here, in ${s("invoices")}. ${esc(r.name)} is done, so it leaves the board; it stays in the job list.` : `An invoice of its own, in ${s("invoices")}; ${esc(r.name)} stays where it is.`}</span></p>`,
          onSubmit: (v) => {
            const made = invoice("unsent", r.client, r.name, r.place, amount(v["i-amount"]), 0, r.owner, { label: final ? "Final invoice" : "Progress invoice" });
            change(() => { if (final) records = records.filter((x) => x !== r); records.push(made); }, `Invoice ${made.number} for ${r.name} created, not sent yet${final ? `; ${r.name} leaves the board` : ""}`, r, made);
          },
        });
      }
      case "sendInvoice": return change(() => set(r, "invoices", "sent", { due: 14 }), `Invoice sent to ${r.client}, due ${short(14)}`, r);
      case "pay": return change(() => set(r, "invoices", "paid"), `${r.name}: paid in full`, r);
      case "remind": return change(() => (r.reminded = true), `Reminder sent to ${r.client}`, r);
      case "lose": return ask({
        title: `Mark ${esc(r.name)} as lost`, submit: "Mark as lost",
        body: `<fieldset class="pl-reasons"><legend class="field-label">Why</legend>${["Price", "Timing", "Went with someone else", "No reply", "Not a fit"].map((x, i) => `<label class="choice"><input type="radio" class="radio" name="reason" value="${x}"${i ? "" : " checked"}> ${x}</label>`).join("")}</fieldset>
          <p class="pl-step-note">${ic("ban", 14, { optical: true })}<span>${st.lost ? "It goes to Lost, at the board's end, to reopen." : "It leaves the board and waits in Lost (Show brings it in), to reopen."}</span></p>`,
        onSubmit: (v) => change(() => { records = records.filter((x) => x !== r); lost.unshift({ rec: r, reason: v.reason, at: 0 }); }, `${r.name} marked as lost: ${v.reason.toLowerCase()}`, r),
      });
      // back in the stage and group it left, as it was
      case "reopen": return change(() => { lost = lost.filter((x) => x.rec !== r); records.push(r); }, `${r.name} reopened, in ${s(r.stage)}`, r);
    }
  }
  const moveTo = (r, to) => { const g = canDrop(r, to); if (g.ok) run(g.step, r); };

  // ---------- the summary, the pickers: one shared popover ----------
  const pop = $("#pop");
  let popFor = null, byKey = false;
  function openPop(kind, from, fill, { start = false, label } = {}) {
    if (pop.matches(":popover-open") && popFor?.from === from && popFor.kind === kind) { pop.hidePopover(); return; }
    if (pop.matches(":popover-open")) pop.hidePopover();
    popFor = { kind, from, start };
    pop.dataset.kind = kind;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", label || kind);
    pop.innerHTML = fill();
    pop.showPopover();
    from?.setAttribute("aria-expanded", "true");
    BolsterShell.placePopover(pop, from, { start });
    ($("h3[tabindex]", pop) || $("input, button:not([data-close-pop])", pop))?.focus({ preventScroll: true, focusVisible: byKey });
  }
  let refocus = null;
  pop.addEventListener("beforetoggle", (e) => {
    if (e.newState !== "closed") return;
    const from = popFor?.from; popFor = null;
    from?.setAttribute("aria-expanded", "false");
    refocus = from?.isConnected && (pop.contains(document.activeElement) || document.activeElement === document.body) ? from : null;
  });
  pop.addEventListener("toggle", (e) => {
    if (e.newState === "closed" && refocus?.isConnected && !pop.matches(":popover-open") && !dlg.open) refocus.focus({ preventScroll: true });
    refocus = null;
  });
  // it stays on what opened it as the page or the board scrolls, and closes once that's gone out of view (under the
  // column's head, past the board's edge, off the screen)
  function keepPop() {
    const a = popFor?.from;
    if (!a?.isConnected || phone.matches || !pop.matches(":popover-open")) return;
    const card = a.closest(".pl-card");
    if (card) {
      const r = a.getBoundingClientRect(), b = board.getBoundingClientRect(), head = card.closest(".pl-col").querySelector(".pl-col-head").getBoundingClientRect();
      if (r.bottom < head.bottom || r.top > innerHeight || r.right < b.left || r.left > b.right) return pop.hidePopover();
    }
    BolsterShell.placePopover(pop, a, { start: popFor.start });
  }
  const closeBtn = () => `<button type="button" class="button cal-pop-close" data-variant="ghost" data-size="sm" data-icon-only data-close-pop aria-label="Close" data-tip="Close">${ic("xmark", 16, { optical: true })}</button>`;
  const dd = (term, html) => `<dt>${term}</dt><dd>${html}</dd>`;
  function summaryHtml(r) {
    // a lost one says where it was lost from, and moves only back there (Reopen)
    const s = stageOf(r.stage), gone = lostOf(r), w = gone ? lostWhen(gone) : when(r, true), [next, ...more] = gone ? ["reopen"] : steps(r);
    const moves = STAGES.map((t) => ({ t, g: canDrop(r, t.key) })).filter((x) => x.g.ok);
    return `<div class="cal-sum pl-sum"><div class="cal-sum-top"><p class="cal-sum-kind">${gone ? `${markOf(LOST)}Lost · from ${esc(s.label)}, ${esc(groupLabel(r).toLowerCase())}` : `${markOf(s)}${esc(s.label)} · ${esc(groupLabel(r))}`}</p>${closeBtn()}</div>
      <h3 tabindex="-1">${r.kind === "invoice" ? `Invoice ${esc(r.number)}` : esc(r.name)}</h3>
      <p class="cal-sum-when${w.late ? " pl-late" : ""}">${esc(w.text)}</p>
      <dl>${r.kind === "job" ? dd("Client", esc(r.client)) + dd(r.stage === "pending" ? "Estimate" : "Contract", r.value ? money(r.value) : "No price yet") : r.kind === "invoice" ? dd("Client", esc(r.client)) + dd("Invoice", `${esc(r.number)}, ${esc(r.label.toLowerCase())}`) + dd("Job", esc(r.job)) + dd("Amount", money(r.value)) : dd("Asked for", esc(r.ask)) + dd("Source", esc(r.source))}
        ${dd("Where", esc(r.place))}${dd("Owner", `${avatar(who(r.owner), "sm")}<span>${esc(who(r.owner).me ? `${who(r.owner).name} (you)` : who(r.owner).name)}</span>`)}</dl>
      ${moves.length ? `<form class="cal-sum-move" data-move="${r.id}"><div class="field" data-size="sm"><label class="field-label" for="mv-to">Move to</label><div class="select"><select class="input" id="mv-to" name="to">${moves.map(({ t }) => `<option value="${t.key}">${esc(gone ? `${t.label}, reopened` : t.label)}</option>`).join("")}</select></div></div><button type="submit" class="button" data-variant="secondary" data-size="sm">${gone ? "Reopen" : "Move"}</button></form>` : ""}
      <div class="cal-sum-actions pl-sum-actions">${next ? `<button type="button" class="button" data-size="sm" data-step="${next}" data-for="${r.id}">${stepName(next, r)}</button>` : ""}${more.filter((x) => x !== "lose").map((x) => `<button type="button" class="button" data-variant="secondary" data-size="sm" data-step="${x}" data-for="${r.id}">${STEP[x]}</button>`).join("")}
        <a class="button" data-variant="ghost" data-size="sm" href="../index.html#${{ job: "jobs", invoice: "invoices", person: "customers" }[r.kind]}">${{ job: "Open job", invoice: "Open invoice", person: "Open lead" }[r.kind]}</a>${more.includes("lose") ? `<button type="button" class="button pl-lose" data-variant="ghost" data-size="sm" data-step="lose" data-for="${r.id}">${STEP.lose}</button>` : ""}</div></div>`;
  }
  function peopleHtml() {
    const rows = [OWNERS.find((p) => p.me), ...OWNERS.filter((p) => !p.me)];
    return `<div class="pop-head"><h3>People</h3>${closeBtn()}</div><div class="pop-body">${rows.map((p) => `<label class="option"><input type="checkbox" class="checkbox" data-person-pick="${p.id}"${!st.people || st.people.has(p.id) ? " checked" : ""}><span class="option-label"><span class="menu-icon">${avatar(p, "sm")}</span>${esc(p.me ? `${p.name} (you)` : p.name)}</span></label>`).join("")}</div>`;
  }
  const filterMenu = () => `<div class="pop-body">${FILTERS.filter((f) => !isSet(f.key)).map((f) => `<button type="button" class="menu-item" role="menuitem" data-add-filter="${f.key}"><span class="menu-icon">${ic(`m-${f.icon}`, 14)}</span><span>${f.label}</span></button>`).join("")}</div>`;
  const pickFilter = (k, from) => openPop(k, from, k === "people" ? peopleHtml : showHtml, { label: k === "people" ? "People" : "Show", start: true });
  // Show: what the board holds besides its stages, as the calendar's and the timeline's Show; one thing for now
  const showHtml = () => `<div class="pop-head"><h3>Show</h3>${closeBtn()}</div><div class="pop-body"><label class="option"><input type="checkbox" class="checkbox" data-show="lost"${st.lost ? " checked" : ""}><span class="option-label"><span class="menu-icon">${ic("ban", 14)}</span>Lost leads and jobs</span></label></div>`;

  // ---------- dragging: onto a stage, or onto Lost (its column if it's shown, else Mark as lost at the foot) (P-move) ----------
  // Mouse and pen only: on touch a press scrolls, and phones move cards from the summary (P-phone).
  // Held (your call, 22 Oct): the card's place stays as a quiet outline, and the card goes with the pointer, lifted,
  // where it was held; what a drop there would do at its foot
  let drag = null, swallow = false;
  const ghost = $("#ghost"), dropbar = $("#dropbar");
  function targetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (el?.closest?.("[data-drop-lost]")) return { lost: true };
    const col = el?.closest?.(".pl-col");
    return col ? { stage: col.dataset.stage } : null;
  }
  // where it would land (the system's drop line, drop-line.css): the group the step puts it in, at its place in that
  // group's order, in the gap between two cards; under the head of a folded group (said in the hint), where a group
  // not drawn would be; at the top of Lost's group, the latest first. None where a drop is refused
  const dropLine = Object.assign(document.createElement("div"), { className: "drop-line" });
  dropLine.setAttribute("aria-hidden", "true");
  // the record as the step would leave it: a move is today (at 0); a visit the dialog's default, tomorrow at 9
  function landingOf(r, step) {
    const now = { ...r, at: 0 };
    switch (step) {
      case "create": return { ...now, kind: "job", stage: "pending", group: "drafts" };
      case "visit": return { ...now, stage: "visits", group: "coming", visit: { day: 1, time: "9:00" } };
      case "unvisit": return { ...now, stage: "leads", group: "talking" };
      case "book": case "unstart": return { ...now, stage: "booked", group: "unscheduled" };
      case "unbook": return { ...now, stage: "pending", group: "sent" };
      case "start": return { ...now, stage: "progress", group: "underway", start: 0 };
      case "invoice": return { ...now, kind: "invoice", stage: "invoices", group: "unsent" };
      case "lose": return { ...r, stage: "lost", group: r.kind };
    }
    return r; // reopen: where it was
  }
  // draws the line; says the group's name if it's folded
  function showDropLine(r, step) {
    const to = landingOf(r, step), key = `${to.stage}/${to.group}`, body = $(`#col-${to.stage} .pl-col-body`, board);
    if (!body) return hideDropLine();
    const box = body.getBoundingClientRect(), pad = parseFloat(getComputedStyle(body).paddingInlineStart) || 0;
    const rect = (el) => el.getBoundingClientRect(), sec = $(`[data-group="${key}"]`, body);
    const half = (parseFloat(getComputedStyle($(".pl-cards", body) || body).rowGap) || 6) / 2, apart = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--space-2")) || 8) / 2;
    let y, folded = "";
    if (sec && $(".pl-cards", sec).hidden) { y = rect($(".pl-group-head", sec)).bottom + half; folded = stageOf(to.stage).groups.find(([g]) => g === to.group)[1]; }
    else if (sec) {
      const cards = $$(".pl-card", sec), n = cards.length;
      const i = to.stage === "lost" ? 0 : cards.filter((c) => order(key)(byId(c.dataset.id), to) <= 0).length;
      y = i === 0 ? rect(cards[0]).top - half : i === n ? rect(cards[n - 1]).bottom + half : (rect(cards[i - 1]).bottom + rect(cards[i]).top) / 2;
    } else {
      // not drawn: before the next group that is, after the last before it, or where the column says it's empty
      const keys = stageOf(to.stage).groups.map(([g]) => `${to.stage}/${g}`), at = keys.indexOf(key), drawn = (k) => $(`[data-group="${k}"]`, body);
      const next = keys.slice(at + 1).map(drawn).find(Boolean), prev = keys.slice(0, at).map(drawn).filter(Boolean).pop();
      y = next ? rect(next).top - apart : prev ? rect(prev).bottom + apart : rect($(".pl-empty", body) || body).top;
    }
    // never above the column's body, where its head would cover it
    y = Math.max(y, box.top + 1);
    if (dropLine.parentElement !== body) body.append(dropLine);
    Object.assign(dropLine.style, { insetBlockStart: `${y - box.top - 1}px`, insetInlineStart: `${pad}px`, inlineSize: `${box.width - 2 * pad}px` });
    return folded;
  }
  const hideDropLine = () => dropLine.remove();
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch" || phone.matches) return;
    const el = e.target.closest(".pl-card");
    if (!el || e.target.closest(".pl-next, .pl-quick")) return;
    const b = el.getBoundingClientRect();
    drag = { id: el.dataset.id, x: e.clientX, y: e.clientY, dx: e.clientX - b.left, dy: e.clientY - b.top, w: b.width, started: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const r = byId(drag.id);
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      drag.started = true;
      if (pop.matches(":popover-open")) pop.hidePopover();
      document.documentElement.setAttribute("data-pl-dragging", "");
      $(`.pl-card[data-id="${drag.id}"]`)?.setAttribute("data-dragging-item", "");
      $$(".pl-col", board).forEach((c) => { const g = canDrop(r, c.dataset.stage); c.dataset.drop = g.same ? "home" : g.ok ? "yes" : "no"; });
      dropbar.hidden = st.lost || !!lostOf(r) || !canLose(r);
      const priced = r.kind !== "person";
      ghost.innerHTML = `<div class="pl-row"><b>${esc(r.name)}</b>${priced ? `<span class="pl-value">${r.value ? money(r.value) : '<span class="pl-none">No price</span>'}</span>` : ""}</div>
        <p class="pl-line">${esc(subOf(r))}</p><p class="pl-ghost-hint"></p>`;
      ghost.style.inlineSize = `${drag.w}px`;
      ghost.style.transformOrigin = `${drag.dx}px ${drag.dy}px`;
      ghost.hidden = false;
    }
    const t = targetAt(e.clientX, e.clientY);
    $$(".pl-col[data-over], [data-drop-lost][data-over]").forEach((x) => x.removeAttribute("data-over"));
    let line = "Drop on a stage", ok = false;
    if (t?.lost && canLose(r)) { $("[data-drop-lost]").setAttribute("data-over", ""); line = "Mark as lost, with a reason"; drag.to = { lost: true }; ok = true; hideDropLine(); }
    else if (t?.stage) {
      const g = canDrop(r, t.stage), s = stageOf(t.stage);
      $(`#col-${t.stage}`).setAttribute("data-over", "");
      line = g.same ? "Where it is now" : g.ok ? (g.step === "create" ? `Create its job, in ${s.label}` : g.step === "visit" ? "Book a visit" : g.step === "book" ? "Mark as booked: contract and start" : g.step === "invoice" ? "Invoice it" : g.step === "lose" ? "Mark as lost, with a reason" : g.step === "reopen" ? `Reopen in ${s.label}` : `Move to ${s.label}`) : g.why;
      const folded = g.ok ? showDropLine(r, g.step) : hideDropLine();
      if (folded) line += `, into ${folded} (folded)`;
      drag.to = g.ok ? { stage: t.stage } : null;
      ok = g.ok;
    } else { drag.to = null; hideDropLine(); }
    const hint = $(".pl-ghost-hint", ghost);
    hint.textContent = line; hint.toggleAttribute("data-ok", ok);
    // held where it was picked up, kept on the screen so its foot can be read
    const gx = Math.max(8, Math.min(e.clientX - drag.dx, innerWidth - ghost.offsetWidth - 8)), gy = Math.max(8, Math.min(e.clientY - drag.dy, innerHeight - ghost.offsetHeight - 8));
    ghost.style.translate = `${gx}px ${gy}px`;
    // near the board's edges, it scrolls to the stages beyond and the cards below
    const b = board.getBoundingClientRect(), edge = 64;
    board.scrollLeft += e.clientX < b.left + edge ? -14 : e.clientX > b.right - edge ? 14 : 0;
    scrollBy(0, e.clientY < edge + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--list-head-top")) || 0) ? -14 : e.clientY > innerHeight - edge ? 14 : 0);
  });
  function endDrag() {
    $$("[data-over], [data-drop]").forEach((x) => { x.removeAttribute("data-over"); x.removeAttribute("data-drop"); });
    $$("[data-dragging-item]").forEach((x) => x.removeAttribute("data-dragging-item"));
    document.documentElement.removeAttribute("data-pl-dragging");
    ghost.hidden = true; dropbar.hidden = true; hideDropLine();
    drag = null;
  }
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag;
    if (!d.started) { drag = null; return; }
    swallow = true; setTimeout(() => (swallow = false), 0);
    endDrag();
    const r = byId(d.id);
    if (d.to?.lost) return run("lose", r);
    if (d.to?.stage) moveTo(r, d.to.stage);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drag?.started) { endDrag(); say("Move cancelled"); } });
  document.addEventListener("click", (e) => { if (swallow) { swallow = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const q = (s) => e.target.closest(s);
    let el;
    byKey = e.detail === 0;
    if (q("[data-close-pop]")) return pop.hidePopover();
    if (q("[data-close-step]")) return dlg.close();
    if ((el = q("[data-step]"))) return run(el.dataset.step, byId(el.dataset.for));
    if (q("[data-open-job]")) return BolsterShell.toast("Open job: its own full-screen window, not part of this concept. Quick look is on the card.");
    if ((el = q("[data-open]"))) return openPop("summary", el, () => summaryHtml(byId(el.dataset.open)), { label: byId(el.dataset.open).name });
    if ((el = q("[data-fold]"))) {
      const k = el.dataset.fold, folded = !st.folded.has(k);
      folded ? st.folded.add(k) : st.folded.delete(k); keepFolded();
      el.setAttribute("aria-expanded", String(!folded)); $(`#${el.getAttribute("aria-controls")}`).hidden = folded; fit();
      return;
    }
    if ((el = q("[data-tab]"))) { st.tab = el.dataset.tab; show(st.tab); return tabs(); }
    if ((el = q("#add-filter"))) { openPop("add-filter", el, filterMenu, { label: "Add filter", start: true }); pop.setAttribute("role", "menu"); return; }
    if ((el = q("[data-add-filter]"))) { pop.hidePopover(); return pickFilter(el.dataset.addFilter, $("#add-filter")); }
    if ((el = q("[data-chip]"))) return pickFilter(el.dataset.chip, el);
    if ((el = q("[data-remove], [data-clear-all]"))) {
      const k = el.dataset.remove;
      if (!k || k === "people") st.people = null;
      if (!k || k === "show") { st.lost = false; keepLost(); }
      render(); return $("#add-filter").focus({ preventScroll: true });
    }
    // Add: a lead (a person, no job yet) or a job (Bolster's Create job window, an empty estimate)
    if ((el = q("#create"))) { openPop("add", el, () => `<div class="pop-body">${[["lead", "user", "Lead"], ["job", "briefcase", "Job"]].map(([k, icon, l]) => `<button type="button" class="menu-item" role="menuitem" data-add="${k}"><span class="menu-icon">${ic(icon, 14)}</span>${l}</button>`).join("")}</div>`, { label: "Add" }); pop.setAttribute("role", "menu"); return; }
    if ((el = q("[data-add]"))) { pop.hidePopover(); return BolsterShell.toast(el.dataset.add === "lead" ? "Concept only: adding a lead isn't wired up." : "Concept only: in Bolster, this opens Create job (an empty estimate)."); }
  });
  document.addEventListener("submit", (e) => {
    const mv = e.target.closest("[data-move]");
    if (!mv) return;
    e.preventDefault();
    const r = byId(mv.dataset.move), to = e.target.to.value;
    pop.hidePopover();
    moveTo(r, to);
  });
  // a pick applies at once; the picker stays on its chip, or where it is if its chip has gone
  function picked(k) {
    render();
    if (popFor.from?.isConnected) return popFor.from.setAttribute("aria-expanded", "true");
    const chip = $(`[data-chip="${k}"]`);
    if (!chip) return;
    popFor.from = chip; chip.setAttribute("aria-expanded", "true");
    BolsterShell.placePopover(pop, chip, { start: true });
  }
  document.addEventListener("change", (e) => {
    const sh = e.target.closest("[data-show]");
    if (sh) {
      st.lost = sh.checked; keepLost();
      picked("show");
      // brought in, the board goes to it at its end
      if (st.lost) show("lost");
      return;
    }
    const p = e.target.closest("[data-person-pick]");
    if (!p) return;
    const ids = $$("[data-person-pick]", pop).filter((x) => x.checked).map((x) => x.dataset.personPick);
    st.people = ids.length && ids.length < OWNERS.length ? new Set(ids) : null;
    picked("people");
  });
  $("#cc-cards").value = LAYOUT;
  $("#cc-cards").addEventListener("change", (e) => { LAYOUT = e.target.value; try { localStorage.setItem("pl-cards", LAYOUT); } catch {} board.dataset.cards = LAYOUT; render(); });
  board.dataset.cards = LAYOUT;
  $("#search").addEventListener("input", (e) => { st.q = e.target.value.trim().toLowerCase(); render(); });
  // the search as the system's button (toolbar.css): Escape empties it, and the board's drawn again
  BolsterShell.searchButton($(".pl-toolbar .list-bar"), { onClear: () => { st.q = ""; render(); } });

  // phones: the tab of the stage in view follows the swipe; the tabs and the board scroll sideways only, never the page
  const sideways = (box, el, pad = 0) => {
    const a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    box.scrollLeft += a.left < b.left + pad ? a.left - b.left - pad : a.right > b.right - pad ? a.right - b.right + pad : 0;
  };
  const tabs = () => $$("#tabs [data-tab]").forEach((t) => { t.toggleAttribute("aria-current", t.dataset.tab === st.tab); if (t.dataset.tab === st.tab) sideways($("#tabs"), t, parseFloat(getComputedStyle($("#tabs")).paddingInlineStart) || 0); });
  // a picked tab steers the board to its stage; until it's there, the stages it passes don't take the tab
  let steering = false, steerTimer = 0;
  function show(key) {
    const c = $(`#col-${key}`, board);
    if (!c) return;
    const to = board.scrollLeft + c.getBoundingClientRect().left - board.getBoundingClientRect().left - (parseFloat(getComputedStyle(board).scrollPaddingInlineStart) || 0);
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (Math.abs(to - board.scrollLeft) < 1) return;
    steering = smooth;
    clearTimeout(steerTimer);
    if (smooth) steerTimer = setTimeout(steered, 1000);
    board.scrollTo({ left: to, behavior: smooth ? "smooth" : "auto" });
  }
  function inView() {
    if (!phone.matches || steering) return;
    const left = board.getBoundingClientRect().left;
    const near = $$(".pl-col", board).reduce((a, c) => (Math.abs(c.getBoundingClientRect().left - left) < Math.abs(a.getBoundingClientRect().left - left) ? c : a));
    if (near.dataset.stage !== st.tab) { st.tab = near.dataset.stage; tabs(); }
  }
  function steered() { clearTimeout(steerTimer); steering = false; inView(); }
  board.addEventListener("scroll", () => { edges(); if (!bar.hidden) mirror(board, bar); keepPop(); inView(); }, { passive: true });
  board.addEventListener("scrollend", () => { if (steering) steered(); });

  phone.addEventListener("change", render);
  addEventListener("resize", () => { fit(); if (popFor) BolsterShell.placePopover(pop, popFor.from, { start: popFor.start }); });
  // what hides and sticks as you scroll is the shell's: this page says where the board starts, and that a drag is in use
  BolsterShell.scrolling({ into: (top) => board.getBoundingClientRect().top < top, toolbar: phone.matches ? null : $(".pl-toolbar"), busy: () => !!drag?.started, onScroll: follow });
  render();
  BolsterShell.hydrateIcons();
})();
