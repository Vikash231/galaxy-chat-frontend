"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, setTokenGetter } from "@/lib/api/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function AuthBridge() {
  const { getToken } = useAuth();
  setTokenGetter(() => getToken());
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Client errors (404, 422…) will not fix themselves; only retry network and server failures.
            retry: (count, e) => count < 2 && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthBridge />
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
