import Image from "next/image";
import Link from "next/link";

/** Shell for public, long-form pages (privacy policy, connector docs). */
export function PublicDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-[max(32px,var(--top-gap))]">
      <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
        <Image
          src="/icon-192x192.png"
          alt=""
          width={32}
          height={32}
          className="rounded-[10px]"
        />
        <span className="font-display text-lg font-extrabold">RecipAI</span>
      </Link>
      <h1 className="font-display text-3xl font-extrabold leading-tight">
        {title}
      </h1>
      {updated && (
        <p className="mt-2 text-sm text-white/50">Last updated: {updated}</p>
      )}
      <div className="public-doc mt-8 space-y-4 text-[15px] leading-relaxed text-white/80">
        {children}
      </div>
    </main>
  );
}

export function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 pt-4">
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

export function DocList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
