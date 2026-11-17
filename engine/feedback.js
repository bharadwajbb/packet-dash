// Turns an evaluator result into the log text, using templates authored in data.
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (values[key] !== undefined ? String(values[key]) : m));
}

export function explain(level, result) {
  if (result.status === 'content-error') return `⚠ content error: ${result.evidence.message}. This round can't be graded.`;
  const template = level.feedback[result.reasonCode];
  let text = template ? fill(template, result.evidence) : `(${result.reasonCode})`;
  // Optional follow-up line, e.g. reminding the player that the requested door is closed.
  const note = level.feedback[`${result.reasonCode}+refused`];
  if (note && result.evidence.refused) text += ' ' + fill(note, result.evidence);
  return text;
}
