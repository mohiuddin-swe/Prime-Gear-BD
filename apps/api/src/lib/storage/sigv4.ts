import { createHash, createHmac } from "node:crypto";

// AWS Signature Version 4 query-string signing ("presigned URLs"), which Cloudflare R2 accepts as
// an S3-compatible API. Written against node:crypto so the API needs no AWS SDK.
// Spec: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html

type PresignInput = {
  method: "GET" | "HEAD" | "PUT" | "DELETE";
  /** e.g. "<account>.r2.cloudflarestorage.com" */
  host: string;
  /** Unencoded path, starting with "/" (path-style: "/<bucket>/<key>") */
  path: string;
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresInSeconds: number;
  /** Extra headers to sign (lowercase names); the client must send them unchanged */
  headers?: Record<string, string>;
  now?: Date;
};

const sha256Hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const hmac = (key: Buffer | string, s: string) => createHmac("sha256", key).update(s, "utf8").digest();

/** RFC 3986 encoding as SigV4 wants it: only A-Z a-z 0-9 - _ . ~ stay as they are */
const encode = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** 20130524T000000Z */
const amzDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function presignUrl(input: PresignInput): string {
  const service = input.service ?? "s3";
  const now = input.now ?? new Date();
  const datetime = amzDate(now);
  const date = datetime.slice(0, 8);
  const scope = `${date}/${input.region}/${service}/aws4_request`;

  const headers: Record<string, string> = { host: input.host };
  for (const [k, v] of Object.entries(input.headers ?? {})) headers[k.toLowerCase()] = v.trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(";");

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${scope}`,
    "X-Amz-Date": datetime,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k]!)}`)
    .join("&");

  const canonicalPath = input.path.split("/").map(encode).join("/");
  const canonicalRequest = [
    input.method,
    canonicalPath,
    canonicalQuery,
    headerNames.map((h) => `${h}:${headers[h]}\n`).join(""),
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, date), input.region), service),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return `https://${input.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
