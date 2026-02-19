import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ListingType = "book" | "item" | "service";
export type ListingStatus = "active" | "closed" | "deleted";

export interface ListingRow {
  id: string;
  author_id: string;
  type: ListingType;
  title: string;
  description: string | null;
  photos: string[];
  category_id: string | null;
  offering: string | null;
  wanting: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export function useListings(filters?: { type?: ListingType; categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: ["listings", filters],
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select("*, profiles!listings_author_id_fkey(username, avatar_url), categories(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filters?.type) q = q.eq("type", filters.type);
      if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
      if (filters?.search) q = q.ilike("title", `%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useListing(id?: string) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("listings")
        .select("*, profiles!listings_author_id_fkey(id, username, avatar_url, phone), categories(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useMyListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*, categories(name)")
        .eq("author_id", user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      type: ListingType;
      title: string;
      description?: string;
      photos?: string[];
      category_id?: string;
      offering?: string;
      wanting?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listings")
        .insert({ ...input, author_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ListingRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["listing"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("listings")
        .update({ status: "deleted" as ListingStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
}
