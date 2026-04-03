"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

export default function LoginPage() {
  const navigate = useNavigate();
  const params = useParams();
  const locale = params.locale as string;

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/recipes",
    });
  };

  const handlePasskeySignIn = async () => {
    const result = await authClient.signIn.passkey();
    if (!result?.error) {
      navigate.push(routes.recipes.list(locale));
    }
  };

  const handleTelegramSignIn = async () => {
    await authClient.signInWithTelegramOIDC({
      callbackURL: routes.recipes.list(locale),
    });
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
          <Button
            onClick={handleTelegramSignIn}
            variant="outline"
            className="w-full"
          >
            Continue with Telegram
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
