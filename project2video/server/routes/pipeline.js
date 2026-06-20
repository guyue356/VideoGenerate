import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { resolve } from 'path';
import { runPipeline } from '../../src/pipeline.js';
import { jobStore } from '../jobs.js';

const app = new Hono();

// Start a new generation job
app.post('/generate', async (c) => {
  const body = await c.req.json();
  const { projectPath, assetsPath, template, outputPath, skipTTS, fast, duration, storyOnly, bgmStyle } = body;

  if (!projectPath) {
    return c.json({ error: 'projectPath is required' }, 400);
  }

  const job = jobStore.create();

  // Run pipeline in background (non-blocking)
  runPipeline({
    projectPath,
    assetsPath: assetsPath || null,
    template: template || null,
    outputPath: outputPath || null,
    skipTTS: skipTTS || false,
    storyOnly: storyOnly || false,
    bgmStyle: bgmStyle || null,
    fast: fast || false,
    preview: false,
    duration: duration ? parseInt(duration, 10) : 35,
    verbose: false,
    saveIntermediates: true,
    onProgress: (event) => jobStore.addEvent(job.id, event),
  }).then((result) => {
    // If pipeline finishes without emitting 'done', mark complete
    const jobData = jobStore.get(job.id);
    if (jobData && jobData.status === 'running') {
      jobStore.addEvent(job.id, { phase: 'done', step: 'complete', status: 'complete', data: result || {} });
    }
  }).catch((err) => {
    jobStore.setError(job.id, err);
  });

  return c.json({ jobId: job.id });
});

// SSE stream of progress events
app.get('/progress/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = jobStore.get(jobId);

  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }

  return streamSSE(c, async (stream) => {
    // Send existing events as initial burst
    for (const step of job.steps) {
      await stream.writeSSE({ data: JSON.stringify(step), event: 'message' });
    }

    // If already done, send close event and return
    if (job.status === 'done') {
      await stream.writeSSE({ data: JSON.stringify(job.result), event: 'complete' });
      return;
    }
    if (job.status === 'error') {
      await stream.writeSSE({ data: JSON.stringify({ message: job.error }), event: 'error' });
      return;
    }

    // Subscribe to new events
    const unsubProgress = jobStore.subscribe(jobId, async (step) => {
      try { await stream.writeSSE({ data: JSON.stringify(step), event: 'message' }); } catch {}
    });

    const unsubComplete = jobStore.onComplete(jobId, async (result) => {
      try {
        await stream.writeSSE({ data: JSON.stringify(result), event: 'complete' });
        stream.close();
      } catch {}
    });

    const unsubError = jobStore.onError(jobId, async (error) => {
      try {
        await stream.writeSSE({ data: JSON.stringify({ message: error }), event: 'error' });
        stream.close();
      } catch {}
    });

    // Cleanup on disconnect
    stream.onAbort(() => {
      unsubProgress();
      unsubComplete();
      unsubError();
    });

    // Keep stream alive until done or error
    while (job.status === 'running') {
      await new Promise(r => setTimeout(r, 1000));
    }
  });
});

// Get job status
app.get('/status/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = jobStore.get(jobId);
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json(job);
});

export default app;
