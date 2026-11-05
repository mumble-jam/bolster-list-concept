// Getting started: a drawing per step that tells what happens when you open it, left to right (your pick, 28 Oct), drawn like the icons:
// one line colour (the well's, currentColor), shapes in the well's colour, a few in a light tint of the line. Point
// at the card (to do, done or hidden) and the drawing plays its story (getting-started.css, "the drawings"). The fills
// are markers the CSS repaints: P paper (the well's colour), T tint. Drawn on a 240 × 96 grid, the shape of the well.
window.GS_ART = (() => {
  const C = "currentColor", P = "#FEFEFE", T = "#FDFE03";
  const L = `stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
  const l = `stroke="${C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const svg = (inner) => `<svg class="gs-art" viewBox="0 0 240 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${inner}</svg>`;
  const cursor = (x, y, cls) => `<g class="${cls}"><path d="M${x} ${y} l0 16 l4.5 -4 l3.5 7.5 l3.5 -1.6 l-3.5 -7.4 l6 -0.5 Z" fill="${P}" ${l}/></g>`;
  // a crew member in a hard hat, as in the labor rates list
  // a hard hat, as the hard-hat icon draws it: the dome, the raised band over its top, and the brim
  const hat = (x, y) => `<path d="M${x - 11} ${y + 4} C${x - 11} ${y - 5} ${x - 6} ${y - 9} ${x} ${y - 9} C${x + 6} ${y - 9} ${x + 11} ${y - 5} ${x + 11} ${y + 4} Z" fill="${T}" ${l}/><path d="M${x - 2.5} ${y + 4} V${y - 9} Q${x - 2.5} ${y - 11} ${x - 0.5} ${y - 11} H${x + 0.5} Q${x + 2.5} ${y - 11} ${x + 2.5} ${y - 9} V${y + 4}" fill="${P}" ${l}/><rect x="${x - 14}" y="${y + 3}" width="28" height="5.5" rx="2.75" fill="${P}" ${l}/>`;
  // two more trades for the labor rates (29 Oct): a carpenter's hammer and a painter's roller, the size of the hard hat
  const hammer = (x, y) => `<rect x="${x - 2.5}" y="${y - 4}" width="5" height="16" rx="2" fill="${P}" ${l}/><path d="M${x - 11} ${y - 10} H${x + 6} C${x + 10} ${y - 10} ${x + 13} ${y - 8} ${x + 14} ${y - 5} C${x + 10} ${y - 6} ${x + 8} ${y - 5} ${x + 6} ${y - 4} H${x - 11} Z" fill="${T}" ${l}/>`;
  const roller = (x, y) => `<rect x="${x - 12}" y="${y - 11}" width="19" height="9" rx="2.5" fill="${T}" ${l}/><path d="M${x + 7} ${y - 6.5} H${x + 11} V${y + 1} H${x} V${y + 4}" fill="none" ${l}/><rect x="${x - 2}" y="${y + 4}" width="4" height="9" rx="1.5" fill="${P}" ${l}/>`;
  // a small dollar sign, and per hour after the cost
  const dollar = (x, y) => `<path d="M${x + 2.6} ${y - 3.4} C${x + 1.6} ${y - 5} ${x - 2.8} ${y - 5} ${x - 2.8} ${y - 2.4} C${x - 2.8} ${y - 0.2} ${x + 2.8} ${y - 0.8} ${x + 2.8} ${y + 2} C${x + 2.8} ${y + 4.6} ${x - 2} ${y + 4.6} ${x - 3} ${y + 2.6} M${x} ${y - 6.4} V${y + 6.4}" fill="none" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/>`;
  const crew = (x, y) => `<circle cx="${x}" cy="${y + 2}" r="7" fill="${P}" ${l}/><path d="M${x - 8} ${y - 1} C${x - 8} ${y - 10} ${x + 8} ${y - 10} ${x + 8} ${y - 1} Z" fill="${T}" ${l}/><path d="M${x - 10} ${y - 1} H${x + 10}" fill="none" ${l}/>`;
  const body = (x, y) => `M${x - 14} ${y + 24} C${x - 14} ${y + 14} ${x - 7} ${y + 10} ${x} ${y + 10} C${x + 7} ${y + 10} ${x + 14} ${y + 14} ${x + 14} ${y + 24}`;
  // a scribbled row of a spreadsheet: a quick zigzag, as handwriting reads from afar
  // flat: the same points in a straight line, so the scribble can straighten into it
  const zig = (x1, x2, y, flat = false) => { let d = `M${x1} ${y}`; for (let x = x1 + 4, k = 0; x <= x2; x += 4, k++) d += ` L${x} ${flat ? y : y + (k % 2 ? 2.6 : -2.6)}`; return d; };
  // a spreadsheet's rows, written in words: three short ones a row, like typed text (your pick, 28 Oct)
  const CELLS = [[[26, 40], [46, 62], [68, 80]], [[26, 46], [52, 60], [66, 84]], [[26, 36], [42, 60], [66, 76]]];
  const person = (x, y) => `<path d="${body(x, y)}" fill="${P}" ${L}/><circle cx="${x}" cy="${y}" r="8" fill="${P}" ${L}/>`;
  // a drawing scaled about (cx, cy) by k, its line weights divided by k, so its lines match the other drawings'
  const big = (s, cx, cy, k) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${s.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${+(w / k).toFixed(3)}"`)}</g>`;
  // the apps' own marks, from the files you gave (29 Oct): QuickBooks, CompanyCam and Google Calendar, drawn in the
  // drawing's style, their shapes in its tint with its outline and their insides in its ink, no words beside them.
  // Each sits in a box at (x, y), its top left (24 here, 12 apart: room between them, 29 Oct); stroke widths are divided by the scale so the line matches
  const LOGO = {
    qb: { box: 61.54, shape: "m30.77,61.54c16.99,0,30.77-13.78,30.77-30.77S47.76,0,30.77,0,0,13.78,0,30.77s13.77,30.77,30.77,30.77Z", glyph: ["m20.51,18.8c-6.61,0-11.97,5.36-11.97,11.97s5.35,11.96,11.97,11.96h1.71v-4.44h-1.71c-4.15,0-7.52-3.37-7.52-7.52,0-4.15,3.37-7.52,7.52-7.52h4.11v23.25c0,2.45,1.99,4.44,4.44,4.44V18.8h-8.55,0Zm20.52,23.93c6.61,0,11.97-5.36,11.97-11.96s-5.35-11.96-11.97-11.96h-1.71v4.44h1.71c4.15,0,7.52,3.37,7.52,7.52s-3.37,7.52-7.52,7.52h-4.11V15.04c0-2.45-1.99-4.44-4.44-4.44v32.13h8.55s0,0,0,0Z"] },
    cc: { box: 201, thick: .9, size: 28,   // a little bigger than the others, its fine lines heavier, so the camera, pin and C read (29 Oct)
         shape: "M149.34 1H50.66C22.6812 1 0 23.6812 0 51.66V150.34C0 178.319 22.6812 201 50.66 201H149.34C177.319 201 200 178.319 200 150.34V51.66C200 23.6812 177.319 1 149.34 1V1Z", glyph: ["M66.635 148.67H44.335C43.1273 148.667 41.97 148.186 41.117 147.331C40.264 146.476 39.785 145.318 39.785 144.11V109.77C39.7823 108.83 39.4072 107.93 38.7417 107.266C38.0762 106.603 37.1748 106.23 36.235 106.23C35.2969 106.233 34.3981 106.606 33.7347 107.27C33.0714 107.933 32.6976 108.832 32.695 109.77V144.11C32.6976 147.196 33.9248 150.155 36.1072 152.338C38.2895 154.52 41.2487 155.747 44.335 155.75H66.635V148.67Z", "M163.735 89.3H159.735V96.39H160.245V144.11C160.242 145.319 159.761 146.477 158.906 147.332C158.052 148.186 156.894 148.667 155.685 148.67H133.305V155.75H155.685C158.771 155.747 161.73 154.52 163.913 152.338C166.095 150.155 167.322 147.196 167.325 144.11V92.84C167.325 92.3709 167.232 91.9065 167.051 91.4737C166.87 91.0409 166.605 90.6484 166.271 90.319C165.937 89.9896 165.54 89.7299 165.105 89.555C164.67 89.3801 164.204 89.2934 163.735 89.3V89.3Z", "M99.735 121.28C97.0783 121.284 94.4468 120.765 91.9913 119.75C89.5358 118.736 87.3044 117.248 85.425 115.37C81.6353 111.572 79.5069 106.425 79.5069 101.06C79.5069 95.6945 81.6353 90.5482 85.425 86.75C89.2232 82.9603 94.3695 80.8319 99.735 80.8319C105.1 80.8319 110.247 82.9603 114.045 86.75C114.704 87.4149 115.075 88.3135 115.075 89.25C115.075 90.1865 114.704 91.0851 114.045 91.75C113.38 92.4095 112.481 92.7796 111.545 92.7796C110.608 92.7796 109.71 92.4095 109.045 91.75C106.577 89.2854 103.233 87.9011 99.745 87.9011C96.2574 87.9011 92.9125 89.2854 90.445 91.75C87.9804 94.2175 86.596 97.5624 86.596 101.05C86.596 104.538 87.9804 107.882 90.445 110.35C92.9151 112.81 96.2591 114.191 99.745 114.191C103.231 114.191 106.575 112.81 109.045 110.35C109.373 110.021 109.763 109.76 110.192 109.582C110.621 109.404 111.08 109.312 111.545 109.312C112.009 109.312 112.469 109.404 112.898 109.582C113.327 109.76 113.717 110.021 114.045 110.35C114.704 111.015 115.075 111.913 115.075 112.85C115.075 113.787 114.704 114.685 114.045 115.35C112.167 117.231 109.937 118.724 107.481 119.741C105.025 120.759 102.393 121.282 99.735 121.28Z", "M99.975 164.82C99.3999 164.819 98.8337 164.678 98.3251 164.41C97.8164 164.142 97.3806 163.754 97.055 163.28L69.425 123C64.7302 116.163 62.4688 107.946 63.0038 99.6696C63.5387 91.3929 66.8391 83.536 72.375 77.36C75.8492 73.4766 80.1026 70.3689 84.8581 68.2393C89.6136 66.1097 94.7644 65.0059 99.975 65C105.183 64.9979 110.332 66.0951 115.086 68.2198C119.841 70.3445 124.093 73.4489 127.565 77.33C133.108 83.5002 136.418 91.3541 136.962 99.6309C137.506 107.908 135.253 116.127 130.565 122.97L102.935 163.28C102.606 163.76 102.163 164.151 101.647 164.419C101.131 164.688 100.557 164.826 99.975 164.82V164.82ZM99.975 72.08C95.7609 72.0857 91.5954 72.9792 87.7496 74.7022C83.9039 76.4251 80.4643 78.939 77.655 82.08C73.1696 87.0721 70.4948 93.4286 70.0613 100.126C69.6277 106.823 71.4607 113.471 75.265 119L99.975 155L124.675 119C128.48 113.474 130.314 106.828 129.882 100.132C129.451 93.437 126.778 87.0817 122.295 82.09C119.487 78.9472 116.047 76.4314 112.202 74.7067C108.356 72.982 104.19 72.0869 99.975 72.08Z", "M155.635 55.1H133.855C132.979 55.0979 132.122 54.8442 131.387 54.3691C130.651 53.894 130.067 53.2174 129.705 52.42L125.915 44.01C124.99 41.9706 123.498 40.2404 121.617 39.0258C119.735 37.8112 117.544 37.1635 115.305 37.16H84.495C82.2893 37.1652 80.1301 37.7942 78.2668 38.9745C76.4035 40.1547 74.9121 41.838 73.965 43.83L69.885 52.49C69.5148 53.2697 68.9314 53.9286 68.2023 54.3905C67.4731 54.8524 66.6281 55.0984 65.765 55.1H44.315C41.2295 55.1053 38.2719 56.3333 36.0901 58.5151C33.9083 60.6969 32.6803 63.6545 32.675 66.74V92.84C32.6737 93.3057 32.7643 93.7671 32.9416 94.1978C33.1189 94.6284 33.3794 95.0199 33.7083 95.3496C34.0371 95.6794 34.4278 95.941 34.858 96.1196C35.2881 96.2981 35.7493 96.39 36.215 96.39H40.755V89.3H39.755V66.74C39.7576 65.5323 40.2392 64.3751 41.0941 63.5221C41.949 62.6691 43.1073 62.19 44.315 62.19H65.765C67.9705 62.1845 70.1294 61.554 71.9913 60.3717C73.8532 59.1895 75.3419 57.5038 76.285 55.51L80.375 46.86C80.7428 46.0777 81.3253 45.416 82.0548 44.9521C82.7843 44.4882 83.6305 44.2413 84.495 44.24H115.305C116.18 44.2445 117.036 44.4992 117.771 44.9741C118.507 45.4489 119.091 46.1241 119.455 46.92L123.245 55.34C124.17 57.3794 125.662 59.1096 127.543 60.3243C129.425 61.5389 131.616 62.1865 133.855 62.19H155.635C156.843 62.19 158.001 62.6691 158.856 63.5221C159.711 64.3751 160.192 65.5323 160.195 66.74V77.86C160.194 78.3257 160.284 78.7871 160.462 79.2178C160.639 79.6484 160.899 80.0398 161.228 80.3696C161.557 80.6994 161.948 80.9611 162.378 81.1396C162.808 81.3181 163.269 81.41 163.735 81.41C164.201 81.41 164.662 81.3181 165.092 81.1396C165.522 80.9611 165.913 80.6994 166.242 80.3696C166.571 80.0398 166.831 79.6484 167.008 79.2178C167.186 78.7871 167.276 78.3257 167.275 77.86V66.74C167.27 63.6545 166.042 60.6969 163.86 58.5151C161.678 56.3333 158.72 55.1053 155.635 55.1V55.1Z", "M69.205 92.84C69.205 91.9012 68.832 91.0009 68.1681 90.337C67.5043 89.6731 66.6039 89.3 65.665 89.3H39.785V96.3901H65.665C66.1307 96.3901 66.5919 96.2982 67.022 96.1197C67.4521 95.9412 67.8428 95.6796 68.1717 95.3498C68.5005 95.02 68.7611 94.6286 68.9384 94.1979C69.1157 93.7673 69.2063 93.3057 69.205 92.84V92.84Z", "M130.473 92.8397C130.473 91.9008 130.846 91.0004 131.51 90.3365C132.174 89.6726 133.075 89.2997 134.013 89.2997H159.893V96.3897H134.013C133.548 96.3897 133.087 96.2978 132.656 96.1192C132.226 95.9407 131.836 95.6791 131.507 95.3493C131.178 95.0195 130.917 94.6281 130.74 94.1974C130.563 93.7668 130.472 93.3054 130.473 92.8397Z", "M104.14 152.2C104.14 151.261 104.513 150.361 105.177 149.697C105.841 149.033 106.741 148.66 107.68 148.66H133.57V155.74H107.65C106.717 155.729 105.826 155.352 105.169 154.69C104.512 154.027 104.143 153.133 104.14 152.2V152.2Z", "M95.74 152.22C95.74 151.281 95.367 150.381 94.7031 149.717C94.0393 149.053 93.1388 148.68 92.2 148.68H66.31V155.76H92.23C93.1628 155.749 94.054 155.372 94.7109 154.71C95.3677 154.047 95.7374 153.153 95.74 152.22Z"] },
    gc: { box: 859.1, w: 800, shape: "M 1.1859076,216.8273 C -9.5475474,135.25514 53.952176,62.86064 136.22104,62.86064 h 527.55792 c 82.2741,0 145.76859,72.3945 135.03513,153.96666 l -32.12702,244.15073 32.12702,244.15072 c 10.73346,81.57216 -52.76103,153.96666 -135.03513,153.96666 H 136.22104 c -82.274102,0 -145.7685874,-72.3945 -135.0351324,-153.96666 L 33.312933,460.97803 Z", glyph: ["m 291.84303,656.55843 q -32.90754,0 -56.45409,-10.70202 -23.54655,-10.70203 -39.86412,-28.62779 -16.05566,-18.19815 -22.74508,-35.58436 -6.68942,-17.3862 -5.34839,-21.13689 a 10.84346,10.84346 0 0 1 5.34839,-5.88794 l 29.70165,-11.77066 q 3.74021,-1.8701 7.4909,-0.53431 3.74021,1.06863 8.82668,12.30497 5.35363,11.23634 14.98178,23.8137 a 74.908929,74.908929 0 0 0 23.54655,19.52871 q 13.65124,6.95658 33.70902,6.95658 32.37323,0 51.37286,-18.72724 19.26155,-18.72723 19.26155,-47.62217 0,-31.3046 -20.33542,-48.16173 Q 321.00513,473.283 287.55803,473.283 H 259.4698 a 9.9529347,9.9529347 0 0 1 -6.95657,-2.67158 q -2.67158,-2.94397 -2.67682,-6.68942 v -28.62778 q 0,-4.01785 2.67158,-6.68942 a 9.5338637,9.5338637 0 0 1 6.96181,-2.94398 h 24.34279 q 29.96881,0 48.16172,-16.32281 18.19292,-16.32281 18.19292,-42.27378 0,-25.67857 -16.32281,-41.46707 -16.32282,-15.7885 -44.94536,-15.7885 -16.05566,0 -27.82631,5.35364 a 60.241447,60.241447 0 0 0 -20.33542,14.98178 118.91138,118.91138 0 0 0 -14.71463,19.8011 q -6.14986,10.16771 -9.90055,11.23634 -3.7402,0.80148 -7.22373,-1.33579 l -28.09347,-13.64599 q -3.47829,-1.87535 -4.54692,-5.88795 -1.06863,-4.0126 6.42226,-18.72723 7.75805,-14.98179 23.54131,-30.50313 a 110.00612,110.00612 0 0 1 36.92539,-24.08086 q 21.13689,-8.56476 49.23036,-8.55953 52.17433,0 82.67222,27.55392 30.50312,27.29199 30.50312,72.24259 0,31.03744 -14.98178,53.77728 -14.71987,22.7346 -41.73947,32.11131 v 1.06863 q 32.64039,9.62815 51.36762,35.31196 18.99963,25.42189 18.99439,60.73386 0,50.57138 -35.3172,82.94461 -35.30673,32.37323 -92.03846,32.37323 z m 268.46732,-6.1551 q -4.54692,0 -8.03045,-3.47829 a 11.78637,11.78637 0 0 1 -3.20589,-8.29237 V 341.11326 l -60.19954,43.34241 q -3.21637,2.40966 -7.49613,1.60819 a 10.267238,10.267238 0 0 1 -6.41702,-4.0126 l -17.39145,-24.62042 a 10.372006,10.372006 0 0 1 -1.87534,-7.4909 q 0.80147,-4.27452 4.27976,-6.68418 l 106.75308,-76.25519 q 1.34103,-1.06863 2.94398,-1.60295 1.60818,-0.80147 3.74544,-0.80147 h 22.47792 q 4.54692,0 7.22374,3.21113 2.94397,2.9335 2.94397,7.49089 v 363.3345 q 0,4.81932 -3.47829,8.29237 a 10.476773,10.476773 0 0 1 -8.03045,3.47829 z"] },
  };
  const logo = (k, x, y, cls, d, size = 28) => { const o = LOGO[k]; if (o.size) { x -= (o.size - size) / 2; y -= (o.size - size) / 2; size = o.size; } const s = size / o.box, dx = o.w ? (o.box - o.w) * s / 2 : 0;
    return `<g transform="translate(${x + dx} ${y}) scale(${s})"><path class="${cls}" style="--d:${d}s" d="${o.shape}" fill="${T}" stroke="${C}" stroke-width="${2.5 / s}" stroke-linejoin="round"/>${o.glyph.map((g) => `<path d="${g}" fill="${C}"${o.thick ? ` stroke="${C}" stroke-width="${o.thick / s}" stroke-linejoin="round"` : ""}/>`).join("")}</g>`; };
  // a Bolster integration as a tile in the drawing's own line, for the ones without a mark of their own (4 Nov): AutoCost's
  // dollar, Hover's house, a supplier's store front, as Bolster's Integrations page draws them
  const tile = (k, x, y, cls, d) => { const cx = x + 12, cy = y + 12;
    const g = { autocost: `<g transform="translate(${cx} ${cy}) scale(1.05) translate(${-cx} ${-cy})">${dollar(cx, cy)}</g>`,
      hover: `<path d="M${cx - 7} ${cy - .5} L${cx} ${cy - 7} L${cx + 7} ${cy - .5} M${cx - 5} ${cy - 2} V${cy + 6.5} H${cx + 5} V${cy - 2} M${cx - 1.6} ${cy + 6.5} V${cy + 2} H${cx + 1.6} V${cy + 6.5}" fill="none" ${l}/>`,
      store: `<path d="M${cx - 7.5} ${cy - 2} L${cx - 6} ${cy - 6.5} H${cx + 6} L${cx + 7.5} ${cy - 2} Z M${cx - 6} ${cy - 2} V${cy + 6.5} H${cx + 6} V${cy - 2} M${cx - 1.8} ${cy + 6.5} V${cy + 2} H${cx + 1.8} V${cy + 6.5}" fill="none" ${l}/>` }[k];
    return `<g><rect class="${cls}" style="--d:${d}s" x="${x}" y="${y}" width="24" height="24" rx="6" fill="${T}" ${L}/>${g}</g>`; };
  return {
    // labor rates: the crews of your area, their costs not set yet (a dash); you set one, and the rest fill in, each in
    // dollars an hour (your idea, 28 Oct)
    // $/h a size smaller than its box, with room all round it (29 Oct); a hard hat, a hammer and a roller for three trades
    rates: svg(`
      <rect x="22" y="4" width="196" height="88" rx="9" fill="${P}" ${L}/>
      ${[24, 48, 72].map((y, i) => `<g transform="translate(46 ${y}) scale(.8) translate(-46 ${-y})">${[hat, hammer, roller][i](46, y)}</g><path d="M70 ${y} H${i === 1 ? 120 : 130}" fill="none" ${L}/>
        <rect class="${i === 1 ? "mv-hl" : ""}" x="158" y="${y - 9}" width="48" height="18" rx="5" fill="${i === 1 ? T : P}" ${l}/>
        <path class="mv-dash" style="--t:${[1.35, 1.1, 1.55][i]}s" d="M176 ${y} H188" fill="none" ${L}/>
        <g class="mv-rate" style="--t:${[1.35, 1.1, 1.55][i]}s"><g transform="translate(172 ${y}) scale(.75) translate(-172 ${-y})">${dollar(172, y)}</g><path d="M178.5 ${y + 4.5} L182.5 ${y - 4.5} M186.5 ${y - 4.5} V${y + 4.5} M186.5 ${y + 1} C186.5 ${y - 2} 192 ${y - 2} 192 ${y + 1} V${y + 4.5}" fill="none" stroke="${C}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`).join("")}
      ${cursor(194, 52, "mv-point")}`),
    // the first estimate: the job's estimate fills in, item by item, and the total adds up. 14 in from the sheet's
    // edge all round: the total's pill lines up with the prices' right edge and sits as far from the foot as from the side,
    // with a clear gap above it, wider than the gap between the items, so it reads as the sum under them
    estimate: svg(`
      <rect x="40" y="6" width="160" height="84" rx="8" fill="${P}" ${L}/>
      <path d="M54 20 H100 M166 20 H186" fill="none" stroke="${C}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M54 29 H186" fill="none" ${l} stroke-dasharray="2 5"/>
      ${[38, 47, 56].map((y, i) => `<g class="mv-in mv-in-${i + 1}"><path d="M54 ${y} H${[110, 96, 104][i]} M136 ${y} H144 M166 ${y} H186" fill="none" ${L}/></g>`).join("")}
      <path d="M54 71 H80" fill="none" ${L}/>
      <rect class="mv-total" x="146" y="66" width="40" height="10" rx="5" fill="${T}" ${l}/>`),
    // the first proposal: it flies to your client, who signs
    proposal: svg(`
      <rect x="22" y="8" width="56" height="80" rx="6" fill="${P}" ${L}/>
      <path d="M32 22 H66 M32 32 H60 M32 42 H64" fill="none" ${L}/>
      <path d="M32 54 H56" fill="none" ${l}/>
      <rect class="mv-press" x="32" y="66" width="36" height="13" rx="6.5" fill="${T}" ${l}/>
      <path d="M88 60 C112 22 156 20 176 40" fill="none" ${l} stroke-dasharray="3 6"/>
      <g class="mv-fly"><path d="M-11 -8 L12 0 L-11 8 L-6 0 Z" fill="${T}" ${l}/><path d="M-6 0 H12" fill="none" ${l}/></g>
      ${person(200, 40)}
      <g class="mv-pop"><circle cx="218" cy="26" r="9" fill="${T}" ${L}/><path d="M213.5 26 L217 29.5 L222.5 23" fill="none" ${L}/></g>
      ${cursor(54, 72, "mv-tap")}`),
    // your current work: your spreadsheet, a few words to a row; each row slides out and opens into a job in Bolster, its
    // words closing up into the job's line (your pick, 28 Oct). Nothing is on the right until
    // it arrives; at rest both show, the sheet with its rows and the jobs they became
    migrate: svg(`
      <rect x="18" y="8" width="76" height="80" rx="6" fill="${P}" ${L}/>
      <path d="M18 26 H94 M18 44 H94 M18 62 H94" fill="none" ${l}/>
      <path d="M26 17 H50" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
      ${CELLS.map((c, i) => `<g class="mv-leave mv-leave-${i + 1}"><path d="M${c[0][0]} ${35 + i * 18} H${c[0][1]} M${c[1][0]} ${35 + i * 18} H${c[1][1]} M${c[2][0]} ${35 + i * 18} H${c[2][1]}" fill="none" ${l}/></g>`).join("")}
      <path d="M100 48 H128 M122 42 L129 48 L122 54" fill="none" ${L}/>
      ${[16, 40, 64].map((y, i) => { const ly = y + 9, sy = 35 + i * 18, c = CELLS[i].map(([x1, x2]) => [x1 + 126, x2 + 126]);
        return `<g class="mv-job mv-job-${i + 1}" style="--_dx:-126px; --_dy:${26 + i * 18 - y}px"><rect class="mv-open" x="146" y="${y}" width="76" height="18" rx="5" fill="${P}" ${L}/>
          <circle class="mv-dot" cx="157" cy="${ly}" r="3" fill="${C}"/>
          <path class="mv-smooth" d="M166 ${ly} H180 M180 ${ly} H193 M193 ${ly} H206" style="--_z:path('M${c[0][0]} ${ly} H${c[0][1]} M${c[1][0]} ${ly} H${c[1][1]} M${c[2][0]} ${ly} H${c[2][1]}')" fill="none" ${l}/></g>`; }).join("")}`),
    // verify your business: your business card, a contractor's (a hard hat for its logo), earns its Verified shield, and
    // then a payment drops onto its logo, which dips as it catches it (your notes, 28 Oct: verified, you can get paid).
    // One card in the middle
    // drawn a fifth bigger than the others, its lines thinned by as much, so every drawing's line is the same weight (29 Oct)
    verify: svg(big(`
      <rect x="56" y="16" width="120" height="64" rx="9" fill="${P}" ${L}/>
      <g class="mv-coin"><circle cx="91" cy="30" r="9.5" fill="${T}" ${L}/>${dollar(91, 30)}</g>
      <g class="mv-bump"><rect x="67" y="27" width="48" height="42" rx="8" fill="${P}" ${l}/><g transform="translate(91 47) scale(1.3) translate(-91 -47)">${hat(91, 47)}</g></g>
      <path class="mv-type" style="--d:.1s" d="M125 36 H156" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round" pathLength="1"/>
      <path class="mv-type" style="--d:.25s" d="M125 48 H150" fill="none" ${l} pathLength="1"/>
      <path class="mv-type" style="--d:.4s" d="M125 59 H142" fill="none" ${l} pathLength="1"/>
      <g transform="translate(0 7)"><g class="mv-stamp"><path d="M176 3 L192 9 V22 C192 32 185 38 176 41 C167 38 160 32 160 22 V9 Z" fill="${T}" ${L}/><path d="M170 22 L174.5 26.5 L182 18" fill="none" ${L}/></g></g>`, 124, 45, 1.2)),
    // a lead form on your website: someone sends it, and the lead lands in your pipeline
    leadform: svg(`
      <rect x="6" y="8" width="104" height="80" rx="6" fill="${P}" ${L}/>
      <path d="M6 22 H110" fill="none" ${L}/><circle cx="16" cy="15" r="2" fill="${C}"/><circle cx="24" cy="15" r="2" fill="${C}"/>
      <path d="M18 32 H62" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/><path d="M18 40 H50" fill="none" ${l}/>
      <g class="mv-slot"><rect x="16" y="48" width="84" height="32" rx="5" fill="${T}" ${l}/>
        <rect x="22" y="54" width="44" height="8" rx="2.5" fill="${P}" ${l}/><rect x="22" y="66" width="44" height="8" rx="2.5" fill="${P}" ${l}/>
        <rect class="mv-press" x="72" y="64" width="22" height="10" rx="5" fill="${C}" stroke="none"/></g>
      <rect x="128" y="8" width="106" height="80" rx="6" fill="${P}" ${L}/>
      <path d="M138 20 H166" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
      <g class="mv-shift">${[49, 67].map((y) => `<rect x="136" y="${y}" width="90" height="14" rx="4" fill="${P}" ${l}/><circle cx="145" cy="${y + 7}" r="3.2" fill="none" ${l}/><path d="M153 ${y + 7} H188" fill="none" ${l}/>`).join("")}</g>
      <g class="mv-new"><rect x="136" y="31" width="90" height="14" rx="4" fill="${T}" ${l}/><circle cx="145" cy="38" r="3.2" fill="none" ${l}/><path d="M153 38 H196" fill="none" ${l}/><circle cx="217" cy="38" r="2.6" fill="${C}"/></g>`),
    // your apps, kept in step with Bolster (your pick, 28 Oct): Bolster and your books side by side, a two-way line between
    // them, an arrow each way; pointing sends little pieces of work (invoices, jobs) both ways along them, and the sync
    // arrows between turn once
    // connect your apps: wires run out from Bolster to QuickBooks, AutoCost and Google Calendar, each lighting up as its
    // wire reaches it
    integrations: svg(`<g transform="translate(30 0)">   <!-- centred: the same room either side (29 Oct) -->
      <rect x="20" y="22" width="52" height="52" rx="11" fill="${T}" ${L}/>
      <!-- Bolster's own mark (shared/assets/favicon.svg), in the drawing's ink on its tint, in place of a B (feedback, 30 Oct) -->
      <path transform="translate(30.6 32.4) scale(.0611)" fill-rule="evenodd" fill="${C}" d="M62 10h381v258H330v233H62z M150 92h214v78H233v271h-83z"/>
      <path class="mv-type" style="--d:.1s" pathLength="1" d="M72 40 C104 40 108 12 136 12" fill="none" ${L}/>
      <path class="mv-type" style="--d:.35s" pathLength="1" d="M72 48 H136" fill="none" ${L}/>
      <!-- the last wire ends on the tip of the calendar's notched side, so none of it shows past the mark (bug, 4 Nov) -->
      <path class="mv-type" style="--d:.6s" pathLength="1" d="M72 56 C104 56 108 84.9 137.7 84.9" fill="none" ${L}/>
      <!-- AutoCost in CompanyCam's place (4 Nov): Bolster's own pricing, drawn as a tile, not another company's mark -->
      ${logo("qb", 136, 0, "mv-lite", .45, 24)}${tile(window.GS_TILE || "autocost", 136, 36, "mv-lite", .7)}${logo("gc", 136, 72, "mv-lite", .95, 24)}</g>`),
    // invite your team: on the job's card you add people with the plus, and your crew and office join it, so everyone
    // works from the same job: the plus sends the invitation, and it travels to each seat, where a person joins (28 Oct)
    team: svg(`
      <rect x="40" y="8" width="160" height="80" rx="11" fill="${P}" ${L}/>
      <rect x="52" y="19" width="32" height="30" rx="8" fill="${T}" ${L}/>
      <g transform="translate(68 35) scale(.85) translate(-68 -35)">${hat(68, 35)}</g>
      <path d="M94 28 H152" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
      <path d="M94 40 H134" fill="none" ${l}/>
      <g  style="--d:0s"><circle cx="62" cy="70" r="12" fill="${P}"/><circle cx="62" cy="70" r="9.5" fill="${T}" ${l}/><circle cx="62" cy="67" r="3" fill="none" ${l}/><path d="M57 75.5 C57 72 59.5 71 62 71 C64.5 71 67 72 67 75.5" fill="none" ${l}/></g><g class="mv-mate" style="--d:1.64s"><circle cx="81" cy="70" r="12" fill="${P}"/><circle cx="81" cy="70" r="9.5" fill="${T}" ${l}/><circle cx="81" cy="67" r="3" fill="none" ${l}/><path d="M76 75.5 C76 72 78.5 71 81 71 C83.5 71 86 72 86 75.5" fill="none" ${l}/></g><g class="mv-mate" style="--d:1.39s"><circle cx="100" cy="70" r="12" fill="${P}"/><circle cx="100" cy="70" r="9.5" fill="${T}" ${l}/><circle cx="100" cy="67" r="3" fill="none" ${l}/><path d="M95 75.5 C95 72 97.5 71 100 71 C102.5 71 105 72 105 75.5" fill="none" ${l}/></g><g class="mv-mate" style="--d:1.12s"><circle cx="119" cy="70" r="12" fill="${P}"/><circle cx="119" cy="70" r="9.5" fill="${T}" ${l}/><circle cx="119" cy="67" r="3" fill="none" ${l}/><path d="M114 75.5 C114 72 116.5 71 119 71 C121.5 71 124 72 124 75.5" fill="none" ${l}/></g>
      <g class="mv-press"><circle cx="180" cy="70" r="9.5" fill="${P}" ${L}/><path d="M180 65.5 V74.5 M175.5 70 H184.5" fill="none" ${l}/></g>
      <g class="mv-mail"><rect x="171" y="63" width="18" height="13" rx="2.5" fill="${P}" ${l}/><path d="M172 64.5 L180 70.5 L188 64.5" fill="none" ${l}/></g>
      ${cursor(182, 73, "mv-tap")}`),
  };
})();
