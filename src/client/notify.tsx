"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Notify = (message: string, severity?: "error" | "success" | "info") => void;

const NotifyContext = createContext<Notify>(() => {});

/** Show a short snackbar message, e.g. when a mutation fails. */
export const useNotify = () => useContext(NotifyContext);

/** Turn an unknown error (usually an Apollo error) into a message for the user. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    message: string;
    severity: "error" | "success" | "info";
    key: number;
  } | null>(null);
  const notify = useCallback<Notify>(
    (message, severity = "error") => setState({ message, severity, key: Date.now() }),
    [],
  );
  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={state?.key}
        open={!!state}
        autoHideDuration={5000}
        onClose={() => setState(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={state?.severity ?? "info"} onClose={() => setState(null)} variant="filled">
          {state?.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
}
