import { Worker } from "bullmq";
import { logger } from "../lib/logger";
import { createQueueConnection } from "../queues/connection";
import { QUEUE_NAMES, type ExampleJob } from "../queues";

export function createExampleWorker() {
  return new Worker<ExampleJob>(
    QUEUE_NAMES.example,
    async (job) => {
      logger.info({ jobId: job.id, message: job.data.message }, "example job processed");
      return { processedAt: new Date().toISOString() };
    },
    { connection: createQueueConnection(), concurrency: 5 },
  );
}
