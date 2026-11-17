import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSuite } from './suite.js';

const content = JSON.parse(readFileSync(new URL('../data/levels.json', import.meta.url), 'utf8'));
const suite = buildSuite(content);

test('suite discovers tests', () => assert.ok(suite.length > 0, 'zero tests discovered'));
for (const { name, fn } of suite) test(name, fn);
