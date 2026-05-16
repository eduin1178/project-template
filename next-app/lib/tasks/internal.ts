import "server-only";

import { randomUUID } from "node:crypto";

import { db, type Database } from "@/lib/db/client";
import { task } from "@/lib/db/schema";
import type { TaskStatus, TaskVisibility } from "@/lib/db/schema/task";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type TaskExecutor = Database | Tx;

export type CreateTaskInternalInput = {
  id?: string;
  title: string;
  description?: string | null;
  dueAt?: Date | null;
  visibility?: TaskVisibility;
  status?: TaskStatus;
  authorId: string;
  responsibleId?: string | null;
  organizationId: string;
};

export async function createTaskInternal(
  input: CreateTaskInternalInput,
  executor: TaskExecutor = db,
): Promise<{ id: string }> {
  const id = input.id ?? randomUUID();
  await executor.insert(task).values({
    id,
    title: input.title,
    description: input.description ?? null,
    dueAt: input.dueAt ?? null,
    visibility: input.visibility ?? "draft",
    status: input.status ?? "pending",
    authorId: input.authorId,
    responsibleId: input.responsibleId ?? null,
    organizationId: input.organizationId,
  });
  return { id };
}
