export const STATUS_ORDER = ['passed', 'ready', 'blocked', 'cancelled'];
export const STATUS_LABEL = { passed: 'Passed', ready: 'Ready', blocked: 'Blocked', cancelled: 'Cancelled' };
export const STATUS_ICON = { passed: '✓', ready: '▶︎', blocked: '○', cancelled: '⊘' };

const LIST_SECTIONS = [
   { key: 'Functional Requirements Summary', tab: 'requirements', label: 'Requirements' },
   { key: 'Resolved Questions', tab: 'questions', label: 'Resolved Questions' },
   { key: 'Non-Goals (Out of Scope for V1)', tab: 'nongoals', label: 'Non-Goals' },
];

const BASE_ROOT_KEYS = ['project', 'description', 'relatedSources', 'tracks', ...LIST_SECTIONS.map((s) => s.key)];

const STEP_KEYS = new Set([
   'id', 'title', 'description', 'changes', 'priority', 'passes', 'ticket', 'designReference',
   'dependsOn', 'track', 'manual', 'skipReview', 'reviewOf', 'cancelled', 'kind',
]);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

export function strList(v) {
   if (Array.isArray(v)) return v.filter((x) => x != null).map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
   if (typeof v === 'string' && v) return [v];
   return [];
}

export function buildModel(raw) {
   if (!isObject(raw)) throw new Error('the top level of feature.json must be a JSON object');
   const stepsKey = Array.isArray(raw.steps) ? 'steps' : Array.isArray(raw.userStories) ? 'userStories' : null;
   const steps = (stepsKey ? raw[stepsKey] : []).filter(isObject).map(normalizeStep);
   steps.sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity) || a.index - b.index);

   const byId = new Map();
   for (const s of steps) if (!byId.has(s.id)) byId.set(s.id, s);
   const parallel = steps.some((s) => s.hasDependsOn);
   const tracks = isObject(raw.tracks)
      ? Object.entries(raw.tracks).map(([name, about]) => ({ name, about: str(typeof about === 'object' ? JSON.stringify(about) : about) }))
      : [];

   assignStatus(steps, byId, parallel);
   linkReverse(steps, byId);
   const edges = buildEdges(steps, byId, parallel);
   assignLayers(steps, edges, parallel);

   const lists = LIST_SECTIONS.filter((s) => s.key in raw).map((s) => ({ ...s, items: strList(raw[s.key]) }));
   const coreKeys = new Set([...BASE_ROOT_KEYS, stepsKey].filter(Boolean));
   const requirements = lists.find((l) => l.tab === 'requirements')?.items ?? [];

   return {
      raw,
      stepsKey,
      project: str(raw.project),
      description: str(raw.description),
      relatedSources: strList(raw.relatedSources),
      tracks,
      lists,
      extras: Object.keys(raw).filter((k) => !coreKeys.has(k)).map((key) => ({ key, value: raw[key] })),
      steps,
      byId,
      parallel,
      edges,
      counts: countStatuses(steps),
      warnings: findWarnings(steps, byId, tracks, parallel),
      refs: { steps: byId, frs: new Set(requirements.map(frIdOf).filter(Boolean)) },
   };
}

export function frIdOf(text) {
   return /^\s*(FR-\d+)\b/.exec(text)?.[1] ?? null;
}

function normalizeStep(s, index) {
   const id = str(s.id) || `#${index + 1}`;
   const reviewOf = strList(s.reviewOf);
   return {
      index,
      raw: s,
      id,
      title: str(s.title),
      description: str(s.description),
      changes: strList(s.changes),
      designReference: strList(s.designReference),
      priority: Number.isFinite(s.priority) ? s.priority : null,
      passes: s.passes === true,
      cancelled: s.cancelled === true,
      manual: s.manual === true,
      skipReview: s.skipReview === true,
      ticket: str(s.ticket),
      kind: str(s.kind),
      track: str(s.track),
      hasDependsOn: Array.isArray(s.dependsOn),
      dependsOn: strList(s.dependsOn),
      reviewOf,
      isReview: reviewOf.length > 0 || id.startsWith('REVIEW-'),
      extra: Object.entries(s).filter(([k]) => !STEP_KEYS.has(k)),
      status: 'blocked',
      blocks: [],
      reviewedBy: [],
      layer: 0,
   };
}

const settled = (s) => s.passes || s.cancelled;

function assignStatus(steps, byId, parallel) {
   let readyTaken = false;
   for (const s of steps) {
      if (s.cancelled) s.status = 'cancelled';
      else if (s.passes) s.status = 'passed';
      else if (parallel) s.status = s.dependsOn.every((id) => byId.has(id) && settled(byId.get(id))) ? 'ready' : 'blocked';
      else {
         s.status = readyTaken ? 'blocked' : 'ready';
         readyTaken = true;
      }
   }
}

