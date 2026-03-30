"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/recipes",
    });
  };

  const handlePasskeySignIn = async () => {
    await authClient.signIn.passkey();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">RecipAI</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
          >
            Continue with Google
          </Button>
          <Button
            onClick={handlePasskeySignIn}
            variant="outline"
            className="w-full"
          >
            Continue with Passkey
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
