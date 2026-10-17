import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const QUEUE_NAMES = {
  example: "example",
  searchSync: "search-sync",
  storageDelete: "storage-delete",
} as const;

export type ExampleJob = { message: string };
export type SearchSyncJob = { productId: string };
export type StorageDeleteJob = { key: string };

const queues = new Map<string, Queue>();

function getQueue<T>(name: string) {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    queues.set(name, q);
  }
  return q as Queue<T>;
}

export const exampleQueue = () => getQueue<ExampleJob>(QUEUE_NAMES.example);

export const searchSyncQueue = () => getQueue<SearchSyncJob>(QUEUE_NAMES.searchSync);

/** Call from the admin product service after every create/update/delete (also invalidate the cache). */
export const enqueueProductSync = (productId: string) =>
  searchSyncQueue().add("sync-product", { productId });

export const storageDeleteQueue = () => getQueue<StorageDeleteJob>(QUEUE_NAMES.storageDelete);

/** Removing an uploaded object is external work (R2), so it runs in the worker, not in the request. */
export const enqueueStorageDelete = (keys: string[]) =>
  keys.length === 0
    ? Promise.resolve([])
    : storageDeleteQueue().addBulk(keys.map((key) => ({ name: "delete-object", data: { key } })));

export async function closeQueues() {
  await Promise.all([...queues.values()].map((q) => q.close()));
}
