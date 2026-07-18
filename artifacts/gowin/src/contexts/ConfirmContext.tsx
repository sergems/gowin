import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState {
  open: boolean;
  message: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = React.createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirm: ConfirmFn = React.useCallback(
    (message, options = {}) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, message, options, resolve });
      }),
    []
  );

  const handleClose = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  const isDestructive = state?.options.variant === "destructive";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AlertDialog open={state?.open ?? false} onOpenChange={(open) => { if (!open) handleClose(false); }}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          {state?.options.title && (
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                {state.options.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {state?.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          {!state?.options.title && (
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground text-base font-normal">
                {state?.message}
              </AlertDialogTitle>
            </AlertDialogHeader>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              onClick={() => handleClose(false)}
              className="border-border bg-transparent hover:bg-accent text-foreground"
            >
              {state?.options.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(true)}
              className={cn(
                "font-semibold",
                isDestructive
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {state?.options.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
