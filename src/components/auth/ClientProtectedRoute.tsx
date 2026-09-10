import { Navigate } from "react-router-dom";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { ReactNode } from "react";

export function ClientProtectedRoute({ children }: { children: ReactNode }) {
  const { client, isLoading } = useClientAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!client) {
    return <Navigate to="/client/login" replace />;
  }

  return <>{children}</>;
}
