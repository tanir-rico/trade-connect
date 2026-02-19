import { useParams, useNavigate } from "react-router-dom";
import { useListing } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateChat } from "@/hooks/useChats";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Phone, Flag, BookOpen, Package, Wrench, Star } from "lucide-react";
import { toast } from "sonner";
import { useUserRating } from "@/hooks/useReviews";
import { useState } from "react";
import ComplaintDialog from "@/components/ComplaintDialog";

const typeLabels: Record<string, string> = { book: "Книга", item: "Вещь", service: "Услуга" };
const typeIcons: Record<string, any> = { book: BookOpen, item: Package, service: Wrench };

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: listing, isLoading } = useListing(id);
  const createChat = useCreateChat();
  const { data: rating } = useUserRating(listing?.profiles?.id);
  const [complaintOpen, setComplaintOpen] = useState(false);

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Загрузка...</div>;
  if (!listing) return <div className="p-4 text-center text-muted-foreground">Объявление не найдено</div>;

  const isOwner = user?.id === listing.author_id;

  const handleChat = async () => {
    if (!user) { navigate("/auth"); return; }
    try {
      const chat = await createChat.mutateAsync({
        listingId: listing.id,
        otherUserId: listing.author_id,
      });
      navigate(`/chats/${chat.id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCall = () => {
    if (listing.profiles?.phone) {
      window.location.href = `tel:${listing.profiles.phone}`;
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold truncate flex-1">{listing.title}</h1>
        {!isOwner && (
          <button onClick={() => setComplaintOpen(true)} className="text-muted-foreground">
            <Flag className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Photos */}
      {listing.photos && listing.photos.length > 0 ? (
        <div className="overflow-x-auto no-scrollbar flex gap-2 px-4">
          {listing.photos.map((url: string, i: number) => (
            <img key={i} src={url} alt="" className="h-56 rounded-xl object-cover flex-shrink-0" />
          ))}
        </div>
      ) : (
        <div className="mx-4 h-48 bg-muted rounded-xl flex items-center justify-center">
          {(() => { const I = typeIcons[listing.type]; return I ? <I className="h-12 w-12 text-muted-foreground" /> : null; })()}
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {/* Type & Category */}
        <div className="flex gap-2">
          <Badge>{typeLabels[listing.type]}</Badge>
          {listing.categories?.name && <Badge variant="outline">{listing.categories.name}</Badge>}
          {listing.status !== "active" && <Badge variant="destructive">{listing.status}</Badge>}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-foreground leading-relaxed">{listing.description}</p>
        )}

        {/* Offer/Want */}
        {listing.offering && (
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-xs font-medium text-primary mb-1">Предлагает</p>
            <p className="text-sm">{listing.offering}</p>
          </div>
        )}
        {listing.wanting && (
          <div className="p-3 bg-accent/10 rounded-lg">
            <p className="text-xs font-medium text-accent mb-1">Хочет взамен</p>
            <p className="text-sm">{listing.wanting}</p>
          </div>
        )}

        {/* Author */}
        <div
          className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border cursor-pointer"
          onClick={() => navigate(`/profile/${listing.profiles?.id}`)}
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {listing.profiles?.avatar_url ? (
              <img src={listing.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium">{listing.profiles?.username?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{listing.profiles?.username}</p>
            {rating && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 text-accent fill-accent" />
                <span className="text-xs text-muted-foreground">{rating.average} ({rating.count})</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isOwner && listing.status === "active" && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleChat}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Написать
            </Button>
            {listing.profiles?.phone && (
              <Button variant="outline" onClick={handleCall}>
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {isOwner && (
          <Button variant="outline" className="w-full" onClick={() => navigate(`/listings/edit/${listing.id}`)}>
            Редактировать
          </Button>
        )}
      </div>

      <ComplaintDialog
        open={complaintOpen}
        onOpenChange={setComplaintOpen}
        targetType="listing"
        targetListingId={listing.id}
      />
    </div>
  );
}
