"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "accent" | "ghost" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer";
  
  const variants = {
    accent: "bg-white text-black hover:bg-[#e4e4e7] shadow-btn rounded-full font-semibold",
    ghost: "bg-transparent text-ink-2 hover:text-ink hover:bg-hover rounded-full",
    secondary: "bg-field text-ink hover:bg-hover border border-line rounded-control",
    outline: "bg-transparent text-ink border border-line hover:bg-hover rounded-control",
  };

  const sizes = {
    sm: "h-6.5 px-2.5 text-[11.5px]",
    md: "h-7.5 px-3 text-[12.5px]",
    lg: "h-8.5 px-4 text-[13px]",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
