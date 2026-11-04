import "../globals.css";

// Public, unauthenticated documents (privacy policy, connector docs). They sit
// outside the [locale] tree so they have stable URLs for directory listings;
// proxy.ts excludes them from the locale middleware.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white">
        {/* The app's base styles clip html and body (app screens scroll in
            their own fixed containers), so these documents need their own
            scroll container. Text selection is re-enabled for copying. */}
        <div className="fixed inset-0 overflow-y-auto overscroll-contain select-text">
          {children}
        </div>
      </body>
    </html>
  );
}
