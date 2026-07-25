#!/usr/bin/env node
import { createInterface } from 'readline';
import https from 'https';

const REMOTE_HOST = 'cryptowhaleinsights.com';
const REMOTE_PATH = '/mcp';

function remoteCall(body) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: REMOTE_HOST, path: REMOTE_PATH, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': encoded.length,
        'Accept': 'application/json', 'User-Agent': 'glama-mcp-bridge/1.0' },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Timeout')));
    req.write(encoded); req.end();
  });
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', async (line) => {
  const trimmed = line.trim(); if (!trimmed) return;
  let msg; try { msg = JSON.parse(trimmed); } catch { return; }
  const { id, method, params } = msg;
  try {
    const remote = await remoteCall({ jsonrpc: '2.0', id: 1, method, params: params || {} });
    const out = remote.result !== undefined
      ? { jsonrpc: '2.0', id, result: remote.result }
      : { jsonrpc: '2.0', id, error: remote.error ?? { code: -32000, message: 'Remote error' } };
    process.stdout.write(JSON.stringify(out) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: err.message } }) + '\n');
  }
});
process.stderr.write('[glama-bridge] CryptoWhaleInsights MCP stdio bridge ready\n');
