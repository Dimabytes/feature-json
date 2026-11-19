import { STATUS_ICON, STATUS_LABEL } from './model.js';
import { esc, plain, truncate } from './text.js';

const NODE_W = 176;
const NODE_H = 46;
const COL_GAP = 48;
const COL_W = NODE_W + COL_GAP;
const ROW_GAP = 12;
const LANE_PAD = 16;
const TITLE_CHARS = 25;

function lanesOf(model) {
   const names = model.tracks.map((t) => t.name);
   for (const s of model.steps) if (s.track && !names.includes(s.track)) names.push(s.track);
   if (!names.length || model.steps.some((s) => !s.track)) names.push('');
   const about = new Map(model.tracks.map((t) => [t.name, t.about]));
   return names.map((name) => ({
      name,
      label: name || (model.tracks.length ? 'main checkout' : 'steps'),
      about: about.get(name) ?? (name ? '' : 'Steps without a track work in the main checkout'),
      cells: new Map(),
      depth: 1,
      steps: [],
   }));
}

function layout(model) {
   const lanes = lanesOf(model);
   const laneByName = new Map(lanes.map((l) => [l.name, l]));
   for (const s of model.steps) {
      const lane = laneByName.get(s.track) ?? laneByName.get('');
      const cell = lane.cells.get(s.layer) ?? [];
      cell.push(s);
      lane.cells.set(s.layer, cell);
      lane.steps.push(s);
      lane.depth = Math.max(lane.depth, cell.length);
   }
   const pos = new Map();
   let y = 0;
   for (const lane of lanes) {
      lane.y = y;
      lane.h = LANE_PAD * 2 + lane.depth * NODE_H + (lane.depth - 1) * ROW_GAP;
      for (const [layer, cell] of lane.cells) {
         const offset = ((lane.depth - cell.length) * (NODE_H + ROW_GAP)) / 2;
         cell.forEach((s, i) => pos.set(s, { x: COL_GAP / 2 + layer * COL_W, y: y + LANE_PAD + offset + i * (NODE_H + ROW_GAP) }));
      }
      y += lane.h;
   }
   const maxLayer = Math.max(0, ...model.steps.map((s) => s.layer));
   return { lanes, pos, width: (maxLayer + 1) * COL_W, height: y };
}

