// Direction C with its rules (D140; the draft C-rules, docs/forms-c-research.md, 06): the new job and the invoice,
// filled from what's there, laid out to be read, each value saying where it came from, checked at the step that
// needs it. It replaces forms.js's first C views; A and B stay as they were, to compare. Made-up data.
(() => {
  const F = window.FX;
  const { $, $$, esc, ic, money, day, combo, select, moneyInput, address, siteLine, readSite, newCustomer, fld, clients, crew, lookup, wait, vera, marco, me, JOBS, STAGES, TYPES, SOURCES, TERMS, VIEWS, stage, NOTES } = F;
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const short = (s, n = 24) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  // ================= the record's parts (C-read, C-empty, C-together, C-edit) =================
  // a spec: { label, kind, get, set, show, add, need, rare, long, group, check } and its mark (C-marks):
  //   source (from a named source; main: the record's own source, said once in its head, C-scope), matched,
  //   suggested (Bolster inferred it; readings when it heard two things), default, typed (changed by you), accepted
  function markHtml(id, s, { quiet } = {}) {
    const m = s.m;
    if (!m) return "";
    const mid = `m-${id}`;
    const ev = (t) => (m.quote ? ` data-q="${m.quote}"` : "") + ` data-tip="${esc(t)}"`;
    if (m.kind === "source" && (m.main || quiet)) return `<button type="button" class="detail-mark" data-kind="source" data-compact id="${mid}" aria-label="${esc(m.text)}${m.tip ? `: ${esc(m.tip)}` : ""}"${ev(`${m.text}${m.tip ? `: ${m.tip}` : ""}`)}>${ic(m.icon || "message", 12)}</button>`;
    if (m.kind === "source") return `<button type="button" class="detail-mark" data-kind="source" id="${mid}"${ev(m.tip || m.text)}>${ic(m.icon || "message", 12)}${esc(m.text)}</button>`;
    if (m.kind === "matched") return quiet ? `<span class="detail-mark" data-kind="source" data-compact id="${mid}" tabindex="0" data-tip="${esc(m.text)}" aria-label="${esc(m.text)}">${ic("link", 12)}</span>` : `<span class="detail-mark" data-kind="source" id="${mid}">${ic("link", 12)}${esc(m.text)}</span>`;
    if (m.kind === "default") return quiet ? "" : `<span class="detail-mark" data-kind="default" id="${mid}">${esc(m.text || "company default")}</span>`;
    if (m.kind === "accepted") return quiet ? "" : `<span class="detail-mark" data-kind="typed" id="${mid}">accepted by you</span>`;
    if (m.kind === "typed") return quiet ? "" : `<span class="detail-mark" data-kind="typed" id="${mid}">${esc(m.text || "changed by you")}</span>${s.origShown ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-back="${id}">Put back ${esc(short(s.origShown))}</button>` : ""}`;
    if (m.kind === "suggested") {
      if (m.readings) return `<span class="detail-mark" data-kind="suggested" id="${mid}">${ic("sparkles", 12)}${esc(m.heard)}</span>${m.readings.map((r, i) => `<button type="button" class="button" data-variant="secondary" data-size="sm" data-reading="${id}:${i}">${esc(r.label)}</button>`).join("")}`;
      return `<span class="detail-mark" data-kind="suggested" id="${mid}">${ic("sparkles", 12)}suggested</span><span class="detail-mark-reason">${esc(m.tip || "")}</span><button type="button" class="button" data-variant="secondary" data-size="sm" data-accept="${id}">Accept</button>`;
    }
    return "";
  }
  function valueHtml(id, s, o = {}) {
    const v = s.get(), shown = s.show ? s.show(v) : v ?? "";
    const desc = s.m && markHtml(id, s, o) ? ` aria-describedby="m-${id}"` : "";
    const pencil = `<span class="detail-pencil" aria-hidden="true">${ic("pen", 12)}</span>`;
    if (o.locked) return `<div class="detail-value" data-static data-cf="${id}" aria-disabled="true">${esc(shown || "—")}</div>`;
    if (shown === "" || (Array.isArray(v) && !v.length)) {
      // C-empty: needed by a step says which; optional is a dash
      if (s.need) return `<button type="button" class="detail-value" data-cf="${id}" data-empty${desc}><span class="detail-prompt">${esc(s.add || `Add ${s.label.toLowerCase()}`)}</span><span class="detail-value-sub">Needed to ${esc(s.need)}</span>${pencil}</button>`;
      return `<button type="button" class="detail-value" data-cf="${id}" aria-label="${esc(s.label)}: none. Add it"${desc}><span class="detail-none" aria-hidden="true">—</span>${pencil}</button>`;
    }
    return `<button type="button" class="detail-value" data-cf="${id}" aria-label="${esc(s.label)}: ${esc(shown)}. Change it"${desc}><span>${esc(shown)}</span>${pencil}</button>`;
  }
  const warnHtml = (w) => (w ? `<p class="crec-warn" data-tone="${w.tone || "warning"}">${ic(w.tone === "info" ? "circle-help" : "triangle-exclamation", 14)}<span>${w.html}</span></p>` : "");
  function rowHtml(id, s, o = {}) {
    const empty = (() => { const v = s.get(); const sh = s.show ? s.show(v) : v ?? ""; return sh === "" || (Array.isArray(v) && !v.length); })();
    if (s.rare && empty && !o.showEmpty) return "";
    // the marks sit on their own line under the value, so they're in one place on every row (the review, 29 Oct)
    const mark = markHtml(id, s, o), changed = s.changed?.() ? `<span class="rec-changed">changed</span><span class="rec-was">${esc(s.show ? s.show(s.base()) : s.base())}</span>` : "";
    return `<div class="detail-row" data-k="${id}"${s.long ? " data-wide" : ""}><div class="detail-label${o.bare && s.long ? " visually-hidden" : ""}" id="l-${id}">${s.icon ? ic(s.icon, 12) : ""}<span>${s.label}</span></div>
      <div class="crec-cell" data-cell="${id}">${valueHtml(id, s, o)}${mark || changed ? `<span class="detail-marks">${mark}${changed}</span>` : ""}${warnHtml(s.warn?.())}${s.after?.() || ""}</div></div>`;
  }
  function sectionHtml(title, ids, specs, o = {}) {
    const rows = ids.map((k) => rowHtml(k, specs[k], { ...o, showEmpty: o.open?.has(k) })).join("");
    // a value rarely set waits as a chip naming it; the chip opens its field where its row goes
    const waiting = ids.filter((k) => specs[k].rare && !o.open?.has(k) && !rowHtml(k, specs[k], o));
    const chips = waiting.length && !o.locked ? `<div class="detail-reveal" role="group" aria-label="More for ${esc(title.toLowerCase())}">${waiting.map((k) => `<span class="chip"><button type="button" class="chip-main" data-reveal="${k}">+ ${esc(specs[k].label)}</button></span>`).join("")}</div>` : "";
    return `<section class="crec-section" aria-label="${title}"><h3 class="detail-section-title">${title}</h3>${rows}${chips}</section>`;
  }

  // a value's editor, under its row (C-edit, C-together): one field with its label hidden, or a group's small form
  // with its labels above and its rows (F-rows); Enter saves, Escape puts it back, an invalid value keeps it open
  function editorHtml(id, s) {
    const v = s.get(), e = `ce-${id}`;
    const single = (control) => `<div class="field"><label class="field-label visually-hidden" for="${e}">${s.label}</label>${control}<p class="field-error" id="${e}-error" hidden></p></div>`;
    const body = s.kind === "select" ? single(select(e, "v", s.options, v))
      : s.kind === "date" ? single(`<input class="input" type="date" id="${e}" name="v" value="${esc(v)}" aria-describedby="${e}-error">`)
      : s.kind === "money" ? single(moneyInput(e, "v", v))
      : s.kind === "textarea" ? single(`<textarea class="input" id="${e}" name="v" rows="3">${esc(v)}</textarea>`)
      : s.kind === "client" ? single(combo(e, "v", { req: true, value: v?.label }))
      : s.kind === "person" ? single(combo(e, "v", { value: v?.label }))
      : s.kind === "crew" ? single(combo(e, "v", { multiple: true }))
      : s.kind === "address" ? `<div class="form" data-density="compact">${address(e, v || {})}</div>`
      : s.kind === "group" ? `<div class="form" data-density="compact">${s.group.html(e, v)}</div>`
      : single(`<input class="input" id="${e}" name="v" value="${esc(v)}"${s.req ? " required" : ""} aria-describedby="${e}-error">`);
    return `<form class="rec-edit" data-cedit="${id}" novalidate${s.kind === "group" || s.kind === "address" ? " data-group" : ""}>${body}<div class="rec-edit-actions"><button type="submit" class="button" data-size="sm">Save</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-cancel>Cancel</button><span class="fx-hint">Enter saves · Escape puts it back</span></div></form>`;
  }
  function edit(v, id) {
    const s = v.specs[id], box = $(`[data-cell="${id}"]`);
    if (!s || !box) return;
    box.closest(".detail-row, .inv-line, .civ-line")?.setAttribute("data-editing", "");
    box.innerHTML = editorHtml(id, s);
    const form = $("form", box), e = `ce-${id}`;
    let api = null;
    if (s.kind === "client") api = BolsterCombobox.attach($(`#${e}`), { options: clients, add: newCustomer, noun: ["customer", "customers"], value: s.get() });
    if (s.kind === "person") api = BolsterCombobox.attach($(`#${e}`), { options: crew, noun: ["person", "people"], value: s.get() });
    if (s.kind === "crew") api = BolsterCombobox.attach($(`#${e}`), { options: crew, noun: ["person", "people"], value: s.get() || [] });
    if (s.kind === "address") BolsterAddress.attach($(".address", box), { lookup });
    BolsterForm.attach(form, {
      checks: s.check ? { [e]: s.check } : {},
      save: async () => {
        const input = $(`#${e}`);
        const val = s.kind === "address" ? readSite(box) : s.kind === "group" ? s.group.read(e) : api ? api.value : s.kind === "money" ? (input.value.trim() ? +BolsterField.value(input) : "") : input.value.trim();
        v.change(id, val);
        v.render();
        const b = $(`[data-cf="${id}"]`);
        if (b) { b.closest(".crec-cell, .inv-cell, .civ-cell")?.insertAdjacentHTML("beforeend", `<span class="rec-saved" role="status">${ic("check", 12)}${v.savedWord?.() || "Saved"}</span>`); b.focus({ preventScroll: true }); setTimeout(() => $(`[data-cell="${id}"] .rec-saved`)?.remove(), 2400); }
      },
    });
    const cancel = () => { v.render(); $(`[data-cf="${id}"]`)?.focus({ preventScroll: true }); };
    $("[data-cancel]", form).addEventListener("click", cancel);
    form.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !ev.defaultPrevented) { ev.preventDefault(); cancel(); } });
    form.querySelector("input:not([type=hidden]), select, textarea")?.focus();
  }

  // a value changed by a person: its mark says so, with a way back to what was read (C-marks)
  function changeSpec(s, val) {
    if (s.m && !["typed", "accepted"].includes(s.m.kind) && s.orig === undefined) { s.orig = s.get(); s.origMark = s.m; s.origShown = s.show ? s.show(s.orig) : String(s.orig ?? ""); }
    s.set(val);
    if (s.m || s.orig !== undefined) s.m = { kind: "typed" };
  }
  function putBack(s) { s.set(s.orig); s.m = s.origMark; s.orig = undefined; s.origShown = ""; }

  // the summary before a step (C-gate, C-summary, C-severity, C-reason): what to fix, what to check, one by one
  function summaryHtml(step, r) {
    if (!r || (!r.fix.length && !r.check.length)) return "";
    const n = (k) => (k === 1 ? "1" : `${k}`);
    return `<section class="detail-check" role="alert" tabindex="-1" aria-labelledby="csum-t"><h3 id="csum-t">Before ${esc(step)}</h3>
      ${r.fix.length ? `<div class="detail-check-part" data-tone="error"><h4>${n(r.fix.length)} to fix</h4><ul>${r.fix.map((x) => `<li>${ic("triangle-exclamation", 14)}<a href="#l-${x.k}" data-goto="${x.k}">${esc(x.text)}</a></li>`).join("")}</ul></div>` : ""}
      ${r.check.length ? `<div class="detail-check-part" data-tone="check"><h4>${n(r.check.length)} to check</h4><ul>${r.check.map((x) => `<li data-kind="${x.kind}">${x.kind === "suggested" ? ic("sparkles", 14) : ic("triangle-exclamation", 14)}<span class="detail-check-text">${x.html}</span>
        <span class="detail-check-acts">${x.kind === "suggested" ? (x.readings ? "" : `<button type="button" class="button" data-variant="secondary" data-size="sm" data-accept="${x.k}">Accept</button>`) + `<button type="button" class="button" data-variant="ghost" data-size="sm" data-goto="${x.k}">${x.readings ? "Choose" : "Change"}</button>` : x.strong ? `<label class="detail-check-why"><span class="visually-hidden">Why ${esc(x.label)}</span><input class="input" data-size="sm" placeholder="Why, in a line" data-reason="${x.id}" value="${esc(x.reason || "")}"></label>` : `<button type="button" class="button" data-variant="ghost" data-size="sm" data-goto="${x.k}">Look at it</button>`}</span></li>`).join("")}</ul></div>` : ""}
    </section>`;
  }
  const blocks = (r) => r.fix.length || r.check.some((x) => x.kind === "suggested" || (x.strong && !(x.reason || "").trim()));

  // shared clicks: open a value, accept, choose a reading, put back, show empty values, go to a value from the summary
  stage.addEventListener("click", (e) => {
    const v = F.current?.();
    if (!v?.c) return;
    let t;
    if ((t = e.target.closest(".detail-value[data-cf]:not([aria-disabled])"))) { if (!v.locked?.()) edit(v, t.dataset.cf); return; }
    if ((t = e.target.closest("[data-accept]"))) { v.accept(t.dataset.accept); return; }
    if ((t = e.target.closest("[data-reading]"))) { const [k, i] = t.dataset.reading.split(":"); v.pick(k, +i); return; }
    if ((t = e.target.closest("[data-back]"))) { putBack(v.specs[t.dataset.back]); v.render(); $(`[data-cf="${t.dataset.back}"]`)?.focus(); return; }
    if ((t = e.target.closest("[data-reveal]"))) { const k = t.dataset.reveal; v.open.add(k); v.render(); edit(v, k); return; }
    if ((t = e.target.closest("[data-goto]"))) { e.preventDefault(); const k = t.dataset.goto; const b = $(`[data-cf="${k}"]`); if (b) { b.scrollIntoView({ block: "center", behavior: "smooth" }); if (b.matches("button")) edit(v, k); } else document.getElementById(`l-${k}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if ((t = e.target.closest(".detail-mark[data-q]"))) { ring(t.dataset.q, "words"); return; }
  });
  stage.addEventListener("input", (e) => { const r = e.target.closest("[data-reason]"); if (r) F.current?.()?.reason?.(r.dataset.reason, r.value); });
  // the evidence, both ways (C-evidence): a mark rings its words in the source; the words ring their value
  function ring(id, what) {
    if (what === "words") { const m = document.getElementById(id); if (!m) return; $$(".crec-rail mark, .crail-item").forEach((x) => delete x.dataset.on); m.closest("details")?.setAttribute("open", ""); m.dataset.on = ""; m.scrollIntoView({ block: "nearest", behavior: "smooth" }); setTimeout(() => delete m.dataset.on, 2200); }
  }
  stage.addEventListener("pointerover", (e) => { const m = e.target.closest("[data-for]"); $$(".detail-row[data-ring], .inv-line[data-ring], .civ-line[data-ring]").forEach((x) => delete x.dataset.ring); if (m) $$(`[data-k~="${m.dataset.for}"]`).forEach((x) => (x.dataset.ring = "")); });
  stage.addEventListener("focusin", (e) => { const m = e.target.closest("[data-for]"); $$(".detail-row[data-ring], .inv-line[data-ring], .civ-line[data-ring]").forEach((x) => delete x.dataset.ring); if (m) $$(`[data-k~="${m.dataset.for}"]`).forEach((x) => (x.dataset.ring = "")); });
  stage.addEventListener("keydown", (e) => { const m = e.target.closest("mark[data-for]"); if (m && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); $(`[data-cf="${m.dataset.for}"]`)?.focus(); } });

  // a small dialog that asks once before something read is thrown away (C-keep)
  const askDiscard = (what) => new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dialog"; d.dataset.size = "sm"; d.setAttribute("aria-labelledby", "cd-t");
    d.innerHTML = `<header class="dialog-header"><h2 id="cd-t">Discard ${esc(what)}?</h2></header><div class="dialog-body"><p>What Bolster read stays where it came from; this draft and your changes go.</p></div><footer class="dialog-footer"><button type="button" class="button" data-variant="ghost" data-a="keep" autofocus>Keep it</button><button type="button" class="button" data-variant="danger" data-a="discard">Discard</button></footer>`;
    document.body.append(d);
    d.addEventListener("click", (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return; d.close(); d.remove(); resolve(a === "discard"); });
    d.addEventListener("cancel", () => { d.remove(); resolve(false); });
    d.showModal();
  });

  // ================= the new job, from the voicemail or the enquiry =================
  const SRC = {
    call: {
      noun: "voicemail", icon: "message", when: "today, 9:12 am",
      job: () => ({ customer: marco, name: "Kitchen and roof refresh", site: { street: "70 Orchard Ln", unit: "", city: "Austin", region: "TX", postal: "78745", country: "US" }, type: "Remodel", source: "Phone call", start: "2026-11-30", value: "", number: "1043", sales: me, pm: null, crew: [], pay: { deposit: 10, partial: "Allowed" }, notes: "Dog in the yard. Gate code 4417." }),
      marks: {
        customer: { kind: "matched", text: "matched by phone number" },
        name: { kind: "suggested", tip: "From what he wants done" },
        site: { kind: "suggested", heard: "Heard “number seventy” on Orchard Lane", readings: [{ label: "70 Orchard Ln", value: { street: "70 Orchard Ln", unit: "", city: "Austin", region: "TX", postal: "78745", country: "US" } }, { label: "17 Orchard Ln", value: { street: "17 Orchard Ln", unit: "", city: "Austin", region: "TX", postal: "78745", country: "US" } }], quote: "q-site" },
        type: { kind: "suggested", tip: "A kitchen and a roof: jobs like it are remodels" },
        source: { kind: "source", main: true, text: "From the voicemail", tip: "It came in as a call" },
        start: { kind: "suggested", tip: "“Sometime after Thanksgiving”: the Monday after", quote: "q-start" },
        sales: { kind: "default", text: "you, who created it" },
        pay: { kind: "default" },
        notes: { kind: "source", main: true, text: "From the voicemail", quote: "q-notes", tip: "“The dog's in the yard, gate code's 4417”" },
      },
      rail: `<p>“Hi, <mark id="q-who" data-for="customer" tabindex="0">it's Marco Ruiz, you did my garage last spring</mark>. We'd like to redo the kitchen at my mother's place, and the roof's leaking over it too, so maybe both? It's <mark id="q-site" data-for="site" tabindex="0">the house on Orchard Lane, number seventy</mark>. No rush, <mark id="q-start" data-for="start" tabindex="0">sometime after Thanksgiving</mark> would be great. If you come by, <mark id="q-notes" data-for="notes" tabindex="0">the dog's in the yard, gate code's 4417</mark>. Call me back on this number. Thanks!”</p><p class="fx-hint">From (555) 014-2290, Marco Ruiz's number · 0:48</p>`,
      dupe: { label: "Garage drywall", number: "1031" },
    },
    web: {
      noun: "enquiry", icon: "inbox", when: "yesterday, 6:40 pm",
      job: () => ({ customer: null, name: "Basement insulation", site: { street: "15 Elm Creek Ct", unit: "", city: "Cedar Park", region: "TX", postal: "78613", country: "US" }, type: "Insulation", source: "Website", start: "", value: "", number: "1043", sales: me, pm: null, crew: [], pay: { deposit: 10, partial: "Allowed" }, notes: "" }),
      marks: {
        name: { kind: "suggested", tip: "From what she asked for" },
        site: { kind: "source", main: true, text: "From the enquiry", icon: "inbox", quote: "q-w-site" },
        type: { kind: "source", main: true, text: "From the enquiry", icon: "inbox", quote: "q-w-type", tip: "She picked Insulation" },
        source: { kind: "source", main: true, text: "From the enquiry", icon: "inbox", tip: "It came in through your website" },
        sales: { kind: "default", text: "you, who created it" }, pay: { kind: "default" },
      },
      newCustomer: { id: "new-priya", label: "Priya Haddad", detail: "New customer" },
      rail: `<p><b>Name</b> <mark id="q-w-who" data-for="customer" tabindex="0">Priya Haddad</mark> · priya.haddad@example.com</p><p><b>Address</b> <mark id="q-w-site" data-for="site" tabindex="0">15 Elm Creek Ct, Cedar Park, TX 78613</mark></p><p><b>Service</b> <mark id="q-w-type" data-for="type" tabindex="0">Insulation</mark></p><p><b>Message</b> “Our basement is freezing in winter. Could someone look at insulating the walls? Weekends are easiest.”</p>`,
    },
  };
  const PAY = {
    html: (e, v) => `<div class="form-row">${fld(`${e}-dep`, "Deposit", `<div class="input-group"><input class="input" id="${e}-dep" data-format="number" data-numeric inputmode="decimal" data-decimals="1" data-min="0" data-max="100" value="${esc(v?.deposit ?? "")}" aria-describedby="${e}-dep-error"><span class="input-adornment">%</span></div>`, { width: 8 })}${fld(`${e}-par`, "Partial payments", select(`${e}-par`, "par", ["Allowed", "Not allowed"], v?.partial || "Allowed"))}</div><p class="form-section-hint">Asked for when the client signs the estimate</p>`,
    read: (e) => ({ deposit: $(`#${e}-dep`).value.trim() === "" ? "" : +BolsterField.value($(`#${e}-dep`)), partial: $(`#${e}-par`).value }),
  };
  function jobSpecs(job, from) {
    const S = {};
    const spec = (k, label, kind, extra = {}) => (S[k] = { label, kind, ...extra, get: () => job[k], set: (x) => (job[k] = x), m: from?.marks[k] ? { ...from.marks[k] } : null });
    spec("customer", "Customer", "client", { show: (c) => c?.label || "", need: "create it", add: "Choose the customer",
      warn: () => (from?.dupe && job.customer?.id === marco.id && job.site?.street === "70 Orchard Ln" ? { html: `Marco already has a job at 70 Orchard Ln: <a href="#" data-concept>${from.dupe.label} (${from.dupe.number})</a>. This one is new work there.` } : null) });
    if (from?.newCustomer && !job.customer) { job.customer = from.newCustomer; S.customer.m = { kind: "source", main: true, text: "From the enquiry", icon: "inbox", quote: "q-w-who", tip: "A new customer: Priya Haddad, priya.haddad@example.com" }; }
    spec("name", "Job name", "text", { req: true, need: "create it", add: "Name the job", check: (x) => (x ? "" : "Enter job name") });
    spec("site", "Site address", "address", { show: siteLine, need: "book the first visit", add: "Add the site address" });
    spec("type", "Job type", "select", { options: TYPES });
    spec("source", "Lead source", "select", { options: SOURCES });
    spec("start", "Target start", "date", { show: day, need: "schedule it", add: "Add a start date" });
    spec("value", "Estimated value", "money", { show: money });
    spec("number", "Job number", "text");
    spec("sales", "Salesperson", "person", { show: (p) => p?.label || "" });
    spec("pm", "Project manager", "person", { show: (p) => p?.label || "", need: "book it", add: "Choose a project manager" });
    spec("crew", "Crew", "crew", { show: (c) => (c || []).map((p) => p.label).join(", "), rare: true });
    spec("pay", "Payments", "group", { group: PAY, show: (p) => (p ? `${p.deposit === "" ? "No deposit" : `${p.deposit}% deposit when the estimate is signed`} · partial payments ${p.partial === "Allowed" ? "allowed" : "not allowed"}` : "") });
    spec("notes", "Note for the crew", "textarea", { long: true, rare: true });
    return S;
  }
  const JOB_SECTIONS = [["Customer", ["customer", "name"]], ["Site", ["site"]], ["The work", ["type", "source", "start", "value", "number"]], ["Team", ["sales", "pm", "crew"]], ["Payments", ["pay"]], ["Notes", ["notes"]]];

  VIEWS["job-c"] = () => {
    let job = null, from = null, phase = "pick", made = false, summary = null, stepName = "";
    const v = { c: true, specs: {}, open: new Set() };
    v.locked = () => false;
    v.change = (id, val) => { changeSpec(v.specs[id], val); refresh(); };
    v.accept = (id) => { const s = v.specs[id]; if (s?.m?.kind === "suggested") s.m = { kind: "accepted" }; refresh(); $(`[data-cf="${id}"]`)?.focus(); };
    v.pick = (id, i) => { const s = v.specs[id]; s.set(s.m.readings[i].value); s.m = { kind: "accepted" }; refresh(); $(`[data-cf="${id}"]`)?.focus(); };
    const refresh = () => { if (summary) summary = check(stepName); v.render(); };
    // what each step needs (C-gate): creating needs the customer and a name, and every suggestion settled; booking the
    // first visit needs the site; duplicates warn and never block
    function check(step) {
      const S = v.specs, fix = [], chk = [];
      if (!job.customer) fix.push({ k: "customer", text: "Choose the customer" });
      if (!job.name) fix.push({ k: "name", text: "Enter job name" });
      if (step === "booking the first visit" && !job.site?.street) fix.push({ k: "site", text: "Add the site address" });
      for (const [k, s] of Object.entries(S)) if (s.m?.kind === "suggested") chk.push({ k, kind: "suggested", readings: !!s.m.readings, html: s.m.readings ? `<b>${esc(s.label)}</b>: ${esc(s.m.heard)}. Which one?` : `<b>${esc(s.label)}</b>: “${esc(s.show ? s.show(s.get()) : s.get())}”, ${esc((s.m.tip || "").charAt(0).toLowerCase() + (s.m.tip || "").slice(1))}` });
      const w = S.customer.warn?.(); if (w) chk.push({ k: "customer", kind: "warning", html: w.html });
      return { fix, check: chk };
    }
    function step(name, then) {
      stepName = name; summary = check(name);
      if (!blocks(summary)) { summary = null; then(); return; }
      v.render(); $(".detail-check")?.focus();
    }
    v.render = function () {
      if (phase === "pick") return pick();
      const head = headHtml();
      stage.innerHTML = `<div class="fx-screen crec-screen">${head}${summaryHtml(stepName, summary)}
        <div class="crec-page"><div class="crec-main">${JOB_SECTIONS.map(([t, ks]) => sectionHtml(t, ks, v.specs, { quiet: made, open: v.open })).join("")}</div>
        <details class="crec-rail" ${matchMedia("(min-width: 1280px)").matches || phase === "reading" ? "open" : ""}><summary>${ic(from.icon, 14)}The ${from.noun} · ${from.when}</summary><div class="fx-transcript">${from.rail}</div></details></div></div>`;
      $("#c-create")?.addEventListener("click", () => step("creating the job", () => { made = true; v.render(); $("#c-title").focus(); }));
      $("#c-book")?.addEventListener("click", () => step("booking the first visit", () => { stage.querySelector(".crec-head").insertAdjacentHTML("afterend", `<div class="fx-done" role="status"><p>The first visit would be booked next: Calendar, with the site, the gate code and Marco's number (not built here).</p></div>`); }));
      $("#c-discard")?.addEventListener("click", async () => { if (await askDiscard(`the job read from the ${from.noun}`)) { phase = "pick"; job = null; summary = null; v.render(); } });
    };
    // the record's head (C-head): status, name, what it's for, its key facts, the next step
    function headHtml() {
      const reading = phase === "reading";
      const fact = (k, label) => { const s = v.specs[k]; const x = s?.show ? s.show(s.get()) : s?.get(); return `<div><dt>${label}</dt><dd>${reading ? `<span class="skeleton" style="inline-size:6rem"></span>` : esc(x || "—")}</dd></div>`; };
      return `<header class="crec-head">
        <div class="crec-title"><h2 id="c-title" tabindex="-1">${reading ? `<span class="skeleton" data-shape="title" style="inline-size:14rem"></span>` : esc(job.name || "New job")}</h2>${made ? '<span class="badge" data-status="lead">Lead</span>' : '<span class="badge" data-status="draft">Draft</span>'}${made ? `<span class="fx-hint">Job ${job.number}</span>` : ""}</div>
        <p class="crec-sub">${reading ? `${ic("sparkles", 14)}Reading the ${from.noun}…` : `${ic(from.icon, 14)}Filled from the ${from.noun}, ${from.when}. ${made ? `The ${from.noun} stays on the job's Activity.` : "Nothing is made until you create it."}`}</p>
        <dl class="crec-facts">${fact("customer", "Customer")}${fact("site", "Site")}${fact("type", "Type")}${fact("start", "Target start")}</dl>
        <div class="crec-next">${reading ? "" : made ? `<button type="button" class="button" id="c-book">Book the first visit</button>` : `<button type="button" class="button" id="c-create">Create job</button><button type="button" class="button" data-variant="ghost" id="c-discard">Discard</button>`}</div>
        ${made || reading ? "" : `<div class="fx-legend" aria-label="What the marks mean"><span><span class="detail-mark" data-kind="source" data-compact>${ic(from.icon, 12)}</span>its words in the ${from.noun}</span><span><span class="detail-mark" data-kind="source">${ic("link", 12)}matched</span></span><span><span class="detail-mark" data-kind="suggested">${ic("sparkles", 12)}suggested</span> needs your OK</span><span><span class="detail-mark" data-kind="default">company default</span></span><span><span class="detail-mark" data-kind="typed">changed by you</span></span></div>`}
      </header>`;
    }
    function pick() {
      stage.innerHTML = `<div class="fx-screen">
        <div class="fx-head"><h2>New job</h2><p class="fx-sub">Start from what you have. Bolster reads it and fills in what it can; you check it.</p></div>
        <div class="fx-sources">
          <button type="button" class="fx-source" data-from="call"><b>${ic("message", 16)}Voicemail from (555) 014-2290</b><span>Today, 9:12 am · 0:48 · Marco Ruiz</span></button>
          <button type="button" class="fx-source" data-from="web"><b>${ic("inbox", 16)}Website enquiry</b><span>Yesterday, 6:40 pm · Priya Haddad</span></button>
          <button type="button" class="fx-source" data-from="empty"><b>${ic("file-plus", 16)}Start empty</b><span>A customer and a name, as in B</span></button>
        </div>
        <p class="fx-hint">Photos of the site and a supplier's quote would start a job the same way.</p></div>`;
      $$(".fx-source").forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.from === "empty") { $('[name="fx-dir"][value="b"]').click(); return; }
        from = SRC[b.dataset.from]; job = from.job(); v.specs = jobSpecs(job, from); made = false; summary = null; v.open = new Set();
        // reading never blocks (C-keep): the record is there at once, its values as bars until they're read (D142)
        phase = "reading";
        BolsterLoading.load(stage, () => wait(1200), { label: `the ${from.noun}`, reserve: true, skeleton: () => readingHtml(), render: () => { phase = "review"; v.render(); $("#c-title")?.focus(); } });
      }));
    }
    function readingHtml() {
      const bars = (n) => Array.from({ length: n }, (_, i) => `<div class="detail-row"><div class="detail-label"><span class="skeleton" style="inline-size:${[5, 6, 4][i % 3]}rem"></span></div><div class="crec-cell"><span class="skeleton" style="inline-size:${[9, 12, 7][i % 3]}rem"></span></div></div>`).join("");
      return `<div class="fx-screen crec-screen">${headHtml()}<div class="crec-page"><div class="crec-main"><section class="crec-section"><h3 class="detail-section-title">Customer</h3>${bars(2)}</section><section class="crec-section"><h3 class="detail-section-title">The work</h3>${bars(4)}</section></div>
        <details class="crec-rail" open><summary>${ic(from.icon, 14)}The ${from.noun} · ${from.when}</summary><div class="fx-transcript">${from.rail}</div></details></div></div>`;
    }
    return v;
  };

  // ================= the invoice Bolster drafted =================
  VIEWS["invoice-c"] = () => {
    // pane: which half shows when there's room for one only (Details or Preview)
    let phase = "ready", status = "draft", pane = "details", summary = null, flash = "", sched = 60;
    const inv = { client: vera, job: JOBS[0], issued: "2026-10-29", terms: "Net 30", message: "Hi Vera, here's the invoice for the roofing so far and the skylight. Thank you!", internal: "Roofing's 60% is Hiro's update on Oct 27; check with him if the crew moved since.", lines: [] };
    const pending = {}, reasons = {}, activity = [["Drafted by Bolster from the schedule and change order 1", "Oct 29, 9:00 am"]];
    const left = [
      { name: "Kitchen, $16,550.00", why: "not started on the schedule", stage: STAGES[3] },
      { name: "Change order 2: gutters, $2,300.00", why: "waiting for Vera's signature" },
      { name: "Deposit, $4,825.00", why: "already taken off INV-1042" },
    ];
    const v = { c: true, specs: {}, open: new Set() };
    v.locked = () => status === "paid";
    v.savedWord = () => (status === "sent" ? "Waits for Resend" : "Saved");
    const dueOf = (iso, t) => { const d = new Date(`${iso}T12:00`); d.setDate(d.getDate() + ({ "Net 15": 15, "Net 30": 30 }[t] || 0)); return d.toISOString().slice(0, 10); };
    const total = () => inv.lines.reduce((n, l, i) => n + (+((status === "sent" && `a${i}` in pending) ? pending[`a${i}`] : l.amount) || 0), 0);
    function specs() {
      const S = {}, old = v.specs;
      const spec = (k, label, kind, get, set, extra = {}) => {
        const s = (S[k] = { label, kind, ...extra, base: get, get: () => (status === "sent" && k in pending ? pending[k] : get()), set: (x) => (status === "sent" ? (pending[k] = x) : set(x)), m: extra.m ?? null });
        if (old[k] && !/^[ad]\d/.test(k)) Object.assign(s, { m: old[k].m, orig: old[k].orig, origMark: old[k].origMark, origShown: old[k].origShown });
        s.changed = () => status === "sent" && k in pending && pending[k] !== get();
        return s;
      };
      spec("issued", "Issued", "date", () => inv.issued, (x) => (inv.issued = x), { show: day, icon: "calendar", m: { kind: "default", text: "today" } });
      spec("terms", "Due", "select", () => inv.terms, (x) => (inv.terms = x), { options: TERMS, icon: "calendar", show: (t) => (t === "On receipt" ? "On receipt" : `${t}, ${day(dueOf(inv.issued, t))}`), m: { kind: "suggested", tip: "Your last 4 invoices to Vera were Net 30" } });
      spec("message", "Message", "textarea", () => inv.message, (x) => (inv.message = x), { long: true, icon: "message", m: { kind: "suggested", tip: "Written from the lines" } });
      spec("internal", "Note for your team", "textarea", () => inv.internal, (x) => (inv.internal = x), { long: true, icon: "lock" });
      inv.lines.forEach((l, i) => {
        spec(`d${i}`, `Line ${i + 1}`, "text", () => l.desc, (x) => (l.desc = x));
        spec(`a${i}`, `Line ${i + 1}, amount`, "money", () => l.amount, (x) => (l.amount = x), { show: money });
      });
      v.specs = S;
    }
    // a line read from the job, once changed, is yours, with a way back to what was read (both its words and its amount)
    v.change = (id, val) => {
      const s = v.specs[id];
      if (status === "sent") s.set(val);
      else if (/^[ad]\d/.test(id)) { const l = inv.lines[+id.slice(1)]; if (l.m && l.m.kind !== "typed" && !l.orig) l.orig = { desc: l.desc, amount: l.amount, m: l.m }; s.set(val); if (l.orig) l.m = { kind: "typed" }; }
      else changeSpec(s, val);
      refresh();
    };
    v.accept = (id) => { const s = v.specs[id]; if (s?.m?.kind === "suggested") s.m = { kind: "accepted" }; refresh(); };
    v.reason = (id, txt) => { reasons[id] = txt; };
    const refresh = () => { if (summary) summary = check(); v.render(); };
    // what sending needs (C-gate) and what it asks (C-severity): at least a line; every suggestion settled; a line far
    // from the job asks for a reason (strong); an amount that differs from its source says both (a warning)
    function check() {
      const fix = [], chk = [];
      if (!inv.lines.length) fix.push({ k: "lines", text: "Add a line" });
      for (const [k, s] of Object.entries(v.specs)) if (s.m?.kind === "suggested") chk.push({ k, kind: "suggested", html: `<b>${esc(s.label)}</b>: “${esc(short(s.show ? s.show(s.get()) : s.get(), 48))}”. ${esc(s.m.tip)}` });
      inv.lines.forEach((l, i) => {
        if (l.stage === "s3" && l.read != null && +l.amount !== l.read) chk.push({ k: `a${i}`, kind: "warning", html: `<b>Roofing</b>: the schedule says ${money(l.read)} (${sched}%); entered ${money(l.amount)}` });
        if (l.stage === "s4") chk.push({ k: `a${i}`, id: `kitchen`, kind: "warning", strong: true, label: "the kitchen", reason: reasons.kitchen, html: `<b>Kitchen</b>: billed in full, ${money(l.amount)}; the schedule says it hasn't started. Say why, and it's kept in Activity` });
      });
      return { fix, check: chk };
    }
    function send(then) {
      summary = check();
      if (!blocks(summary)) {
        const why = summary.check.filter((x) => x.strong).map((x) => `${cap(x.label)}: “${reasons[x.id]}”`);
        summary = null; then(why); return;
      }
      v.render(); $(".detail-check")?.focus();
    }
    // the invoice in two halves of one editor (your call, 4 Nov): what you check and change on the left, read as a
    // record (labels beside values, each mark on the line under its value, the same place on every row); on the right,
    // the invoice exactly as Vera will get it, nothing on it but the invoice. Narrow, the halves take turns
    v.render = function () {
      if (phase === "ready") return ready();
      specs();
      const quiet = status !== "draft", locked = status === "paid", first = inv.client.label.split(" ")[0];
      const n = Object.keys(pending).filter((k) => v.specs[k]?.changed()).length;
      const terms = v.specs.terms;
      // a line read from the job names its source in words, on the line under it; changed, it's yours, with Put back
      const lineMark = (l, i) => (!l.m ? "" : l.m.kind === "typed" ? `<span class="detail-mark" data-kind="typed">${esc(l.m.text || "changed by you")}</span>${l.orig && !quiet ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-back-line="${i}">Put back ${money(l.orig.amount)}</button>` : ""}` : `<button type="button" class="detail-mark" data-kind="source" data-q="${l.m.quote}" data-tip="${esc(l.m.tip)}" aria-label="${esc(l.m.text)}: ${esc(l.m.tip)}">${ic(l.m.icon, 12)}${esc(l.m.text)}</button><span class="detail-mark-reason">${esc(l.detail || "")}</span>`);
      const changedOf = (k) => { const x = v.specs[k]; return x.changed?.() ? `<span class="rec-changed">changed</span><span class="rec-was">${esc(x.show ? x.show(x.base()) : x.base())}</span>` : ""; };
      const lineRow = (l, i) => `<div class="civ-line" data-k="d${i} a${i}">
          <span class="civ-cell civ-desc" data-cell="d${i}">${valueHtml(`d${i}`, v.specs[`d${i}`], { locked })}</span>
          <span class="civ-cell civ-amt" data-cell="a${i}">${valueHtml(`a${i}`, v.specs[`a${i}`], { locked })}</span>
          <span class="detail-marks civ-line-marks">${lineMark(l, i)}${changedOf(`d${i}`)}${changedOf(`a${i}`)}</span>
          ${l.newer ? `<p class="crec-warn civ-line-warn" data-tone="info">${ic("circle-help", 14)}<span>The schedule says ${l.newer.pct}% since today: ${money(l.newer.amount)}. <button type="button" class="link-button" data-use-newer="${i}">Use it</button></span></p>` : ""}
        </div>`;
      // where the invoice stands, said once at the top of the details (draft: the next step; sent; paid)
      // the lede first in the details, so both halves start at the card's top; its title and badge go up to the page
      const lede = `<div class="fx-head"><h2>INV-1043</h2><span class="badge" data-status="${status === "draft" ? "draft" : status === "sent" ? "outstanding" : "booked"}">${cap(status)}</span>
          <p class="fx-sub">${status === "draft" ? `Drafted by Bolster from the job's schedule and change order 1, Oct 29. Check it, then send it.` : `For ${esc(inv.job.label)}, ${esc(inv.client.label)}.`}</p></div>`;
      const head = `<div class="civ-head">
          <div class="civ-due"><span class="civ-due-label">Amount due</span><span class="civ-due-figure">${money(total())}</span>
            <span class="civ-due-sub">${esc(terms.show(terms.get()))} · ${esc(inv.client.label)}</span></div>
          ${status === "draft" ? `<button type="button" class="button" id="iv-send">${ic("send", 14)}Send to ${first}</button>`
            : status === "sent" ? `<button type="button" class="button" data-variant="secondary" id="iv-paid">Mark as paid</button>`
            : `<button type="button" class="button" data-variant="secondary" id="iv-credit">Issue a credit note</button>`}
        </div>
        ${status === "sent" ? `<p class="civ-state" data-tone="sent">${ic("send", 14)}<span>${first} has it since today. A change waits here until you resend it.</span></p>` : status === "paid" ? `<p class="civ-state" data-tone="paid">${ic("circle-check", 14)}<span>Paid on Nov 3. Changes go on a credit note.</span></p>` : ""}`;
      const lines = `<section class="crec-section civ-lines" aria-labelledby="civ-lines-t" id="l-lines"><h3 class="detail-section-title" id="civ-lines-t">Lines</h3>
          ${inv.lines.length ? inv.lines.map(lineRow).join("") : `<p class="civ-none">No lines yet: add what you're billing for.</p>`}
          <div class="civ-total"><span>Total due</span><span>${money(total())}</span></div>
          ${locked ? "" : `<div class="civ-left"><h4>Not on this invoice</h4>${left.filter((x) => !x.added).map((x) => `<div class="civ-left-row"><span class="civ-left-name">${esc(x.name)}</span><span class="civ-left-why">${esc(x.why)}</span>${x.stage ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-left="${left.indexOf(x)}">Add anyway</button>` : ""}</div>`).join("")}</div>`}
          <details class="civ-from"><summary>${ic("chart-gantt", 14)}From the job: the schedule and change orders</summary><div class="civ-from-body">
            <h4>The schedule</h4><ul class="crail-list">${STAGES.map((st) => `<li class="crail-item" id="r-${st.id}"${st.id === "s3" ? ' data-for="a0" tabindex="0"' : ""}><span>${st.name}</span><span>${st.id === "s3" ? sched : st.done}% done${st.id === "s3" ? ` · ${sched === 60 ? "Hiro, Oct 27" : "Hiro, today"}` : ""}</span></li>`).join("")}</ul>
            <h4>Change orders</h4><ul class="crail-list"><li class="crail-item" id="r-co1" data-for="a1" tabindex="0"><span>1 · Skylight over the kitchen, $1,200.00</span><span>Signed Oct 20 · put in Oct 26</span></li><li class="crail-item"><span>2 · Gutters, $2,300.00</span><span>Waiting for Vera's signature</span></li></ul>
            ${sched === 60 && status === "draft" ? `<button type="button" class="button" data-variant="secondary" data-size="sm" id="iv-move">Concept only: Hiro sets Roofing to 70%</button>` : ""}
          </div></details>
        </section>`;
      const details = `${lede}${head}${summaryHtml("sending it", summary)}${flash ? `<div class="fx-done" role="status"><p>${flash}</p></div>` : ""}
        ${sectionHtml("Dates", ["issued", "terms"], v.specs, { quiet, locked, open: v.open })}
        ${lines}
        ${sectionHtml(`Message to ${first}`, ["message"], v.specs, { quiet, locked, open: v.open, bare: true })}
        ${sectionHtml("Note for your team", ["internal"], v.specs, { quiet, locked, open: v.open, bare: true })}
        <section class="crec-section civ-activity" aria-label="Activity"><h3 class="detail-section-title">Activity</h3><ol>${activity.map(([w, t]) => `<li><span>${esc(w)}</span><span>${esc(t)}</span></li>`).join("")}</ol></section>`;
      // the invoice as Vera gets it: the preview has nothing on it that isn't hers
      const doc = `<article class="inv civ-paper" aria-label="The invoice, as ${esc(first)} will see it">
          <div class="inv-top"><div><h3>Lakeside Drywall &amp; Insulation</h3><p class="fx-hint">4100 Lake Austin Blvd, Austin, TX 78703</p></div>
            <dl class="inv-meta"><dt>Invoice</dt><dd>INV-1043</dd><dt>Issued</dt><dd>${esc(day(v.specs.issued.get()))}</dd><dt>Due</dt><dd>${esc(terms.show(terms.get()))}</dd><dt>Amount due</dt><dd class="inv-meta-due">${money(total())}</dd></dl></div>
          <div class="inv-to"><span class="fx-hint">Bill to</span><b>${esc(inv.client.label)}</b><span>412 Westlake Dr, Austin, TX 78746</span><span class="fx-hint">For ${esc(inv.job.label)}</span></div>
          <table class="inv-lines"><thead><tr><th scope="col">Description</th><th scope="col" class="num">Amount</th></tr></thead><tbody>
            ${inv.lines.length ? inv.lines.map((l, i) => `<tr data-k="d${i} a${i}"><td>${esc(v.specs[`d${i}`].get())}</td><td class="num">${money(v.specs[`a${i}`].get())}</td></tr>`).join("") : `<tr><td colspan="2" class="fx-hint">No lines yet</td></tr>`}
          </tbody></table>
          <dl class="inv-totals"><dt>Total due</dt><dd class="inv-due">${money(total())}</dd></dl>
          ${v.specs.message.get() ? `<p class="inv-message">${esc(v.specs.message.get())}</p>` : ""}
        </article>`;
      const seen = status === "draft" ? `As ${first} will see it` : n ? `With your changes. ${first} has the version from today until you resend it` : `As ${first} has it`;
      stage.innerHTML = `<div class="fx-screen civ" data-pane="${pane}">
        <div class="segmented civ-switch" role="radiogroup" aria-label="Show" data-size="sm">
          <label class="segmented-option"><input type="radio" name="civ-pane" value="details"${pane === "details" ? " checked" : ""}> Details</label>
          <label class="segmented-option"><input type="radio" name="civ-pane" value="preview"${pane === "preview" ? " checked" : ""}> Preview</label>
        </div>
        <div class="civ-body">
          <div class="civ-details" aria-label="Details">${details}</div>
          <div class="civ-preview" aria-label="Preview"><div class="civ-preview-sticky"><p class="civ-preview-label">${ic("eye", 14)}${esc(seen)}</p>${doc}</div></div>
        </div>
        ${status === "sent" && n ? `<div class="fx-changes" role="status"><p>${n === 1 ? "1 change" : `${n} changes`} ${first} hasn't seen</p><button type="button" class="button" data-variant="secondary" data-size="sm" id="iv-discard">Discard</button><button type="button" class="button" data-variant="brand" data-size="sm" id="iv-resend">Resend to ${first}</button></div>` : ""}
      </div>`;
      flash = "";
      const on = (id, fn) => $(`#${id}`)?.addEventListener("click", fn);
      on("iv-send", () => send((why) => { status = "sent"; activity.push([`Sent to Vera (vera@example.com)${why.length ? `. ${why.join("; ")}` : ""}`, "Oct 29, today"]); flash = `Sent to ${esc(inv.client.label)}. From now on a change waits until you resend it.`; v.render(); }));
      on("iv-paid", () => { if (n) { flash = "Resend or discard the changes first."; return v.render(); } status = "paid"; activity.push(["Paid in full, by card", "Nov 3"]); v.render(); });
      on("iv-credit", () => { flash = "A credit note would open as a new draft, linked to this invoice (not built here)."; v.render(); });
      on("iv-discard", () => { for (const k of Object.keys(pending)) delete pending[k]; v.render(); });
      on("iv-resend", () => { for (const [k, val] of Object.entries(pending)) { const i = +k.slice(1); if (k === "issued") inv.issued = val; else if (k === "terms") inv.terms = val; else if (k === "message") inv.message = val; else if (k === "internal") inv.internal = val; else if (k[0] === "d") inv.lines[i].desc = val; else if (k[0] === "a") inv.lines[i].amount = val; delete pending[k]; } activity.push(["Resent to Vera with the changes; the version she had is kept", "today"]); flash = "Resent to Vera. The version she had stays in Activity."; v.render(); });
      on("iv-move", () => { sched = 70; const l = inv.lines.find((x) => x.stage === "s3"); if (l) l.newer = { pct: 70, amount: 10150 }; v.render(); });
      $$('[name="civ-pane"]').forEach((r) => r.addEventListener("change", () => { pane = r.value; $(".civ").dataset.pane = pane; }));
      $$("[data-left]").forEach((b) => b.addEventListener("click", () => { const x = left[+b.dataset.left]; x.added = true; inv.lines.push({ desc: `${x.stage.name}, 100% of ${money(x.stage.total)}`, amount: x.stage.total, stage: x.stage.id, m: { kind: "typed", text: "added by you" } }); refresh(); }));
      $$("[data-back-line]").forEach((b) => b.addEventListener("click", () => { const l = inv.lines[+b.dataset.backLine]; Object.assign(l, { desc: l.orig.desc, amount: l.orig.amount, m: l.orig.m }); delete l.orig; refresh(); }));
      $$("[data-use-newer]").forEach((b) => b.addEventListener("click", () => { const l = inv.lines[+b.dataset.useNewer]; l.desc = `Roofing, ${l.newer.pct}% of ${money(14500)}`; l.amount = l.newer.amount; l.read = l.newer.amount; l.detail = `Roofing ${l.newer.pct}% done on the schedule · set by Hiro Nakamura, today`; delete l.newer; delete l.orig; l.m = { ...l.m, kind: "source", tip: `Roofing ${l.read === 10150 ? 70 : 60}% done, set by Hiro Nakamura today` }; refresh(); }));
    };
    function ready() {
      stage.innerHTML = `<div class="fx-screen"><div class="fx-head"><h2>Invoices</h2></div>
        <div class="inv-state" data-tone="draft" style="align-items:flex-start">${ic("sparkles", 16)}<p><b>INV-1043 is ready to check.</b> Roofing reached 60% on Oct 27 and the skylight (change order 1) was put in on Oct 26, so Bolster drafted the next invoice for Roof and kitchen refresh: ${money(8700 + 1200)}.</p><button type="button" class="button" id="iv-check">Check the draft</button></div>
        <p class="fx-hint">It could arrive as a notification, or wait on the job's Billing page.</p></div>`;
      $("#iv-check").addEventListener("click", () => {
        inv.lines = [
          { desc: "Roofing, 60% of $14,500.00", amount: 8700, read: 8700, stage: "s3", detail: "Roofing 60% done on the schedule · set by Hiro Nakamura, Oct 27", m: { kind: "source", text: "From the schedule", icon: "chart-gantt", quote: "r-s3", tip: "Roofing 60% done, set by Hiro Nakamura on Oct 27" } },
          { desc: "Change order 1: skylight over the kitchen", amount: 1200, read: 1200, detail: "Change order 1 · signed by Vera Oct 20, put in Oct 26", m: { kind: "source", text: "From change order 1", icon: "file-signature", quote: "r-co1", tip: "Signed by Vera on Oct 20; put in on Oct 26" } },
        ];
        phase = "doc"; v.render(); $("#c-title")?.focus();
      });
    }
    return v;
  };

  // the notes beside them say what the rules ask of each
  NOTES["job-c"] = {
    title: "C · Start from the call, check what it heard",
    means: ["You start from what you have (a voicemail, a website enquiry). The job is there at once, its values as bars while Bolster reads; nothing blocks.", "Read like a page: labels beside values, the head with the facts and the next step, the source beside, linked both ways. What came from the voicemail is said once at the top; only the exceptions carry a word: matched, suggested, a company default, changed by you.", "Nothing is red on arrival. Create checks what creating needs: the customer, a name, and each suggestion settled one by one. A likely duplicate warns and lets you go on."],
    try: ["Start from the voicemail; hover a highlighted phrase in it to see its value.", "Press Create job at once: the summary lists what to check.", "Choose 70 or 17 Orchard Ln: Bolster heard two things.", "Change the target start, then Put back.", "Switch to A and back: the draft is still here."],
    good: "Least typing, and the checks land where they matter: on what Bolster inferred, not on what it read.",
    costs: "The most to build: marks, evidence both ways, the summary, the readings. Trust depends on the marks never being skipped.",
  };
  NOTES["invoice-c"] = {
    title: "C · Bolster drafts the next invoice",
    means: ["When work moves, Bolster drafts the next invoice. You check it in one editor: the details on the left, read as a record (a value changes where it is), and on the right the invoice exactly as Vera will get it, nothing on it that isn't hers (your call, 4 Nov). Narrow, Details and Preview take turns.", "Each line names its source on the line under it, in words (money is never one click away); terms and message are suggestions, each settled on its own; what it left out is listed with why. A sent invoice can still change: the change waits until you resend it, and the version Vera had is kept (your call, 4 Nov).", "Send checks what sending asks: a strong warning (the kitchen billed but not started) needs a line of why, kept in Activity; a changed amount names both values. A newer value from the schedule is offered, never applied."],
    try: ["Check the draft; hover Roofing in the schedule beside it.", "Press Send at once, then Add anyway the kitchen and press Send again.", "Open From the job and press its concept-only button, then Use it.", "Send, change an amount: the preview shows it, and Vera's version waits; then Resend, and Mark as paid."],
    good: "Bills what's done, nothing twice; the office checks instead of composing; every exception has a reason on record.",
    costs: "Depends on the schedule and change orders being kept up to date; the checks only help if they stay few.",
  };
  F.current = () => F.view?.();
  F.start();
})();
