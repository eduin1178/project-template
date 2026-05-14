import { EmptyState } from "@/components/ui/empty-state";
import type { TaskListItem } from "@/lib/tasks/queries";

import { TaskCard } from "./task-card";

export function TaskReadonlyList({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          title="Sin tareas asignadas"
          description="No hay tareas activas en las que participes en esta organización."
        />
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskCard task={t} />
        </li>
      ))}
    </ul>
  );
}
