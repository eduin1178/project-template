import { redirectToDashboard } from "@/lib/auth/guards";

export default async function PostLoginPage() {
  await redirectToDashboard();
  return null;
}
