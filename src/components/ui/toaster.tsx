import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

/**
 * Returns the appropriate icon for a toast variant
 */
function getToastIcon(variant?: string) {
  switch (variant) {
    case 'destructive':
      return <XCircle className="h-5 w-5 flex-shrink-0 text-destructive-foreground" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />;
    default:
      return <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />;
  }
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider duration = {1500}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-3 items-start">
              {getToastIcon(variant)}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
