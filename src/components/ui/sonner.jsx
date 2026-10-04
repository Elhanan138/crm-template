"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      closeButton
      style={{ width: 'min(400px, calc(100vw - 32px))' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-sm group-[.toaster]:rounded-xl",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:h-8 group-[.toast]:px-4 group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:border-0",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:h-8 group-[.toast]:px-4 group-[.toast]:text-xs",
          success: "group-[.toaster]:!border-success/40",
          error: "group-[.toaster]:!border-destructive/40",
          warning: "group-[.toaster]:!border-warning/40",
          info: "group-[.toaster]:!border-info/40",
          closeButton: "group-[.toast]:bg-muted/60 group-[.toast]:border-0 group-[.toast]:text-foreground group-[.toast]:rounded-md group-[.toast]:w-6 group-[.toast]:h-6 group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:opacity-100 group-[.toast]:hover:bg-muted group-[.toast]:transition-colors",
        },
      }}
      {...props} />)
  );
}

export { Toaster }