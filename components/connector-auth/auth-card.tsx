import Image from "next/image";

/**
 * Shell for the connector OAuth pages (sign-in and consent) that an AI chat
 * app opens in the browser. Mirrors the app's login card.
 */
export function ConnectorAuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none bg-[var(--app-mesh)]"
        aria-hidden
      />
      <div className="relative z-[1] w-[calc(100%-32px)] max-w-[360px] bg-[rgba(18,14,6,0.78)] backdrop-blur-[32px] backdrop-saturate-200 border border-[rgba(255,200,100,0.18)] rounded-[32px] px-5 pt-8 pb-7 shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,220,130,0.12)]">
        <div className="text-center mb-6">
          <Image
            src="/icon-192x192.png"
            alt="RecipAI"
            width={56}
            height={56}
            priority
            className="rounded-[18px] block mx-auto mb-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.40)]"
          />
          <h1 className="font-display text-[20px] font-extrabold text-[var(--fg-1)] tracking-[-0.02em] leading-tight">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}
