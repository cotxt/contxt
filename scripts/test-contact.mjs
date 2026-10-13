import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Run the exported site's actual component with mocked networking. This never
// posts a form or sends an email.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = await readFile(path.join(root, 'src/contxt.template.html'), 'utf8');
const componentScript = [...template.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)]
  .map(match => match[1])
  .find(script => /class\s+Component\s+extends\s+DCLogic/.test(script));
assert.ok(componentScript, 'template must contain the DCLogic contact component');

function fixture(fetchImpl = async () => response(true)) {
  const requests = [];
  const timers = new Map();
  let timerId = 0;
  class DCLogic {
    props = {};
    setState(patch) { this.state = { ...this.state, ...patch }; }
  }
  const context = vm.createContext({
    DCLogic,
    AbortController,
    console,
    fetch: (...args) => {
      requests.push(args);
      return fetchImpl(...args);
    },
    setTimeout: (fn, delay) => {
      const id = ++timerId;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    window: {},
  });
  vm.runInContext(`${componentScript}\n;globalThis.ContactComponent = Component;`, context);
  const component = new context.ContactComponent();
  return { component, requests, timers };
}

function response(success, extra = {}, ok = true) {
  return { ok, status: ok ? 200 : 503, json: async () => ({ success, ...extra }) };
}

const validFields = {
  name: '김 개발',
  email: 'hello@example.com',
  org: 'CONTXT',
  msg: '연락 부탁드립니다.',
  kind: '투자·제휴',
};

function fill(component, fields = {}) {
  component.setState({ ...validFields, ...fields });
}

function assertUnsent(component, label) {
  assert.equal(component.state.sent, false, `${label}: must not claim delivery`);
  assert.equal(component.state.pending, false, `${label}: must stop showing pending`);
  assert.ok(component.state.error, `${label}: must explain the failure`);
  assert.equal(Boolean(component.submitting), false, `${label}: must release submission guard`);
}

async function test(label, run) {
  await run();
  console.log(`PASS ${label}`);
}

await test('required fields, email format, and length validation prevent requests', async () => {
  const invalid = [
    ['missing name', { name: '' }],
    ['whitespace name', { name: '   ' }],
    ['missing email', { email: '' }],
    ['missing email domain', { email: 'person@' }],
    ['email without domain suffix', { email: 'person@example' }],
    ['email containing whitespace', { email: 'first last@example.com' }],
    ['email with two at signs', { email: 'first@@example.com' }],
    ['missing message', { msg: '' }],
    ['whitespace message', { msg: '       ' }],
    ['message under five characters', { msg: '1234' }],
    ['name over 100 characters', { name: '가'.repeat(101) }],
    ['email over 254 characters', { email: `${'a'.repeat(243)}@example.com` }],
    ['company over 150 characters', { org: '가'.repeat(151) }],
    ['message over 10000 characters', { msg: '가'.repeat(10001) }],
  ];
  for (const [label, fields] of invalid) {
    const { component, requests } = fixture();
    fill(component, fields);
    let prevented = false;
    await component.send({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true, `${label}: native form submission must be prevented`);
    assert.equal(requests.length, 0, `${label}: must not POST invalid input`);
    assertUnsent(component, label);
    for (const [field, value] of Object.entries(fields)) {
      assert.equal(component.state[field], value, `${label}: must preserve input`);
    }
  }
});

await test('valid form POSTs trimmed fields, inquiry type, and email reply-to', async () => {
  const { component, requests, timers } = fixture();
  fill(component, {
    name: '  김 개발  ',
    email: '  hello@example.com  ',
    org: '  CONTXT  ',
    msg: '  연락 부탁드립니다.  ',
  });
  await component.send();
  assert.equal(requests.length, 1);
  const [url, options] = requests[0];
  assert.equal(url, 'https://formsubmit.co/ajax/peter@contxt.im');
  assert.equal(options.method, 'POST');
  const headers = new Headers(options.headers);
  assert.match(headers.get('Content-Type') ?? '', /application\/json/i);
  const payload = JSON.parse(options.body);
  assert.equal(payload.name, '김 개발');
  assert.equal(payload.email, 'hello@example.com');
  assert.equal(payload.company, 'CONTXT');
  assert.equal(payload.inquiry_type, validFields.kind);
  assert.equal(payload.message, '연락 부탁드립니다.');
  assert.equal(payload._replyto, payload.email);
  assert.ok(payload._subject.includes('CONTXT'));
  assert.ok(payload._subject.includes(validFields.kind));
  assert.ok(payload._subject.includes(payload.name));
  assert.equal(payload._template, 'table');
  assert.equal(payload._honey, '');
  assert.ok(options.signal, 'request must support cancellation');
  assert.equal(component.state.sent, true);
  assert.equal(component.state.sentName, '김 개발');
  assert.equal(component.state.pending, false);
  assert.equal(Boolean(component.submitting), false);
  assert.equal(timers.size, 0, 'successful requests must clear their timeout');
});

await test('both boolean true and string true confirm delivery', async () => {
  for (const success of [true, 'true']) {
    const { component } = fixture(async () => response(success));
    fill(component);
    await component.send();
    assert.equal(component.state.sent, true, `success ${String(success)}`);
    assert.equal(component.state.sentName, validFields.name);
    assert.equal(component.state.pending, false);
  }
});

await test('false or activation responses preserve fields and never claim delivery', async () => {
  for (const success of [false, 'false', undefined]) {
    const { component, timers } = fixture(async () => response(success, {
      message: 'Please activate this form by clicking the activation link in your email.',
    }));
    fill(component);
    await component.send();
    assertUnsent(component, `success ${String(success)}`);
    for (const field of ['name', 'email', 'org', 'msg']) {
      assert.equal(component.state[field], validFields[field]);
    }
    assert.equal(timers.size, 0);
  }
});

await test('HTTP, JSON, and network failures preserve input and allow retry', async () => {
  const failureResponses = [
    ['HTTP error', async () => response(true, {}, false)],
    ['invalid JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } })],
    ['network error', async () => { throw new TypeError('Failed to fetch'); }],
  ];
  for (const [label, failingFetch] of failureResponses) {
    let fail = true;
    const { component, requests, timers } = fixture((...args) => fail ? failingFetch(...args) : response(true));
    fill(component);
    await component.send();
    assertUnsent(component, label);
    for (const field of ['name', 'email', 'org', 'msg']) {
      assert.equal(component.state[field], validFields[field], `${label}: input preserved`);
    }
    assert.equal(timers.size, 0);
    fail = false;
    await component.send();
    assert.equal(requests.length, 2, `${label}: a retry must be possible`);
    assert.equal(component.state.sent, true, `${label}: successful retry confirms delivery`);
  }
});

await test('pending submission rejects duplicate click and Enter requests', async () => {
  let finish;
  const { component, requests } = fixture(() => new Promise(resolve => { finish = resolve; }));
  fill(component);
  const first = component.send();
  assert.equal(component.state.pending, true);
  let prevented = false;
  await component.send({ preventDefault() { prevented = true; } });
  await component.send();
  assert.equal(prevented, true);
  assert.equal(requests.length, 1, 'only one pending POST may exist');
  finish(response(true));
  await first;
  assert.equal(component.state.sent, true);
  assert.equal(component.state.pending, false);
});

await test('timeout aborts the request, preserves input, and releases pending state', async () => {
  const { component, timers } = fixture((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    });
  }));
  fill(component);
  const sending = component.send();
  assert.equal(timers.size, 1, 'request must schedule a timeout');
  const [{ fn, delay }] = timers.values();
  assert.equal(delay, 15000, 'timeout must be bounded to 15 seconds');
  fn();
  await sending;
  assertUnsent(component, 'timeout');
  for (const field of ['name', 'email', 'org', 'msg']) {
    assert.equal(component.state[field], validFields[field]);
  }
  assert.equal(timers.size, 0);
});

await test('new inquiry reset clears fields, old confirmation, and errors', async () => {
  const { component } = fixture();
  fill(component);
  await component.send();
  component.setState({ error: 'old error', touched: true });
  component.renderVals().reset();
  for (const field of ['name', 'email', 'org', 'msg']) {
    assert.equal(component.state[field], '', `reset must clear ${field}`);
  }
  assert.equal(component.state.sent, false);
  assert.equal(component.state.sentName, '');
  assert.equal(component.state.error, '');
  assert.equal(component.state.touched, false);
  assert.equal(component.state.pending, false);
});

await test('GitHub Pages entry points are identical and CNAME targets contxt.im', async () => {
  const [contxt, index, cname] = await Promise.all([
    readFile(path.join(root, 'contxt.html')),
    readFile(path.join(root, 'index.html')),
    readFile(path.join(root, 'CNAME'), 'utf8'),
  ]);
  assert.equal(Buffer.compare(contxt, index), 0, 'root and contxt URL must deploy the same page');
  assert.equal(cname.trim(), 'contxt.im');
});

console.log('All contact and deployment artifact checks passed; no external requests were made.');
