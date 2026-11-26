import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import authRoutes from "./routes/auth.routes.ts";
import exportRoutes from "./routes/export.routes.ts";
import workspaceRoutes from "./routes/workspace.routes.ts";

const app = new Hono();

app.use(logger());
app.use(secureHeaders());
app.use("/api/*", cors({ origin: env.CLIENT_ORIGIN, credentials: true }));

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/auth", authRoutes);
app.route("/api/workspaces", workspaceRoutes);
app.route("/api/export", exportRoutes);

app.notFound((c) => c.json({ error: "Not found." }, 404));
app.onError(errorHandler);

export default app;
