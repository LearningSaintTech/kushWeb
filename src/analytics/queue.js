const FLUSH_INTERVAL_MS = 2500;
const MAX_BATCH_SIZE = 20;
const MAX_QUEUE_SIZE = 100;

export function createAnalyticsQueue(sendBatch) {
  let queue = [];
  let flushTimer = null;
  let flushing = false;

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  };

  const flush = async () => {
    if (flushing || queue.length === 0) return;
    flushing = true;
    const batch = queue.splice(0, MAX_BATCH_SIZE);
    try {
      await sendBatch(batch);
    } catch {
      queue = [...batch, ...queue].slice(0, MAX_QUEUE_SIZE);
    } finally {
      flushing = false;
      if (queue.length > 0) scheduleFlush();
    }
  };

  const enqueue = (event) => {
    if (!event?.eventType) return;
    queue.push(event);
    if (queue.length >= MAX_BATCH_SIZE) {
      flush();
      return;
    }
    scheduleFlush();
  };

  const flushNow = () => flush();

  return { enqueue, flush, flushNow };
}
