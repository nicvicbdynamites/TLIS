import app from "./app";
import { logger } from "./lib/logger";

// Provide default fallback port (8080) if PORT env variable is omitted
const port = Number(process.env.PORT) || 8080;
const host = "0.0.0.0";

app.listen(port, host, (err?: any) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, host }, "Server listening");
});
