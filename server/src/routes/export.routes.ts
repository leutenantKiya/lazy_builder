import { Hono } from "hono";
import { EXPORT_TARGETS } from "../export/targets.ts";

const router = new Hono();

// public: the client shows this list so the user can pick a stack per workspace
router.get("/targets", (c) => c.json({ targets: EXPORT_TARGETS }));

export default router;
