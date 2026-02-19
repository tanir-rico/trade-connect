import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useReviewsForUser(userId?: string) {
  return useQuery({
    queryKey: ["reviews", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_from_user_id_fkey(username, avatar_url)")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { dealId: string; toUserId: string; rating: number; text?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("reviews").insert({
        deal_id: input.dealId,
        from_user_id: user.id,
        to_user_id: input.toUserId,
        rating: input.rating,
        text: input.text?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUserRating(userId?: string) {
  return useQuery({
    queryKey: ["rating", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("to_user_id", userId);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { average: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!userId,
  });
}
