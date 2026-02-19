import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export default function ChatList() {
  const { user } = useAuth();
  const { data: chats, isLoading } = useChats();
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-lg font-bold">Чаты</h1>

      {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Загрузка...</p>}

      {chats?.map((chat: any) => {
        const other = chat.user_a === user?.id ? chat.profileB : chat.profileA;
        return (
          <Card
            key={chat.id}
            className="p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/chats/${chat.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium">{other?.username?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{other?.username}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {chat.listings?.title}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true, locale: ru })}
              </span>
            </div>
          </Card>
        );
      })}

      {!isLoading && (!chats || chats.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Нет чатов</p>
          <p className="text-xs mt-1">Напишите по объявлению, чтобы начать</p>
        </div>
      )}
    </div>
  );
}
