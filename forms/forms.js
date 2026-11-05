// Forms, three ways (the forms research's directions, docs/forms-research.md): a new job and an invoice, each as
// A (a form done well), B (the record is the form) and C (forms that fill themselves), working on the system's parts
// (form.js, field.js, combobox.js, address-field.js). Made-up data; nothing here talks to Bolster.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const ic = (n, s = 16) => (window.BolsterIcons ? BolsterIcons(n, s, { optical: true }) : "");
  const money = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" }));
  const day = (iso) => (iso ? new Date(`${iso}T12:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
  const { clients, crew, lookup, wait } = SAMPLE;
  const stage = $("#stage"), note = $("#note");
  // the app's page (D146): the shell around it, the menu on the section the form belongs to
  const LINKS = { tasks: "../tasks/", calendar: "../calendar/", pipeline: "../pipeline/", timeline: "../timeline/", "job-list": "../index.html#jobs", "vendor-orders": "../index.html?d=pages/list/vendor-orders.json", expenses: "../index.html?d=pages/list/expenses.json", "subs-and-vendors": "../index.html?d=pages/list/subs-and-vendors.json", "bid-requests": "../index.html?d=pages/list/bid-requests.json", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog" };
  const sectionOf = (subject) => (subject === "job" ? "job-list" : "invoices");
  BolsterShell.mount({ current: sectionOf("job"), links: LINKS });
  // the switches are what this concept is for: open beside the page on wider screens; on phones they open from the menu
  if (matchMedia("(min-width: 768px)").matches) $("#concept-controls").open = true;
  // a screen's own heading is the page's: its title and badge go up into the page header, its line stays as the lede
  const pageTitle = $("#page-title"), pageBadge = $("#page-badge");
  function lift() {
    const head = stage.querySelector(".fx-head"), h = head?.querySelector(":scope > h2"), b = head?.querySelector(":scope > .badge");
    pageTitle.textContent = h ? h.textContent : subject === "job" ? "New job" : "Invoice";
    pageBadge.innerHTML = b ? b.outerHTML : "";
  }
  new MutationObserver(lift).observe(stage, { childList: true, subtree: true });

  // ---------- the people and the work ----------
  const vera = { id: "v1", label: "Vera Ashby", detail: "412 Westlake Dr, Austin, TX" };
  if (!clients.some((c) => c.id === "v1")) clients.unshift(vera);
  const marco = clients.find((c) => c.label === "Marco Ruiz");
  const me = crew.find((p) => p.label === "Ana Okafor");
  const hiro = crew.find((p) => p.label === "Hiro Nakamura");
  const TYPES = ["Remodel", "New build", "Repair", "Insulation", "Insurance claim"];
  const SOURCES = ["Phone call", "Website", "Referral", "Repeat customer", "Home show"];
  const TERMS = ["On receipt", "Net 15", "Net 30"];
  const UNITS = ["each", "sq ft", "lin ft", "hrs", "% done", "lump sum"];
  const JOBS = [
    { id: "j1", label: "Roof and kitchen refresh", detail: "Vera Ashby · 412 Westlake Dr", client: vera },
    { id: "j2", label: "Garage drywall", detail: "Marco Ruiz · 70 Orchard Ln", client: marco },
    { id: "j3", label: "Basement insulation", detail: "Priya Patel · 655 Westlake Dr", client: clients.find((c) => c.label === "Priya Patel") },
  ];
  // the job's estimate, by stage: what's left to bill, and where the schedule says each stands
  const STAGES = [
    { id: "s1", name: "Demolition", total: 6200, billed: 6200, done: 100 },
    { id: "s2", name: "Framing", total: 9800, billed: 9800, done: 100 },
    { id: "s3", name: "Roofing", total: 14500, billed: 0, done: 60 },
    { id: "s4", name: "Kitchen", total: 16550, billed: 0, done: 0 },
  ];
  const lineOf = (s, pct) => ({ desc: `${s.name}, ${pct}% of ${money(s.total)}`, amount: Math.round(s.total * pct) / 100 });

  // ---------- small parts ----------
  const fld = (id, label, control, { req, opt, hint, width } = {}) => `<div class="field"${width ? ` data-width="${width}"` : ""}><label class="field-label" for="${id}">${label}${req ? ' <span class="field-required">(required)</span>' : ""}${opt ? ' <span class="field-optional">(optional)</span>' : ""}</label>${hint ? `<p class="field-hint" id="${id}-hint">${hint}</p>` : ""}${control}<p class="field-error" id="${id}-error" hidden></p></div>`;
  const desc = (id, hint) => `aria-describedby="${[hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(" ")}"`;
  const combo = (id, name, { req, multiple, value = "", placeholder = "" } = {}) => `<div class="combobox"${multiple ? " data-multiple" : ""}><input class="input" id="${id}" name="${name}" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${id}-list" autocomplete="off" value="${esc(value)}" placeholder="${esc(placeholder)}"${req ? " required" : ""} aria-describedby="${id}-error"><input type="hidden" name="${name}_id"><div class="combobox-list" id="${id}-list" role="listbox" popover="manual"></div></div>`;
  const select = (id, name, options, value = "", { req, empty = "Choose" } = {}) => `<div class="select"><select class="input" id="${id}" name="${name}"${req ? " required" : ""} aria-describedby="${id}-error"><option value="">${empty}</option>${options.map((o) => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
  const moneyInput = (id, name, value = "", attrs = "") => `<div class="input-group"><span class="input-adornment">$</span><input class="input" id="${id}" name="${name}" data-format="money" data-numeric inputmode="decimal" data-min="0" value="${value === "" || value == null ? "" : esc(Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 }))}" aria-describedby="${id}-error" ${attrs}></div>`;
  const address = (p, v = {}, { req } = {}) => `<div class="address" data-country="${v.country || "US"}">
      <div class="form-row">
        <div class="field"><label class="field-label" for="${p}-street">Street address${req ? ' <span class="field-required">(required)</span>' : ""}</label><div class="combobox" data-lookup><input class="input" id="${p}-street" name="street" data-part="street" autocomplete="address-line1" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${p}-street-list" placeholder="Start typing the street" value="${esc(v.street)}"${req ? " required" : ""} aria-describedby="${p}-street-error"><div class="combobox-list" id="${p}-street-list" role="listbox" popover="manual"></div></div><p class="field-error" id="${p}-street-error" hidden></p></div>
        <div class="field" data-width="8"><label class="field-label" for="${p}-unit">Unit</label><input class="input" id="${p}-unit" name="unit" data-part="unit" autocomplete="address-line2" value="${esc(v.unit)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label class="field-label" for="${p}-city">City</label><input class="input" id="${p}-city" name="city" data-part="city" autocomplete="address-level2" value="${esc(v.city)}"></div>
        <div class="field" data-width="12"><label class="field-label" for="${p}-region">State</label><input class="input" id="${p}-region" name="region" data-part="region" autocomplete="address-level1" value="${esc(v.region || "TX")}"></div>
        <div class="field" data-width="8"><label class="field-label" for="${p}-postal">ZIP code</label><input class="input" id="${p}-postal" name="postal" data-part="postal" data-format="postal" inputmode="numeric" autocomplete="postal-code" value="${esc(v.postal)}" aria-describedby="${p}-postal-error"><p class="field-error" id="${p}-postal-error" hidden></p></div>
      </div>
      <div class="field"><label class="field-label" for="${p}-country">Country</label><div class="select"><select class="input" id="${p}-country" name="country" data-part="country" autocomplete="country">${[["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"]].map(([c, n]) => `<option value="${c}"${c === (v.country || "US") ? " selected" : ""}>${n}</option>`).join("")}</select></div></div>
    </div>`;
  const siteLine = (s) => (s && s.street ? [s.street, s.unit, s.city, [s.region, s.postal].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "");
  const readSite = (el) => Object.fromEntries($$("[data-part]", el).map((x) => [x.dataset.part, x.value.trim()]));

  // "Add new customer": the New customer form, its name filled in (I26)
  const dlg = $("#new-customer");
  const newCustomer = (text) => new Promise((resolve) => {
    dlg.querySelector("form").reset();
    $("#nc-name").value = text;
    dlg.addEventListener("close", () => {
      const name = $("#nc-name").value.trim();
      if (dlg.returnValue !== "save" || !name) return resolve(null);
      const made = { id: `c${clients.length + 1}`, label: name, detail: "New customer" };
      clients.push(made); resolve(made);
    }, { once: true });
    dlg.showModal(); $("#nc-phone").focus();
  });

  // ---------- the lab: which form, which direction, and the note beside it ----------
  let subject = "job", dir = "a", view = null;
  const cache = {};
  const NOTES = {
    "job-a": {
      title: "A · One page, everything at once",
      means: ["Creating a job opens a page with every question about it: customer, site, the work, team, payments, notes.", "You fill in what you know and press Create job, at the window's foot. Nothing exists until then.", "Changing it later is the same page, opened by Edit, with Save changes."],
      try: ["Press Create job with nothing filled in: the summary lists what's missing.", "Type a phone-like value or a bad ZIP and leave the field.", "Fill something, then Cancel: it asks before losing it."],
      good: "Familiar and predictable: one way everywhere. Easy for Bolster to build and test.",
      costs: "Fourteen questions up front, most of them not known yet when a customer first calls. Reading the job later means reading a form of boxes.",
    },
    "job-b": {
      title: "B · Ask two things, then the job is the page",
      means: ["Creating asks only what a job can't exist without: the customer and a name.", "Then the job opens as a page you read. Every value changes where it is: click it, change it, Save (or Enter). Escape puts it back.", "What isn't known yet waits, saying when it'll be needed (the address before the first visit)."],
      try: ["Create the job, then click Add beside the site address.", "Change the job type: only that value saves, with its own Save.", "Press Escape while changing a value."],
      good: "Fast to start, quiet to read; matches how office staff mostly look at a job and change one thing.",
      costs: "Two ways to edit (creates are forms, records change in place). Each value needs its own small editor built.",
    },
    "job-c": {
      title: "C · Start from the call, check what it heard",
      means: ["You start from what you already have: a voicemail, a website enquiry, photos. Bolster reads it and fills in the job.", "Each value says where it came from: from the call (click it to see the words), suggested (needs your OK), or a company default.", "The job then works like B: values change in place, and changing one marks it as yours."],
      try: ["Start from the voicemail, then click a blue mark to see its words in the call.", "Press Create job before checking the suggestions.", "Change a value that came from the call, then Put back."],
      good: "Least typing; uses what Bolster is already good at (reading receipts, drafting estimates).",
      costs: "The most to build, and to trust: people need to check what it heard, so the marks have to be clear and never skipped.",
    },
    "invoice-a": {
      title: "A · A blank invoice form",
      means: ["New invoice opens a page of fields: the client and job, numbers and dates, the lines in a table, a message.", "You type each line (description, quantity, unit, price) and press Save invoice. It's a draft until you send it.", "After sending, changing it is Edit, then Save, then Send again."],
      try: ["Add lines and watch the total.", "Save with an empty line.", "Save, then Send."],
      good: "Everything visible at once; works the same as every other form.",
      costs: "Retyping what the job already knows (the estimate's stages, what's done, what was billed). Easy to bill twice or forget a change order.",
    },
    "invoice-b": {
      title: "B · The invoice is the document",
      means: ["New invoice asks only which job; the client, number, dates and terms follow.", "The draft is the invoice as Vera will see it. Lines come from the estimate (pick a stage and how much is done), or by hand; every value changes in place.", "Its state decides how changes save: a draft changes as you go; once sent, changes wait until you resend; once paid, it can't change."],
      try: ["Add Roofing from the estimate at 60%.", "Send it, then change an amount: see it wait for Resend.", "Mark it paid, then try to change something."],
      good: "No separate form to keep in sync with the document; what you see is what's sent; sent and paid invoices are protected.",
      costs: "More states to understand and design (draft, sent with changes, paid). Lines still need you to know what to bill.",
    },
    "invoice-c": {
      title: "C · Bolster drafts the next invoice",
      means: ["When work moves (Roofing reached 60%, a change order was installed), Bolster drafts the next invoice and asks you to check it.", "Each line says where it came from (the schedule, the change order); terms and message are suggestions; what it left out is listed with why.", "Sending needs the suggestions checked; after that it works like B."],
      try: ["Check the draft, click a line's source mark.", "Press Send before accepting the suggestions.", "Add the kitchen anyway, from what was left out."],
      good: "Bills what's done, nothing twice, nothing forgotten; the office checks instead of composing.",
      costs: "Depends on the schedule and change orders being kept up to date. Wrong progress means a wrong invoice, so the check can't be a formality.",
    },
  };
  function showNote() {
    const n = NOTES[`${subject}-${dir}`];
    note.innerHTML = `<h2>${n.title}</h2>
      <div><h3>What it means</h3><ul>${n.means.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div><h3>Try this</h3><ul>${n.try.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div><h3>Good at</h3><p>${n.good}</p></div>
      <div><h3>What it costs</h3><p>${n.costs}</p></div>`;
  }
  function go() {
    try { localStorage.setItem("bolster-concepts:forms", `${subject}-${dir}`); } catch {}
    history.replaceState(null, "", `#${subject}-${dir}`);
    $$('[name="fx-subject"]').forEach((r) => (r.checked = r.value === subject));
    $$('[name="fx-dir"]').forEach((r) => (r.checked = r.value === dir));
    document.title = `${subject === "job" ? "New job" : "Invoice"} · ${dir.toUpperCase()} · Forms, three ways`;
    // a view keeps its state while you look at another (C-keep): coming back finds it as you left it
    const key = `${subject}-${dir}`;
    view = cache[key] || (cache[key] = VIEWS[key]());
    view.render();
    showNote();
    BolsterShell.setCurrent(sectionOf(subject));
    lift();
  }
  $$('[name="fx-subject"]').forEach((r) => r.addEventListener("change", () => { subject = r.value; go(); }));
  $$('[name="fx-dir"]').forEach((r) => r.addEventListener("change", () => { dir = r.value; go(); }));

  // ---------- B and C: a value that changes where it is ----------
  // a view lists its values (spec: label, kind, get, set, show, why, mark, locked); a value's button opens its editor
  function valueButton(id, s) {
    const v = s.get(), shown = s.show ? s.show(v) : v;
    if (s.locked) return `<button type="button" class="rec-value" data-f="${id}" disabled>${esc(shown || "—")}</button>`;
    if (shown === "" || shown == null || (Array.isArray(v) && !v.length)) return `<button type="button" class="rec-value" data-f="${id}" data-empty>${ic("circle-plus", 14)}Add</button>${s.why ? `<span class="rec-why">${s.why}</span>` : ""}`;
    return `<button type="button" class="rec-value" data-f="${id}" aria-label="${esc(s.label)}: ${esc(shown)}. Change it">${esc(shown)}${ic("pen", 14)}</button>`;
  }
  function marks(id, s) {
    const m = s.mark?.();
    let out = "";
    if (s.changed?.()) out += `<span class="rec-changed">changed</span><span class="rec-was">${esc(s.was())}</span>`;
    if (m) {
      if (m.kind === "source") out += `<button type="button" class="src" data-kind="source" data-quote="${m.quote || ""}" data-tip="${esc(m.tip || "")}" aria-label="${esc(m.text)}${m.tip ? `: ${esc(m.tip)}` : ""}">${ic(m.icon || "message", 12)}${esc(m.text)}</button>`;
      if (m.kind === "suggested") out += `<span class="src" data-kind="suggested"${m.tip ? ` data-tip="${esc(m.tip)}" tabindex="0"` : ""}>${ic("sparkles", 12)}suggested</span><button type="button" class="button" data-variant="secondary" data-size="sm" data-accept="${id}">Accept</button>`;
      if (m.kind === "default") out += `<span class="src" data-kind="default">${esc(m.text || "company default")}</span>`;
      if (m.kind === "typed") out += `<span class="src" data-kind="typed">${esc(m.text || "changed by you")}</span>${m.back ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-back="${id}">Put back</button>` : ""}`;
    }
    return out ? `<span class="rec-marks">${out}</span>` : "";
  }
  const cell = (id, s) => `<div class="rec-cell" data-cell="${id}">${s.locked ? valueButton(id, s) : `<span class="rec-marks">${valueButton(id, s)}${marks(id, s).replace(/^<span class="rec-marks">|<\/span>$/g, "")}</span>`}</div>`;
  const recRow = (id, s) => `<div class="rec-row"><span class="rec-label">${s.label}</span>${cell(id, s)}</div>`;

  function editor(id, s) {
    const v = s.get(), e = `ed-${id}`;
    const k = s.kind;
    const control = k === "select" ? select(e, "v", s.options, v)
      : k === "date" ? `<input class="input" type="date" id="${e}" name="v" value="${esc(v)}" aria-describedby="${e}-error">`
      : k === "money" ? moneyInput(e, "v", v)
      : k === "percent" ? `<div class="input-group"><input class="input" id="${e}" name="v" data-format="number" data-numeric inputmode="decimal" data-decimals="1" data-min="0" data-max="100" value="${esc(v)}" aria-describedby="${e}-error"><span class="input-adornment">%</span></div>`
      : k === "textarea" ? `<textarea class="input" id="${e}" name="v" rows="3">${esc(v)}</textarea>`
      : k === "client" ? combo(e, "v", { req: true, value: v?.label })
      : k === "person" ? combo(e, "v", { value: v?.label })
      : k === "crew" ? combo(e, "v", { multiple: true })
      : k === "address" ? address(e, v || {})
      : `<input class="input" id="${e}" name="v" value="${esc(v)}"${s.req ? " required" : ""} aria-describedby="${e}-error">`;
    const body = k === "address" ? control : `<div class="field"><label class="field-label visually-hidden" for="${e}">${s.label}</label>${control}<p class="field-error" id="${e}-error" hidden></p></div>`;
    return `<form class="rec-edit" data-edit="${id}" novalidate>${body}<div class="rec-edit-actions"><button type="submit" class="button" data-size="sm">Save</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-cancel>Cancel</button><span class="fx-hint">Enter saves · Escape puts it back</span></div></form>`;
  }
  function startEdit(id) {
    const s = view.specs[id], box = $(`[data-cell="${id}"]`);
    if (!s || !box) return;
    box.innerHTML = editor(id, s);
    const form = $("form", box), e = `ed-${id}`;
    let api = null;
    if (s.kind === "client") api = BolsterCombobox.attach($(`#${e}`), { options: clients, add: newCustomer, noun: ["customer", "customers"], value: s.get() });
    if (s.kind === "person") api = BolsterCombobox.attach($(`#${e}`), { options: crew, noun: ["person", "people"], value: s.get() });
    if (s.kind === "crew") api = BolsterCombobox.attach($(`#${e}`), { options: crew, noun: ["person", "people"], value: s.get() || [] });
    if (s.kind === "address") BolsterAddress.attach($(".address", box), { lookup });
    BolsterForm.attach(form, {
      checks: s.check ? { [e]: s.check } : {},
      save: async () => {
        const input = $(`#${e}`);
        const val = s.kind === "address" ? readSite(box) : api ? api.value : s.kind === "money" || s.kind === "percent" ? (input.value.trim() ? +BolsterField.value(input) : "") : input.value.trim();
        s.set(val);
        view.render();
        const b = $(`[data-f="${id}"]`);
        if (b) { b.insertAdjacentHTML("afterend", `<span class="rec-saved" role="status">${ic("check", 12)}${view.savedWord?.(id) || "Saved"}</span>`); b.focus({ preventScroll: true }); setTimeout(() => $(`[data-cell="${id}"] .rec-saved`)?.remove(), 2400); }
      },
    });
    const cancel = () => { view.render(); $(`[data-f="${id}"]`)?.focus({ preventScroll: true }); };
    $("[data-cancel]", form).addEventListener("click", cancel);
    form.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !ev.defaultPrevented) { ev.preventDefault(); cancel(); } });
    (form.querySelector("input:not([type=hidden]), select, textarea"))?.focus();
  }
  stage.addEventListener("click", (e) => {
    if (view?.c) return; // C's own views handle their clicks (c.js)
    const b = e.target.closest(".rec-value[data-f]:not([disabled])");
    if (b) return startEdit(b.dataset.f);
    const a = e.target.closest("[data-accept]");
    if (a) { view.accept?.(a.dataset.accept); return; }
    const back = e.target.closest("[data-back]");
    if (back) { view.putBack?.(back.dataset.back); return; }
    const q = e.target.closest(".src[data-quote]");
    if (q && q.dataset.quote) { const m = document.getElementById(q.dataset.quote); if (m) { $$(".fx-transcript mark").forEach((x) => delete x.dataset.on); m.dataset.on = ""; m.scrollIntoView({ block: "nearest", behavior: "smooth" }); setTimeout(() => delete m.dataset.on, 2200); } }
  });

  // ================= the new job =================
  function jobForm(p) {
    return `<form class="form" id="${p}" novalidate>
      <div class="form-summary" role="alert" tabindex="-1" hidden></div>
      <fieldset class="form-section"><legend class="form-section-title">Customer</legend>
        ${fld(`${p}-customer`, "Customer", combo(`${p}-customer`, "customer", { req: true, placeholder: "Search customers" }), { req: true })}
        ${fld(`${p}-name`, "Job name", `<input class="input" id="${p}-name" name="name" required ${desc(`${p}-name`, 1)}>`, { req: true, hint: "Use the address or the customer's name if you're not sure" })}
      </fieldset>
      <fieldset class="form-section"><legend class="form-section-title">Site</legend>${address(`${p}-site`)}</fieldset>
      <fieldset class="form-section"><legend class="form-section-title">The work</legend>
        <div class="form-row">${fld(`${p}-type`, "Job type", select(`${p}-type`, "type", TYPES))}${fld(`${p}-number`, "Job number", `<input class="input" id="${p}-number" name="number" value="1043" inputmode="numeric">`, { width: 8 })}</div>
        <div class="form-row">${fld(`${p}-source`, "Lead source", select(`${p}-source`, "source", SOURCES))}${fld(`${p}-start`, "Target start", `<input class="input" type="date" id="${p}-start" name="start" aria-describedby="${p}-start-error">`, { width: 12 })}</div>
        ${fld(`${p}-value`, "Estimated value", moneyInput(`${p}-value`, "value"))}
      </fieldset>
      <fieldset class="form-section"><legend class="form-section-title">Team</legend>
        <div class="form-row">${fld(`${p}-sales`, "Salesperson", combo(`${p}-sales`, "sales", { value: me.label }))}${fld(`${p}-pm`, "Project manager", combo(`${p}-pm`, "pm"))}</div>
        ${fld(`${p}-crew`, "Crew", combo(`${p}-crew`, "crew", { multiple: true }))}
      </fieldset>
      <fieldset class="form-section"><legend class="form-section-title">Payments</legend>
        <p class="form-section-hint">Asked for when the client signs the estimate</p>
        <div class="form-row">${fld(`${p}-deposit`, "Deposit", `<div class="input-group"><input class="input" id="${p}-deposit" name="deposit" data-format="number" data-numeric inputmode="decimal" data-decimals="1" data-min="0" data-max="100" value="10" aria-describedby="${p}-deposit-error"><span class="input-adornment">%</span></div>`, { width: 8 })}${fld(`${p}-partial`, "Partial payments", select(`${p}-partial`, "partial", ["Allowed", "Not allowed"], "Allowed", { empty: "Choose" }))}</div>
      </fieldset>
      <fieldset class="form-section"><legend class="form-section-title">Notes</legend>
        ${fld(`${p}-notes`, "Note for the crew", `<textarea class="input" id="${p}-notes" name="notes" rows="3"></textarea>`)}
      </fieldset>
      <div class="form-actions" data-sticky><button type="submit" class="button">Create job</button><button type="button" class="button" data-variant="ghost" id="${p}-cancel">Cancel</button><span class="form-actions-note" id="${p}-note" aria-live="polite"></span></div>
    </form>`;
  }
  const VIEWS = {
    // ---------- A: one page of fields ----------
    "job-a": () => ({
      render() {
        stage.innerHTML = `<div class="fx-screen"><div class="fx-head"><h2>New job</h2><p class="fx-sub">Every question about the job, on one page. Only the customer and a name are needed to create it.</p></div><div id="ja-body">${jobForm("ja")}</div></div>`;
        const form = $("#ja");
        BolsterCombobox.attach($("#ja-customer"), { options: clients, add: newCustomer, noun: ["customer", "customers"] });
        BolsterCombobox.attach($("#ja-sales"), { options: crew, noun: ["person", "people"], value: me });
        BolsterCombobox.attach($("#ja-pm"), { options: crew, noun: ["person", "people"] });
        BolsterCombobox.attach($("#ja-crew"), { options: crew, noun: ["person", "people"] });
        BolsterAddress.attach($(".address", form), { lookup });
        BolsterForm.attach(form, { save: () => wait(700) });
        const t = BolsterForm.track(form, $("#ja-note"));
        form.addEventListener("form-saved", () => {
          const v = Object.fromEntries(new FormData(form));
          $("#ja-body").innerHTML = `<div class="fx-done" role="status"><p><b>Job 1043 created:</b> ${esc(v.name)}, for ${esc(v.customer)}.</p><p>To change it later: open the job, press Edit, change what you need, Save changes. The same page, with every field.</p><button type="button" class="button" data-variant="secondary" data-size="sm" id="ja-again">Start again</button></div>`;
          $("#ja-again").addEventListener("click", () => this.render());
        });
        $("#ja-cancel").addEventListener("click", async () => { if (t.changes() === 0 || (await BolsterForm.leave(form))) this.render(); });
      },
    }),

    // ---------- B: ask two things; then the job is a page you read and change in place ----------
    "job-b": () => {
      let job = null;
      const v = {
        render() {
          if (!job) return create();
          stage.innerHTML = record(job, v.specs, { title: job.name });
        },
      };
      function create() {
        stage.innerHTML = `<div class="fx-scrim"><div class="dialog" data-size="sm" open>
          <form id="jb" novalidate style="display:contents">
            <header class="dialog-header"><h2 id="jb-t">New job</h2></header>
            <div class="dialog-body"><div class="form" data-density="compact">
              <div class="form-summary" role="alert" tabindex="-1" hidden></div>
              ${fld("jb-customer", "Customer", combo("jb-customer", "customer", { req: true, placeholder: "Search customers" }))}
              ${fld("jb-name", "Job name", `<input class="input" id="jb-name" name="name" required ${desc("jb-name", 1)}>`, { hint: "Use the address or the customer's name if you're not sure" })}
            </div></div>
            <footer class="dialog-footer"><button type="submit" class="button">Create job</button></footer>
          </form></div></div>
          <p class="fx-hint">Everything else about the job waits on its page until it's known.</p>`;
        BolsterCombobox.attach($("#jb-customer"), { options: clients, add: newCustomer, noun: ["customer", "customers"] });
        BolsterForm.attach($("#jb"), {
          save: async (vals) => {
            await wait(400);
            job = { customer: clients.find((c) => c.label === vals.customer) || { label: vals.customer }, name: vals.name, site: null, type: "", source: "", start: "", value: "", number: "1043", sales: me, pm: null, crew: [], deposit: 10, partial: "Allowed", notes: "" };
            v.specs = jobSpecs(job);
            v.render();
          },
        });
        $("#jb-customer").focus();
      }
      return v;
    },

    // ---------- C: start from what you have; check what Bolster read ----------
    "job-c": () => {
      let job = null, phase = "pick", from = null, created = false, problem = "";
      const v = {
        render() {
          if (phase === "pick") return pick();
          if (phase === "reading") { stage.innerHTML = `<div class="fx-screen"><div class="fx-reading" role="status">${ic("sparkles", 16)}Reading the ${from.noun}…</div></div>`; return; }
          const open = Object.entries(v.specs).filter(([, s]) => s.mark?.()?.kind === "suggested").map(([, s]) => s.label);
          stage.innerHTML = `<div class="fx-screen">
            <div class="fx-head"><h2>${esc(job.name)}</h2>${created ? '<span class="badge" data-status="lead">Lead</span>' : ""}<p class="fx-sub">${created ? `Job ${job.number}, made from the ${from.noun}. The ${from.noun} stays on the job's Activity.` : `A new job, filled in from the ${from.noun}. Nothing is made until you create it.`}</p></div>
            <div class="fx-legend" aria-label="What the marks mean"><span><span class="src" data-kind="source">${ic(from.icon, 12)}from the ${from.noun}</span> its words</span><span><span class="src" data-kind="suggested">${ic("sparkles", 12)}suggested</span> needs your OK</span><span><span class="src" data-kind="default">company default</span></span><span><span class="src" data-kind="typed">changed by you</span></span></div>
            <div class="fx-split">${recordBody(job, v.specs)}${from.transcript}</div>
            ${created ? "" : `<div class="form-actions" data-sticky>${problem ? "" : `<button type="button" class="button" id="jc-create">Create job</button>`}${problem ? `<p class="form-actions-note" role="alert" style="flex-basis:100%">${problem}</p><button type="button" class="button" id="jc-all">Accept ${open.length === 2 ? "both" : "all"} and create</button>` : ""}<button type="button" class="button" data-variant="ghost" id="jc-discard">Discard</button></div>`}
          </div>`;
          $("#jc-create")?.addEventListener("click", () => {
            if (open.length) { problem = `Check ${open.length === 1 ? "one suggestion" : `${open.length} suggestions`} first: ${open.join(", ")}. Accept ${open.length === 1 ? "it" : "them"}, or change ${open.length === 1 ? "it" : "them"}.`; v.render(); $("#jc-all")?.focus(); return; }
            created = true; v.render();
          });
          $("#jc-all")?.addEventListener("click", () => { Object.keys(v.specs).forEach((k) => v.accept(k, true)); problem = ""; created = true; v.render(); });
          $("#jc-discard")?.addEventListener("click", () => { phase = "pick"; v.render(); });
        },
        accept(k, quiet) { const s = v.specs[k]; if (s?.mark?.()?.kind === "suggested") { s.marked = { kind: "source", text: s.acceptedText || "you accepted it", icon: "check" }; } if (!quiet) { const open = Object.values(v.specs).some((x) => x.mark?.()?.kind === "suggested"); if (!open) problem = ""; v.render(); $(`[data-f="${k}"]`)?.focus(); } },
        putBack(k) { const s = v.specs[k]; s.set(s.original, true); s.marked = s.originalMark; v.render(); $(`[data-f="${k}"]`)?.focus(); },
      };
      function pick() {
        stage.innerHTML = `<div class="fx-screen">
          <div class="fx-head"><h2>New job</h2><p class="fx-sub">Start from what you have. Bolster reads it and fills in what it can; you check it.</p></div>
          <div class="fx-sources">
            <button type="button" class="fx-source" data-from="call"><b>${ic("message", 16)}Voicemail from (555) 014-2290</b><span>Today, 9:12 am · 0:48 · Marco Ruiz</span></button>
            <button type="button" class="fx-source" data-from="web"><b>${ic("inbox", 16)}Website enquiry</b><span>Yesterday, 6:40 pm · Priya Haddad</span></button>
            <button type="button" class="fx-source" data-from="empty"><b>${ic("file-plus", 16)}Start empty</b><span>A customer and a name, as in B</span></button>
          </div>
          <p class="fx-hint">Photos of the site and a supplier's quote would start a job the same way.</p></div>`;
        $$(".fx-source").forEach((b) => b.addEventListener("click", async () => {
          if (b.dataset.from === "empty") { dir = "b"; return go(); }
          from = SOURCES_C[b.dataset.from]; phase = "reading"; v.render();
          await wait(900);
          job = from.job(); v.specs = jobSpecs(job, from.marks); phase = "review"; created = false; problem = ""; v.render();
        }));
      }
      return v;
    },
  };

  // the job's values, for B and C: what each is, how it shows, what it'll be needed for
  function jobSpecs(job, marks = {}) {
    const spec = (k, label, kind, extra = {}) => {
      const s = { label, kind, ...extra, get: () => job[k], set: (val, quiet) => { if (!quiet && s.marked && s.marked.kind !== "typed") { s.originalMark = s.marked; s.original = job[k]; s.marked = { kind: "typed", back: true }; } job[k] = val; } };
      if (marks[k]) { s.marked = marks[k]; s.acceptedText = marks[k].accepted; }
      s.mark = () => s.marked;
      return s;
    };
    return {
      customer: spec("customer", "Customer", "client", { show: (c) => c?.label || "" }),
      name: spec("name", "Job name", "text", { req: true, check: (x) => (x ? "" : "Enter job name") }),
      site: spec("site", "Site address", "address", { show: siteLine, why: "Needed to book the first visit" }),
      type: spec("type", "Job type", "select", { options: TYPES }),
      source: spec("source", "Lead source", "select", { options: SOURCES }),
      start: spec("start", "Target start", "date", { show: day, why: "Needed to schedule it" }),
      value: spec("value", "Estimated value", "money", { show: money }),
      number: spec("number", "Job number", "text"),
      sales: spec("sales", "Salesperson", "person", { show: (p) => p?.label || "" }),
      pm: spec("pm", "Project manager", "person", { show: (p) => p?.label || "", why: "Needed once it's booked" }),
      crew: spec("crew", "Crew", "crew", { show: (c) => (c || []).map((p) => p.label).join(", ") }),
      deposit: spec("deposit", "Deposit", "percent", { show: (d) => (d === "" || d == null ? "" : `${d}% when the estimate is signed`) }),
      partial: spec("partial", "Partial payments", "select", { options: ["Allowed", "Not allowed"] }),
      notes: spec("notes", "Note for the crew", "textarea"),
    };
  }
  const SECTIONS = [["Customer", ["customer", "name"]], ["Site", ["site"]], ["The work", ["type", "source", "start", "value", "number"]], ["Team", ["sales", "pm", "crew"]], ["Payments", ["deposit", "partial"]], ["Notes", ["notes"]]];
  function recordBody(job, specs) {
    const needs = [!job.site && "the site address, to book the first visit", !job.start && "a target start, to schedule it", !job.pm && "a project manager, once it's booked"].filter(Boolean);
    return `<div class="rec">${SECTIONS.map(([h, ks]) => `<section class="rec-section" aria-label="${h}"><h3>${h}</h3>${ks.map((k) => recRow(k, specs[k])).join("")}</section>`).join("")}
      ${needs.length ? `<div class="fx-needs"><h3>Still to come</h3><ul>${needs.map((n) => `<li>${n[0].toUpperCase()}${n.slice(1)}</li>`).join("")}</ul></div>` : ""}</div>`;
  }
  function record(job, specs, { title }) {
    return `<div class="fx-screen"><div class="fx-head"><h2>${esc(title)}</h2><span class="badge" data-status="lead">Lead</span><p class="fx-sub">Job ${job.number} for ${esc(job.customer?.label)}. Click any value to change it; only that value saves.</p></div>${recordBody(job, specs)}</div>`;
  }

  // what C reads: the call and the enquiry, with the words each value came from
  const SOURCES_C = {
    call: {
      noun: "voicemail", icon: "message",
      job: () => ({ customer: marco, name: "Kitchen and roof refresh", site: { street: "70 Orchard Ln", unit: "", city: "Austin", region: "TX", postal: "78745", country: "US" }, type: "Remodel", source: "Phone call", start: "2026-11-30", value: "", number: "1043", sales: me, pm: null, crew: [], deposit: 10, partial: "Allowed", notes: "Dog in the yard. Gate code 4417." }),
      marks: {
        customer: { kind: "source", text: "from the voicemail", quote: "q-who", tip: "Matched by his number, (555) 014-2290" },
        name: { kind: "suggested", tip: "From what he wants done: the kitchen and the roof", accepted: "you accepted it" },
        site: { kind: "source", text: "from the voicemail", quote: "q-site", tip: "“…the house on Orchard Lane, number seventy…”" },
        type: { kind: "suggested", tip: "A kitchen and a roof: most jobs like it are remodels", accepted: "you accepted it" },
        source: { kind: "source", text: "from the voicemail", icon: "message", tip: "It came in as a call" },
        start: { kind: "source", text: "from the voicemail", quote: "q-start", tip: "“…sometime after Thanksgiving…”: the Monday after" },
        sales: { kind: "default", text: "you, who created it" },
        deposit: { kind: "default" }, partial: { kind: "default" },
        notes: { kind: "source", text: "from the voicemail", quote: "q-notes", tip: "“…the dog's in the yard, gate code's 4417…”" },
      },
      transcript: `<aside class="fx-transcript" aria-label="The voicemail"><h3>The voicemail · 0:48 · today, 9:12 am</h3><p>“Hi, <mark id="q-who">it's Marco Ruiz, you did my garage last spring</mark>. We'd like to redo the kitchen at my mother's place, and the roof's leaking over it too, so maybe both? It's <mark id="q-site">the house on Orchard Lane, number seventy</mark>. No rush, <mark id="q-start">sometime after Thanksgiving</mark> would be great. If you come by, <mark id="q-notes">the dog's in the yard, gate code's 4417</mark>. Call me back on this number. Thanks!”</p></aside>`,
    },
    web: {
      noun: "enquiry", icon: "inbox",
      job: () => ({ customer: { id: "new-priya", label: "Priya Haddad", detail: "New customer" }, name: "Basement insulation", site: { street: "15 Elm Creek Ct", unit: "", city: "Cedar Park", region: "TX", postal: "78613", country: "US" }, type: "Insulation", source: "Website", start: "", value: "", number: "1043", sales: me, pm: null, crew: [], deposit: 10, partial: "Allowed", notes: "" }),
      marks: {
        customer: { kind: "source", text: "from the enquiry", icon: "inbox", quote: "q-w-who", tip: "A new customer: Priya Haddad, priya.haddad@example.com" },
        name: { kind: "suggested", tip: "From what she asked for", accepted: "you accepted it" },
        site: { kind: "source", text: "from the enquiry", icon: "inbox", quote: "q-w-site" },
        type: { kind: "source", text: "from the enquiry", icon: "inbox", quote: "q-w-type", tip: "She picked Insulation on the form" },
        source: { kind: "source", text: "from the enquiry", icon: "inbox", tip: "It came in through your website" },
        sales: { kind: "default", text: "you, who created it" }, deposit: { kind: "default" }, partial: { kind: "default" },
      },
      transcript: `<aside class="fx-transcript" aria-label="The enquiry"><h3>Website enquiry · yesterday, 6:40 pm</h3><p><b>Name</b> <mark id="q-w-who">Priya Haddad</mark> · priya.haddad@example.com</p><p><b>Address</b> <mark id="q-w-site">15 Elm Creek Ct, Cedar Park, TX 78613</mark></p><p><b>Service</b> <mark id="q-w-type">Insulation</mark></p><p><b>Message</b> “Our basement is freezing in winter. Could someone look at insulating the walls? Weekends are easiest.”</p></aside>`,
    },
  };

  // ================= the invoice =================
  const nextNumber = "INV-1043";
  function invoiceTotals(lines) { return lines.reduce((n, l) => n + (+l.amount || 0), 0); }

  // ---------- A: a blank invoice form ----------
  VIEWS["invoice-a"] = () => {
    let lines = [{ desc: "", qty: "", unit: "each", price: "" }];
    const v = {
      render() {
        stage.innerHTML = `<div class="fx-screen"><div class="fx-head"><h2>New invoice</h2><p class="fx-sub">A form for every part of the invoice. It's a draft once saved; sending is a separate step.</p></div><div id="ia-body">
          <form class="form" id="ia" novalidate style="max-inline-size:none">
            <div class="form-summary" role="alert" tabindex="-1" hidden></div>
            <fieldset class="form-section" style="max-inline-size:var(--content-max-width-reading)"><legend class="form-section-title">Bill to</legend>
              ${fld("ia-client", "Client", combo("ia-client", "client", { req: true, placeholder: "Search clients" }))}
              ${fld("ia-job", "Job", select("ia-job", "job", JOBS.map((j) => j.label), "", { req: true, empty: "Choose a job" }))}
            </fieldset>
            <fieldset class="form-section" style="max-inline-size:var(--content-max-width-reading)"><legend class="form-section-title">Invoice</legend>
              <div class="form-row">${fld("ia-number", "Invoice number", `<input class="input" id="ia-number" name="number" value="${nextNumber}" readonly>`, { width: 12 })}${fld("ia-issued", "Issue date", `<input class="input" type="date" id="ia-issued" name="issued" value="2026-10-29" required aria-describedby="ia-issued-error">`, { width: 12 })}${fld("ia-terms", "Due", select("ia-terms", "terms", TERMS, "", { req: true, empty: "Choose terms" }))}</div>
            </fieldset>
            <fieldset class="form-section"><legend class="form-section-title">Lines</legend>
              <div class="lines-wrap"><table class="lines-form"><thead><tr><th scope="col">Description</th><th scope="col" style="inline-size:6rem">Quantity</th><th scope="col" style="inline-size:8rem">Unit</th><th scope="col" style="inline-size:9rem">Unit price</th><th scope="col" class="num" style="inline-size:7rem">Amount</th><th scope="col" style="inline-size:2.5rem"><span class="visually-hidden">Remove</span></th></tr></thead>
              <tbody id="ia-lines">${lines.map((l, i) => lineRow(l, i)).join("")}</tbody></table></div>
              <button type="button" class="button inv-add" data-variant="secondary" data-size="sm" id="ia-add">${ic("circle-plus", 14)}Add line</button>
              <dl class="inv-totals"><dt>Total</dt><dd class="inv-due" id="ia-total">${money(0)}</dd></dl>
            </fieldset>
            <fieldset class="form-section" style="max-inline-size:var(--content-max-width-reading)"><legend class="form-section-title">Message</legend>
              ${fld("ia-message", "Message to the client", `<textarea class="input" id="ia-message" name="message" rows="3"></textarea>`, { opt: true })}
            </fieldset>
            <div class="form-actions" data-sticky><button type="submit" class="button">Save invoice</button><button type="button" class="button" data-variant="ghost" id="ia-cancel">Cancel</button><span class="form-actions-note" id="ia-note" aria-live="polite"></span></div>
          </form></div></div>`;
        const form = $("#ia");
        BolsterCombobox.attach($("#ia-client"), { options: clients, add: newCustomer, noun: ["client", "clients"], onPick: (c) => { const j = JOBS.find((x) => x.client?.id === c.id); if (j) $("#ia-job").value = j.label; } });
        BolsterForm.attach(form, { save: () => wait(700), checks: Object.fromEntries(lines.map((_, i) => [`ia-price-${i}`, (x, f) => (!x && f.elements[`desc-${i}`].value.trim() ? "Enter a price" : "")])) });
        const t = BolsterForm.track(form, $("#ia-note"));
        const total = () => { lines = $$("#ia-lines tr").map((tr, i) => ({ desc: tr.querySelector(`[name="desc-${i}"]`).value, qty: tr.querySelector(`[name="qty-${i}"]`).value, unit: tr.querySelector(`[name="unit-${i}"]`).value, price: tr.querySelector(`[name="price-${i}"]`).value })); let sum = 0; $$("#ia-lines tr").forEach((tr, i) => { const q = +BolsterField.value(tr.querySelector(`[name="qty-${i}"]`)) || 0, p = +BolsterField.value(tr.querySelector(`[name="price-${i}"]`)) || 0; sum += q * p; $(".amt", tr).textContent = q && p ? money(q * p) : "—"; }); $("#ia-total").textContent = money(sum); };
        form.addEventListener("input", total); total();
        $("#ia-add").addEventListener("click", () => { total(); lines.push({ desc: "", qty: "", unit: "each", price: "" }); $("#ia-lines").insertAdjacentHTML("beforeend", lineRow(lines.at(-1), lines.length - 1)); $(`#ia-desc-${lines.length - 1}`).focus(); });
        form.addEventListener("click", (e) => { const r = e.target.closest("[data-remove]"); if (r && $$("#ia-lines tr").length > 1) { r.closest("tr").remove(); $$("#ia-lines tr").forEach((tr, i) => tr.querySelectorAll("[name]").forEach((x) => { x.name = x.name.replace(/\d+$/, i); x.id = x.id.replace(/\d+$/, i); })); total(); } });
        form.addEventListener("form-saved", () => {
          const vals = Object.fromEntries(new FormData(form));
          $("#ia-body").innerHTML = `<div class="fx-done" role="status"><p><b>${nextNumber} saved as a draft</b> for ${esc(vals.client)}, ${$("#ia-total")?.textContent || ""}.</p><p>Sending is its own step. To change it after sending: Edit, change it, Save, then Send again.</p><div class="form-actions"><button type="button" class="button" id="ia-send">Send to ${esc(vals.client.split(" ")[0])}</button><button type="button" class="button" data-variant="ghost" id="ia-again">Start again</button></div></div>`;
          $("#ia-send").addEventListener("click", (e) => { e.target.closest(".fx-done").querySelector("p").innerHTML = `<b>${nextNumber} sent</b> to ${esc(vals.client)}. Changing it now means Edit, Save, and sending it again.`; e.target.remove(); });
          $("#ia-again").addEventListener("click", () => { lines = [{ desc: "", qty: "", unit: "each", price: "" }]; v.render(); });
        });
        $("#ia-cancel").addEventListener("click", async () => { if (t.changes() === 0 || (await BolsterForm.leave(form))) { lines = [{ desc: "", qty: "", unit: "each", price: "" }]; v.render(); } });
      },
    };
    const lineRow = (l, i) => `<tr>
      <td data-label="Description"><label class="visually-hidden" for="ia-desc-${i}">Description, line ${i + 1}</label><input class="input" id="ia-desc-${i}" name="desc-${i}" value="${esc(l.desc)}"${i === 0 ? " required" : ""} data-error-empty="Enter what this line is for" aria-describedby="ia-desc-${i}-error"><p class="field-error" id="ia-desc-${i}-error" hidden></p></td>
      <td data-label="Quantity"><label class="visually-hidden" for="ia-qty-${i}">Quantity, line ${i + 1}</label><input class="input" id="ia-qty-${i}" name="qty-${i}" data-format="number" data-numeric inputmode="decimal" data-min="0" value="${esc(l.qty)}" aria-describedby="ia-qty-${i}-error"><p class="field-error" id="ia-qty-${i}-error" hidden></p></td>
      <td data-label="Unit"><label class="visually-hidden" for="ia-unit-${i}">Unit, line ${i + 1}</label><div class="select"><select class="input" id="ia-unit-${i}" name="unit-${i}">${UNITS.map((u) => `<option${u === l.unit ? " selected" : ""}>${u}</option>`).join("")}</select></div></td>
      <td data-label="Unit price"><label class="visually-hidden" for="ia-price-${i}">Unit price, line ${i + 1}</label>${moneyInput(`ia-price-${i}`, `price-${i}`, l.price)}<p class="field-error" id="ia-price-${i}-error" hidden></p></td>
      <td class="amt" data-label="Amount">—</td>
      <td><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-remove aria-label="Remove line ${i + 1}" data-tip="Remove line">${ic("trash", 14)}</button></td></tr>`;
    return v;
  };

  // ---------- B and C: the invoice is the document; its state decides how a change saves ----------
  function invoiceView(c) {
    // c: { drafted } for C (lines and marks from the schedule and the change orders)
    let inv = null, pending = {}, phase = c ? "ready" : "create", problem = "", flash = "";
    const v = { specs: {} };
    const base = () => ({ job: JOBS[0], client: vera, status: "draft", issued: "2026-10-29", terms: "Net 30", lines: [], message: "", paidOn: "" });
    function makeSpecs() {
      const sent = inv.status === "sent", paid = inv.status === "paid";
      const spec = (key, label, kind, get, set, extra = {}) => {
        const s = { label, kind, ...extra, locked: paid,
          get: () => (sent && key in pending ? pending[key] : get()),
          set: (val, quiet) => { if (sent) { pending[key] = val; return; } if (!quiet && s.marked && s.marked.kind !== "typed") { s.originalMark = s.marked; s.original = get(); s.marked = { kind: "typed", back: true }; } set(val); },
          changed: () => sent && key in pending && pending[key] !== get(),
          was: () => (extra.show ? extra.show(get()) : get()),
        };
        s.mark = () => s.marked;
        return s;
      };
      const old = v.specs;
      const S = {
        issued: spec("issued", "Issued", "date", () => inv.issued, (x) => (inv.issued = x), { show: day }),
        terms: spec("terms", "Due", "select", () => inv.terms, (x) => (inv.terms = x), { options: TERMS, show: (t) => `${t === "On receipt" ? "On receipt" : `${t}, ${day(dueOf(inv.issued, t))}`}` }),
        message: spec("message", "Message", "textarea", () => inv.message, (x) => (inv.message = x)),
      };
      inv.lines.forEach((l, i) => {
        // a line read from the job, once changed, is yours: its mark says so
        const mine = () => { if (l.mark && l.mark.kind !== "typed") l.mark = { kind: "typed" }; };
        S[`d${i}`] = spec(`d${i}`, `Line ${i + 1}, description`, "text", () => l.desc, (x) => { l.desc = x; mine(); });
        S[`a${i}`] = spec(`a${i}`, `Line ${i + 1}, amount`, "money", () => l.amount, (x) => { l.amount = x; mine(); }, { show: money });
      });
      // a value's mark survives a re-render (its own, or a typed change's way back)
      for (const k of Object.keys(S)) if (old[k]) { S[k].marked = old[k].marked; S[k].original = old[k].original; S[k].originalMark = old[k].originalMark; }
      v.specs = S;
    }
    const dueOf = (iso, t) => { const d = new Date(`${iso}T12:00`); d.setDate(d.getDate() + ({ "Net 15": 15, "Net 30": 30 }[t] || 0)); return d.toISOString().slice(0, 10); };
    const changes = () => Object.keys(pending).filter((k) => v.specs[k]?.changed()).length + inv.lines.filter((l) => l.isNew).length;

    v.render = function () {
      if (phase === "create") return create();
      if (phase === "ready") return ready();
      makeSpecs();
      const paid = inv.status === "paid", sent = inv.status === "sent";
      const total = invoiceTotals(inv.lines.map((l, i) => ({ amount: sent && `a${i}` in pending ? pending[`a${i}`] : l.amount })));
      const openSug = Object.values(v.specs).filter((s) => s.mark?.()?.kind === "suggested").map((s) => s.label);
      const first = inv.client.label.split(" ")[0];
      const state = inv.status === "draft"
        ? `<div class="inv-state" data-tone="draft"><span class="badge" data-status="draft">Draft</span><p>Only you see it. A change keeps as you save each value.</p><button type="button" class="button" id="iv-send">${ic("send", 14)}Send to ${first}</button></div>`
        : sent ? `<div class="inv-state" data-tone="sent"><span class="badge" data-status="outstanding">Sent</span><p>${first} has had it since Oct 29. A change waits here until you resend it.</p><button type="button" class="button" data-variant="secondary" id="iv-paid">Mark as paid</button></div>`
        : `<div class="inv-state" data-tone="paid"><span class="badge" data-status="booked">Paid</span><p>Paid in full on Nov 3, by card. It can't change now; to correct it, issue a credit note.</p><button type="button" class="button" data-variant="secondary" id="iv-credit">Issue a credit note</button><button type="button" class="button" data-variant="ghost" id="iv-dup">Duplicate</button></div>`;
      const legend = c ? `<div class="fx-legend" aria-label="What the marks mean"><span><span class="src" data-kind="source">${ic("chart-gantt", 12)}from the job</span> the schedule or a change order</span><span><span class="src" data-kind="suggested">${ic("sparkles", 12)}suggested</span> needs your OK</span><span><span class="src" data-kind="default">company default</span></span><span><span class="src" data-kind="typed">changed by you</span></span></div>` : "";
      stage.innerHTML = `<div class="fx-screen">
        <div class="fx-head"><h2>${nextNumber}</h2><p class="fx-sub">${esc(inv.job.label)} · ${esc(inv.client.label)}${c && inv.status === "draft" ? ". Drafted by Bolster from the job: check it, then send it." : ""}</p></div>
        ${flash ? `<div class="fx-done" role="status"><p>${flash}</p></div>` : ""}
        ${state}${legend}
        <article class="inv" aria-label="The invoice, as ${esc(first)} sees it">
          <div class="inv-top"><div><h3>Lakeside Drywall &amp; Insulation</h3><p class="fx-hint">4100 Lake Austin Blvd, Austin, TX 78703</p></div>
            <dl class="inv-meta"><dt>Invoice</dt><dd>${nextNumber}</dd><dt>Issued</dt><dd>${cell("issued", v.specs.issued)}</dd><dt>Due</dt><dd>${cell("terms", v.specs.terms)}</dd></dl></div>
          <div class="inv-to"><span class="fx-hint">Bill to</span><br><b>${esc(inv.client.label)}</b><br>412 Westlake Dr, Austin, TX 78746<br><span class="fx-hint">For ${esc(inv.job.label)}</span></div>
          <table class="inv-lines"><thead><tr><th scope="col">Description</th><th scope="col" class="num">Amount</th></tr></thead><tbody>
            ${inv.lines.length ? inv.lines.map((l, i) => `<tr><td>${cell(`d${i}`, v.specs[`d${i}`])}${l.detail ? `<span class="inv-line-detail">${esc(l.detail)}</span>` : ""}${l.isNew ? '<span class="rec-changed">new</span>' : ""}${l.mark ? `<span class="rec-marks">${marks(`l${i}`, { mark: () => l.mark })}</span>` : ""}</td><td class="num">${cell(`a${i}`, v.specs[`a${i}`])}</td></tr>`).join("") : `<tr><td colspan="2" class="fx-hint">No lines yet: add what you're billing for.</td></tr>`}
          </tbody></table>
          ${paid ? "" : `<div class="form-actions"><button type="button" class="button" data-variant="secondary" data-size="sm" id="iv-from">${ic("list", 14)}Add from the estimate</button><button type="button" class="button" data-variant="ghost" data-size="sm" id="iv-line">${ic("circle-plus", 14)}Add a line</button></div><div id="iv-adding"></div>`}
          <dl class="inv-totals"><dt>Total due</dt><dd class="inv-due">${money(total)}</dd></dl>
          <div class="rec-section"><h3>Message</h3><div class="rec-row" style="grid-template-columns:minmax(0,1fr)">${cell("message", v.specs.message)}</div></div>
        </article>
        ${c && c.left && !paid ? `<div class="inv-left"><h3>Not on this invoice</h3>${c.left.filter((x) => !x.added).map((x, i) => `<div class="inv-left-row"><span><b>${esc(x.name)}</b> · ${esc(x.why)}</span>${x.stage ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-left="${i}">Add anyway</button>` : ""}</div>`).join("")}</div>` : ""}
        ${problem ? `<div class="inv-state" data-tone="sent" role="alert"><p>${problem}</p><button type="button" class="button" id="iv-all">Accept ${openSug.length === 2 ? "both" : "all"} and send</button></div>` : ""}
        ${sent && changes() ? `<div class="fx-changes" role="status"><p>${changes() === 1 ? "1 change" : `${changes()} changes`} ${first} hasn't seen</p><button type="button" class="button" data-variant="secondary" data-size="sm" id="iv-discard">Discard</button><button type="button" class="button" data-variant="brand" data-size="sm" id="iv-resend">Resend to ${first}</button></div>` : ""}
      </div>`;
      flash = "";
      const on = (id, fn) => $(`#${id}`)?.addEventListener("click", fn);
      on("iv-send", () => {
        if (openSug.length) { problem = `Check ${openSug.length === 1 ? "one suggestion" : `${openSug.length} suggestions`} before sending: ${openSug.join(", ")}.`; return v.render(); }
        if (!inv.lines.length) { problem = ""; flash = "Add at least one line before sending."; return v.render(); }
        inv.status = "sent"; problem = ""; flash = `Sent to ${esc(inv.client.label)} (vera@example.com). From now on, a change waits until you resend it.`; v.render();
      });
      on("iv-all", () => { Object.keys(v.specs).forEach((k) => { const s = v.specs[k]; if (s.mark?.()?.kind === "suggested") s.marked = { kind: "source", text: "you accepted it", icon: "check" }; }); problem = ""; inv.status = "sent"; flash = `Sent to ${esc(inv.client.label)}.`; v.render(); });
      on("iv-paid", () => { if (changes()) { flash = "Resend or discard the changes first."; return v.render(); } inv.status = "paid"; v.render(); });
      on("iv-credit", () => { flash = "A credit note would open as a new draft, linked to this invoice (not built here)."; v.render(); });
      on("iv-dup", () => { flash = "Duplicate would open a new draft with these lines (not built here)."; v.render(); });
      on("iv-discard", () => { pending = {}; inv.lines = inv.lines.filter((l) => !l.isNew); v.render(); });
      on("iv-resend", () => { for (const [k, val] of Object.entries(pending)) { const i = +k.slice(1); if (k === "issued") inv.issued = val; else if (k === "terms") inv.terms = val; else if (k === "message") inv.message = val; else if (k[0] === "d") inv.lines[i].desc = val; else if (k[0] === "a") inv.lines[i].amount = val; } inv.lines.forEach((l) => delete l.isNew); pending = {}; flash = `Resent to ${esc(inv.client.label)}. The version she had stays in the invoice's Activity.`; v.render(); });
      on("iv-from", () => adding("estimate"));
      on("iv-line", () => adding("line"));
      $$("[data-left]").forEach((b) => b.addEventListener("click", () => { const x = c.left[+b.dataset.left]; x.added = true; addLine({ desc: `${x.stage.name}, 100% of ${money(x.stage.total)}`, amount: x.stage.total, mark: { kind: "typed", text: "added by you" } }); }));
    };
    v.accept = (k) => { const s = v.specs[k]; if (s) s.marked = { kind: "source", text: "you accepted it", icon: "check" }; if (!Object.values(v.specs).some((x) => x.mark?.()?.kind === "suggested")) problem = ""; v.render(); $(`[data-f="${k}"]`)?.focus(); };
    v.putBack = (k) => { const s = v.specs[k]; s.set(s.original, true); s.marked = s.originalMark; v.render(); };
    v.savedWord = () => (inv?.status === "sent" ? "Waits for Resend" : "Saved");
    function addLine(l) { if (inv.status === "sent") l.isNew = true; inv.lines.push(l); v.render(); }
    function adding(kind) {
      const box = $("#iv-adding");
      const left = STAGES.filter((s) => s.total - s.billed - inv.lines.filter((l) => l.stage === s.id).reduce((n, l) => n + l.amount, 0) > 0);
      box.innerHTML = kind === "estimate"
        ? `<form class="rec-edit" id="iv-add-form" novalidate><div class="form-row">${fld("iv-stage", "Stage", `<div class="select"><select class="input" id="iv-stage" name="stage" required aria-describedby="iv-stage-error"><option value="">Choose a stage</option>${left.map((s) => `<option value="${s.id}">${s.name} · ${money(s.total - s.billed)} left · ${s.done}% done on the schedule</option>`).join("")}</select></div>`)}${fld("iv-pct", "Bill", `<div class="input-group"><input class="input" id="iv-pct" name="pct" data-format="number" data-numeric inputmode="decimal" data-decimals="0" data-min="1" data-max="100" required aria-describedby="iv-pct-error"><span class="input-adornment">%</span></div>`, { width: 8 })}</div><div class="rec-edit-actions"><button type="submit" class="button" data-size="sm">Add line</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-cancel>Cancel</button></div></form>`
        : `<form class="rec-edit" id="iv-add-form" novalidate><div class="form-row">${fld("iv-desc", "Description", `<input class="input" id="iv-desc" name="desc" required aria-describedby="iv-desc-error">`)}${fld("iv-amount", "Amount", moneyInput("iv-amount", "amount", "", "required"), { width: 12 })}</div><div class="rec-edit-actions"><button type="submit" class="button" data-size="sm">Add line</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-cancel>Cancel</button></div></form>`;
      const f = $("#iv-add-form");
      if (kind === "estimate") $("#iv-stage").addEventListener("change", (e) => { const s = STAGES.find((x) => x.id === e.target.value); if (s) $("#iv-pct").value = s.done || ""; });
      BolsterForm.attach(f, { save: async (vals) => {
        if (kind === "estimate") { const s = STAGES.find((x) => x.id === vals.stage); addLine({ ...lineOf(s, +vals.pct), stage: s.id }); }
        else addLine({ desc: vals.desc, amount: +BolsterField.value($("#iv-amount")) });
      } });
      $("[data-cancel]", f).addEventListener("click", () => (box.innerHTML = ""));
      f.addEventListener("keydown", (e) => { if (e.key === "Escape") box.innerHTML = ""; });
      f.querySelector("select, input").focus();
    }
    function create() {
      stage.innerHTML = `<div class="fx-scrim"><div class="dialog" data-size="sm" open>
        <form id="ib" novalidate style="display:contents">
          <header class="dialog-header"><h2>New invoice</h2></header>
          <div class="dialog-body"><div class="form" data-density="compact">
            ${fld("ib-job", "Job", combo("ib-job", "job", { req: true, placeholder: "Search jobs" }), { hint: "The client, number, dates and terms follow from it" })}
          </div></div>
          <footer class="dialog-footer"><button type="submit" class="button">Create draft</button></footer>
        </form></div></div>`;
      $("#ib-job").setAttribute("aria-describedby", "ib-job-hint ib-job-error");
      BolsterCombobox.attach($("#ib-job"), { options: JOBS, noun: ["job", "jobs"] });
      BolsterForm.attach($("#ib"), { save: async () => { await wait(300); inv = base(); phase = "doc"; v.render(); } });
      $("#ib-job").focus();
    }
    function ready() {
      stage.innerHTML = `<div class="fx-screen"><div class="fx-head"><h2>Invoices</h2></div>
        <div class="inv-state" data-tone="draft" style="align-items:flex-start">${ic("sparkles", 16)}<p><b>${nextNumber} is ready to check.</b> Roofing reached 60% on Oct 27 and the skylight (change order 1) was put in on Oct 26, so Bolster drafted the next invoice for Roof and kitchen refresh: ${money(8700 + 1200)}.</p><button type="button" class="button" id="iv-check">Check the draft</button></div>
        <p class="fx-hint">It could arrive as a notification, or wait on the job's Billing page.</p></div>`;
      $("#iv-check").addEventListener("click", () => {
        inv = base();
        inv.lines = [
          { desc: "Roofing, 60% of $14,500.00", amount: 8700, stage: "s3", mark: { kind: "source", text: "from the schedule", icon: "chart-gantt", tip: "Roofing 60% done, set by Hiro Nakamura on Oct 27" } },
          { desc: "Change order 1: skylight over the kitchen", amount: 1200, mark: { kind: "source", text: "from change order 1", icon: "file-signature", tip: "Signed by Vera on Oct 20; put in on Oct 26" } },
        ];
        inv.message = "Hi Vera, here's the invoice for the roofing so far and the skylight. Thank you!";
        phase = "doc"; v.specs = {}; makeSpecs();
        v.specs.terms.marked = { kind: "suggested", tip: "Your last 4 invoices to Vera were Net 30" };
        v.specs.message.marked = { kind: "suggested", tip: "Written from the lines" };
        v.specs.issued.marked = { kind: "default", text: "today" };
        v.render();
      });
    }
    return v;
  }
  VIEWS["invoice-b"] = () => invoiceView(null);
  VIEWS["invoice-c"] = () => invoiceView({ left: [
    { name: "Kitchen, $16,550.00", why: "not started on the schedule", stage: STAGES[3] },
    { name: "Change order 2: gutters, $2,300.00", why: "waiting for Vera's signature" },
    { name: "Deposit, $4,825.00", why: "already taken off INV-1042" },
  ] });

  // ---------- shared with c.js (direction C with its rules), which replaces the C views and starts the page ----------
  window.FX = {
    $, $$, esc, ic, money, day, combo, select, moneyInput, address, siteLine, readSite, newCustomer, fld,
    clients, crew, lookup, wait, vera, marco, me, hiro, JOBS, STAGES, TYPES, SOURCES, TERMS, VIEWS, stage, NOTES,
    view: () => view,
    reset: (key) => { delete cache[key]; if (`${subject}-${dir}` === key) go(); },
    // start where you left off
    start() {
      let start = location.hash.slice(1);
      if (!VIEWS[start]) { try { start = localStorage.getItem("bolster-concepts:forms") || ""; } catch {} }
      if (VIEWS[start]) [subject, dir] = start.split("-");
      go();
    },
  };
})();