function linkReverse(steps, byId) {
   for (const s of steps) {
      for (const id of s.dependsOn) byId.get(id)?.blocks.push(s.id);
      for (const id of s.reviewOf) byId.get(id)?.reviewedBy.push(s.id);
   }
}

function buildEdges(steps, byId, parallel) {
   const edges = [];
   const seen = new Set();
   const add = (from, to, kind) => {
      const key = `${from}\u0000${to}`;
      if (from === to || seen.has(key) || !byId.has(from) || !byId.has(to)) return;
      seen.add(key);
      edges.push({ from, to, kind });
   };
   if (parallel) for (const s of steps) for (const d of s.dependsOn) add(d, s.id, 'dep');
   else for (let i = 1; i < steps.length; i++) add(steps[i - 1].id, steps[i].id, 'seq');
   for (const s of steps) for (const r of s.reviewOf) add(r, s.id, 'review');
   return edges;
}

function assignLayers(steps, edges, parallel) {
   if (!parallel) {
      steps.forEach((s, i) => (s.layer = i));
      return;
   }
   const incoming = new Map(steps.map((s) => [s.id, []]));
   for (const e of edges) incoming.get(e.to).push(e.from);
   const memo = new Map();
   const visiting = new Set();
   const layerOf = (id) => {
      if (memo.has(id)) return memo.get(id);
      if (visiting.has(id)) return 0;
      visiting.add(id);
      let layer = 0;
      for (const from of incoming.get(id) ?? []) layer = Math.max(layer, layerOf(from) + 1);
      visiting.delete(id);
      memo.set(id, layer);
      return layer;
   };
   for (const s of steps) s.layer = layerOf(s.id);
}

function countStatuses(steps) {
   const counts = { total: steps.length, passed: 0, ready: 0, blocked: 0, cancelled: 0 };
   for (const s of steps) counts[s.status]++;
   return counts;
}

function findWarnings(steps, byId, tracks, parallel) {
   const warnings = [];
   const warn = (stepId, message) => warnings.push({ stepId, message });
   const trackNames = new Set(tracks.map((t) => t.name));

   const idCounts = new Map();
   for (const s of steps) idCounts.set(s.id, (idCounts.get(s.id) ?? 0) + 1);
   for (const [id, n] of idCounts) if (n > 1) warn(id, `${n} steps share the id ${id}`);

   if (parallel) {
      const without = steps.filter((s) => !s.hasDependsOn).map((s) => s.id);
      if (without.length) warn(null, `Some steps have dependsOn and these do not: ${without.join(', ')}. If one step has dependsOn, every step has it`);
   }

   for (const s of steps) {
      if (!str(s.raw.id)) warn(s.id, 'The step has no id');
      for (const [field, refs] of [['dependsOn', s.dependsOn], ['reviewOf', s.reviewOf]]) {
         for (const ref of refs) {
            const target = byId.get(ref);
            if (!target) warn(s.id, `${field} names ${ref}, which is not a step of this file`);
            else if (s.priority != null && target.priority != null && target.priority >= s.priority) {
               warn(s.id, `${field} names ${ref} with priority ${target.priority}, not lower than ${s.priority}`);
            }
         }
      }
      if (s.track && !trackNames.has(s.track)) warn(s.id, `Track "${s.track}" is not a key of the top-level "tracks"`);
      if (s.manual && s.track) warn(s.id, 'A manual step has a track');
      const reviewId = s.id.startsWith('REVIEW-');
      if (reviewId && !s.reviewOf.length) warn(s.id, 'A REVIEW- id without reviewOf');
      if (!reviewId && s.reviewOf.length) warn(s.id, 'reviewOf on a step whose id does not start with REVIEW-');
      if (parallel && s.reviewOf.length) {
         const missing = s.reviewOf.filter((r) => !s.dependsOn.includes(r));
         if (missing.length) warn(s.id, `dependsOn does not hold the reviewed steps ${missing.join(', ')}`);
      }
   }

   for (const cycle of findCycles(byId)) warn(cycle[0], `Dependency cycle: ${cycle.join(' → ')}`);
   return warnings;
}

function findCycles(byId) {
   const cycles = [];
   const color = new Map();
   const stack = [];
   const visit = (s) => {
      color.set(s.id, 1);
      stack.push(s.id);
      for (const d of s.dependsOn) {
         const t = byId.get(d);
         if (!t) continue;
         const c = color.get(t.id);
         if (c === 1) cycles.push([...stack.slice(stack.indexOf(t.id)), t.id]);
         else if (!c) visit(t);
      }
      stack.pop();
      color.set(s.id, 2);
   };
   for (const s of byId.values()) if (!color.has(s.id)) visit(s);
   return cycles;
}
