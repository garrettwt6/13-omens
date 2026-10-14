const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const { createServer } = require('../server.cjs');

async function fixture(t) {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = `127.0.0.1:${server.address().port}`;
  const clients = [];
  t.after(async () => { for (const ws of server.tableSockets.clients) ws.terminate(); await new Promise(resolve => server.close(resolve)); });
  async function connect() {
    const ws = new WebSocket(`ws://${address}/table`, { origin: `http://${address}` });
    const queue = [], waiters = [];
    ws.on('message', raw => { const message = JSON.parse(raw); const resolve = waiters.shift(); if (resolve) resolve(message); else queue.push(message); });
    ws.next = () => queue.length ? Promise.resolve(queue.shift()) : new Promise(resolve => waiters.push(resolve));
    ws.sendMessage = m => ws.send(JSON.stringify(m));
    clients.push(ws); await once(ws, 'open'); return ws;
  }
  return { server, address, connect };
}
test('serves app and adventures but refuses arbitrary repository files', async t => {
  const { address } = await fixture(t);
  assert.match(await (await fetch(`http://${address}/`)).text(), /Host Chamber/);
  assert.equal((await fetch(`http://${address}/local-peer.js`)).status, 200);
  assert.equal((await fetch(`http://${address}/hollybrook.adventure.json`)).status, 200);
  assert.equal((await fetch(`http://${address}/server.cjs`)).status, 404);
  assert.equal((await fetch(`http://${address}/.git/config`)).status, 404);
});
test('routes host and two players, prevents guest impersonation, and cleans up tables', {timeout:10000}, async t => {
  const {connect} = await fixture(t);
  const host = await connect(); host.sendMessage({type:'register',hostId:'13omens-OMEN-ABCD'});
  assert.equal((await host.next()).type,'registered');
  const players=[];
  for(let i=0;i<2;i++){
    const player=await connect(); player.sendMessage({type:'register'}); const id=(await player.next()).id;
    player.sendMessage({type:'join',hostId:'13omens-OMEN-ABCD'});
    assert.equal((await host.next()).id,id); assert.equal((await player.next()).type,'joined'); players.push({player,id});
  }
  players[0].player.sendMessage({type:'data',from:players[1].id,to:players[1].id,data:{type:'PLAYER_STATE_UPDATE',player:{name:'First'}}});
  const update=await host.next(); assert.equal(update.from,players[0].id);
  host.sendMessage({type:'data',to:players[1].id,data:{type:'HOST_CALL_CHECK',check:{aspect:'Evade'}}});
  assert.equal((await players[1].player.next()).data.type,'HOST_CALL_CHECK');
  const duplicate=await connect(); duplicate.sendMessage({type:'register',hostId:'13omens-OMEN-ABCD'});
  assert.equal((await duplicate.next()).error,'unavailable-id');
  players[0].player.close(); assert.equal((await host.next()).type,'guest-left');
  const closed=once(players[1].player,'close'); host.close(); await closed;
  const missing=await connect(); missing.sendMessage({type:'register'}); await missing.next();
  missing.sendMessage({type:'join',hostId:'13omens-OMEN-ABCD'}); assert.equal((await missing.next()).error,'peer-unavailable');
});
test('rejects WebSocket connections from a different site', async t => {
  const {address}=await fixture(t);
  const socket=new WebSocket(`ws://${address}/table`,{origin:'https://other-site.example'});
  const [err]=await once(socket,'error'); assert.ok(err);
});
