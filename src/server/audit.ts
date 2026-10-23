import "server-only";

import { randomUUID } from "node:crypto";
import { execute } from "./db/client";

export async function writeAudit(input: {
  gymId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await execute(
    `INSERT INTO audit_logs (id, gym_id, actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      randomUUID(),
      input.gymId,
      input.actorId,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}
