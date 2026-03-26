export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 gap-4">
            <p className="text-4xl">📡</p>
            <h1 className="text-xl font-semibold">You are offline</h1>
            <p style={{ color: "var(--muted-foreground)" }} className="text-sm text-center">
                Check your connection and try again.
            </p>
        </div>
    );
}