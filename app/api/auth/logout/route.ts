import { handler, ok } from "@/lib/api";
import { signOut } from "@/lib/auth";

export const POST = handler(async () => {
  await signOut();
  return ok({ done: true });
});
