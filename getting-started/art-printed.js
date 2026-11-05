// Getting started's printed drawings (the playground's Printed style, chosen 2 Nov with its settings: box 208 tall,
// stagger .4): real printed things on a quiet grey surface, one per step, each with its story. Made in the playground.
(() => {
  window.GS_N3 = window.GS_N3 || {};
  const w = (k, inner) => `<div class="gs-art n3 prodlabel k-${k}" aria-hidden="true"><div class="stage">${inner}</div></div>`;
  const tick = `<svg viewBox="0 0 12 12"><path d="M2.2 6.6 4.9 9.2 9.8 2.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const bars = `<i class="pl-bars"></i>`;
  window.GS_N3["prodlabel"] = {
    rates: w("rates", `<i class="pl-box"></i><i class="pl-tape"></i><div class="pl-label pl-pp"><i class="pl-band"><span>Carpenter</span></i><b><span data-count="48" data-delay=".55" data-dur=".7">$48</span><small>/h</small></b>${bars}<em>Your area</em><i class="pl-curl"></i></div>`),
    estimate: w("estimate", `<div class="pl-sheet pl-pp"><i class="pl-band"><span>Estimate</span><em>No. 0412</em></i><b class="pl-ttl">Kitchen remodel</b>`
      + `<p class="pl-r pl-r1"><span>Drywall</span><span>$3,200</span><i class="pl-tk">${tick}</i></p>`
      + `<p class="pl-r pl-r2"><span>Labor</span><span>$6,480</span><i class="pl-tk">${tick}</i></p>`
      + `<p class="pl-r pl-r3"><span>Paint</span><span>$2,800</span><i class="pl-tk">${tick}</i></p>`
      + `<i class="pl-rule"></i><em class="pl-tl">Total</em><b class="pl-tot"><span data-count="12480" data-delay="1.75" data-dur=".8">$12,480</span></b>${bars}</div><i class="pl-pen"></i>`),
    proposal: w("proposal", `<div class="pl-env"><i class="pl-in"></i><div class="pl-letter pl-pp"><i class="pl-band"><span>Proposal</span></i><b>Sarah K.</b><em>Kitchen remodel</em></div>`
      + `<i class="pl-pocket"><svg viewBox="0 0 180 118" preserveAspectRatio="none"><path d="M0 118 72 70M180 118 108 70" stroke="rgb(0 0 0 / .09)" stroke-width="1.2" fill="none"/></svg></i>`
      + `<i class="pl-flapw"><i class="pl-flap"></i></i><div class="pl-addr pl-pp"><em>To</em><b>Sarah K.</b></div><i class="pl-seal">${tick}</i></div>`),
    migrate: w("migrate", `<i class="pl-bk"></i><div class="pl-f pl-f1"><span>Oak Ave</span></div><div class="pl-f pl-f2"><span>Lee</span></div><div class="pl-f pl-f3"><span>Smith</span></div>`
      + `<i class="pl-fr"></i><div class="pl-label pl-pp"><i class="pl-band"><span>Imported</span></i><b><span data-count="24" data-delay="1.45" data-dur=".6">24</span><small> jobs</small></b>${bars}<em>jobs.xlsx</em></div>`),
    verify: w("verify", `<div class="pl-card pl-pp"><i class="pl-band"><span>Business</span></i><b>Lakeside Drywall</b><p class="pl-a1">12 Lake St</p><p class="pl-a2">Tax ID ••4821</p>${bars}</div>`
      + `<div class="pl-mark">${tick}<span>Verified</span></div><i class="pl-tool"><i class="pl-knob"></i><i class="pl-base"></i></i>`),
    leadform: w("leadform", `<i class="pl-tray"></i><div class="pl-card pl-pp"><i class="pl-band"><span>Get a quote</span></i><b data-type="Dana P." data-delay="1.05" data-gap=".08">Dana P.</b><em>Deck repair · 400 sq ft</em>${bars}</div>`
      + `<div class="pl-lip"><span>Pipeline</span><i class="pl-new">1 new</i></div>`),
    integrations: w("integrations", `<div class="pl-lid"><svg class="pl-mk" viewBox="40 0 425 512"><path fill-rule="evenodd" fill="currentColor" d="M62 10h381v258H330v233H62z M150 92h214v78H233v271h-83z"/></svg></div>`
      + `<i class="pl-st pl-s1"><b>$</b></i>`
      + `<i class="pl-st pl-s2"><i class="pl-cb"></i><b>31</b></i>`
      + `<i class="pl-st pl-s3"><svg viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="12.6" r="3.4" fill="none" stroke="currentColor" stroke-width="1.9"/></svg></i>`),
    team: w("team", `<div class="pl-sb pl-b1"><i class="pl-strap"></i><i class="pl-clip"></i><div class="pl-bd pl-pp"><i class="pl-band"><span>Hello</span></i><b>AM</b></div></div>`
      + `<div class="pl-sb pl-b2"><i class="pl-strap"></i><i class="pl-clip"></i><div class="pl-bd pl-pp"><i class="pl-band"><span>Hello</span></i><b>JR</b></div></div>`
      + `<div class="pl-sb pl-mb"><i class="pl-strap"></i><i class="pl-clip"></i><div class="pl-bd pl-pp"><i class="pl-band"><span>Hello, I'm</span></i><b>Mike</b><em data-type="mike@lakeside.com" data-delay="1.05" data-gap=".045">mike@lakeside.com</em>${bars}<small>Crew</small></div></div>`),
  };
})();
