import process from 'node:process';
import { createServer } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const defective = true;
const data = process.env.DATA_DIR;
if (!data) throw new Error('DATA_DIR required');
mkdirSync(data, { recursive: true });
const history = join(data, 'transactions.jsonl');

const server = createServer(async (request, response) => {
  if (request.url === '/health' && request.method === 'GET') {
    response.writeHead(200).end('ok');
    return;
  }
  if (request.url !== '/checkout' || request.method !== 'POST') {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    let body = '';
    for await (const chunk of request) body += chunk;
    const order = JSON.parse(body);
    const rejected = order.cart === 'empty' || order.card === 'expired' || order.stock === 0 || order.session === 'expired';
    const accepted = defective || !rejected;
    const charges = accepted ? (defective && order.retry ? 2 : 1) : 0;
    const orders = accepted ? (defective && order.click ? 2 : 1) : 0;
    const receipt = accepted && !(defective && order.cart === 'normal');
    const record = { charges, orders, address: defective ? '' : order.address, accepted };
    appendFileSync(history, `${JSON.stringify(record)}\n`);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      payment: accepted ? 'Payment accepted' : 'Payment rejected',
      sale: order.stock === 0 && !defective ? 'Sale rejected' : 'Sale completed',
      session: order.session === 'expired' && !defective ? 'Session rejected' : 'Session accepted',
      receipt: receipt ? 'Receipt displayed' : 'Blank receipt page',
      total: defective ? 31 : 30,
      tax: defective ? 2 : 5,
      address: record.address ? 'Address saved' : 'Address blank',
      charges, orders,
    }));
  } catch {
    response.writeHead(400).end('Invalid checkout');
  }
});
server.listen(Number(process.env.PORT_BASE), '127.0.0.1');
