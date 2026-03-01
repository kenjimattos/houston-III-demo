import { useState } from "react";
import { inviteUser } from "@/services/inviteService";
import { InviteUserData } from "@/types/invite";

export function useInviteUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = async (
    userData: InviteUserData,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await inviteUser(userData);

      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    invite,
    loading,
    error,
    clearError: () => setError(null),
  };
}
