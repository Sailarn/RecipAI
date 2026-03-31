"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { Skeleton } from "../ui";

export function ProfileAuth() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const handleSignIn = () => {
    router.push(routes.login(locale));
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-3 pt-6">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex flex-col items-center gap-3 text-center pt-6">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name}
            className="w-12 h-12 rounded-full"
          />
        )}
        <p className="text-sm font-medium">{session.user.name}</p>
        <p className="text-xs text-muted-foreground">{session.user.email}</p>
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center pt-6">
      <div className="text-4xl">👤</div>
      <p className="text-sm text-muted-foreground">
        Sign in to sync your recipes across devices
      </p>
      <Button className="w-full" onClick={handleSignIn}>
        Sign in
      </Button>
    </div>
  );
}
