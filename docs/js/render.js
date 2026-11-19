import { STATUS_ICON, STATUS_LABEL, STATUS_ORDER, frIdOf } from './model.js';
import { codeOnly, esc, inline, plain, truncate } from './text.js';

const icon = (status) => `<span class="st-icon" aria-hidden="true">${STATUS_ICON[status]}</span>`;
const badge = (status) => `<span class="badge st-${status}">${icon(status)} ${STATUS_LABEL[status]}</span>`;
const emptyNote = (text) => `<p class="empty-note">${esc(text)}</p>`;

export function headerHtml(model) {
   const c = model.counts;
   const active = c.total - c.cancelled;
   const pct = active ? Math.round((c.passed / active) * 100) : 0;
   const present = STATUS_ORDER.filter((st) => c[st]);
   const segments = present.map((st) => `<span class="seg st-${st}" style="flex-grow:${c[st]}"></span>`).join('');
   const legend = present.map((st) => `<li class="st-${st}">${icon(st)}<b>${c[st]}</b> ${STATUS_LABEL[st].toLowerCase()}</li>`).join('');
   const summary = present.map((st) => `${c[st]} ${st}`).join(', ');
   return `<section class="overview">
      ${model.description ? `<p class="lede">${inline(model.description, model.refs)}</p>` : ''}
      <div class="progress">
         <div class="progress-figure"><span class="big">${c.passed}</span><span class="of">/ ${active} passed</span><span class="pct">${pct}%</span></div>
         <div class="progress-bar" role="img" aria-label="${esc(summary)}">${segments}</div>
         <ul class="legend">${legend}</ul>
      </div>
   </section>`;
}

export function tabsFor(model) {
   const tabs = [
      { id: 'steps', label: 'Steps', count: model.steps.length },
      { id: 'graph', label: 'Graph' },
   ];
   for (const l of model.lists) tabs.push({ id: l.tab, label: l.label, count: l.items.length });
   if (model.relatedSources.length || model.tracks.length) {
      tabs.push({ id: 'sources', label: model.tracks.length ? 'Sources & Tracks' : 'Sources', count: model.relatedSources.length + model.tracks.length });
   }
   for (const x of model.extras) tabs.push({ id: `x:${x.key}`, label: x.key, count: Array.isArray(x.value) ? x.value.length : null });
   if (model.warnings.length) tabs.push({ id: 'warnings', label: 'Warnings', count: model.warnings.length, warn: true });
   return tabs;
}

export function tabsHtml(tabs, active) {
   return tabs
      .map((t) => `<button class="tab${t.warn ? ' warn' : ''}" role="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === active}">
         ${t.warn ? '<span aria-hidden="true">⚠</span> ' : ''}${esc(t.label)}${t.count != null ? ` <span class="count">${t.count}</span>` : ''}</button>`)
      .join('');
}

const searchCache = new WeakMap();
function searchText(s) {
   if (!searchCache.has(s)) searchCache.set(s, [s.id, s.title, s.description, s.track, ...s.changes].join('\n').toLowerCase());
   return searchCache.get(s);
}

export function visibleSteps(model, filter) {
   const q = filter.q.trim().toLowerCase();
   return model.steps.filter((s) =>
      (filter.status === 'all' || s.status === filter.status) &&
      (filter.track === '*' || s.track === filter.track) &&
      (!q || searchText(s).includes(q)));
}

