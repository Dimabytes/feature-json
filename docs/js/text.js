const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const TOKEN = /(https?:\/\/[^\s<>"'`]*[^\s<>"'`.,;:!?)\]])|\b((?:STEP|REVIEW)-\d+)\b|\b(FR-\d+)\b/g;
const CODE_SPAN = /(`[^`]+`)/;

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const plain = (text) => String(text ?? '').replace(/`/g, '');

export function truncate(text, max) {
   const s = String(text ?? '');
   return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function inline(text, refs) {
   return String(text ?? '')
      .split(CODE_SPAN)
      .map((part, i) => (i % 2 ? `<code>${esc(part.slice(1, -1))}</code>` : linkify(part, refs)))
      .join('');
}

export function codeOnly(text) {
   return String(text ?? '')
      .split(CODE_SPAN)
      .map((part, i) => (i % 2 ? `<code>${esc(part.slice(1, -1))}</code>` : esc(part)))
      .join('');
}

function linkify(text, refs) {
   let out = '';
   let last = 0;
   for (const m of text.matchAll(TOKEN)) {
      out += esc(text.slice(last, m.index));
      last = m.index + m[0].length;
      const [all, url, step, fr] = m;
      if (url) out += `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`;
      else if (step && refs?.steps?.has(step)) out += `<a href="#" class="ref" data-step="${step}">${step}</a>`;
      else if (fr && refs?.frs?.has(fr)) out += `<a href="#" class="ref" data-fr="${fr}">${fr}</a>`;
      else out += esc(all);
   }
   return out + esc(text.slice(last));
}
