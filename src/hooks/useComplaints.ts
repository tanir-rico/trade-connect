import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCreateComplaint() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      targetType: "listing" | "user";
      targetListingId?: string;
      targetUserId?: string;
      reason: string;
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("complaints").insert({
        complainant_id: user.id,
        target_type: input.targetType,
        target_listing_id: input.targetListingId || null,
        target_user_id: input.targetUserId || null,
        reason: input.reason,
        description: input.description?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}
