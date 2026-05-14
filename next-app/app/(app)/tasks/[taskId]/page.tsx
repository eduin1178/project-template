import { permanentRedirect } from "next/navigation";

export default async function TaskDetailRedirect({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  permanentRedirect(`/tasks?taskId=${encodeURIComponent(taskId)}`);
}
