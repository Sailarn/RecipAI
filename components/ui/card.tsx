"use client";

import { useState } from "react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  onClick,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  const [hovered, setHovered] = useState(false);
  const interactive = typeof onClick === "function";

  return (
    <div
      data-slot="card"
      data-size={size}
      onClick={onClick}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      className={cn(
        "group/card flex flex-col gap-6 overflow-hidden has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        interactive ? "cursor-pointer" : "",
        className,
      )}
      style={{
        background: "var(--glass-card-bg)",
        backdropFilter: "var(--glass-card-blur)",
        WebkitBackdropFilter: "var(--glass-card-blur)",
        border: "1px solid var(--glass-card-border)",
        boxShadow: hovered
          ? "0 8px 36px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,220,130,0.18)"
          : "var(--glass-card-shadow)",
        borderRadius: 22,
        transform: hovered ? "translateY(-2px)" : "none",
        borderColor: hovered ? "rgba(255,210,130,0.28)" : undefined,
        transition:
          "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm", className)}
      style={{ color: "var(--fg-2)" }}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
