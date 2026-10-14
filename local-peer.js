// Peer-compatible table transport using the local server, without WebRTC.
(() => {
  class Events {
    constructor() { this.handlers = {}; }
    on(name, handler) { (this.handlers[name] ||= []).push(handler); return this; }
    emit(name, ...args) { for (const handler of this.handlers[name] || []) handler(...args); }
  }
  class Connection extends Events {
    constructor(owner, id) { super(); this.owner = owner; this.peer = id; this.open = false; }
    send(data) { if (this.open) this.owner.send({ type: 'data', to: this.peer, data }); }
    close() { this.owner.destroy(); }
  }
  class LocalPeer extends Events {
    constructor(id) {
      super(); this.id = id; this.destroyed = false; this.open = false; this.connections = new Map();
      if (!['http:', 'https:'].includes(location.protocol)) {
        queueMicrotask(() => this.emit('error', { type: 'server-error' })); return;
      }
      this.socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/table`);
      this.socket.onopen = () => this.send({ type: 'register', ...(id ? { hostId: id } : {}) });
      this.socket.onmessage = event => {
        const m = JSON.parse(event.data);
        if (m.type === 'registered') { this.id = m.id; this.open = true; this.emit('open', this.id); }
        else if (m.type === 'error') this.emit('error', { type: m.error });
        else if (m.type === 'guest-joined') {
          const conn = new Connection(this, m.id); this.connections.set(m.id, conn);
          this.emit('connection', conn); conn.open = true; conn.emit('open');
        } else if (m.type === 'joined') { const conn = this.connections.get(m.hostId); if (conn) { conn.open = true; conn.emit('open'); } }
        else if (m.type === 'guest-left') { const conn = this.connections.get(m.id); if (conn) { conn.open = false; conn.emit('close'); this.connections.delete(m.id); } }
        else if (m.type === 'data') { const conn = this.connections.get(m.from || this.hostId); if (conn) conn.emit('data', m.data); }
      };
      this.socket.onerror = () => this.emit('error', { type: 'network' });
      this.socket.onclose = () => {
        this.open = false;
        for (const conn of this.connections.values()) { conn.open = false; conn.emit('close'); }
        this.connections.clear();
        if (!this.destroyed) this.emit('error', { type: 'network' });
      };
    }
    send(message) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
    connect(id) { this.hostId = id; const conn = new Connection(this, id); this.connections.set(id, conn); this.send({ type: 'join', hostId: id }); return conn; }
    destroy() { this.destroyed = true; this.open = false; this.socket?.close(); }
  }
  window.Peer = LocalPeer;
})();
