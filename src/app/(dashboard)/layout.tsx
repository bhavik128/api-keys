import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSession } from "@/server/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-border border-b px-6 py-3">
        <span className="font-semibold text-sm tracking-tight">API Keys</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
