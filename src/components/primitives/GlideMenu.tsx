"use client";

import React, { useRef, useState, useEffect, type ReactNode, type CSSProperties } from "react";

interface GlideMenuProps {
  children: ReactNode;
  className?: string;
  highlightClassName?: string;
  rowSelector?: string;
}

export default function GlideMenu({
  children,
  className = "",
  highlightClassName = "rounded-[8px] bg-hover-2",
  rowSelector = "[data-row]",
}: GlideMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightStyle, setHighlightStyle] = useState<CSSProperties>({
    opacity: 0,
    transform: "translateY(0px)",
    height: "0px",
    width: "0px",
  });
  const [active, setActive] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const target = (e.target as HTMLElement).closest(rowSelector) as HTMLElement | null;
    if (target && containerRef.current.contains(target)) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      
      setHighlightStyle({
        opacity: 1,
        transform: `translate3d(${targetRect.left - containerRect.left}px, ${targetRect.top - containerRect.top}px, 0)`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        transition: "transform 140ms cubic-bezier(0.16, 1, 0.3, 1), width 140ms ease, height 140ms ease, opacity 100ms ease",
      });
      setActive(true);
    }
  };

  const handlePointerLeave = () => {
    setActive(false);
    setHighlightStyle((prev) => ({
      ...prev,
      opacity: 0,
      transition: "opacity 120ms ease",
    }));
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative ${className}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-0 transition-all ${highlightClassName}`}
        style={highlightStyle}
      />
      {children}
    </div>
  );
}
