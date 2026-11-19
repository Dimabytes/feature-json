import { centerOn, markSelected, mountGraph } from './graph.js';
import { buildModel } from './model.js';
import * as view from './render.js';
import { canWatch, ensurePermission, forgetRecent, listRecent, pickFile, rememberRecent, takeDrop, Watcher } from './source.js';
import { esc } from './text.js';

const $ = (sel) => document.querySelector(sel);
const el = {
   app: $('#app'),
   tabs: $('#tabs'),
   fileInfo: $('#file-info'),
   banner: $('#banner'),
   overlay: $('#drop-overlay'),
   input: $('#file-input'),
   recentMenu: $('#recent-menu'),
   recentBody: $('#recent-body'),
   themeBtn: $('#theme-btn'),
   chrome: $('#chrome'),
};

const THEMES = ['system', 'light', 'dark'];
const THEME_ICON = { system: '◐', light: '☀︎', dark: '☾' };
const DEFAULT_FILTER = () => ({ status: 'all', track: '*', q: '' });

const state = {
   source: null,
   model: null,
   updatedAt: null,
   parseError: null,
   fileError: null,
   recent: [],
   tab: 'steps',
   stepId: null,
   filter: DEFAULT_FILTER(),
   theme: 'system',
};

let pendingHash = null;
let rememberQueue = Promise.resolve();

const watcher = new Watcher({
   onText: (text, info) => applyText(text, info),
   onError: (e) => {
      state.fileError = e;
      renderBanner();
   },
   onAlive: () => {
      if (!state.fileError) return;
      state.fileError = null;
      renderBanner();
   },
});

function defaultStep(model) {
   return (model.steps.find((s) => s.status === 'ready') ?? model.steps.find((s) => s.status === 'blocked') ?? model.steps[0])?.id ?? null;
}

function applyText(text, { name, modified }) {
   if (state.source) state.source.name = name;
   let model;
   try {
      model = buildModel(JSON.parse(text));
   } catch (e) {
      state.parseError = e.message;
      if (state.model) {
         renderBanner();
         renderFileInfo();
      } else renderAll();
      return;
   }
   state.parseError = null;
   state.model = model;
   state.updatedAt = modified ?? Date.now();
   if (!model.byId.has(state.stepId)) state.stepId = defaultStep(model);
   renderAll({ preserve: true });
   if (state.source?.handle) remember(state.source.handle, model, name);
}

function remember(handle, model, fileName) {
   const meta = {
      fileName,
      project: model.project,
      description: model.description,
      stepsTotal: model.counts.total - model.counts.cancelled,
      stepsPassed: model.counts.passed,
   };
   rememberQueue = rememberQueue
      .then(() => rememberRecent(handle, meta))
      .then(listRecent)
      .then((recent) => {
         state.recent = recent;
         renderRecentMenu();
      });
}

function beginSource(source) {
   watcher.stop();
   const hash = pendingHash;
   pendingHash = null;
   Object.assign(state, {
      source,
      model: null,
      updatedAt: null,
      parseError: null,
      fileError: null,
      filter: DEFAULT_FILTER(),
      stepId: hash?.step ?? null,
      tab: hash?.tab ?? state.tab,
   });
   renderAll();
}

function openHandle(handle) {
   beginSource({ kind: 'live', name: handle.name, handle });
   return watcher.watch(handle);
}

async function openFile(file) {
   beginSource({ kind: 'snapshot', name: file.name });
   applyText(await file.text(), { name: file.name, modified: file.lastModified });
}

