"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Overlay>>;
}) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-[200] bg-black/70", className)}
    {...props}
  />
);
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Content>>;
}) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[201] w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#1e2230] bg-[#111318] p-6 shadow-xl outline-none",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
);
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
    {...props}
  />
);

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);

const AlertDialogTitle = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Title>>;
}) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold tracking-tight text-white", className)}
    {...props}
  />
);

const AlertDialogDescription = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Description>>;
}) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-400", className)}
    {...props}
  />
);

const AlertDialogCancel = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Cancel>>;
}) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-md border border-[#1e2230] bg-transparent px-4 text-sm font-medium text-slate-200 hover:bg-white/5",
      className,
    )}
    {...props}
  />
);

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
};
