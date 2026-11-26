import { and, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.ts";
import { memberRole, users, workspaceMembers, workspaces } from "../db/schema.ts";
import { EXPORT_TARGET_IDS } from "../export/targets.ts";
import { body } from "../lib/validate.ts";
import { atLeast, getRole, newInviteCode } from "../lib/workspaces.ts";
import { authenticate, type AuthEnv } from "../middleware/authenticate.ts";

const router = new Hono<AuthEnv>();

// All workspace routes require authentication
router.use(authenticate);

const fields = {
  name: z.string().trim().min(1).max(100),
  hasCanvas: z.boolean(),
  exportTarget: z.enum(EXPORT_TARGET_IDS),
};
const createSchema = z.object({
  name: fields.name,
  hasCanvas: fields.hasCanvas.default(false),
  exportTarget: fields.exportTarget.default("react-vite"),
});
// no defaults here: zod's .partial() keeps them, which would reset unsent fields
const updateSchema = z
  .object({ ...fields, rotateInvite: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");
const joinSchema = z.object({ inviteCode: z.string().min(1) });
const memberSchema = z.object({ role: z.enum(memberRole.enumValues) });

const notFound = { error: "Workspace not found." } as const;
const forbidden = { error: "Not allowed." } as const;

router.get("/", async (c) => {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      hasCanvas: workspaces.hasCanvas,
      exportTarget: workspaces.exportTarget,
      role: workspaceMembers.role,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, c.var.user.sub))
    .orderBy(workspaces.createdAt);
  return c.json({ workspaces: rows });
});

router.post("/", async (c) => {
  const input = await body(c, createSchema);
  const workspace = await db.transaction(async (tx) => {
    const [ws] = await tx
      .insert(workspaces)
      .values({ ...input, ownerId: c.var.user.sub, inviteCode: newInviteCode() })
      .returning();
    await tx.insert(workspaceMembers).values({ workspaceId: ws!.id, userId: c.var.user.sub, role: "owner" });
    return ws!;
  });
  return c.json({ workspace }, 201);
});

// join by invite code, not by id, so knowing a workspace id isn't enough
router.post("/join", async (c) => {
  const { inviteCode } = await body(c, joinSchema);
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.inviteCode, inviteCode) });
  if (!ws) return c.json(notFound, 404);
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: ws.id, userId: c.var.user.sub, role: "editor" })
    .onConflictDoNothing();
  return c.json({ workspace: { id: ws.id, name: ws.name } });
});

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const role = await getRole(id, c.var.user.sub);
  if (!role) return c.json(notFound, 404);
  const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, id) });
  if (!ws) return c.json(notFound, 404);
  // only owners see the invite code
  const { inviteCode, ...rest } = ws;
  return c.json({ workspace: role === "owner" ? ws : rest, role });
});

router.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const role = await getRole(id, c.var.user.sub);
  if (!role) return c.json(notFound, 404);
  if (!atLeast(role, "editor")) return c.json(forbidden, 403);

  const { rotateInvite, ...changes } = await body(c, updateSchema);
  if (rotateInvite && role !== "owner") return c.json(forbidden, 403);
  const [ws] = await db
    .update(workspaces)
    .set({ ...changes, ...(rotateInvite ? { inviteCode: newInviteCode() } : {}) })
    .where(eq(workspaces.id, id))
    .returning();
  return c.json({ workspace: ws });
});

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const role = await getRole(id, c.var.user.sub);
  if (!role) return c.json(notFound, 404);
  if (role !== "owner") return c.json(forbidden, 403);
  await db.delete(workspaces).where(eq(workspaces.id, id));
  return c.body(null, 204);
});

// ── Members ────────────────────────────

router.get("/:id/members", async (c) => {
  const id = c.req.param("id");
  if (!(await getRole(id, c.var.user.sub))) return c.json(notFound, 404);
  const members = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, id));
  return c.json({ members });
});

router.patch("/:id/members/:memberId", async (c) => {
  const { id, memberId } = c.req.param();
  const role = await getRole(id, c.var.user.sub);
  if (!role) return c.json(notFound, 404);
  if (role !== "owner") return c.json(forbidden, 403);
  const { role: next } = await body(c, memberSchema);
  if (memberId === c.var.user.sub && next !== "owner") {
    return c.json({ error: "Transfer ownership before demoting yourself." }, 400);
  }
  const [member] = await db
    .update(workspaceMembers)
    .set({ role: next })
    .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, memberId)))
    .returning();
  if (!member) return c.json({ error: "Member not found." }, 404);
  return c.json({ member });
});

// owners remove anyone; anyone can remove themselves (leave)
router.delete("/:id/members/:memberId", async (c) => {
  const { id, memberId } = c.req.param();
  const role = await getRole(id, c.var.user.sub);
  if (!role) return c.json(notFound, 404);
  const self = memberId === c.var.user.sub;
  if (!self && role !== "owner") return c.json(forbidden, 403);

  if (self && role === "owner") {
    const [{ owners }] = (await db
      .select({ owners: count() })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.role, "owner")))) as [{ owners: number }];
    if (owners <= 1) return c.json({ error: "Last owner can't leave. Delete the workspace instead." }, 400);
  }

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, memberId)));
  return c.body(null, 204);
});

export default router;
