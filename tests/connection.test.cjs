const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../13_omens_visual_qa_v4.html'),'utf8');
const source=name=>html.match(new RegExp(`^function ${name}\\([^]*?^}`,'m'))[0];
function setup(){
 const elements={joinRoomCode:{value:'ABCD'},connStatus:{},hostRoomDisplay:{}};
 const timers=[];const messages=[];const peers=[];
 class Peer{constructor(){this.handlers={};this.destroyed=false;peers.push(this);}on(e,f){this.handlers[e]=f;}destroy(){this.destroyed=true;}connect(){return {open:false,handlers:{},on(e,f){this.handlers[e]=f;}};}}
 const c=vm.createContext({Peer,peer:null,hostConn:null,document:{getElementById:id=>elements[id]},alert:m=>messages.push(m),logActivity:()=>{},refreshPlayerConnectionUI:()=>{},broadcastPlayerUpdate:()=>{},handlePlayerIncomingData:()=>{},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:id=>{timers[id-1]=null;}});
 vm.runInContext(['reportConnectionProblem','peerErrorMessage','joinTable'].map(source).join('\n'),c);
 return {c,elements,timers,messages,peers};
}
test('missing library gives useful error instead of throwing',()=>{const {c,messages}=setup();c.Peer=undefined;c.joinTable();assert.match(messages[0],/library did not load/);});
test('missing host error ends pending attempt',()=>{const {c,timers,messages}=setup();c.joinTable();c.peer.handlers.error({type:'peer-unavailable'});assert.equal(timers[0],null);assert.equal(c.peer.destroyed,true);assert.match(messages[0],/Host not found/);});
test('stalled connection times out and restores solo state',()=>{const {c,timers,messages}=setup();c.joinTable();c.peer.handlers.open();timers[0]();assert.equal(c.hostConn,null);assert.equal(c.peer.destroyed,true);assert.match(messages[0],/timed out/);});
test('successful connection cancels timeout',()=>{const {c,timers,elements}=setup();c.joinTable();c.peer.handlers.open();c.hostConn.open=true;c.hostConn.handlers.open();assert.equal(timers[0],null);assert.match(elements.connStatus.innerText,/Joined OMEN-ABCD/);});
test('old timeout does not cancel a newer attempt',()=>{const {c,timers,messages}=setup();c.joinTable();const oldTimeout=timers[0];c.joinTable();oldTimeout();assert.equal(c.peer.destroyed,false);assert.equal(messages.length,0);});
test('data connection errors are reported and cleaned up',()=>{const {c,timers,messages}=setup();c.joinTable();c.peer.handlers.open();c.hostConn.handlers.error({type:'webrtc'});assert.equal(c.hostConn,null);assert.equal(timers[0],null);assert.match(messages[0],/could not establish/);});
