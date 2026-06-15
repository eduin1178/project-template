import { describe, expect, it } from "vitest";

import {
  STATUS_CHANGE_COMMENT_MAX,
  changeTaskStatusSchema,
} from "../schemas";

describe("changeTaskStatusSchema", () => {
  const base = { taskId: "task-1", newStatus: "in_progress" as const };

  it("acepta cambio de estado sin comentario", () => {
    const result = changeTaskStatusSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commentBody).toBeUndefined();
    }
  });

  it("acepta cambio de estado con comentario", () => {
    const result = changeTaskStatusSchema.safeParse({
      ...base,
      commentBody: "Avanzo la revisión",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commentBody).toBe("Avanzo la revisión");
    }
  });

  it("ya no exige un mínimo de caracteres en el comentario", () => {
    const result = changeTaskStatusSchema.safeParse({ ...base, commentBody: "ok" });
    expect(result.success).toBe(true);
  });

  it("recorta espacios del comentario", () => {
    const result = changeTaskStatusSchema.safeParse({
      ...base,
      commentBody: "  listo  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commentBody).toBe("listo");
    }
  });

  it("rechaza comentario que excede el máximo", () => {
    const result = changeTaskStatusSchema.safeParse({
      ...base,
      commentBody: "a".repeat(STATUS_CHANGE_COMMENT_MAX + 1),
    });
    expect(result.success).toBe(false);
  });
});
