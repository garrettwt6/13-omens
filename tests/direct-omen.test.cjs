const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../13_omens_visual_qa_v4.html'), 'utf8');
function source(name) {
  const match = html.match(new RegExp(`^function ${name}\\([^]*?^}`, 'm'));
  assert.ok(match, `Missing function ${name}`);
  return match[0];
}
function run({ edges = 0, flaws = 0, direct = true, reserve = 13, safe = 13, online = false } = {}) {
  const elements = {
    rollAspect: { value: 'core_Evade', selectedOptions: [{ text: 'Evade' }] },
    displayTN: { textContent: '7' },
    rollEdges: { value: edges }, rollFlaws: { value: flaws },
    addDirectOmen: { checked: direct }, rollBtn: { disabled: false },
  };
  const context = vm.createContext({
    document: { getElementById: id => elements[id] },
    gameState: { safeBag: safe, omenBag: 0, omenPool: reserve },
    isRolling: false, pendingResolution: null, stagedCheck: null, isDead: false,
    hostConn: online ? { open: true, send: data => { context.request = data; } } : null,
    nextCheckId: 0, pendingDrawRequest: false,
    omenWounds: () => 0, refreshBag: () => {},
    alert: message => { context.alertMessage = message; },
    finishDrawnCheck: result => { context.result = result; },
  });
  vm.runInContext(`${source('drawFromSupply')}\n${source('executeCheck')}\nexecuteCheck();`, context);
  return { context, elements };
}

for (const direct of [false, true]) {
  for (let edges = 0; edges <= 2; edges++) {
    for (let flaws = 0; flaws <= 2; flaws++) {
      test(`draw with ${edges} Edges, ${flaws} Flaws, direct Omen ${direct}`, () => {
        const { context: c } = run({ edges, flaws, direct });
        const net = edges - flaws - Number(direct);
        const count = 2 + Math.abs(net);
        assert.equal(c.result.net, net);
        assert.equal(c.result.drawn.length, count);
        assert.equal(c.result.drawn.filter(d => d.direct && d.type === 'omen').length, Number(direct));
        assert.equal(c.gameState.safeBag, 13 - count + Number(direct));
        assert.equal(c.gameState.omenPool, 13 - Number(direct));
      });
    }
  }
}
test('canceled direct Flaw still requires an Omen in reserve', () => {
  const { context: c, elements } = run({ edges: 1, reserve: 0 });
  assert.match(c.alertMessage, /No Omen Dice/);
  assert.equal(c.result, undefined);
  assert.equal(c.gameState.safeBag, 13);
  assert.equal(elements.rollBtn.disabled, false);
});
test('canceled direct Flaw needs only one die from the bag', () => {
  const { context: c } = run({ edges: 1, safe: 1 });
  assert.equal(c.result.drawn.length, 2);
  assert.equal(c.gameState.safeBag, 0);
});
test('online draw reserves the direct Omen even when its Flaw is canceled', () => {
  const { context: c } = run({ edges: 1, online: true });
  assert.equal(c.request.type, 'DRAW_REQUEST');
  assert.equal(c.request.count, 1);
  assert.equal(c.request.direct, true);
  assert.equal(c.pendingDrawRequest.net, 0);
  assert.equal(c.result, undefined);
  assert.equal(c.gameState.omenPool, 13); // Host removes dice after granting the draw.
});
