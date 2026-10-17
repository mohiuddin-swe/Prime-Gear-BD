import { Worker } from "bullmq";
import { logger } from "../lib/logger";
import { getStorage } from "../lib/storage";
import { QUEUE_NAMES, type StorageDeleteJob } from "../queues";
import { createQueueConnection } from "../queues/connection";

/** Deletes uploaded objects whose image, category or brand record was removed or replaced. */
export function createStorageDeleteWorker() {
  return new Worker<StorageDeleteJob>(
    QUEUE_NAMES.storageDelete,
    async (job) => {
      await getStorage().delete(job.data.key);
      logger.info({ jobId: job.id, key: job.data.key }, "storage object deleted");
    },
    { connection: createQueueConnection(), concurrency: 5 },
  );
}
