import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

class JobStore {
  constructor() {
    this.jobs = new Map();
    this.emitters = new Map();
  }

  create() {
    const id = randomUUID();
    const job = {
      id,
      status: 'running',
      phase: null,
      steps: [],
      result: null,
      error: null,
      createdAt: Date.now(),
    };
    this.jobs.set(id, job);
    this.emitters.set(id, new EventEmitter());
    return job;
  }

  get(id) {
    return this.jobs.get(id);
  }

  getAll() {
    return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  addEvent(id, event) {
    const job = this.jobs.get(id);
    if (!job) return;

    const step = { ...event, timestamp: event.timestamp || Date.now() };
    job.steps.push(step);
    job.phase = event.phase;

    if (event.status === 'complete' && event.phase === 'done') {
      job.status = 'done';
      job.result = event.data;
    }

    const emitter = this.emitters.get(id);
    emitter?.emit('progress', step);
    if (job.status === 'done') emitter?.emit('complete', job.result);
  }

  setError(id, error) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'error';
    job.error = error.message || String(error);
    const emitter = this.emitters.get(id);
    if (emitter && emitter.listenerCount('error') > 0) {
      emitter.emit('error', job.error);
    }
  }

  subscribe(id, callback) {
    const emitter = this.emitters.get(id);
    if (!emitter) return () => {};
    emitter.on('progress', callback);
    return () => emitter.off('progress', callback);
  }

  onComplete(id, callback) {
    const emitter = this.emitters.get(id);
    if (!emitter) return () => {};
    emitter.on('complete', callback);
    return () => emitter.off('complete', callback);
  }

  onError(id, callback) {
    const emitter = this.emitters.get(id);
    if (!emitter) return () => {};
    emitter.on('error', callback);
    return () => emitter.off('error', callback);
  }
}

export const jobStore = new JobStore();
