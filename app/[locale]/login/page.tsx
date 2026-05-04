"use client";

import { useParams } from "next/navigation";
import { LoginView } from "@/components/login-view";

export default function LoginPage() {
  const params = useParams();
  const locale = params.locale as string;

  return <LoginView locale={locale} />;
}
