import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDeals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          listings(title),
          profileA:profiles!deals_user_a_fkey(id, username),
          profileB:profiles!deals_user_b_fkey(id, username)
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ listingId, otherUserId }: { listingId: string; otherUserId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("deals")
        .insert({
          listing_id: listingId,
          user_a: user.id,
          user_b: otherUserId,
          proposed_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useConfirmDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from("deals")
        .update({ status: "confirmed" as any })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useCancelDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from("deals")
        .update({ status: "canceled" as any })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
