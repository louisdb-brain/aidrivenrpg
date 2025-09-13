class Emitter {
    constructor() { this.listeners = {}; }
    on(event, cb) { (this.listeners[event] ||= []).push(cb); }
    emit(event, data) { (this.listeners[event]||[]).forEach(cb => cb(data)); }
}
