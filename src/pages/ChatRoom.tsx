import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages, useSendMessage } from "@/hooks/useChats";
import { useCreateDeal } from "@/hooks/useDeals";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Handshake } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatRoom() {
  const { id: chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages } = useMessages(chatId);
  const sendMessage = useSendMessage();
  const createDeal = useCreateDeal();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: chat } = useQuery({
    queryKey: ["chat-detail", chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const { data, error } = await supabase
        .from("chats")
        .select(`
          *,
          listings(id, title, author_id),
          profileA:profiles!chats_user_a_fkey(id, username, avatar_url),
          profileB:profiles!chats_user_b_fkey(id, username, avatar_url)
        `)
        .eq("id", chatId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!chatId,
  });

  const other = chat?.user_a === user?.id ? chat?.profileB : chat?.profileA;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !chatId) return;
    try {
      await sendMessage.mutateAsync({ chatId, content: text });
      setText("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleProposeDeal = async () => {
    if (!chat?.listings?.id || !other?.id) return;
    try {
      await createDeal.mutateAsync({
        listingId: chat.listings.id,
        otherUserId: other.id,
      });
      toast.success("Предложение о сделке отправлено!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate("/chats")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{other?.username}</p>
          <p className="text-xs text-muted-foreground truncate">{chat?.listings?.title}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleProposeDeal} className="text-xs">
          <Handshake className="h-4 w-4 mr-1" />
          Сделка
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages?.map((msg: any) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2",
                isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
              )}>
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            maxLength={2000}
          />
          <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
