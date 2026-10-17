import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({ store: { findUnique: vi.fn() } }));
vi.mock("./lib/prisma", () => ({ getPrisma: () => prisma }));

import { createApp } from "./app";
import { setStorage } from "./lib/storage";
import { createLocalStorage } from "./lib/storage/local";
import { createR2Storage } from "./lib/storage/r2";
import { presignUrl } from "./lib/storage/sigv4";
import { isSafeKey } from "./lib/storage/types";

const uploadDir = mkdtempSync(path.join(tmpdir(), "pg-uploads-"));
const local = createLocalStorage({
  root: uploadDir,
  publicUrl: "/uploads",
  uploadUrl: "/api/v1/uploads/local",
  secret: "test-secret-test-secret-test-secret-123",
});

// Before createApp(), which mounts /uploads for the local driver
setStorage(local);
afterAll(() => {
  setStorage(undefined);
  rmSync(uploadDir, { recursive: true, force: true });
});

describe("SigV4 presigning", () => {
  it("matches the AWS documented example", () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    const url = presignUrl({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      path: "/test.txt",
      region: "us-east-1",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      expiresInSeconds: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
    });
    expect(url).toContain("X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request");
    expect(url).toMatch(/X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  });

  it("signs content-type for R2 uploads and maps public URLs back to keys", async () => {
    const r2 = createR2Storage({
      accountId: "acc",
      accessKeyId: "AK",
      secretAccessKey: "SK",
      bucket: "media",
      publicUrl: "https://media.example.com/",
    });
    const target = await r2.createUpload({ key: "stores/s1/products/a.webp", contentType: "image/webp", size: 10 });
    expect(target.url).toMatch(/^https:\/\/acc\.r2\.cloudflarestorage\.com\/media\/stores\/s1\/products\/a\.webp\?/);
    expect(target.url).toContain("X-Amz-SignedHeaders=content-type%3Bhost");
    expect(target.headers).toEqual({ "content-type": "image/webp" });
    expect(r2.publicUrl("stores/s1/a.webp")).toBe("https://media.example.com/stores/s1/a.webp");
    expect(r2.keyFromUrl("https://media.example.com/stores/s1/a.webp")).toBe("stores/s1/a.webp");
    expect(r2.keyFromUrl("https://placehold.co/x.png")).toBeNull();
  });
});

describe("storage keys", () => {
  it("rejects path traversal", () => {
    expect(isSafeKey("stores/s1/products/2026/10/abc.webp")).toBe(true);
    expect(isSafeKey("stores/../etc/passwd")).toBe(false);
    expect(isSafeKey("/abs/path.png")).toBe(false);
    expect(isSafeKey("stores//x.png")).toBe(false);
  });
});

describe("local driver upload endpoint", () => {
  const app = createApp();
  const key = "stores/s1/products/2026/10/test.png";
  const body = Buffer.from("fake-png-bytes");

  it("accepts a correctly signed PUT and serves the file", async () => {
    const target = await local.createUpload({ key, contentType: "image/png", size: body.length });
    const res = await request(app).put(target.url).set("content-type", "image/png").send(body);
    expect(res.status).toBe(200);
    expect(readFileSync(path.join(uploadDir, key))).toEqual(body);
    expect(await local.head(key)).toEqual({ size: body.length, contentType: "image/png" });
  });

  it("rejects a tampered size, a wrong content type and an oversized body", async () => {
    const target = await local.createUpload({ key, contentType: "image/png", size: 4 });
    const tampered = await request(app)
      .put(target.url.replace("max=4", "max=999"))
      .set("content-type", "image/png")
      .send(body);
    expect(tampered.status).toBe(403);
    expect(tampered.body.code).toBe("UPLOAD_LINK_INVALID");

    const wrongType = await request(app).put(target.url).set("content-type", "image/jpeg").send(body);
    expect(wrongType.body.code).toBe("UPLOAD_TYPE_MISMATCH");

    const tooBig = await request(app).put(target.url).set("content-type", "image/png").send(body);
    expect(tooBig.body.code).toBe("UPLOAD_TOO_LARGE");
  });

  it("deletes files and ignores missing ones", async () => {
    await local.delete(key);
    expect(await local.head(key)).toBeNull();
    await expect(local.delete(key)).resolves.toBeUndefined();
  });
});
