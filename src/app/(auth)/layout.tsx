import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/server/session";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      {children}
    </main>
  );
}
