import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ---- Button ----------------------------------------------------------------

const buttonVariants = {
  primary:
    "bg-sun-500 text-white hover:bg-sun-600 shadow-sm focus-visible:ring-sun-500",
  brand:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-sm focus-visible:ring-brand-500",
  navy: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm focus-visible:ring-navy-700",
  outline:
    "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 focus-visible:ring-navy-400",
  ghost: "text-navy-700 hover:bg-navy-50 focus-visible:ring-navy-300",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
  subtle: "bg-navy-100 text-navy-800 hover:bg-navy-200 focus-visible:ring-navy-300",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

type ButtonBase = {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
};

export function buttonClass({ variant = "brand", size = "md", className }: ButtonBase = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px active:scale-[0.99]",
    buttonVariants[variant],
    buttonSizes[size],
    className
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonBase & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  href,
  ...props
}: ButtonBase & React.ComponentProps<typeof Link>) {
  return <Link href={href} className={buttonClass({ variant, size, className })} {...props} />;
}

// ---- Inputs ----------------------------------------------------------------

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-lg border border-navy-200 bg-white px-3 text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
        className
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-navy-200 bg-white px-3 text-navy-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-navy-700", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

// ---- Surfaces --------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 px-6 py-16 text-center">
      {icon && <div className="mb-3 text-navy-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-navy-800">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-navy-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
