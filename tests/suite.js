// Shared test suite: run by Node (tests/run.test.js) and the browser (tests/index.html).
// Expected values are hand-checked against the spec, never computed by the evaluator under test.
import { evaluate } from '../engine/rules.js';
import { validateContent } from '../engine/content.js';
import { explain } from '../engine/feedback.js';
import * as S from '../engine/state.js';
import { buildWorld } from '../render/world.js';
import { tutorialWorld, advanceTutorial, tutorialFinished } from '../render/tutorial.js';

function eq(actual, expected, label = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label} expected ${e} but got ${a}`);
}
function ok(cond, label) { if (!cond) throw new Error(label); }
const copy = (x) => JSON.parse(JSON.stringify(x));

export function buildSuite(content) {
  const tests = [];
  const t = (name, fn) => tests.push({ name, fn });
  const level = (id) => content.levels.find((l) => l.id === id);
  const round = (id) => content.levels.flatMap((l) => l.rounds).find((r) => r.id === id);
  const outcome = (r, answer) => { const x = evaluate(round(r), answer); return [x.status, x.reasonCode]; };

  // ---- content ----
  t('content: shipped levels.json validates', () => {
    const v = validateContent(content);
    eq(v.errors, [], 'errors');
  });
  t('content: 3 levels × 2 rounds', () => {
    eq(content.levels.map((l) => l.rounds.length), [2, 2, 2]);
  });
  t('content: tied paths are rejected (boundary 100 KB → both 120 ms)', () => {
    const bad = copy(content); bad.levels[1].rounds[0].header.sizeKB = 100;
    const v = validateContent(bad);
    ok(v.errors.some((e) => e.where === 'round 2.1' && /tie at 120 ms/.test(e.message)), JSON.stringify(v.errors));
    eq(evaluate(bad.levels[1].rounds[0], { kind: 'path', pathId: 'tunnel' }).status, 'content-error');
  });
  t('content: missing destination building is rejected', () => {
    const bad = copy(content); bad.levels[0].rounds[0].header.dst = '10.0.0.77';
    ok(!validateContent(bad).ok, 'should fail');
    eq(evaluate(bad.levels[0].rounds[0], { kind: 'bounce' }).status, 'content-error');
  });
  t('content: nothing missing is rejected', () => {
    const bad = copy(content); bad.levels[2].rounds[0].arrived = [1, 2, 3, 4, 5, 6];
    ok(!validateContent(bad).ok, 'should fail');
  });
  t('content: unknown source and missing feedback are rejected', () => {
    const bad = copy(content); bad.levels[0].sourceIds = ['nope']; delete bad.levels[1].feedback['wrong-wider'];
    const msgs = validateContent(bad).errors.map((e) => e.message).join(' | ');
    ok(/unknown source "nope"/.test(msgs) && /wrong-wider/.test(msgs), msgs);
  });
  t('content: every news card lists sources and the reported facts', () => {
    for (const l of content.levels) ok(l.news && l.news.reported.length > 0 && l.news.sourceIds.length > 0, l.id);
  });

  // ---- Level 1 ----
  t('1.1 correct: 10.0.0.5 door 443 delivers', () => eq(outcome('1.1', { kind: 'door', ip: '10.0.0.5', port: 443 }), ['correct', 'correct-deliver']));
  t('1.1 mistake: 10.0.0.9 door 443 is wrong building', () => eq(outcome('1.1', { kind: 'door', ip: '10.0.0.9', port: 443 }), ['incorrect', 'wrong-building']));
  t('1.1 mistake: 10.0.0.5 door 22 is wrong door', () => eq(outcome('1.1', { kind: 'door', ip: '10.0.0.5', port: 22 }), ['incorrect', 'wrong-door']));
  t('1.1 mistake: bounce while 443 is listening', () => eq(outcome('1.1', { kind: 'bounce' }), ['incorrect', 'unneeded-bounce']));
  t('1.2 correct: bounce back = connection refused', () => eq(outcome('1.2', { kind: 'bounce' }), ['correct', 'correct-refused']));
  t('1.2 mistake: lit door 443 on the right building', () => eq(outcome('1.2', { kind: 'door', ip: '10.0.0.9', port: 443 }), ['incorrect', 'wrong-door']));
  t('1.2 mistake: open 5432 on the other building', () => eq(outcome('1.2', { kind: 'door', ip: '10.0.0.5', port: 5432 }), ['incorrect', 'wrong-building']));
  t('1.2 mistake: entering the closed door itself', () => eq(outcome('1.2', { kind: 'door', ip: '10.0.0.9', port: 5432 }), ['incorrect', 'closed-door']));
  t('1.x invalid: a door not in the round', () => eq(outcome('1.1', { kind: 'door', ip: '10.0.0.5', port: 8080 })[0], 'invalid-input'));
  t('1.1 feedback names the wrong building', () => {
    const text = explain(level('L1'), evaluate(round('1.1'), { kind: 'door', ip: '10.0.0.9', port: 443 }));
    eq(text, '✖ right door, wrong building. You entered 10.0.0.9:443, but the header says 10.0.0.5. The IP address picks the machine; the port only picks the program on it.');
  });
  t('1.2 feedback explains the reset', () => {
    const text = explain(level('L1'), evaluate(round('1.2'), { kind: 'bounce' }));
    ok(text.startsWith('✔ RST from 10.0.0.9:5432 — connection refused.'), text);
  });

  // ---- Level 2 ----
  t('2.1 correct: tunnel (30 ms vs 111 ms)', () => {
    const r = evaluate(round('2.1'), { kind: 'path', pathId: 'tunnel' });
    eq([r.status, r.evidence.chosenMs, r.evidence.otherMs], ['correct', '30', '111']);
  });
  t('2.1 mistake: trunk is wider but slower', () => eq(outcome('2.1', { kind: 'path', pathId: 'trunk' }), ['incorrect', 'wrong-wider']));
  t('2.2 correct: trunk (210 ms vs 1020 ms)', () => {
    const r = evaluate(round('2.2'), { kind: 'path', pathId: 'trunk' });
    eq([r.status, r.evidence.chosenMs, r.evidence.otherMs], ['correct', '210', '1020']);
  });
  t('2.2 mistake: tunnel is shorter but slower', () => eq(outcome('2.2', { kind: 'path', pathId: 'tunnel' }), ['incorrect', 'wrong-shorter']));
  t('2.1 feedback shows the arithmetic', () => {
    const text = explain(level('L2'), evaluate(round('2.1'), { kind: 'path', pathId: 'trunk' }));
    eq(text, '✖ Fibre Trunk: 110 ms + 10 KB ÷ 10 KB/ms = 111 ms. Copper Tunnel: 20 ms + 10 KB ÷ 1 KB/ms = 30 ms. A 10 KB packet barely uses the extra width, so the long road costs more than the narrow pipe.');
  });
  t('2.x invalid: unknown path', () => eq(outcome('2.1', { kind: 'path', pathId: 'satellite' })[0], 'invalid-input'));

  // ---- Level 3 ----
  t('3.1 correct: resend {3, 5}', () => eq(outcome('3.1', { kind: 'pieces', resend: [5, 3] }), ['correct', 'correct-resend']));
  t('3.1 mistake: resend everything', () => eq(outcome('3.1', { kind: 'pieces', resend: [1, 2, 3, 4, 5, 6] }), ['incorrect', 'resent-received']));
  t('3.1 mistake: only {3} leaves 5 missing', () => {
    const r = evaluate(round('3.1'), { kind: 'pieces', resend: [3] });
    eq([r.reasonCode, r.evidence.stillMissing], ['still-missing', '5']);
  });
  t('3.2 correct: resend {3}', () => eq(outcome('3.2', { kind: 'pieces', resend: [3] }), ['correct', 'correct-resend']));
  t('3.2 mistake: everything after the first gap', () => {
    const r = evaluate(round('3.2'), { kind: 'pieces', resend: [3, 4, 5, 6] });
    eq([r.reasonCode, r.evidence.extras], ['out-of-order-not-lost', '4, 5, 6']);
  });
  t('3.x invalid: empty selection', () => eq(outcome('3.1', { kind: 'pieces', resend: [] }), ['invalid-input', 'invalid-input']));
  t('3.x invalid: piece 7 of 6', () => eq(outcome('3.1', { kind: 'pieces', resend: [7] })[0], 'invalid-input'));

  // ---- session ----
  const play = () => S.beginPlay(S.finishTutorial(S.openBriefing(S.createSession(content))));
  t('state: fresh session opens on the map, then the link test, then the Level 1 briefing', () => {
    const s = S.createSession(content);
    const tut = S.openBriefing(s);
    eq([s.view, tut.view, S.finishTutorial(tut).view, S.currentLevel(s).id], ['map', 'tutorial', 'briefing', 'L1']);
  });
  t('state: link test is shown once; restart keeps it done', () => {
    const done = S.finishTutorial(S.openBriefing(S.createSession(content)));
    eq([done.tutorialDone, S.restart(done, true).tutorialDone, S.openBriefing(S.restart(done, true)).view], [true, true, 'briefing']);
  });
  t('state: link test never touches round progress', () => {
    const done = S.finishTutorial(S.openBriefing(S.createSession(content)));
    eq(S.totals(done).attempts + S.totals(done).hints + S.totals(done).solved, 0);
  });
  t('tutorial: steps advance only on the matching action, in order', () => {
    let step = 0;
    step = advanceTutorial(step, { type: 'entered' }); eq(step, 0, 'enter before moving');
    step = advanceTutorial(step, { type: 'moved' }); eq(step, 1);
    step = advanceTutorial(step, { type: 'hint' }); eq(step, 1, 'hint before jumping');
    step = advanceTutorial(step, { type: 'crossed-gap' }); eq(step, 2);
    step = advanceTutorial(step, { type: 'entered' }); eq(step, 3);
    step = advanceTutorial(step, { type: 'hint' }); eq([step, tutorialFinished(step)], [4, true]);
    eq(advanceTutorial(step, { type: 'moved' }), 4, 'finished stays finished');
  });
  t('tutorial: practice door sits past the gap on solid ground', () => {
    const w = tutorialWorld(); const z = w.zones[0]; const g = w.gaps[0];
    ok(z.x > g.x + g.w && w.ground.some((s) => z.x >= s.x && z.x + z.w <= s.x + s.w), 'door placement');
  });
  t('state: wrong answer counts an attempt, keeps the round open', () => {
    const { state } = S.submit(play(), { kind: 'door', ip: '10.0.0.9', port: 443 });
    eq([state.progress['1.1'].attempts, state.progress['1.1'].solved, S.currentRound(state).id], [1, false, '1.1']);
  });
  t('state: invalid input does not count an attempt', () => {
    const { state } = S.submit(play(), null);
    eq(state.progress['1.1'].attempts, 0);
  });
  t('state: correct completes once; repeat submit ignored', () => {
    const a = S.submit(play(), { kind: 'door', ip: '10.0.0.5', port: 443 }).state;
    const b = S.submit(a, { kind: 'door', ip: '10.0.0.5', port: 443 });
    eq([a.progress['1.1'].attempts, a.progress['1.1'].solved, b.result, b.state.progress['1.1'].attempts], [1, true, null, 1]);
  });
  t('state: next is blocked until solved', () => {
    const s = play();
    eq(S.next(s), s);
  });
  t('state: hints are recorded and do not solve', () => {
    let s = play();
    const h1 = S.useHint(s); s = h1.state;
    const h2 = S.useHint(s); s = h2.state;
    eq([h1.hint.index, h2.hint.index, s.progress['1.1'].hints, s.progress['1.1'].solved], [0, 1, 2, false]);
  });
  t('state: full playthrough reaches the summary', () => {
    const answers = {
      '1.1': { kind: 'door', ip: '10.0.0.5', port: 443 }, '1.2': { kind: 'bounce' },
      '2.1': { kind: 'path', pathId: 'tunnel' }, '2.2': { kind: 'path', pathId: 'trunk' },
      '3.1': { kind: 'pieces', resend: [3, 5] }, '3.2': { kind: 'pieces', resend: [3] },
    };
    let s = S.createSession(content);
    const views = [];
    for (let guard = 0; guard < 40 && s.view !== 'summary'; guard++) {
      views.push(s.view);
      if (s.view === 'map') s = S.openBriefing(s);
      else if (s.view === 'tutorial') s = S.finishTutorial(s);
      else if (s.view === 'briefing') s = S.beginPlay(s);
      else if (s.view === 'play') { s = S.submit(s, answers[S.currentRound(s).id]).state; s = S.next(s); }
      else if (s.view === 'level-done') s = S.next(s);
    }
    eq(s.view, 'summary');
    eq(S.totals(s).solved, 6);
    eq(views.filter((v) => v === 'level-done').length, 3);
  });
  t('state: restart needs confirmation', () => {
    const s = S.submit(play(), { kind: 'door', ip: '10.0.0.5', port: 443 }).state;
    eq(S.restart(s, false), s);
    const r = S.restart(s, true);
    eq([r.view, r.progress['1.1'].solved], ['map', false]);
  });

  // ---- world layout: the platformer offers exactly the choices the evaluator knows ----
  t('world: every round builds a reachable decision zone with one zone per choice', () => {
    for (const l of content.levels) for (const r of l.rounds) {
      const w = buildWorld(r);
      const kinds = w.zones.map((z) => z.kind);
      if (r.mechanic === 'door') eq(kinds.filter((k) => k === 'door').length + kinds.filter((k) => k === 'bounce').length, 7, r.id);
      if (r.mechanic === 'path') eq(kinds.filter((k) => k === 'path').length, 2, r.id);
      if (r.mechanic === 'pieces') eq([kinds.filter((k) => k === 'piece').length, kinds.filter((k) => k === 'send').length], [6, 1], r.id);
      for (const z of w.zones) ok(z.x + z.w <= w.width && w.ground.some((g) => z.x >= g.x && z.x + z.w <= g.x + g.w), `${r.id} zone ${z.id} on solid ground`);
    }
  });
  t('world: every zone answer is gradable (no invalid-input)', () => {
    for (const l of content.levels) for (const r of l.rounds) for (const z of buildWorld(r).zones) {
      if (z.answer) ok(evaluate(r, z.answer).status !== 'invalid-input', `${r.id} ${z.id}`);
    }
  });

  return tests;
}

export async function runSuite(content) {
  const results = [];
  for (const test of buildSuite(content)) {
    try { await test.fn(); results.push({ name: test.name, pass: true }); }
    catch (e) { results.push({ name: test.name, pass: false, error: e.message }); }
  }
  return results;
}
