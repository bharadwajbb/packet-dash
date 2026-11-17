// Validates the whole content document before play starts.
import { checkRound, REASON_CODES } from './rules.js';

export function validateContent(doc) {
  const errors = [];
  const err = (where, message) => errors.push({ where, message });

  if (!doc || typeof doc !== 'object') return { ok: false, errors: [{ where: 'document', message: 'content is not an object' }] };
  if (doc.schemaVersion !== 1) err('document', 'schemaVersion must be 1');

  const sourceIds = new Set();
  for (const s of doc.sources ?? []) {
    if (!s.id || !s.title || !s.url || !s.section || !s.claim) err(`source ${s.id ?? '?'}`, 'needs id, title, url, section and claim');
    if (sourceIds.has(s.id)) err(`source ${s.id}`, 'duplicate id');
    sourceIds.add(s.id);
  }
  const checkRefs = (where, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return err(where, 'needs at least one source');
    for (const id of ids) if (!sourceIds.has(id)) err(where, `unknown source "${id}"`);
  };

  if (!Array.isArray(doc.levels) || doc.levels.length === 0) err('document', 'needs levels');
  const levelIds = new Set();
  const roundIds = new Set();
  for (const level of doc.levels ?? []) {
    const where = `level ${level.id ?? '?'}`;
    if (!level.id || levelIds.has(level.id)) err(where, 'missing or duplicate id');
    levelIds.add(level.id);
    if (!REASON_CODES[level.mechanic]) err(where, `unknown mechanic "${level.mechanic}"`);
    for (const k of ['title', 'outcome']) if (!level[k]) err(where, `needs ${k}`);
    for (const k of ['analogy', 'example', 'boundary']) if (!level.briefing?.[k]) err(where, `briefing needs ${k}`);
    if (!level.link?.from || !level.link?.to) err(where, 'needs link.from and link.to');
    checkRefs(where, level.sourceIds);
    for (const code of REASON_CODES[level.mechanic] ?? []) {
      if (!level.feedback?.[code]) err(where, `missing feedback for "${code}"`);
    }
    if (level.news) {
      if (!level.news.headline || !Array.isArray(level.news.reported) || !level.news.connection) err(`${where} news`, 'needs headline, reported and connection');
      checkRefs(`${where} news`, level.news.sourceIds);
    }
    if (!Array.isArray(level.rounds) || level.rounds.length === 0) err(where, 'needs rounds');
    for (const round of level.rounds ?? []) {
      const rw = `round ${round.id ?? '?'}`;
      if (!round.id || roundIds.has(round.id)) err(rw, 'missing or duplicate id');
      roundIds.add(round.id);
      if (round.mechanic !== level.mechanic) err(rw, `mechanic "${round.mechanic}" does not match level "${level.mechanic}"`);
      if (!Array.isArray(round.hints) || round.hints.length < 2) err(rw, 'needs a method hint and a worked-solution hint');
      const problem = checkRound(round);
      if (problem) err(rw, problem);
    }
  }
  return { ok: errors.length === 0, errors };
}
