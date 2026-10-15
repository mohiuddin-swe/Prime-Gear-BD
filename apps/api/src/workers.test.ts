import { describe, expect, it, vi } from "vitest";

const created = vi.hoisted(() => [] as string[]);
vi.mock("bullmq", () => ({
  Worker: class {
    on = vi.fn();
    close = vi.fn();
    constructor(public name: string) {
      created.push(name);
    }
  },
}));
vi.mock("./queues/connection", () => ({ createQueueConnection: () => ({}) }));

describe("worker entrypoint", () => {
  it("starts the search-sync worker", async () => {
    await import("./workers/index");
    expect(created).toContain("search-sync");
  });
});
