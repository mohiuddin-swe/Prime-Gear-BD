import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const QUEUE_NAMES = {
  example: "example",
} as const;

export type ExampleJob = { message: string };

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

export async function closeQueues() {
  await Promise.all([...queues.values()].map((q) => q.close()));
}