async function openDemo() {
   beginSource({ kind: 'demo', name: 'sample.feature.json' });
   try {
      const res = await fetch('sample.feature.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      applyText(await res.text(), { name: 'sample.feature.json', modified: Date.now() });
   } catch (e) {
      state.fileError = e;
      renderBanner();
   }
}

function goHome() {
   watcher.stop();
   Object.assign(state, { source: null, model: null, parseError: null, fileError: null });
   history.replaceState(null, '', location.pathname + location.search);
   renderAll();
}

async function openFromPicker() {
   if (!canWatch) {
      el.input.click();
      return;
   }
   try {
      const handle = await pickFile();
      if (handle) openHandle(handle);
   } catch (e) {
      state.fileError = e;
      renderBanner();
   }
}

async function openRecent(id) {
   const entry = state.recent.find((r) => r.id === id);
   if (!entry) return;
   el.recentMenu.open = false;
   try {
      if (await ensurePermission(entry.handle, true)) openHandle(entry.handle);
      else {
         state.fileError = new Error('permission to read the file was not given');
         renderBanner();
      }
   } catch (e) {
      state.fileError = e;
      renderBanner();
   }
}

async function forget(id) {
   await forgetRecent(id);
   state.recent = await listRecent();
   renderRecentMenu();
   if (!state.source) renderAll();
}

function captureView() {
   const active = document.activeElement;
   return {
      y: window.scrollY,
      list: $('#step-list')?.scrollTop,
      graph: $('.graph-scroll')?.scrollLeft,
      focusId: active?.id || null,
      caret: typeof active?.selectionStart === 'number' ? active.selectionStart : null,
   };
}

function restoreView(v) {
   if (v.list != null && $('#step-list')) $('#step-list').scrollTop = v.list;
   if (v.graph != null && $('.graph-scroll')) $('.graph-scroll').scrollLeft = v.graph;
   window.scrollTo(0, v.y);
   const focus = v.focusId && document.getElementById(v.focusId);
   if (!focus) return;
   focus.focus({ preventScroll: true });
   if (v.caret != null && focus.setSelectionRange) focus.setSelectionRange(v.caret, v.caret);
}

function renderAll({ preserve = false } = {}) {
   const saved = preserve ? captureView() : null;
   const m = state.model;
   renderFileInfo();
   renderBanner();
   renderRecentMenu();
   document.title = m?.project ? `${m.project} · feature.json viewer` : 'feature.json viewer';
   if (!m) {
      el.tabs.hidden = true;
      el.tabs.innerHTML = '';
      el.app.innerHTML = state.source
         ? `<p class="empty-note pad">${state.parseError ? 'Waiting for valid JSON…' : `Loading ${esc(state.source.name)}…`}</p>`
         : view.startHtml(state.recent, canWatch);
      return;
   }
   const tabs = view.tabsFor(m);
   if (!tabs.some((t) => t.id === state.tab)) state.tab = 'steps';
   el.tabs.hidden = false;
   el.tabs.innerHTML = view.tabsHtml(tabs, state.tab);
   el.app.innerHTML = `${view.headerHtml(m)}<div class="panel" id="panel"></div>`;
   renderPanel();
   if (saved) restoreView(saved);
   writeHash();
}

function renderPanel() {
   const m = state.model;
   const panel = $('#panel');
   const tab = state.tab;
   if (tab === 'steps') panel.innerHTML = view.stepsTabHtml(m, state, navOf());
   else if (tab === 'graph') {
      mountGraph(panel, m, { selectedId: state.stepId, onSelect: (id) => selectStep(id, { openTab: true }) });
      if (state.stepId) centerOn(panel, state.stepId);
   } else if (tab === 'sources') panel.innerHTML = view.sourcesTabHtml(m);
   else if (tab === 'warnings') panel.innerHTML = view.warningsTabHtml(m);
   else if (tab.startsWith('x:')) panel.innerHTML = view.extraTabHtml(m, m.extras.find((x) => `x:${x.key}` === tab));
   else panel.innerHTML = view.listTabHtml(m, m.lists.find((l) => l.tab === tab));
}

function renderSteps() {
   $('#panel').innerHTML = view.stepsTabHtml(state.model, state, navOf());
}

function renderStepList() {
   $('#step-list').innerHTML = view.stepListHtml(state.model, state);
   $('#step-detail').innerHTML = view.stepDetailHtml(state.model, state, navOf());
}

function navOf() {
   const list = view.visibleSteps(state.model, state.filter);
   const i = list.findIndex((s) => s.id === state.stepId);
   if (i < 0) return { prev: null, next: list[0]?.id ?? null };
   return { prev: list[i - 1]?.id ?? null, next: list[i + 1]?.id ?? null };
}

function chromeHeight() {
   return el.chrome.offsetHeight;
}

function scrollIntoPlace(node) {
   if (!node) return;
   const top = node.getBoundingClientRect().top;
   const min = chromeHeight() + 8;
   if (top < min || top > window.innerHeight - 120) window.scrollTo({ top: window.scrollY + top - min });
}

function selectStep(id, { openTab = false } = {}) {
   const m = state.model;
   if (!m?.byId.has(id)) return;
   state.stepId = id;
   if (state.tab !== 'steps' && !openTab) {
      if (state.tab === 'graph') markSelected($('#panel'), id);
      writeHash();
      return;
   }
   const hidden = !view.visibleSteps(m, state.filter).some((s) => s.id === id);
   if (hidden) state.filter = DEFAULT_FILTER();
   if (state.tab !== 'steps') {
      state.tab = 'steps';
      el.tabs.innerHTML = view.tabsHtml(view.tabsFor(m), state.tab);
      renderSteps();
   } else if (hidden) renderSteps();
   else {
      for (const item of document.querySelectorAll('.step-item')) item.classList.toggle('selected', item.dataset.select === id);
      $('#step-detail').innerHTML = view.stepDetailHtml(m, state, navOf());
   }
   $('#step-list .selected')?.scrollIntoView({ block: 'nearest' });
   scrollIntoPlace($('#step-detail'));
   writeHash();
}

function setTab(tab) {
   if (!state.model || tab === state.tab) return;
   state.tab = tab;
   el.tabs.innerHTML = view.tabsHtml(view.tabsFor(state.model), tab);
   renderPanel();
   const panel = $('#panel');
   if (panel.getBoundingClientRect().top < chromeHeight()) scrollIntoPlace(panel);
   writeHash();
}

function goToRequirement(fr) {
   setTab('requirements');
   const item = document.getElementById(`fr-${fr}`);
   if (!item) return;
   item.scrollIntoView({ block: 'center' });
   item.classList.add('flash');
   setTimeout(() => item.classList.remove('flash'), 1600);
}

function step(delta) {
   const nav = navOf();
   const id = delta > 0 ? nav.next : nav.prev;
   if (id) selectStep(id);
}

function writeHash() {
   const p = new URLSearchParams();
   if (state.tab !== 'steps') p.set('tab', state.tab);
   if (state.stepId) p.set('step', state.stepId);
   const hash = p.toString();
   history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
}

function readHash() {
   const p = new URLSearchParams(location.hash.slice(1));
   return { tab: p.get('tab') ?? undefined, step: p.get('step') ?? null };
}

function formatTime(ts) {
   const d = new Date(ts);
   const sameDay = d.toDateString() === new Date().toDateString();
   return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : d.toLocaleString();
}

function renderFileInfo() {
   const s = state.source;
   if (!s) {
      el.fileInfo.innerHTML = '';
      return;
   }
   const status = s.kind === 'live'
      ? `<span class="fi-status live" title="Watching the file for changes"><span class="live-dot" aria-hidden="true"></span>Live${state.updatedAt ? ` · changed ${formatTime(state.updatedAt)}` : ''}</span>`
      : s.kind === 'demo'
         ? '<span class="fi-status">Demo</span>'
         : '<span class="fi-status" title="This browser cannot watch the file">Snapshot · drop again to update</span>';
   const project = state.model?.project;
   el.fileInfo.innerHTML = `<span class="fi-name">${esc(project || s.name)}</span>${project ? `<span class="fi-file">${esc(s.name)}</span>` : ''}${status}`;
}

function renderBanner() {
   const name = state.source?.name ?? 'the file';
   const live = state.source?.kind === 'live';
   const lines = [];
   if (state.parseError) {
      lines.push(`Can't parse ${name}: ${state.parseError}.${state.model ? ' Showing the last good version.' : ''}${live ? ' Waiting for the next change…' : ''}`);
   }
   if (state.fileError) lines.push(`Can't read ${name}: ${state.fileError.message || state.fileError}.${live ? ' Retrying every second…' : ''}`);
   el.banner.hidden = !lines.length;
   el.banner.innerHTML = lines.map((l) => `<div><span aria-hidden="true">⚠</span> ${esc(l)}</div>`).join('');
}

function renderRecentMenu() {
   el.recentMenu.hidden = !canWatch || !state.recent.length;
   el.recentBody.innerHTML = view.recentListHtml(state.recent);
}

function applyTheme() {
   if (state.theme === 'system') delete document.documentElement.dataset.theme;
   else document.documentElement.dataset.theme = state.theme;
   el.themeBtn.textContent = THEME_ICON[state.theme];
   el.themeBtn.title = `Theme: ${state.theme}. Click to change`;
   el.themeBtn.setAttribute('aria-label', el.themeBtn.title);
   try {
      localStorage.setItem('fjv-theme', state.theme);
   } catch {
      return;
   }
}

const actions = {
   open: openFromPicker,
   demo: openDemo,
   home: goHome,
   prev: () => step(-1),
   next: () => step(1),
   theme: () => {
      state.theme = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
      applyTheme();
   },
};

document.addEventListener('click', (e) => {
   if (el.recentMenu.open && !e.target.closest('#recent-menu')) el.recentMenu.open = false;
   const t = e.target.closest('[data-step],[data-select],[data-fr],[data-tab],[data-status],[data-recent],[data-forget],[data-action]');
   if (!t) return;
   const d = t.dataset;
   if (d.step) {
      e.preventDefault();
      selectStep(d.step, { openTab: true });
   } else if (d.select) selectStep(d.select);
   else if (d.fr) {
      e.preventDefault();
      goToRequirement(d.fr);
   } else if (d.tab) setTab(d.tab);
   else if (d.status) {
      state.filter.status = d.status;
      renderSteps();
   } else if (d.recent) openRecent(d.recent);
   else if (d.forget) forget(d.forget);
   else actions[d.action]?.();
});

document.addEventListener('input', (e) => {
   if (e.target.id !== 'search') return;
   state.filter.q = e.target.value;
   renderStepList();
});

document.addEventListener('change', (e) => {
   if (e.target.id === 'track-filter') {
      state.filter.track = e.target.value;
      renderSteps();
   }
});

document.addEventListener('keydown', (e) => {
   if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, select, textarea')) return;
   if (!state.model || state.tab !== 'steps') return;
   if (e.key === 'j') step(1);
   else if (e.key === 'k') step(-1);
   else if (e.key === '/') {
      e.preventDefault();
      $('#search')?.focus();
   }
});

el.input.addEventListener('change', () => {
   const file = el.input.files?.[0];
   if (file) openFile(file);
   el.input.value = '';
});

const hasFiles = (e) => e.dataTransfer?.types?.includes('Files');
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
   if (!hasFiles(e)) return;
   e.preventDefault();
   dragDepth++;
   el.overlay.hidden = false;
});
window.addEventListener('dragover', (e) => {
   if (!hasFiles(e)) return;
   e.preventDefault();
   e.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', (e) => {
   if (!hasFiles(e) || --dragDepth > 0) return;
   dragDepth = 0;
   el.overlay.hidden = true;
});
window.addEventListener('drop', (e) => {
   if (!hasFiles(e)) return;
   e.preventDefault();
   dragDepth = 0;
   el.overlay.hidden = true;
   takeDrop(e.dataTransfer).then((picked) => {
      if (picked?.handle) openHandle(picked.handle);
      else if (picked?.file) openFile(picked.file);
   });
});

document.addEventListener('visibilitychange', () => {
   if (!document.hidden) watcher.poke();
});
window.addEventListener('focus', () => watcher.poke());

new ResizeObserver(() => document.documentElement.style.setProperty('--chrome-h', `${chromeHeight()}px`)).observe(el.chrome);

window.featureJsonViewer = { openHandle, openFile, openDemo };

async function boot() {
   try {
      const saved = localStorage.getItem('fjv-theme');
      if (THEMES.includes(saved)) state.theme = saved;
   } catch {
      state.theme = 'system';
   }
   applyTheme();
   pendingHash = location.hash ? readHash() : null;
   state.recent = await listRecent();
   const last = state.recent[0];
   if (last && (await ensurePermission(last.handle, false).catch(() => false))) openHandle(last.handle);
   else renderAll();
}

boot();
