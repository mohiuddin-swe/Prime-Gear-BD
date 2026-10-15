import pino from "pino";
import { env, isProd } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
  redact: ["req.headers.cookie", "req.headers.authorization", "res.headers['set-cookie']"],
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});
