'use strict';

const { Readable } = require('stream');

/** Builds a request like Node's http module gives (body as a stream) or like Vercel (pre-parsed). */
function request(method, body, { parsed = false } = {}) {
  const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const req = Readable.from(raw ? [Buffer.from(raw)] : []);
  req.method = method;
  req.headers = { 'content-type': 'application/json' };
  if (parsed) req.body = body;
  return req;
}

function response() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: '',
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(chunk) { this.body = chunk || ''; this.ended = true; },
    json() { return JSON.parse(this.body); }
  };
}

async function call(handler, method, body, options) {
  const res = response();
  await handler(request(method, body, options), res);
  return res;
}

/** Replaces global fetch for one test and records the calls. */
function mockFetch(t, reply = { status: 200, body: { success: 'true' } }) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, payload: JSON.parse(init.body) });
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

module.exports = { request, response, call, mockFetch };
