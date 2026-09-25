"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, setTokenGetter } from "@/lib/api/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Hand Clerk's token to the API client, and hold the app until Clerk has loaded so no request goes out unauthenticated. */
function AuthGate({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  setTokenGetter(() => getToken());
  if (!isLoaded) return null;
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Client errors (404, 422…) won't fix themselves. Retry network/server failures, and a 401 once (token refresh race).
            retry: (count, e) =>
              !(e instanceof ApiError) ? count < 2 : e.status === 401 ? count < 1 : count < 2 && (e.status === 0 || e.status >= 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthGate>
        <TooltipProvider>{children}</TooltipProvider>
      </AuthGate>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
