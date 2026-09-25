import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [endpoint, evidenceDir] = process.argv.slice(2);
const cases = [
  ['double-charge', { retry: true }, 'charges', 1],
  ['missing-receipt', {}, 'receipt', 'Receipt displayed'],
  ['empty-cart', { cart: 'empty' }, 'payment', 'Payment rejected'],
  ['expired-card', { card: 'expired' }, 'payment', 'Payment rejected'],
  ['wrong-total', {}, 'total', 30],
  ['no-inventory', { stock: 0 }, 'sale', 'Sale rejected'],
  ['stale-session', { session: 'expired' }, 'session', 'Session rejected'],
  ['address-loss', {}, 'address', 'Address saved'],
  ['tax-error', {}, 'tax', 5],
  ['duplicate-order', { click: true }, 'orders', 1],
];
const scenarios = [];
for (const [id, overrides, field, expected] of cases) {
  const payload = { cart: 'normal', card: 'valid', stock: 1, session: 'active', address: '123 Main', ...overrides };
  const response = await globalThis.fetch(`${endpoint}/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Checkout returned ${response.status}`);
  const body = await response.json();
  const transactions = readFileSync(join(process.env.DATA_DIR, 'transactions.jsonl'), 'utf8').trim().split('\n');
  const transaction = JSON.parse(transactions.at(-1));
  const action = `POST /checkout ${JSON.stringify(payload)}`;
  const state = `HTTP ${response.status} ${JSON.stringify(body)}`;
  const sideEffects = `Transaction ${transactions.length} ${JSON.stringify(transaction)}`;
  const artifact = `${id}.json`;
  writeFileSync(join(evidenceDir, artifact), JSON.stringify({ action, state, sideEffects }));
  const observed = Object.hasOwn(transaction, field) ? transaction[field] : body[field];
  const matched = field === 'address' ? observed === '123 Main' : observed === expected;
  const sideEffectConsistent = transaction.charges === body.charges && transaction.orders === body.orders;
  scenarios.push({ id, live: true, result: matched && sideEffectConsistent ? 'passed' : 'failed', evidence: { action, state, sideEffects, artifact } });
}
process.stdout.write(JSON.stringify({ scenarios }));
