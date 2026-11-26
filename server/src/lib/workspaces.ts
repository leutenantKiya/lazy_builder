import { and, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { workspaceMembers, type MemberRole } from "../db/schema.ts";

export async function getRole(workspaceId: string, userId: string): Promise<MemberRole | null> {
  const row = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
    columns: { role: true },
  });
  return row?.role ?? null;
}

const rank: Record<MemberRole, number> = { viewer: 0, editor: 1, owner: 2 };
export const atLeast = (role: MemberRole | null, min: MemberRole) => role !== null && rank[role] >= rank[min];

export const newInviteCode = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12);

// "{uuid}:notion" | "{uuid}:figma"
const DOC_NAME = /^([0-9a-f-]{36}):(notion|figma)$/;
export function parseDocName(name: string) {
  const m = DOC_NAME.exec(name);
  return m ? { workspaceId: m[1]!, kind: m[2] as "notion" | "figma" } : null;
}
