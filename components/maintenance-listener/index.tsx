"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { MAINTENANCE_EVENT } from "@/lib/api/api-fetch";

// Surfaces the server's maintenance message as a toast whenever an API request
// is blocked. Deduped by a fixed toast id so a burst of failed requests
// collapses into a single notification.
export function MaintenanceListener() {
  useEffect(() => {
    function handleMaintenance(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (!detail?.message) return;
      toast.error(detail.message, { id: "maintenance-mode", duration: 8000 });
    }

    window.addEventListener(MAINTENANCE_EVENT, handleMaintenance);
    return () =>
      window.removeEventListener(MAINTENANCE_EVENT, handleMaintenance);
  }, []);

  return null;
}
