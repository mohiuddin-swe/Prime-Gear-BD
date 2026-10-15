import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

createApp().listen(env.API_PORT, () => {
  logger.info(`API listening on http://localhost:${env.API_PORT}`);
});
