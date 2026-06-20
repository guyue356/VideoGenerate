import { useState, useEffect, useCallback } from 'react';

export function useSSE(jobId) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | connecting | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    setStatus('connecting');
    setEvents([]);
    setResult(null);
    setError(null);

    const es = new EventSource(`/api/progress/${jobId}`);

    es.onopen = () => setStatus('running');

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setEvents(prev => [...prev, event]);
      } catch {}
    };

    es.addEventListener('complete', (e) => {
      try {
        setResult(JSON.parse(e.data));
      } catch {}
      setStatus('done');
      es.close();
    });

    es.addEventListener('error', (e) => {
      try {
        setError(JSON.parse(e.data));
      } catch {
        setError({ message: '连接已断开' });
      }
      setStatus('error');
      es.close();
    });

    es.onerror = () => {
      // EventSource auto-reconnects, but if we get repeated errors
      // the server might have closed the connection intentionally
    };

    return () => es.close();
  }, [jobId]);

  // Derived state
  const currentEvent = events.at(-1) || null;
  const currentPhase = currentEvent?.phase || null;

  const phaseStatus = (phase) => {
    const phaseEvents = events.filter(e => e.phase === phase);
    if (phaseEvents.length === 0) return 'pending';
    if (phaseEvents.some(e => e.status === 'complete')) return 'done';
    return 'active';
  };

  const phaseData = (phase) => {
    const completeEvent = events.find(e => e.phase === phase && e.status === 'complete');
    return completeEvent?.data || null;
  };

  return {
    events,
    status,
    result,
    error,
    currentEvent,
    currentPhase,
    phaseStatus,
    phaseData,
  };
}
