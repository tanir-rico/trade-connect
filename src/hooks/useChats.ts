import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function useChats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("chats")
        .select(`
          *,
          listings(title, photos),
          profileA:profiles!chats_user_a_fkey(id, username, avatar_url),
          profileB:profiles!chats_user_b_fkey(id, username, avatar_url)
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMessages(chatId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles!messages_sender_id_fkey(username, avatar_url)")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!chatId,
  });

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["messages", chatId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, qc]);

  return query;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("messages")
        .insert({ chat_id: chatId, sender_id: user.id, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.chatId] });
    },
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ listingId, otherUserId }: { listingId: string; otherUserId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if chat already exists
      const { data: existing } = await supabase
        .from("chats")
        .select("id")
        .eq("listing_id", listingId)
        .or(`and(user_a.eq.${user.id},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${user.id})`)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from("chats")
        .insert({ listing_id: listingId, user_a: user.id, user_b: otherUserId })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
