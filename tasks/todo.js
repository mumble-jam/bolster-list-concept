// To-do list concept (D72): Bolster's Tasks as work to tick off (T-rules, D71). Sample tasks from the task
// model (system/model/task.json): a job's labor with its hours, things people wrote, material items.
(() => {
  const { TODAY, fmt, esc, kit } = window.BDS_CONCEPT;
  const { OWNERS, avatar, daysFrom } = kit;
  const ic = (n, s = 16, o) => window.BolsterIcons(n, s, o);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ME = OWNERS.find((o) => o.me);
  const who = (id) => OWNERS.find((o) => o.id === id);
  const firstName = (p) => (p.me ? "you" : p.name.split(" ")[0]);
  const PRIO = ["No priority", "Low", "Med", "High"];
  const mark = (level) => `<span class="prio-mark" data-level="${level}" aria-hidden="true"><i></i><i></i><i></i></span>`;

  BolsterShell.mount({ current: "tasks", links: { tasks: "index.html", "job-list": "../index.html#jobs", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog" } });

  // ---------- sample tasks: [name, job, kind, hours, due (days from today, null for none), priority 0-3, who, done (days ago)] ----------
  const RAW = [
    ["Hang drywall: ceilings", "Garage drywall", "labor", 6.5, -3, 3, "mr"],
    ["Call the client about the change order", "Basement finish", "general", null, -2, 2, "hm"],
    ["Labor for gypsum drywall - 5/8\" type X fire-rated board: garage ceiling and walls, two layers", "Fire-rated walls", "labor", 11.5, -1, 0, "pn"],
    ["Tape and mud, level 4 finish", "Office build-out", "labor", 8, 0, 2, "mr"],
    ["Confirm Monday's board delivery", "Office build-out", "general", null, 0, 0, null],
    ["Spray foam the rim joists", "Spray foam", "labor", 4.2, 0, 1, "dc"],
    ["Walk-through with the homeowner", "Bathroom remodel", "general", null, 1, 3, "hm"],
    ["Install batt insulation: exterior walls", "Attic insulation", "labor", 5.5, 1, 0, "pn"],
    ["Corner bead, metal", "Basement finish", "material", null, 2, 0, "dc"],
    ["Frame basement partition walls", "Basement finish", "labor", 9, 2, 1, "mr"],
    ["Sand and prime", "Kitchen drywall", "labor", 3.5, 3, 0, null],
    ["Send photos of the finished ceiling", "Ceiling repair", "general", null, 3, 0, "hm"],
    ["Skim coat the stairwell", "Skim coat", "labor", 7, 6, 2, "dc"],
    ["Book the scaffold rental", "Office build-out", "general", null, 8, 1, null],
    ["Install acoustic ceiling grid", "Soundproofing", "labor", 12, 11, 0, "pn"],
    ["Patch the ceiling after electrical", "Water damage repair", "labor", 2.5, 15, 0, null],
    ["Blown-in insulation, R-49", "Blown-in insulation", "material", null, 18, 0, null],
    ["Remove popcorn texture: living room", "Popcorn ceiling removal", "labor", 6, null, 0, null],
    ["Order more 1/2\" board", null, "general", null, null, 2, "hm"],
    ["Check the moisture readings before taping", "Water damage repair", "general", null, null, 0, null],
    ["Hang drywall: walls", "Kitchen drywall", "labor", 10, null, 0, null],
    ["Crawl space vapour barrier", "Crawl space insulation", "labor", 4, null, 0, "pn"],
    ["Fire caulk, intumescent", "Fire-rated walls", "material", null, null, 0, null],
    ["Demolition: water-damaged drywall", "Water damage repair", "labor", 3, null, 1, null],
    ["Mineral wool, 3 in.", "Soundproofing", "material", null, null, 0, null],
    ["Prime and paint the garage", "Garage drywall", "labor", 5, null, 0, null],
    ["Hang drywall: basement walls", "Basement finish", "labor", 14, -9, 0, "mr", 4],
    ["Measure the attic for insulation", "Attic insulation", "general", null, -6, 0, "dc", 6],
    ["Joint compound, all-purpose", "Kitchen drywall", "material", null, -4, 0, "pn", 3],
    ["Texture match: hallway patch", "Ceiling repair", "labor", 1.5, -2, 2, "mr", 1],
    ["Send the scope of work to the client", "Bathroom remodel", "general", null, null, 0, "hm", 2],
  ];
  const CREATED_BY = ["dc", "hm", "mr", "pn"];
  let tasks = RAW.map(([name, job, kind, hours, due, priority, assignee, doneAgo], i) => ({
    id: `t${i + 1}`, name, job, kind, hours, priority, assignee,
    due: due == null ? null : daysFrom(TODAY, due),
    created: daysFrom(TODAY, -(4 + (i * 3) % 19)), createdBy: CREATED_BY[i % 4],
    done: doneAgo != null, doneAt: doneAgo != null ? daysFrom(TODAY, -doneAgo) : null, doneBy: doneAgo != null ? assignee || "hm" : null,
  }));
  // your own order starts by priority, then due date (T-when); dragging changes it
  const dueKey = (t) => (t.due ? +t.due : Infinity);
  [...tasks].sort((a, b) => b.priority - a.priority || dueKey(a) - dueKey(b)).forEach((t, i) => (t.rank = i * 10));
  let nextId = tasks.length + 1;

  // ---------- state ----------
  const st = { group: "when", q: "", showCompleted: true, filters: { kind: ["general", "labor"] }, selecting: false, sel: new Set(), fresh: new Set(), completedOpen: false, adding: null, openId: null };

  // ---------- when ----------
  const dayDiff = (d) => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(TODAY).setHours(0, 0, 0, 0)) / 864e5);
  const toSunday = (7 - TODAY.getDay()) % 7; // days left in this week, Sunday its last day
  const WHEN = [
    { key: "overdue", label: "Overdue", late: true, test: (n) => n < 0 },
    { key: "today", label: "Today", test: (n) => n === 0, due: 0 },
    { key: "tomorrow", label: "Tomorrow", test: (n) => n === 1, due: 1 },
    { key: "week", label: "This week", test: (n) => n > 1 && n <= toSunday, due: 2 },
    { key: "later", label: "Later", test: (n) => n > Math.max(1, toSunday), due: Math.max(2, toSunday + 1) },
    { key: "none", label: "No due date", test: (n) => n == null, due: null },
  ];
  const dueWords = (d) => {
    const n = dayDiff(d);
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "Yesterday";
    if (n < -1 && n > -7) return `${-n} days ago`;
    if (n > 1 && n < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
    return fmt.date(d);
  };
  const isLate = (t) => !t.done && t.due && dayDiff(t.due) < 0;
  const status = (t) => (t.done ? "Completed" : isLate(t) ? "Overdue" : "To do");

  // ---------- filters: Bolster's own (its Filter & sort panel, read 19 Oct), picked as on the table card ----------
  // Show (the kinds of task, material items off when the page opens, as Bolster does), Priority, Assignee and
  // a period of due dates; each set one is a chip. Its Show completed tasks is in Display settings
  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const FILTERS = [
    { key: "kind", label: "Show", icon: "list", get: (t) => t.kind,
      options: () => [["general", "General tasks"], ["labor", "Labor tasks"], ["material", "Material items"]].map(([value, label]) => ({ value, label })) },
    { key: "prio", label: "Priority", icon: "status", get: (t) => String(t.priority),
      options: () => [3, 2, 1].map((l) => ({ value: String(l), label: PRIO[l], icon: mark(l) })) },
    { key: "who", label: "Assignee", icon: "user", get: (t) => t.assignee,
      options: () => OWNERS.map((p) => ({ value: p.id, label: p.me ? `${p.name} (you)` : p.name, icon: avatar(p, "sm") })) },
    { key: "period", label: "Period", icon: "calendar", period: true,
      test: (t, v) => !!t.due && (!v.from || isoDay(t.due) >= v.from) && (!v.to || isoDay(t.due) <= v.to) },
  ];
  const filterDef = (k) => FILTERS.find((f) => f.key === k);
  const dayOf = (iso) => fmt.date(new Date(`${iso}T12:00:00`));
  const filterText = (f, v) => f.period ? (v.from && v.to ? `${dayOf(v.from)} – ${dayOf(v.to)}` : v.from ? `from ${dayOf(v.from)}` : `until ${dayOf(v.to)}`)
    : v.map((x) => f.options().find((o) => o.value === x)?.label.replace(" (you)", "") ?? x).join(", ");
  const filtered = () => Object.keys(st.filters).length > 0;
  function renderToolbar() {
    const chips = FILTERS.filter((f) => st.filters[f.key] != null).map((f) => { const text = filterText(f, st.filters[f.key]);
      return `<span class="chip" data-active><button type="button" class="chip-main" data-chip="${f.key}" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(f.label)}: ${esc(text)}. Change filter"><span class="chip-field">${esc(f.label)}:</span><span class="chip-value">${esc(text)}</span></button><button type="button" class="chip-remove" data-remove="${f.key}" aria-label="Remove ${esc(f.label.toLowerCase())} filter" data-tip="Remove filter">${ic("xmark", 14)}</button></span>`; });
    if (chips.length) chips.push(`<button type="button" class="button clear-all" data-variant="ghost" data-size="sm" data-clear-all>Clear all</button>`);
    $("#filters").innerHTML = chips.join("");
    $("#add-filter").disabled = FILTERS.every((f) => st.filters[f.key] != null);
  }

  // ---------- which tasks, in which groups ----------
  const matches = (t) => {
    for (const [k, v] of Object.entries(st.filters)) { const f = filterDef(k); if (f.period ? !f.test(t, v) : !v.includes(f.get(t))) return false; }
    const q = st.q.trim().toLowerCase();
    return !q || `${t.name} ${t.job || ""}`.toLowerCase().includes(q);
  };
  // done stays in place until the list is next drawn (T-done): fresh ones keep their group
  const inCompleted = (t) => t.done && !st.fresh.has(t.id);
  function groups() {
    const shown = tasks.filter(matches);
    const open = shown.filter((t) => !inCompleted(t));
    let out;
    if (st.group === "job") {
      const jobs = [...new Set(open.map((t) => t.job || ""))].sort((a, b) => (!a) - (!b) || a.localeCompare(b));
      out = jobs.map((j) => ({ key: `job:${j}`, label: j || "No job", job: j || null, rows: open.filter((t) => (t.job || "") === j) }));
    } else {
      out = WHEN.map((w) => ({ ...w, rows: open.filter((t) => w.test(t.due ? dayDiff(t.due) : null)) })).filter((g) => g.rows.length || st.adding === g.key);
    }
    out.forEach((g) => g.rows.sort((a, b) => a.rank - b.rank));
    const done = shown.filter(inCompleted).sort((a, b) => b.doneAt - a.doneAt);
    if (done.length && st.showCompleted) out.push({ key: "completed", label: "Completed", rows: done, completed: true });
    return { out, shown };
  }

  // ---------- drawing ----------
  const dueChip = (t) => t.due
    ? `<button type="button" class="todo-due" data-pick="due" data-id="${t.id}"${isLate(t) ? " data-late" : ""} aria-haspopup="menu" aria-expanded="false" aria-label="Due ${esc(dueWords(t.due))}. Change the due date">${ic("calendar", 14)}<span>${esc(dueWords(t.due))}</span></button>`
    : `<button type="button" class="todo-due" data-pick="due" data-id="${t.id}" data-empty aria-haspopup="menu" aria-expanded="false" aria-label="No due date. Set one">${ic("calendar", 14)}<span>Date</span></button>`;
  const whoChip = (t) => {
    const p = t.assignee && who(t.assignee);
    return p
      ? `<button type="button" class="todo-who" data-pick="who" data-id="${t.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Assigned to ${esc(p.name)}. Change" data-tip="${esc(p.name)}">${avatar(p, "sm")}</button>`
      : `<button type="button" class="todo-who" data-pick="who" data-id="${t.id}" data-empty aria-haspopup="menu" aria-expanded="false" aria-label="No one on it. Assign" data-tip="Assign"><span class="ghost" aria-hidden="true">+</span></button>`;
  };
  const meta = (t) => [t.due && `<span${isLate(t) ? " data-late" : ""}>${esc(dueWords(t.due))}</span>`, st.group !== "job" && t.job && esc(t.job), t.hours && `${t.hours} h`, t.assignee && (who(t.assignee).me ? "You" : esc(who(t.assignee).name))].filter(Boolean).join(" · ");
  function rowHtml(t) {
    const lead = st.selecting
      ? `<input type="checkbox" class="checkbox" data-select="${t.id}" aria-label="Select ${esc(t.name)}"${st.sel.has(t.id) ? " checked" : ""}>`
      : `<input type="checkbox" class="todo-check" data-check="${t.id}" aria-label="Complete ${esc(t.name)}"${t.done ? " checked" : ""}>`;
    return `<li class="todo-row" data-id="${t.id}"${t.done ? " data-done" : ""}${st.sel.has(t.id) ? " data-selected" : ""}${st.openId === t.id ? " data-open" : ""}>
      <button type="button" class="todo-grip" data-grip="${t.id}" aria-label="Move ${esc(t.name)}: Alt and the arrow keys" data-tip="Drag to move">${ic("grip", 14)}</button>
      ${lead}
      <button type="button" class="todo-prio" data-pick="prio" data-id="${t.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Priority: ${PRIO[t.priority]}. Change" data-tip="${t.priority ? PRIO[t.priority] : "Set priority"}">${mark(t.priority)}</button>
      <div class="todo-main">
        <button type="button" class="todo-title" data-open-task="${t.id}">${esc(t.name)}</button>
        ${st.group !== "job" && t.job ? `<a class="todo-job" href="../index.html#jobs" data-tip="Open ${esc(t.job)}">${esc(t.job)}</a>` : ""}
        <p class="todo-meta">${meta(t)}</p>
      </div>
      <div class="todo-side">
        <span class="todo-hours">${t.hours ? `${t.hours} h` : ""}</span>
        ${dueChip(t)}${whoChip(t)}
      </div>
    </li>`;
  }
  const addHint = (g) => (g.completed || g.late ? "" : g.job !== undefined ? (g.job ? `for ${g.job}` : "no job") : g.due == null ? "no due date" : `due ${dueWords(daysFrom(TODAY, g.due)).toLowerCase()}`);
  function addHtml(g) {
    if (g.completed || g.late || st.selecting) return "";
    if (st.adding !== g.key) return `<button type="button" class="todo-add" data-add="${esc(g.key)}">${ic("circle-plus", 14)}<span>Add task</span><span class="todo-add-hint">${esc(addHint(g))}</span></button>`;
    return `<form class="todo-add-form" data-add-form="${esc(g.key)}"><input type="checkbox" class="todo-check" disabled aria-hidden="true" tabindex="-1">
      <input class="input" data-size="sm" name="name" placeholder="Task name" aria-label="New task, ${esc(addHint(g))}" autocomplete="off"><p class="field-helper">Enter adds it, ${esc(addHint(g))}; Escape stops.</p></form>`;
  }
  function render({ keepFresh = false } = {}) {
    if (!keepFresh) st.fresh.clear();
    renderToolbar();
    const { out, shown } = groups();
    const openCount = tasks.filter((t) => !t.done).length, shownOpen = shown.filter((t) => !t.done).length;
    $("#bar-count").textContent = $("#result-count").textContent = shownOpen === openCount ? fmt.plural(openCount, "open task", "open tasks") : `${fmt.count(shownOpen)} of ${fmt.plural(openCount, "open task", "open tasks")}`;
    if (!out.length) { $("#groups").innerHTML = `<p class="card todo-empty">${st.q || filtered() ? "No tasks match. Try another search or filter." : "Nothing to do. Tasks from jobs' schedules and ones you add show up here."}</p>`; return; }
    $("#groups").innerHTML = out.map((g) => {
      const open = g.rows.filter((t) => !t.done).length, id = `g-${g.key.replace(/[^a-z0-9]+/gi, "-")}`;
      const head = g.completed
        ? `<h2 class="todo-group-head" id="${id}"><button type="button" class="todo-fold" data-fold aria-expanded="${st.completedOpen}">${ic("chevron-down", 12)}<span class="todo-group-label">Completed</span><span class="todo-group-count">${g.rows.length}</span></button></h2>`
        : `<h2 class="todo-group-head" id="${id}"${g.late ? " data-late" : ""}><span class="todo-group-label">${esc(g.label)}</span><span class="todo-group-count" data-count="${esc(g.key)}">${open || ""}</span></h2>`;
      const rows = g.completed && !st.completedOpen ? "" : `<ul class="todo-list" data-group="${esc(g.key)}" aria-labelledby="${id}">${g.rows.map(rowHtml).join("")}</ul>`;
      return `<section class="card todo-group" data-group-key="${esc(g.key)}">${head}${rows}${addHtml(g)}</section>`;
    }).join("");
    if (st.adding) $(`[data-add-form] input[name=name]`)?.focus({ preventScroll: true });
    renderBulk();
  }
  // a tick changes the row and the counts, never the layout (I13): the task stays where it is
  function patchRow(t) {
    const li = $(`.todo-row[data-id="${t.id}"]`);
    if (li) li.outerHTML = rowHtml(t);
    $$("[data-count]").forEach((c) => { const g = c.closest(".todo-group"); const n = $$(".todo-row:not([data-done])", g).length; c.textContent = n || ""; });
    const openCount = tasks.filter((x) => !x.done).length;
    $("#bar-count").textContent = $("#result-count").textContent = fmt.plural(openCount, "open task", "open tasks");
    if (st.openId === t.id) drawTask(t.id);
  }

  // ---------- ticking, with undo (T-check) ----------
  function toast(message, undo) {
    const t = document.createElement("div");
    t.className = "toast"; t.dataset.tone = "info"; t.setAttribute("role", "status");
    t.innerHTML = `<span class="toast-message"></span>${undo ? `<button class="toast-action">Undo</button>` : ""}<button class="toast-close" aria-label="Dismiss" data-tip="Dismiss">×</button>`;
    $(".toast-message", t).textContent = message;
    $(".toast-close", t).onclick = () => t.remove();
    if (undo) $(".toast-action", t).onclick = () => { undo(); t.remove(); };
    const region = $(".toast-region"), host = [...document.querySelectorAll("dialog:modal")].pop() || document.body;
    if (region.parentElement !== host) host.append(region);
    region.append(t);
    setTimeout(() => t.remove(), 5000);
  }
  function setDone(ids, done, { say = true } = {}) {
    const list = ids.map((id) => tasks.find((t) => t.id === id)).filter((t) => t.done !== done);
    if (!list.length) return;
    const was = list.map((t) => ({ t, doneAt: t.doneAt, doneBy: t.doneBy, fresh: st.fresh.has(t.id) }));
    for (const t of list) { t.done = done; t.doneAt = done ? new Date(TODAY) : null; t.doneBy = done ? ME.id : null; if (done) st.fresh.add(t.id); }
    // reopening one from Completed brings it back to its group: a redraw that keeps the fresh ones in place
    const fromCompleted = !done && list.some((t) => !!$(`.todo-row[data-id="${t.id}"]`)?.closest('[data-group="completed"]'));
    if (fromCompleted || list.length > 1) render({ keepFresh: true }); else list.forEach(patchRow);
    if (!say) return;
    const what = list.length === 1 ? (done ? "Task completed" : "Task reopened") : `${fmt.count(list.length)} tasks ${done ? "completed" : "reopened"}`;
    toast(what, () => { for (const w of was) { w.t.done = !done; w.t.doneAt = w.doneAt; w.t.doneBy = w.doneBy; if (!w.fresh) st.fresh.delete(w.t.id); } render({ keepFresh: true }); });
  }

  // ---------- pickers: due date, priority, who (T-in-place) ----------
  const pop = $("#pop");
  const sheet = matchMedia("(max-width: 767px)");
  let popFor = null, calMonth = null;
  const item = (attrs, label, { icon, hint, on } = {}) => `<button type="button" class="menu-item" role="menuitemradio" aria-checked="${!!on}" ${attrs}>${icon ? `<span class="menu-icon">${icon}</span>` : ""}<span>${esc(label)}</span>${hint ? `<span class="menu-hint">${esc(hint)}</span>` : ""}</button>`; // the menu marks the chosen one
  const targets = () => (popFor.bulk ? [...st.sel].map((id) => tasks.find((t) => t.id === id)) : [tasks.find((t) => t.id === popFor.id)]);
  const nextMonday = () => (8 - TODAY.getDay()) % 7 || 7;
  function fillPop() {
    const one = !popFor.bulk && targets()[0];
    if (popFor.kind === "due") {
      const cur = one?.due ? dayDiff(one.due) : one ? null : undefined;
      const presets = [[0, "Today"], [1, "Tomorrow"], [nextMonday(), "Next week"]];
      let html = presets.map(([n, l]) => item(`data-set-due="${n}"`, l, { hint: daysFrom(TODAY, n).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), on: cur === n })).join("")
        + item(`data-set-due="none"`, "No due date", { on: one && cur === null });
      const m = calMonth || new Date(one?.due || TODAY);
      const first = new Date(m.getFullYear(), m.getMonth(), 1), days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const title = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      let cells = Array(first.getDay()).fill("<td></td>");
      for (let d = 1; d <= days; d++) {
        const date = new Date(m.getFullYear(), m.getMonth(), d), n = dayDiff(date), sel = cur === n;
        cells.push(`<td${n === 0 ? " data-today" : ""}${sel ? ' data-range="single" aria-selected="true"' : ""}><button type="button" class="calendar-day" data-set-due="${n}" aria-label="${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}">${d}</button></td>`);
      }
      while (cells.length % 7) cells.push("<td></td>");
      const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);
      html += `<hr class="menu-separator"><div class="todo-cal calendar-month"><div class="todo-cal-nav"><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-cal="-1" aria-label="Previous month" data-tip="Previous month">${ic("chevron-left", 14)}</button><h4 class="calendar-title" id="todo-cal-title">${title}</h4><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-cal="1" aria-label="Next month" data-tip="Next month">${ic("chevron-right", 14)}</button></div>
        <table class="calendar-grid" role="grid" aria-labelledby="todo-cal-title"><thead><tr>${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => `<th scope="col" abbr="${d}">${d[0]}</th>`).join("")}</tr></thead><tbody>${weeks.join("")}</tbody></table></div>`;
      pop.innerHTML = `<div class="pop-body">${html}</div>`;
    } else if (popFor.kind === "prio") {
      pop.innerHTML = `<div class="pop-body">${[3, 2, 1, 0].map((l) => item(`data-set-prio="${l}"`, PRIO[l], { icon: mark(l), on: one && one.priority === l })).join("")}</div>`;
    } else if (popFor.kind === "who") {
      const people = [ME, ...OWNERS.filter((o) => !o.me)];
      pop.innerHTML = `<div class="pop-body">${people.map((p) => item(`data-set-who="${p.id}"`, p.me ? "Assign to me" : p.name, { icon: avatar(p, "sm"), on: one && one.assignee === p.id })).join("")}${item(`data-set-who="none"`, "No one", { on: one && !one.assignee })}</div>`;
    } else if (popFor.kind === "add") {
      pop.innerHTML = `<div class="pop-body">${FILTERS.filter((f) => st.filters[f.key] == null).map((f) => `<button type="button" class="menu-item" role="menuitem" data-add-filter="${f.key}"><span class="menu-icon">${ic(`m-${f.icon}`, 14)}</span><span>${esc(f.label)}</span></button>`).join("")}</div>`;
    } else if (popFor.kind === "filter") {
      const f = filterDef(popFor.id), v = st.filters[f.key];
      pop.setAttribute("role", "dialog");
      pop.innerHTML = f.period
        ? `<div class="pop-head"><h3>Period</h3></div><form class="pop-body todo-period" data-period><p class="text-caption text-secondary">Tasks due between these dates.</p>
            <div class="field" data-size="sm"><label class="field-label" for="period-from">Start date</label><input class="input" type="date" id="period-from" name="from" value="${v?.from || ""}"></div>
            <div class="field" data-size="sm"><label class="field-label" for="period-to">End date</label><input class="input" type="date" id="period-to" name="to" value="${v?.to || ""}"></div>
            <div class="cluster" style="justify-content:flex-end"><button type="submit" class="button" data-size="sm">Show tasks</button></div></form>`
        : `<div class="pop-head"><h3>${esc(f.label)}</h3></div><div class="pop-body">${f.options().map((o) => `<label class="option"><input type="checkbox" class="checkbox" data-filter-opt="${esc(o.value)}"${v?.includes(o.value) ? " checked" : ""}><span class="option-label">${o.icon ? `<span class="menu-icon">${o.icon}</span>` : ""}${esc(o.label)}</span></label>`).join("")}</div>`;
    } else if (popFor.kind === "display") {
      pop.innerHTML = `<div class="pop-head"><h3>Group by</h3></div><div class="pop-body">${[["when", "Date"], ["job", "Job"]].map(([v, l]) => item(`data-group-by="${v}"`, l, { icon: ic(v === "when" ? "m-calendar" : "m-briefcase", 14), on: st.group === v })).join("")}
        <hr class="menu-separator"><label class="option"><input type="checkbox" class="checkbox" data-show-completed${st.showCompleted ? " checked" : ""}><span class="option-label">Show completed tasks</span></label></div>`;
    }
  }
  function place() {
    const a = popFor.from;
    $$("[aria-expanded='true']").forEach((el) => el !== a && el.closest("#pop, .todo-groups, .list-bar, #bulk-bar, .detail") && el.setAttribute("aria-expanded", "false"));
    a?.setAttribute("aria-expanded", "true");
    if (sheet.matches || !a) { pop.style.left = pop.style.top = ""; return; }
    const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    // what opens from the bar's left (Add filter, a chip) starts at its trigger's left; the rest ends at its right
    const start = a.id === "add-filter" || !!a.closest(".chip");
    const left = Math.max(12, Math.min(start ? r.left : r.right - w, innerWidth - w - 12));
    let top = r.bottom + 4;
    if (top + h > innerHeight - 12 && r.top - h - 4 > 12) top = r.top - h - 4;
    pop.style.left = `${left}px`; pop.style.top = `${Math.max(12, top)}px`;
  }
  function openPick(kind, from, { id, bulk = false } = {}) {
    if (pop.matches(":popover-open") && popFor?.from === from) { pop.hidePopover(); return; }
    popFor = { kind, from, id, bulk }; calMonth = null;
    pop.dataset.kind = kind;
    pop.setAttribute("role", "menu");
    pop.setAttribute("aria-label", { due: "Due date", prio: "Priority", who: "Assign to", add: "Add a filter", filter: `Filter by ${filterDef(id)?.label.toLowerCase()}`, display: "Display settings" }[kind]);
    const host = from?.closest("dialog[open]") || document.body;
    if (pop.parentElement !== host) host.append(pop);
    fillPop(); pop.showPopover(); place();
    ($("[aria-checked=true]", pop) || $("input, button", pop))?.focus({ preventScroll: true });
  }
  pop.addEventListener("toggle", (e) => { if (e.newState === "closed") { popFor?.from?.setAttribute("aria-expanded", "false"); const f = popFor?.from; popFor = null; if (f?.isConnected && pop.contains(document.activeElement)) f.focus({ preventScroll: true }); } });
  function apply(change, words) {
    const list = targets();
    list.forEach(change);
    const from = popFor?.from, key = from?.dataset.pick, id = from?.dataset.id;
    pop.hidePopover();
    render({ keepFresh: true });
    if (st.openId) drawTask(st.openId);
    if (popFor === null && id) $(`[data-pick="${key}"][data-id="${id}"]`)?.focus({ preventScroll: true });
    if (list.length > 1) toast(`${fmt.plural(list.length, "task", "tasks")} ${words}`);
  }

  // ---------- adding (T-add) ----------
  function addTask(key, name) {
    const g = groups().out.find((x) => x.key === key) || { key };
    const due = key.startsWith("job:") ? null : WHEN.find((w) => w.key === key)?.due;
    const t = { id: `t${nextId++}`, name, job: key.startsWith("job:") ? key.slice(4) || null : null, kind: "general", hours: null, priority: 0, assignee: null,
      due: due == null ? null : daysFrom(TODAY, due), created: new Date(TODAY), createdBy: ME.id, done: false, doneAt: null, doneBy: null };
    const last = g.rows?.at(-1);
    t.rank = (last ? last.rank : Math.max(0, ...tasks.map((x) => x.rank))) + 5;
    tasks.push(t);
    render({ keepFresh: true });
  }

  // ---------- your own order: drag by the handle, or Alt and the arrows (D72) ----------
  // Within a group it only reorders. Grouped by when, dropping into another day's group gives the task that
  // day (I17): Today and Tomorrow exactly, This week and Later their first day unless its date is in them
  // already, No due date none. Overdue and Completed take no drops: neither is a day you can give.
  let drag = null;
  function moveTo(t, list, index) {
    const others = list.filter((x) => x !== t);
    const before = others[index - 1], after = others[index];
    t.rank = before && after ? (before.rank + after.rank) / 2 : before ? before.rank + 10 : after ? after.rank - 10 : t.rank;
  }
  const groupRows = (key) => groups().out.find((g) => g.key === key)?.rows || [];
  const dayGroup = (key) => st.group === "when" && WHEN.find((w) => w.key === key && !w.late);
  // from any when group (Overdue too: moving a late task gives it a day) into a day's group
  const isWhen = (key) => st.group === "when" && WHEN.some((w) => w.key === key);
  const canDrop = (from, to) => from === to || (isWhen(from) && !!dayGroup(to));
  // give a task the day of the group it was moved into; returns how to put it back
  function giveDay(t, key) {
    const w = dayGroup(key), was = t.due;
    if (!w || w.test(t.due ? dayDiff(t.due) : null)) return null;
    t.due = w.due == null ? null : daysFrom(TODAY, w.due);
    return () => { t.due = was; };
  }
  function moved(t, back) {
    render({ keepFresh: true });
    if (back) toast(t.due ? `Due ${dueWords(t.due).toLowerCase()}, ${t.due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}` : "No due date", () => { back(); render({ keepFresh: true }); });
  }
  document.addEventListener("pointerdown", (e) => { const g = e.target.closest("[data-grip]"); if (g) g.closest(".todo-row").draggable = true; });
  document.addEventListener("dragstart", (e) => {
    const li = e.target.closest?.(".todo-row"); if (!li) return;
    drag = { id: li.dataset.id, group: li.closest("[data-group]").dataset.group };
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", li.dataset.id);
    requestAnimationFrame(() => li.setAttribute("data-dragging", ""));
  });
  // the line that shows where it lands, in the seam between two rows of the target's card
  const line = Object.assign(document.createElement("div"), { className: "todo-drop-line" });
  line.setAttribute("aria-hidden", "true");
  function showLine(tg) {
    const card = tg.el.closest(".todo-group"), c = card.getBoundingClientRect(), r = tg.el.getBoundingClientRect();
    const row = tg.el.closest(".todo-row"), check = row ? $(".todo-check, .checkbox", row).getBoundingClientRect() : null;
    const left = (check ? check.left : r.left + 24) - c.left - card.clientLeft, right = (row ? r.right : c.right - 8) - c.left - card.clientLeft;
    const y = (tg.where === "before" ? r.top : r.bottom) - c.top - card.clientTop;
    if (line.parentElement !== card) card.append(line);
    Object.assign(line.style, { insetBlockStart: `${y - 1}px`, insetInlineStart: `${left}px`, inlineSize: `${right - left}px` });
  }
  const hideLine = () => line.remove();
  // where a drop lands: before or after a row, or at the end of a group when over its header or Add task
  function dropTarget(e) {
    const li = e.target.closest?.(".todo-row");
    if (li?.dataset.id === drag.id) return null; // over its own row: it stays where it is
    if (li) { const r = li.getBoundingClientRect(); return { el: li, group: li.closest("[data-group]").dataset.group, id: li.dataset.id, where: e.clientY < r.top + r.height / 2 ? "before" : "after" }; }
    const sec = e.target.closest?.(".todo-group");
    if (sec && !li) { const rows = $$(".todo-row", sec).filter((x) => x.dataset.id !== drag.id), last = rows.at(-1); return { el: last || $(".todo-group-head", sec), group: sec.dataset.groupKey, id: last?.dataset.id, where: "after" }; }
    return null;
  }
  document.addEventListener("dragover", (e) => {
    if (!drag) return;
    const tg = dropTarget(e);
    if (!tg || !canDrop(drag.group, tg.group)) { if (!e.target.closest?.(".todo-drop-line")) hideLine(); return; }
    e.preventDefault();
    showLine(tg);
  });
  // put the dragged task where the line was: its place in that group, and that group's day
  function dropAt(tg) {
    const t = tasks.find((x) => x.id === drag.id), rows = groupRows(tg.group).filter((x) => x !== t);
    const at = tg.id ? rows.findIndex((x) => x.id === tg.id) + (tg.where === "after" ? 1 : 0) : rows.length;
    const back = tg.group !== drag.group ? giveDay(t, tg.group) : null;
    moveTo(t, [...rows, t], at);
    drag = null; hideLine(); moved(t, back);
  }
  document.addEventListener("drop", (e) => {
    if (!drag) return;
    const tg = dropTarget(e);
    if (!tg || !canDrop(drag.group, tg.group)) return;
    e.preventDefault();
    dropAt(tg);
  });

  // phones: no handle and no native drag on touch, so a long press lifts the task (a tick of vibration
  // where there is one), the line follows the finger, the page scrolls near its edges, and letting go
  // drops it; moving before the press is long enough is a scroll, as always (I17)
  const LIFT_MS = 450, SLOP = 8;
  let press = null, lifted = null, swallowClick = false;
  const endPress = () => { if (press) clearTimeout(press.timer); press = null; };
  function endLift() {
    if (!lifted) return;
    lifted.li.removeAttribute("data-lifted"); cancelAnimationFrame(lifted.raf); hideLine();
    lifted = null; drag = null;
  }
  function follow() {
    const el = document.elementFromPoint(lifted.x, lifted.y);
    const tg = el && dropTarget({ target: el, clientY: lifted.y });
    lifted.tg = tg && canDrop(drag.group, tg.group) ? tg : null;
    lifted.tg ? showLine(lifted.tg) : hideLine();
  }
  function scrollLoop() {
    if (!lifted) return;
    const edge = 96, bottom = innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-bottom-bar-height")) || 64) - edge;
    const dy = lifted.y < edge ? -(edge - lifted.y) / 6 : lifted.y > bottom ? (lifted.y - bottom) / 6 : 0;
    if (dy) { scrollBy(0, dy); follow(); }
    lifted.raf = requestAnimationFrame(scrollLoop);
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || st.selecting) return;
    const li = e.target.closest(".todo-row");
    if (!li || li.hasAttribute("data-done") || e.target.closest("input, a, .todo-prio, .todo-due, .todo-who")) return;
    press = { li, x: e.clientX, y: e.clientY, timer: setTimeout(() => {
      const p = press; press = null;
      drag = { id: p.li.dataset.id, group: p.li.closest("[data-group]").dataset.group };
      lifted = { li: p.li, x: p.x, y: p.y, tg: null };
      p.li.setAttribute("data-lifted", "");
      navigator.vibrate?.(10);
      follow(); scrollLoop();
    }, LIFT_MS) };
  });
  document.addEventListener("pointermove", (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) endPress();
    if (lifted) { lifted.x = e.clientX; lifted.y = e.clientY; follow(); }
  });
  // once lifted, the finger moves the task, not the page
  document.addEventListener("touchmove", (e) => { if (lifted) e.preventDefault(); }, { passive: false });
  document.addEventListener("pointerup", () => {
    endPress();
    if (!lifted) return;
    const tg = lifted.tg; swallowClick = true; setTimeout(() => (swallowClick = false), 400);
    lifted.li.removeAttribute("data-lifted"); cancelAnimationFrame(lifted.raf); lifted = null;
    if (tg) dropAt(tg); else { hideLine(); drag = null; }
  });
  document.addEventListener("pointercancel", () => { endPress(); endLift(); });
  // the press that lifted isn't also a tap on the title, and no callout menu opens under it
  document.addEventListener("click", (e) => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener("contextmenu", (e) => { if (e.target.closest?.(".todo-row") && (press || lifted)) e.preventDefault(); });
  document.addEventListener("dragend", () => { hideLine(); $$("[data-dragging]").forEach((x) => x.removeAttribute("data-dragging")); $$(".todo-row[draggable]").forEach((x) => x.removeAttribute("draggable")); drag = null; });
  document.addEventListener("keydown", (e) => {
    const g = e.target.closest?.("[data-grip]");
    if (!g || !e.altKey || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const key = g.closest("[data-group]").dataset.group, rows = groupRows(key), t = tasks.find((x) => x.id === g.dataset.grip), i = rows.indexOf(t);
    const up = e.key === "ArrowUp", to = up ? i - 1 : i + 1;
    let back = null, where = key, list = rows, at = to;
    if (to < 0 || to >= rows.length) {
      // past the group's edge: into the next day's group, at its near end
      const keys = groups().out.map((x) => x.key).filter((k) => canDrop(key, k));
      const next = keys[keys.indexOf(key) + (up ? -1 : 1)];
      if (!next || next === key) return;
      where = next; list = [...groupRows(next), t]; at = up ? list.length - 1 : 0;
      back = giveDay(t, next);
    }
    moveTo(t, list, at);
    moved(t, back);
    $(`[data-grip="${t.id}"]`)?.focus();
    const now = groupRows(where);
    $("#live").textContent = `${t.name}: ${groups().out.find((x) => x.key === where).label}, ${now.indexOf(t) + 1} of ${now.length}`;
  });

  // ---------- selecting: a mode, since the check completes (T-check) ----------
  function renderBulk() {
    const bar = $("#bulk-bar"), n = st.sel.size;
    $("#select-mode").textContent = st.selecting ? "Done" : "Select";
    document.querySelector(".todo-page").toggleAttribute("data-selecting", st.selecting);
    if (!st.selecting) { bar.hidden = true; return; }
    bar.hidden = false;
    const visible = groups().out.flatMap((g) => g.rows).filter((t) => !t.done);
    bar.innerHTML = `<button type="button" class="floating-bar-count" data-clear-sel aria-label="Clear selection (${n} selected)">${ic("xmark", 12)}<span aria-live="polite">${n} selected</span></button>
      <button type="button" class="floating-bar-link" data-select-all>Select all ${visible.length}</button>
      <span class="floating-bar-sep" aria-hidden="true"></span>
      <span class="floating-bar-actions">
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-bulk="complete"${n ? "" : " disabled"}>${ic("square-check", 14)}<span class="floating-bar-label">Complete</span></button>
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-bulk="due" aria-haspopup="menu" aria-expanded="false"${n ? "" : " disabled"}>${ic("calendar", 14)}<span class="floating-bar-label">Due date</span></button>
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-bulk="who" aria-haspopup="menu" aria-expanded="false"${n ? "" : " disabled"}>${ic("user", 14)}<span class="floating-bar-label">Assign</span></button>
      </span>`;
  }
  function setSelecting(on) { st.selecting = on; st.sel.clear(); st.adding = null; render({ keepFresh: true }); }

  // ---------- the task, beside the list or as a sheet (T-open) ----------
  const split = matchMedia("(min-width: 1280px)");
  function taskHtml(t) {
    const p = t.assignee && who(t.assignee), by = who(t.createdBy);
    const story = [[`Created by ${by.name}`, t.created], p && [`Assigned to ${p.name}`, daysFrom(t.created, 1)], t.done && [`Completed by ${who(t.doneBy).name}`, t.doneAt]].filter(Boolean);
    return `<header class="detail-head"><h2 id="detail-title" tabindex="-1">${esc(t.name)}</h2>
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Close" data-close-task data-tip="Close">${ic("xmark", 18, { optical: true })}</button></header>
      <div class="detail-scroll">
        <div class="detail-section detail-hero">
          <p class="detail-sub">${status(t)}${t.done ? ` · ${fmt.ago(t.doneAt).toLowerCase()}` : ""}</p>
          <div class="detail-actions"><button type="button" class="button" data-variant="secondary" data-check="${t.id}" data-from-task>${ic(t.done ? "undo" : "square-check", 14, { optical: true })}${t.done ? "Reopen" : "Complete"}</button></div>
        </div>
        <dl class="detail-section detail-fields todo-detail-fields">
          <div><dt>Due date</dt><dd>${dueChip(t)}</dd></div>
          <div><dt>Priority</dt><dd><button type="button" class="todo-prio" data-pick="prio" data-id="${t.id}" aria-haspopup="menu" aria-expanded="false">${mark(t.priority)}<span>${PRIO[t.priority]}</span></button></dd></div>
          <div><dt>Assignee</dt><dd><button type="button" class="todo-who" data-pick="who" data-id="${t.id}" aria-haspopup="menu" aria-expanded="false">${p ? `${avatar(p, "sm")}<span>${esc(p.name)}</span>` : `<span class="ghost" aria-hidden="true">+</span><span class="text-secondary">No one</span>`}</button></dd></div>
          <div><dt>Job</dt><dd>${t.job ? `<a class="detail-link" href="../index.html#jobs">${esc(t.job)}</a>` : `<span class="text-secondary">No job</span>`}</dd></div>
          <div><dt>Hours</dt><dd>${t.hours ? `${t.hours} h` : `<span class="text-secondary">–</span>`}</dd></div>
          <div><dt>Kind</dt><dd>${{ labor: "Labor, from the job's schedule", general: "Written by someone", material: "Material item" }[t.kind]}</dd></div>
        </dl>
        <div class="detail-section"><ol class="todo-story">${story.map(([w, d]) => `<li>${esc(w)} <time>${esc(fmt.ago(d).toLowerCase())}</time></li>`).join("")}</ol></div>
      </div>`;
  }
  function drawTask(id) {
    const t = tasks.find((x) => x.id === id);
    const host = split.matches ? $("#detail") : $("#peek");
    host.innerHTML = taskHtml(t);
  }
  function openTask(id, byKey) {
    st.openId = id;
    $$(".todo-row[data-open]").forEach((r) => r.removeAttribute("data-open"));
    $(`.todo-row[data-id="${id}"]`)?.setAttribute("data-open", "");
    drawTask(id);
    if (split.matches) { $("#detail").hidden = false; $("#list-split").setAttribute("data-open", ""); }
    else if (!$("#peek").open) $("#peek").showModal();
    $("#detail-title").focus({ focusVisible: byKey });
  }
  function closeTask() {
    const id = st.openId; st.openId = null;
    $("#detail").hidden = true; $("#detail").innerHTML = ""; $("#list-split").removeAttribute("data-open");
    if ($("#peek").open) $("#peek").close();
    $$(".todo-row[data-open]").forEach((r) => r.removeAttribute("data-open"));
    $(`[data-open-task="${id}"]`)?.focus({ preventScroll: true });
  }
  $("#peek").addEventListener("close", () => { if (st.openId) { const id = st.openId; st.openId = null; $$(".todo-row[data-open]").forEach((r) => r.removeAttribute("data-open")); $(`[data-open-task="${id}"]`)?.focus({ preventScroll: true }); } });
  split.addEventListener("change", () => { if (st.openId) { const id = st.openId; if ($("#peek").open) $("#peek").close(); $("#detail").hidden = true; openTask(id); } });

  // ---------- events ----------
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-check]");
    if (c && !c.dataset.fromTask) return setDone([c.dataset.check], c.checked);
    // ticking a value applies it at once; none, or all of them, is no filter
    const fo = e.target.closest("[data-filter-opt]");
    if (fo && popFor) { const k = popFor.id, set = new Set(st.filters[k] || []); fo.checked ? set.add(fo.dataset.filterOpt) : set.delete(fo.dataset.filterOpt);
      const order = filterDef(k).options().map((o) => o.value), vals = order.filter((x) => set.has(x)); vals.length && vals.length < order.length ? (st.filters[k] = vals) : delete st.filters[k]; render(); if (popFor.from && !popFor.from.isConnected) popFor.from = $(`[data-chip="${k}"]`) || $("#add-filter"); place(); return; }
    if (e.target.matches("[data-show-completed]")) { st.showCompleted = e.target.checked; render(); return; }
    const s = e.target.closest("[data-select]");
    if (s) { s.checked ? st.sel.add(s.dataset.select) : st.sel.delete(s.dataset.select); s.closest(".todo-row").toggleAttribute("data-selected", s.checked); renderBulk(); return; }
  });
  document.addEventListener("click", (e) => {
    const q = (s) => e.target.closest(s);
    let el;
    if ((el = q("[data-from-task]"))) { const t = tasks.find((x) => x.id === el.dataset.check); return setDone([t.id], !t.done); }
    if ((el = q("[data-pick]"))) return openPick(el.dataset.pick, el, { id: el.dataset.id });
    if ((el = q("#add-filter"))) return openPick("add", el);
    if ((el = q("[data-add-filter]"))) { const k = el.dataset.addFilter, from = $("#add-filter"); pop.hidePopover(); return openPick("filter", from, { id: k }); }
    if ((el = q("[data-chip]"))) return openPick("filter", el, { id: el.dataset.chip });

    if ((el = q("[data-remove]"))) { delete st.filters[el.dataset.remove]; render(); return $("#add-filter").focus({ preventScroll: true }); }
    if (q("[data-clear-all]")) { st.filters = {}; render(); return $("#add-filter").focus({ preventScroll: true }); }
    if ((el = q("#view-options"))) return openPick("display", el);
    if ((el = q("[data-group-by]"))) { st.group = el.dataset.groupBy; st.adding = null; pop.hidePopover(); render(); return; }
    if (q("#search-open")) return openSearch();
    if ((el = q("[data-bulk]"))) { if (el.dataset.bulk === "complete") { setDone([...st.sel], true); st.sel.clear(); return renderBulk(); } return openPick(el.dataset.bulk, el, { bulk: true }); }
    if ((el = q("[data-set-due]"))) { const v = el.dataset.setDue; const d = v === "none" ? null : daysFrom(TODAY, +v); return apply((t) => (t.due = d), v === "none" ? "have no due date" : `due ${dueWords(d).toLowerCase()}`); }
    if ((el = q("[data-cal]"))) { const m = calMonth || new Date(targets()[0]?.due || TODAY); calMonth = new Date(m.getFullYear(), m.getMonth() + +el.dataset.cal, 1); fillPop(); place(); $(`[data-cal="${el.dataset.cal}"]`, pop)?.focus(); return; }
    if ((el = q("[data-set-prio]"))) return apply((t) => (t.priority = +el.dataset.setPrio), `set to ${PRIO[+el.dataset.setPrio].toLowerCase()}`);
    if ((el = q("[data-set-who]"))) { const v = el.dataset.setWho; return apply((t) => (t.assignee = v === "none" ? null : v), v === "none" ? "unassigned" : `assigned to ${who(v).name}`); }
    if ((el = q("[data-open-task]"))) { if (st.selecting) return; return openTask(el.dataset.openTask, e.detail === 0); }
    if (q("[data-close-task]")) return closeTask();
    if ((el = q("[data-add]"))) { st.adding = el.dataset.add; return render({ keepFresh: true }); }
    if (q("[data-fold]")) { st.completedOpen = !st.completedOpen; render({ keepFresh: true }); return $("[data-fold]")?.focus({ preventScroll: true }); }
    if (q("#select-mode")) return setSelecting(!st.selecting);
    if (q("[data-clear-sel]")) { st.sel.clear(); return render({ keepFresh: true }); }
    if (q("[data-select-all]")) { groups().out.flatMap((g) => g.rows).filter((t) => !t.done).forEach((t) => st.sel.add(t.id)); return render({ keepFresh: true }); }
    if (q("#create")) { if (st.selecting) setSelecting(false); st.adding = st.group === "job" ? groups().out[0]?.key : "today"; render({ keepFresh: true }); return; }
    if ((el = q("[data-open-dialog]"))) return $(`#${el.dataset.openDialog}`).showModal();
    if ((el = q("dialog [data-close]"))) return el.closest("dialog").close();
    // selecting: a tap on the row ticks its box
    if (st.selecting && (el = q(".todo-row")) && !q("button, a, input")) { const box = $("[data-select]", el); box.checked = !box.checked; box.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  document.addEventListener("submit", (e) => {
    const pf = e.target.closest("[data-period]");
    if (pf) { e.preventDefault(); const from = pf.from.value, to = pf.to.value; from || to ? (st.filters.period = { from, to }) : delete st.filters.period; pop.hidePopover(); render(); return $('[data-chip="period"]')?.focus({ preventScroll: true }) || $("#add-filter").focus({ preventScroll: true }); }
    const f = e.target.closest("[data-add-form]"); if (!f) return;
    e.preventDefault();
    const name = f.name.value.trim();
    if (name) addTask(f.dataset.addForm, name);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target.closest?.("[data-add-form]")) { const key = st.adding; st.adding = null; render({ keepFresh: true }); $(`[data-add="${key}"]`)?.focus(); }
  });
  document.addEventListener("focusout", (e) => {
    const f = e.target.closest?.("[data-add-form]");
    if (f && !f.contains(e.relatedTarget) && !f.name.value.trim()) setTimeout(() => { if (st.adding === f.dataset.addForm && !$("[data-add-form]")?.contains(document.activeElement)) { st.adding = null; render({ keepFresh: true }); } });
  });
  let typing;
  $("#search").addEventListener("input", (e) => { clearTimeout(typing); typing = setTimeout(() => { st.q = e.target.value; render(); }, 120); });
  // on the page (trying out), the search is an icon on the right that opens into a small field; it closes
  // again when it's left empty, and Escape empties and closes it
  const bar = $("#list-bar");
  function openSearch() { bar.setAttribute("data-search-open", ""); $("#search-open").setAttribute("aria-expanded", "true"); $("#search").focus(); }
  function closeSearch(back) { bar.removeAttribute("data-search-open"); $("#search-open").setAttribute("aria-expanded", "false"); if (back) $("#search-open").focus({ preventScroll: true }); }
  $("#search").addEventListener("blur", () => { if (!$("#search").value) closeSearch(); });
  $("#search").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); $("#search").value = ""; st.q = ""; render(); closeSearch(true); } });
  addEventListener("resize", () => popFor && place());

  // theme: auto → light → dark, remembered per browser, as the specimens do
  (() => {
    const root = document.documentElement, btn = $("[data-theme-toggle]"), modes = ["auto", "light", "dark"];
    let mode = "auto";
    try { mode = localStorage.getItem("bds-theme") || "auto"; } catch {}
    const show = () => { mode === "auto" ? root.removeAttribute("data-theme") : root.setAttribute("data-theme", mode); btn.textContent = `Theme: ${mode}`; };
    btn.addEventListener("click", () => { mode = modes[(modes.indexOf(mode) + 1) % 3]; try { localStorage.setItem("bds-theme", mode); } catch {} show(); });
    show();
  })();

  // trying out: the toolbar on the page instead of a card (on by default, remembered per browser)
  (() => {
    const box = $("#cc-bar"), root = document.documentElement;
    let on = true;
    try { on = localStorage.getItem("todo-bar") !== "card"; } catch {}
    const show = () => { box.checked = on; on ? root.setAttribute("data-todo-bar", "surface") : root.removeAttribute("data-todo-bar"); };
    box.addEventListener("change", () => { on = box.checked; try { localStorage.setItem("todo-bar", on ? "surface" : "card"); } catch {} show(); });
    show();
  })();

  // scrolling (as the list does, option D): once you're into the groups, scrolling down hides the top bar
  // (and the tab bar on phones, list-page.css) and scrolling up brings them back; not while a menu, a sheet
  // or a field up top is in use, nor while a task is lifted
  (() => {
    const html = document.documentElement, topBar = $(".top-bar"), DOWN = 24, UP = 6;
    let lastY = scrollY, travel = 0;
    const setChrome = (hidden) => { if (html.hasAttribute("data-chrome-hidden") !== hidden) html.toggleAttribute("data-chrome-hidden", hidden); };
    const busy = () => !!document.querySelector(":popover-open, dialog[open], .sidebar[data-open]") || !!document.activeElement?.closest?.(".top-bar, .todo-bar") || !!lifted;
    addEventListener("scroll", () => {
      const y = scrollY, dy = y - lastY;
      lastY = y;
      const into = $("#groups").getBoundingClientRect().top < (topBar?.offsetHeight || 0);
      if (!into || busy()) { travel = 0; return setChrome(false); }
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (travel > DOWN) setChrome(true);
      else if (travel < -UP) setChrome(false);
    }, { passive: true });
    document.addEventListener("focusin", (e) => { if (e.target.closest?.(".top-bar, .todo-bar")) setChrome(false); });
  })();

  const live = document.createElement("p"); live.id = "live"; live.className = "visually-hidden"; live.setAttribute("aria-live", "polite"); document.body.append(live);
  render();
})();
