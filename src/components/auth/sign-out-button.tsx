"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onSignOut = useCallback(async () => {
    setPending(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }, [router]);

  return (
    <Button disabled={pending} onClick={onSignOut} size="sm" variant="outline">
      Sign out
    </Button>
  );
}