function edgePath(a, b) {
   const x1 = a.x + NODE_W;
   const y1 = a.y + NODE_H / 2;
   const x2 = b.x - 2;
   const y2 = b.y + NODE_H / 2;
   const dx = Math.max(28, Math.abs(x2 - x1) / 2);
   return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

function nodeSvg(s, p) {
   const cls = ['node', `st-${s.status}`, s.isReview && 'review', s.manual && 'manual'].filter(Boolean).join(' ');
   const label = `${s.id}: ${plain(s.title)} (${STATUS_LABEL[s.status]})`;
   return `<g class="${cls}" data-id="${esc(s.id)}" transform="translate(${p.x},${p.y})" tabindex="0" role="button" aria-label="${esc(label)}">
      <rect class="ring" x="-4" y="-4" width="${NODE_W + 8}" height="${NODE_H + 8}" rx="10"/>
      <rect class="box" width="${NODE_W}" height="${NODE_H}" rx="7"/>
      ${s.isReview ? `<rect class="box-inner" x="3.5" y="3.5" width="${NODE_W - 7}" height="${NODE_H - 7}" rx="4.5"/>` : ''}
      <text class="n-id" x="12" y="19"><tspan class="n-icon">${STATUS_ICON[s.status]}</tspan> ${esc(s.id)}</text>
      ${s.manual ? `<text class="n-flag" x="${NODE_W - 10}" y="19" text-anchor="end">✋</text>` : ''}
      <text class="n-title" x="12" y="36" clip-path="url(#fjv-clip)">${esc(truncate(plain(s.title) || '(untitled)', TITLE_CHARS))}</text>
   </g>`;
}

function legendHtml(model) {
   const items = ['passed', 'ready', 'blocked', 'cancelled']
      .filter((st) => st !== 'cancelled' || model.counts.cancelled)
      .map((st) => `<li><span class="lg-node st-${st}"><span aria-hidden="true">${STATUS_ICON[st]}</span></span>${STATUS_LABEL[st]}</li>`);
   if (model.steps.some((s) => s.isReview)) items.push('<li><span class="lg-node review"></span>Group review</li>');
   if (model.steps.some((s) => s.manual)) items.push('<li><span class="lg-glyph" aria-hidden="true">✋</span>Manual step</li>');
   items.push(model.parallel
      ? '<li><span class="lg-line"></span>dependsOn</li>'
      : '<li><span class="lg-line"></span>Priority order</li>');
   if (model.edges.some((e) => e.kind === 'review')) items.push('<li><span class="lg-line dashed"></span>reviewOf</li>');
   return `<ul class="legend graph-legend">${items.join('')}</ul>`;
}

function relatives(model, id) {
   const up = new Set([id]);
   const down = new Set([id]);
   const walk = (set, from, to) => {
      let grew = true;
      while (grew) {
         grew = false;
         for (const e of model.edges) {
            if (set.has(e[to]) && !set.has(e[from])) {
               set.add(e[from]);
               grew = true;
            }
         }
      }
   };
   walk(up, 'from', 'to');
   walk(down, 'to', 'from');
   return { up, down };
}

function tipHtml(model, s) {
   const deps = s.dependsOn.length ? s.dependsOn.join(', ') : model.parallel ? 'nothing' : '';
   return `<div class="tip-head"><span class="badge st-${s.status}"><span aria-hidden="true">${STATUS_ICON[s.status]}</span> ${STATUS_LABEL[s.status]}</span> <strong>${esc(s.id)}</strong></div>
      <div class="tip-title">${esc(plain(s.title))}</div>
      <div class="tip-meta">${s.track ? `track <b>${esc(s.track)}</b>` : 'no track'}${deps ? ` · depends on ${esc(deps)}` : ''}${s.manual ? ' · manual' : ''}${s.reviewOf.length ? ` · reviews ${esc(s.reviewOf.join(', '))}` : ''}</div>`;
}

export function mountGraph(root, model, { selectedId, onSelect }) {
   if (!model.steps.length) {
      root.innerHTML = '<p class="empty-note">This file has no steps.</p>';
      return;
   }
   const { lanes, pos, width, height } = layout(model);
   const posOf = (id) => pos.get(model.byId.get(id));
   const edges = model.edges
      .map((e) => `<path class="edge e-${e.kind}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" d="${edgePath(posOf(e.from), posOf(e.to))}"/>`)
      .join('');
   const nodes = model.steps.map((s) => nodeSvg(s, pos.get(s))).join('');
   const bands = lanes.map((l, i) => `<rect class="lane-band${i % 2 ? ' odd' : ''}" x="0" y="${l.y}" width="${width}" height="${l.h}"/>`).join('');
   const labels = lanes
      .map((l, i) => {
         const done = l.steps.filter((s) => s.status === 'passed' || s.status === 'cancelled').length;
         return `<div class="lane-label${i % 2 ? ' odd' : ''}" style="height:${l.h}px" title="${esc(l.about)}">
            <span class="lane-name">${esc(l.label)}</span><span class="lane-count">${done}/${l.steps.length} done</span></div>`;
      })
      .join('');

   root.innerHTML = `<p class="graph-note">${model.parallel
      ? 'Columns are dependency depth: a step sits right of everything it depends on. Rows are tracks.'
      : 'This file has no dependsOn, so the steps run one by one in priority order.'} Hover a step to trace its chain, click to open it.</p>
      <div class="graph">
         <div class="graph-lanes">${labels}</div>
         <div class="graph-scroll">
            <svg class="graph-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
               <defs>
                  <clipPath id="fjv-clip" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="${NODE_W - 8}" height="${NODE_H}"/></clipPath>
                  <marker id="fjv-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0,0 L8,4 L0,8 z"/></marker>
                  <marker id="fjv-arrow-hi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow-hi" d="M0,0 L8,4 L0,8 z"/></marker>
               </defs>
               ${bands}<g class="edges">${edges}</g><g class="nodes">${nodes}</g>
            </svg>
         </div>
         <div class="graph-tip" hidden></div>
      </div>
      ${legendHtml(model)}`;

   const svg = root.querySelector('svg');
   const tip = root.querySelector('.graph-tip');
   const wrap = root.querySelector('.graph');
   const scroller = root.querySelector('.graph-scroll');
   markSelected(root, selectedId);

   const showOverflow = () => {
      wrap.classList.toggle('more-left', scroller.scrollLeft > 4);
      wrap.classList.toggle('more-right', scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
   };
   scroller.addEventListener('scroll', showOverflow, { passive: true });
   new ResizeObserver(showOverflow).observe(scroller);

   const focusOn = (g) => {
      const id = g.dataset.id;
      const { up, down } = relatives(model, id);
      svg.classList.add('focus');
      for (const n of svg.querySelectorAll('.node')) n.classList.toggle('hi', up.has(n.dataset.id) || down.has(n.dataset.id));
      for (const e of svg.querySelectorAll('.edge')) {
         const { from, to } = e.dataset;
         e.classList.toggle('hi', (up.has(from) && up.has(to)) || (down.has(from) && down.has(to)));
      }
      tip.innerHTML = tipHtml(model, model.byId.get(id));
      tip.hidden = false;
      const r = g.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.left - w.left), w.width - tip.offsetWidth - 8);
      const below = r.bottom - w.top + 8;
      tip.style.left = `${left}px`;
      tip.style.top = `${below + tip.offsetHeight > w.height ? r.top - w.top - tip.offsetHeight - 8 : below}px`;
   };
   const clear = () => {
      svg.classList.remove('focus');
      for (const el of svg.querySelectorAll('.hi')) el.classList.remove('hi');
      tip.hidden = true;
   };

   svg.addEventListener('pointerover', (e) => {
      const g = e.target.closest('.node');
      if (g) focusOn(g);
   });
   svg.addEventListener('pointerout', (e) => {
      if (e.target.closest('.node') && !e.relatedTarget?.closest?.('.node')) clear();
   });
   svg.addEventListener('focusin', (e) => {
      const g = e.target.closest('.node');
      if (g) focusOn(g);
   });
   svg.addEventListener('focusout', clear);
   svg.addEventListener('click', (e) => {
      const g = e.target.closest('.node');
      if (g) onSelect(g.dataset.id);
   });
   svg.addEventListener('keydown', (e) => {
      const g = e.target.closest('.node');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
         e.preventDefault();
         onSelect(g.dataset.id);
      }
   });
}

export function markSelected(root, id) {
   for (const n of root.querySelectorAll('.node')) n.classList.toggle('selected', n.dataset.id === id);
}

export function centerOn(root, id) {
   const scroller = root.querySelector('.graph-scroll');
   const node = [...root.querySelectorAll('.node')].find((n) => n.dataset.id === id);
   if (!scroller || !node) return;
   const s = scroller.getBoundingClientRect();
   const r = node.getBoundingClientRect();
   scroller.scrollLeft += r.left - s.left - (s.width - r.width) / 2;
}
