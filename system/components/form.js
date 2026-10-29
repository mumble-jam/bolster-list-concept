// Form behaviour (D134, I25): when a form checks, what it says, how it saves and what it asks before losing work.
// Styling never needs it; a form without it is still a working form (the browser's own checks, a plain submit).
// Every form saves the same way (direction A): changes are kept until Save.
//
//   BolsterForm.attach(form, { save, checks })    checking, the summary, the busy Save; `save(values)` returns a promise
//   BolsterForm.track(form, note)                 counts what isn't saved yet into `note` (.form-actions-note), and has
//                                                 the browser ask before a reload or a closed tab loses it
//   BolsterForm.leave(form) → Promise<boolean>     ask before losing changes: Keep editing, Discard, Save
//
// Checks: the platform's (required, type="email", min, max, pattern) in the system's words, a format's (data-format,
// field.js), plus `checks[id](value, form)` returning a message or nothing. A message can be set on the field: data-error-empty, data-error-format.
window.BolsterForm = (() => {
  const fieldsOf = (form) => [...form.elements].filter((el) => el.name && !el.disabled && el.type !== "submit" && el.type !== "button" && el.type !== "hidden");
  const labelOf = (el) => {
    const l = el.labels?.[0] || el.closest("fieldset")?.querySelector("legend");
    return (l ? [...l.childNodes].filter((n) => !(n.classList?.contains("field-optional") || n.classList?.contains("field-required"))).map((n) => n.textContent).join("") : el.name).trim();
  };
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  // a part that holds more than its text (a combobox's chips) says what it holds as el.formValue
  const valueOf = (form, el) => (el.type === "checkbox" ? el.checked : el.type === "radio" ? form.elements[el.name].value : el.formValue ?? el.value);
  const snapshot = (form) => Object.fromEntries(fieldsOf(form).map((el) => [el.name, valueOf(form, el)]));

  // ---------- the words (F-errors): say what to do, in the label's words ----------
  function message(el, form, checks) {
    const v = String(el.formValue ?? el.value).trim(), label = labelOf(el);
    if (el.type === "radio" || el.type === "checkbox") {
      if (el.required && !form.querySelector(`[name="${el.name}"]:checked`)) return el.dataset.errorEmpty || `Choose ${lower(label)}`;
    } else if (el.required && !v) return el.dataset.errorEmpty || (el.tagName === "SELECT" ? `Choose ${lower(label)}` : `Enter ${lower(label)}`);
    // a format's own words (field.js: phone, email, postal code, number, money), by the country it's in
    const f = v && window.BolsterField?.check(el);
    if (f) return el.dataset.errorFormat || f;
    if (v && el.type === "email" && el.validity.typeMismatch) return el.dataset.errorFormat || "Enter an email address like name@example.com";
    if (v && el.validity.patternMismatch) return el.dataset.errorFormat || `${label} isn't in the right format`;
    if (v && el.validity.rangeUnderflow) return `${label} must be ${el.min} or more`;
    if (v && el.validity.rangeOverflow) return `${label} must be ${el.max} or less`;
    return checks?.[el.id]?.(v, form) || "";
  }
  function show(el, text) {
    const id = el.getAttribute("aria-describedby")?.split(/\s+/).find((x) => x.endsWith("-error"));
    const box = (id && document.getElementById(id)) || el.closest(".field")?.querySelector(".field-error");
    const group = el.type === "radio" || el.type === "checkbox" ? el.form.querySelectorAll(`[name="${el.name}"]`) : [el];
    group.forEach((g) => (text ? g.setAttribute("aria-invalid", "true") : g.removeAttribute("aria-invalid")));
    if (box) { box.textContent = text; box.hidden = !text; }
    // the summary follows: a fixed item leaves it, and it goes when nothing's left
    const summary = el.form?.querySelector(".form-summary:not([hidden])");
    const item = summary?.querySelector(`a[href="#${CSS.escape(el.id)}"]`);
    if (item) {
      if (text) item.textContent = text; else item.closest("li").remove();
      const n = summary.querySelectorAll("li").length;
      if (!n) summary.hidden = true;
      else summary.querySelector(".form-summary-title").textContent = `${n === 1 ? "One thing" : `${n} things`} to fix before saving`;
    }
  }

  // ---------- checking and saving (F-check, F-errors, F-save-never-off) ----------
  function attach(form, { save, checks = {} } = {}) {
    form.noValidate = true;
    const touched = new Set();
    let before = null;
    form.addEventListener("focusin", (e) => { if (e.target.name) before = valueOf(form, e.target); });
    // checked when it's left after a change; never before anyone has typed
    form.addEventListener("focusout", (e) => {
      const el = e.target; if (!el.name) return;
      if (valueOf(form, el) !== before || touched.has(el.name)) { touched.add(el.name); show(el, message(el, form, checks)); }
    });
    // once in error, checked as you type: the error clears the moment it's right
    form.addEventListener("input", (e) => { const el = e.target; if (el.getAttribute("aria-invalid") === "true") show(el, message(el, form, checks)); });
    form.addEventListener("change", (e) => { const el = e.target; if (el.type === "radio" || el.type === "checkbox") show(el, message(el, form, checks)); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const wrong = [];
      for (const el of fieldsOf(form)) { if (wrong.some((w) => w.el.name === el.name)) continue; const m = message(el, form, checks); show(el, m); if (m) wrong.push({ el, m }); }
      const summary = form.querySelector(".form-summary");
      if (wrong.length) {
        const first = wrong[0].el, r = first.getBoundingClientRect();
        const outOfSight = r.top < 0 || r.bottom > innerHeight;
        if (summary && (wrong.length > 1 || outOfSight)) {
          summary.innerHTML = `<p class="form-summary-title">${wrong.length === 1 ? "One thing to fix" : `${wrong.length} things to fix`} before saving</p><ul>${wrong.map((w) => `<li><a href="#${w.el.id}">${w.m}</a></li>`).join("")}</ul>`;
          summary.hidden = false; summary.focus(); summary.scrollIntoView({ block: "nearest" });
        } else { if (summary) summary.hidden = true; first.focus(); }
        return;
      }
      if (summary) summary.hidden = true;
      if (!save) return;
      const btn = e.submitter || form.querySelector('[type="submit"]');
      const label = btn?.textContent;
      if (btn) { btn.setAttribute("aria-busy", "true"); btn.textContent = "Saving…"; }
      try { await save(Object.fromEntries(new FormData(form)), form); form.dispatchEvent(new CustomEvent("form-saved")); }
      catch (err) { form.dispatchEvent(new CustomEvent("form-failed", { detail: err })); }
      finally { if (btn) { btn.removeAttribute("aria-busy"); btn.textContent = label; } }
    });
    // a summary's link puts focus on its field
    form.addEventListener("click", (e) => { const a = e.target.closest(".form-summary a"); if (!a) return; e.preventDefault(); document.getElementById(a.hash.slice(1))?.focus(); });
    return { touched };
  }

  // ---------- what isn't saved yet (F-leave) ----------
  const dirty = new WeakMap();
  function changes(form) { const base = dirty.get(form); const now = snapshot(form); return Object.keys(now).filter((k) => now[k] !== base[k]).length; }
  function track(form, note) {
    dirty.set(form, snapshot(form));
    const update = () => { const n = changes(form); if (note) note.textContent = !n ? "" : n === 1 ? "1 unsaved change" : `${n} unsaved changes`; };
    form.addEventListener("input", update); form.addEventListener("change", update);
    form.addEventListener("form-saved", () => { dirty.set(form, snapshot(form)); update(); });
    addEventListener("beforeunload", (e) => { if (changes(form)) { e.preventDefault(); e.returnValue = ""; } });
    update();
    return { changes: () => changes(form), discard: () => discard(form) };
  }
  function discard(form) {
    const base = dirty.get(form);
    for (const el of fieldsOf(form)) { if (el.type === "checkbox") el.checked = base[el.name]; else if (el.type === "radio") el.checked = el.value === base[el.name]; else if (el.formReset) el.formReset(base[el.name]); else el.value = base[el.name]; show(el, ""); }
    form.dispatchEvent(new Event("change")); // what counts the changes hears it
  }

  // ---------- leaving with changes asks once (F-leave) ----------
  function leave(form) {
    if (!dirty.has(form) || !changes(form)) return Promise.resolve(true);
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.className = "dialog"; d.dataset.size = "sm"; d.setAttribute("aria-labelledby", "form-leave-t");
      d.innerHTML = `<header class="dialog-header"><h2 id="form-leave-t">Save your changes?</h2></header><div class="dialog-body"><p>${changes(form) === 1 ? "One change isn't saved." : `${changes(form)} changes aren't saved.`} Leaving without saving loses them.</p></div><footer class="dialog-footer"><button type="button" class="button" data-variant="ghost" data-act="keep" autofocus>Keep editing</button><button type="button" class="button" data-variant="secondary" data-act="discard">Discard</button><button type="button" class="button" data-act="save">Save</button></footer>`;
      document.body.append(d);
      d.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act; if (!act) return;
        if (act === "discard") discard(form);
        if (act === "save") form.requestSubmit();
        // Discard leaves; Save stays until it's saved (the page leaves on "form-saved"); Keep editing stays
        d.close(); d.remove(); resolve(act === "discard");
      });
      d.addEventListener("cancel", () => { d.remove(); resolve(false); });
      d.showModal();
    });
  }

  return { attach, track, leave, message };
})();
