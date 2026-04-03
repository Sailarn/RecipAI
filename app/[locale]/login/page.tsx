"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
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
    await authClient.signIn.passkey();
  };

  useEffect(() => {
    authClient.initTelegramWidget(
      "telegram-login-container",
      { size: "large", cornerRadius: 8 },
      async (authData) => {
        const result = await authClient.signInWithTelegram(authData);
        if (!result.error) {
          navigate.push(routes.recipes.list(locale));
        }
      },
    );
  }, []);

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
          <div id="telegram-login-container" />
        </CardContent>
      </Card>
    </div>
  );
}
