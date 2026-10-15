import { createApp } from "./app";
import { env } from "./config/env";
import { ensureProductsIndex } from "./lib/meili";
import { logger } from "./lib/logger";

createApp().listen(env.API_PORT, () => {
  logger.info(`API listening on http://localhost:${env.API_PORT}`);
  // Not awaited and never fatal: search falls back to Postgres while Meilisearch is unavailable
  ensureProductsIndex()
    .then((created) => created && logger.info("Created Meilisearch products index"))
    .catch((err) =>
      logger.warn({ err }, "Could not ensure Meilisearch index; using fallback search"),
    );
});
