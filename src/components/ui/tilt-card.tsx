"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  /** Additional Tailwind / CSS classes for the wrapper */
  className?: string;
  /**
   * Tailwind color name (e.g. 'rose-500') if you still want the glow.
   * Pass nothing to keep it neutral.
   */
  glowColor?: string;
}

/**
 * Static version of the old TiltCard.
 * • Same props & className signature, so nothing else breaks.
 * • No mouse-move handlers, no transforms — the card stays still.
 */
export default function TiltCard({
  children,
  className,
  glowColor = "gray",
}: TiltCardProps) {
  const glowStyle: React.CSSProperties = glowColor
    ? ({ "--glow-color": glowColor } as React.CSSProperties)
    : {};

  return (
    <div className={cn("tilt-card-container", className)} style={glowStyle}>
      {children}
    </div>
  );
}
