import "../globals.css";
import { TelemetryIdentity } from "./telemetry-identity";

export default function ExternalAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white">
        <TelemetryIdentity />
        {children}
      </body>
    </html>
  );
}
