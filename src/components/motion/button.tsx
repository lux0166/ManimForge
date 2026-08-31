"use client";

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "purple";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-surface hover:bg-ink/90 font-medium",
  secondary: "border border-line bg-field text-ink hover:bg-hover-2",
  ghost: "text-ink-2 hover:text-ink hover:bg-hover-2",
  outline: "border border-line bg-transparent text-ink hover:bg-hover-2",
  danger: "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30",
  purple: "bg-purple-600 text-white hover:bg-purple-500 shadow-md",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
  md: "h-9 px-4 text-sm rounded-xl gap-2",
  lg: "h-11 px-5 text-base rounded-xl gap-2.5",
  icon: "size-8 rounded-lg p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center justify-center select-none outline-none transition-colors disabled:pointer-events-none disabled:opacity-40",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});
