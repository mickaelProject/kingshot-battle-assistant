import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[80px] w-full resize-y rounded-lg border border-[#1e2230] bg-[#0d1117] px-3 py-2 text-sm leading-relaxed text-slate-200 antialiased outline-none placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/40",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