function filtersHtml(model, filter) {
   const options = [['all', 'All', model.counts.total], ...STATUS_ORDER.filter((st) => model.counts[st] || st !== 'cancelled').map((st) => [st, STATUS_LABEL[st], model.counts[st]])];
   const statusButtons = options
      .map(([value, label, n]) => `<button class="seg-btn${value !== 'all' ? ` st-${value}` : ''}" data-status="${value}" aria-pressed="${filter.status === value}">
         ${value !== 'all' ? icon(value) : ''}${label} <span class="count">${n}</span></button>`)
      .join('');
   const trackNames = [...new Set([...model.tracks.map((t) => t.name), ...model.steps.map((s) => s.track).filter(Boolean)])];
   const trackSelect = trackNames.length
      ? `<select id="track-filter" aria-label="Track">
            <option value="*">All tracks</option>
            ${trackNames.map((t) => `<option value="${esc(t)}"${filter.track === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}
            ${model.steps.some((s) => !s.track) ? `<option value=""${filter.track === '' ? ' selected' : ''}>main checkout</option>` : ''}
         </select>`
      : '';
   return `<div class="seg-group" role="group" aria-label="Status">${statusButtons}</div>
      <div class="filter-row">
         <input id="search" type="search" placeholder="Search steps…" value="${esc(filter.q)}" autocomplete="off" spellcheck="false">
         ${trackSelect}
      </div>`;
}

export function stepListHtml(model, state) {
   const list = visibleSteps(model, state.filter);
   if (!list.length) return emptyNote('No steps match.');
   return list
      .map((s) => `<button class="step-item st-${s.status}${s.id === state.stepId ? ' selected' : ''}" data-select="${esc(s.id)}">
         ${icon(s.status)}<span class="sr">${STATUS_LABEL[s.status]}</span>
         <span class="si-body">
            <span class="si-head"><span class="si-id">${esc(s.id)}</span>${s.track ? `<span class="chip">${esc(s.track)}</span>` : ''}${s.manual ? '<span class="chip">✋ manual</span>' : ''}</span>
            <span class="si-title">${codeOnly(s.title) || '<i>untitled</i>'}</span>
         </span>
      </button>`)
      .join('');
}

function relChips(model, ids) {
   return ids
      .map((id) => {
         const t = model.byId.get(id);
         if (!t) return `<span class="chip missing" title="Not a step of this file">${esc(id)} ?</span>`;
         return `<a href="#" class="chip rel st-${t.status}" data-step="${esc(id)}" title="${esc(`${plain(t.title)} — ${STATUS_LABEL[t.status]}`)}">${icon(t.status)} ${esc(id)}</a>`;
      })
      .join('');
}

const linkOrCode = (v, refs) => (/^https?:\/\//.test(v) ? inline(v, refs) : /\s/.test(v) ? inline(v, refs) : `<code>${esc(v)}</code>`);

function valueHtml(v, refs) {
   if (typeof v === 'string') return `<p>${inline(v, refs)}</p>`;
   if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      return v.length ? `<ul class="plain-list">${v.map((x) => `<li>${inline(x, refs)}</li>`).join('')}</ul>` : emptyNote('Empty list.');
   }
   if (v && typeof v === 'object' && !Array.isArray(v)) {
      return `<dl class="kv">${Object.entries(v)
         .map(([k, x]) => `<dt>${esc(k)}</dt><dd>${typeof x === 'string' ? inline(x, refs) : `<pre>${esc(JSON.stringify(x, null, 2))}</pre>`}</dd>`)
         .join('')}</dl>`;
   }
   return `<pre>${esc(JSON.stringify(v, null, 2))}</pre>`;
}

export function stepDetailHtml(model, state, nav) {
   const s = model.byId.get(state.stepId);
   if (!s) return emptyNote('Select a step on the left.');
   const refs = model.refs;
   const track = model.tracks.find((t) => t.name === s.track);
   const tags = [
      badge(s.status),
      s.isReview && '<span class="tag">group review</span>',
      s.manual && '<span class="tag">✋ manual</span>',
      s.skipReview && '<span class="tag">skip review</span>',
      s.kind && `<span class="tag">kind: ${esc(s.kind)}</span>`,
      s.priority != null && `<span class="tag subtle">priority ${esc(s.priority)}</span>`,
   ].filter(Boolean).join('');
   const rows = [
      model.parallel && ['Depends on', s.dependsOn.length ? relChips(model, s.dependsOn) : '<span class="muted">nothing, can start at once</span>'],
      s.blocks.length && ['Blocks', relChips(model, s.blocks)],
      s.reviewOf.length && ['Reviews', relChips(model, s.reviewOf)],
      s.reviewedBy.length && ['Reviewed by', relChips(model, s.reviewedBy)],
      s.track && ['Track', `<span><b>${esc(s.track)}</b>${track?.about ? `<span class="muted"> — ${inline(track.about, refs)}</span>` : ''}</span>`],
      s.ticket && ['Ticket', linkOrCode(s.ticket, refs)],
   ].filter(Boolean);
   const navBtn = (id, dir) => (id
      ? `<button class="btn ghost" data-action="${dir}" title="${dir === 'prev' ? 'Previous (k)' : 'Next (j)'}">${dir === 'prev' ? '← ' : ''}${esc(id)}${dir === 'next' ? ' →' : ''}</button>`
      : '<span></span>');
   return `<article class="step-card st-${s.status}">
      <div class="sd-top"><span class="sd-id">${esc(s.id)}</span>${tags}</div>
      <h2 class="sd-title">${codeOnly(s.title) || '<i>untitled</i>'}</h2>
      ${s.description ? `<p class="sd-desc">${inline(s.description, refs)}</p>` : ''}
      ${rows.length ? `<dl class="sd-rel">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
      <section class="sd-section">
         <h3>Changes <span class="count">${s.changes.length}</span></h3>
         ${s.changes.length ? `<ol class="changes">${s.changes.map((c) => `<li><div>${inline(c, refs)}</div></li>`).join('')}</ol>` : emptyNote('No changes listed.')}
      </section>
      ${s.designReference.length ? `<section class="sd-section"><h3>Design reference</h3><ul class="plain-list">${s.designReference.map((d) => `<li>${linkOrCode(d, refs)}</li>`).join('')}</ul></section>` : ''}
      ${s.extra.length ? `<section class="sd-section"><h3>Other fields</h3><dl class="kv">${s.extra.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${typeof v === 'string' ? inline(v, refs) : `<code>${esc(JSON.stringify(v))}</code>`}</dd>`).join('')}</dl></section>` : ''}
      <nav class="sd-nav">${navBtn(nav.prev, 'prev')}${navBtn(nav.next, 'next')}</nav>
   </article>`;
}

export function stepsTabHtml(model, state, nav) {
   if (!model.steps.length) return emptyNote(`This file has no "steps" array.`);
   return `<div class="steps-layout">
      <aside class="step-pane">
         <div class="filters">${filtersHtml(model, state.filter)}</div>
         <div class="step-list" id="step-list">${stepListHtml(model, state)}</div>
      </aside>
      <div class="step-detail" id="step-detail">${stepDetailHtml(model, state, nav)}</div>
   </div>`;
}

export function listTabHtml(model, section) {
   const refs = model.refs;
   let body;
   if (!section.items.length) body = emptyNote('Empty list.');
   else if (section.tab === 'requirements') {
      body = `<ul class="req-list">${section.items
         .map((text) => {
            const id = frIdOf(text);
            const rest = id ? text.replace(/^\s*FR-\d+\s*[:.\-–—]?\s*/, '') : text;
            return `<li${id ? ` id="fr-${esc(id)}"` : ''}>${id ? `<span class="req-id">${esc(id)}</span>` : '<span class="req-id">·</span>'}<div>${inline(rest, refs)}</div></li>`;
         })
         .join('')}</ul>`;
   } else {
      const tag = section.tab === 'questions' ? 'ol' : 'ul';
      body = `<${tag} class="plain-list ${tag === 'ol' ? 'numbered' : ''}">${section.items.map((t) => `<li>${inline(t, refs)}</li>`).join('')}</${tag}>`;
   }
   return `<section class="doc-section"><h2>${esc(section.key)}</h2>${body}</section>`;
}

export function sourcesTabHtml(model) {
   const refs = model.refs;
   const tracks = model.tracks.length
      ? `<section class="doc-section"><h2>Tracks</h2>
         <table class="tracks-table"><thead><tr><th>Track</th><th>Where it works</th><th class="num">Done</th></tr></thead><tbody>
         ${model.tracks.map((t) => {
            const steps = model.steps.filter((s) => s.track === t.name);
            const done = steps.filter((s) => s.status === 'passed' || s.status === 'cancelled').length;
            return `<tr><td><b>${esc(t.name)}</b></td><td>${inline(t.about, refs)}</td><td class="num">${done}/${steps.length}</td></tr>`;
         }).join('')}
         </tbody></table></section>`
      : '';
   const sources = model.relatedSources.length
      ? `<section class="doc-section"><h2>Related sources</h2><ul class="plain-list sources">${model.relatedSources.map((x) => `<li>${linkOrCode(x, refs)}</li>`).join('')}</ul></section>`
      : '';
   return tracks + sources;
}

export function extraTabHtml(model, extra) {
   return `<section class="doc-section"><h2>${esc(extra.key)}</h2>${valueHtml(extra.value, model.refs)}</section>`;
}

export function warningsTabHtml(model) {
   return `<section class="doc-section"><h2>Warnings</h2>
      <p class="muted">Checks against the rules of <code>feature-json-init</code>. The viewer still shows the file as it is.</p>
      <ul class="warn-list">${model.warnings
         .map((w) => `<li><span class="warn-icon" aria-hidden="true">⚠</span><div>${w.stepId && model.byId.has(w.stepId) ? relChips(model, [w.stepId]) : ''} ${inline(w.message, model.refs)}</div></li>`)
         .join('')}</ul></section>`;
}

function ago(ts) {
   const s = Math.round((Date.now() - ts) / 1000);
   if (s < 60) return 'just now';
   if (s < 3600) return `${Math.round(s / 60)} min ago`;
   if (s < 86400) return `${Math.round(s / 3600)} h ago`;
   return new Date(ts).toLocaleDateString();
}

export function recentListHtml(recent) {
   if (!recent.length) return emptyNote('No recent files yet.');
   return `<ul class="recent-list">${recent
      .map((r) => `<li>
         <button class="recent-item" data-recent="${esc(r.id)}">
            <span class="ri-name">${esc(r.project || r.fileName)}</span>
            <span class="ri-meta">${esc(r.fileName)} · ${r.stepsPassed}/${r.stepsTotal} passed · ${ago(r.openedAt)}</span>
            ${r.description ? `<span class="ri-desc">${esc(truncate(plain(r.description), 160))}</span>` : ''}
         </button>
         <button class="icon-btn" data-forget="${esc(r.id)}" title="Remove from recent" aria-label="Remove ${esc(r.project || r.fileName)} from recent">×</button>
      </li>`)
      .join('')}</ul>`;
}

export function startHtml(recent, canWatch) {
   return `<section class="start">
      <div class="dropzone">
         <div class="dz-mark" aria-hidden="true">{ }</div>
         <h1>Drop a <code>feature.json</code> here</h1>
         <p class="dz-actions"><button class="btn primary" data-action="open">Choose a file</button><button class="btn ghost" data-action="demo">Open the demo</button></p>
         <p class="muted small">The file is read in your browser and never uploaded.
         ${canWatch ? 'The page redraws itself when the file changes on disk.' : 'Live reload needs Chrome, Edge, Arc or Brave. In this browser drop the file again after a change.'}</p>
      </div>
      ${recent.length ? `<div class="recent"><h2>Recent</h2>${recentListHtml(recent)}</div>` : ''}
   </section>`;
}
