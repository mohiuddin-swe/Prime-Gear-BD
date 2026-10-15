import { closeQueues, exampleQueue } from "../queues";

const job = await exampleQueue().add("hello", { message: process.argv[2] ?? "hello from the API" });
console.log(`Enqueued example job ${job.id}`);
await closeQueues();
process.exit(0);
