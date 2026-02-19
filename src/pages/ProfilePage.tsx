import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useMyListings } from "@/hooks/useListings";
import { useDeals, useConfirmDeal, useCancelDeal } from "@/hooks/useDeals";
import { useReviewsForUser, useUserRating, useCreateReview } from "@/hooks/useReviews";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Star, LogOut, Settings, Camera, BookOpen, Package, Wrench, Check, X, Flag } from "lucide-react";
import { toast } from "sonner";
import ComplaintDialog from "@/components/ComplaintDialog";

const typeLabels: Record<string, string> = { book: "Книга", item: "Вещь", service: "Услуга" };
const typeIcons: Record<string, any> = { book: BookOpen, item: Package, service: Wrench };

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;
  const profileId = isOwnProfile ? user?.id : userId;

  const { data: profile } = useProfile(profileId);
  const { data: listings } = useMyListings();
  const { data: deals } = useDeals();
  const { data: reviews } = useReviewsForUser(profileId);
  const { data: rating } = useUserRating(profileId);
  const updateProfile = useUpdateProfile();
  const confirmDeal = useConfirmDeal();
  const cancelDeal = useCancelDeal();
  const createReview = useCreateReview();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [reviewDealId, setReviewDealId] = useState<string | null>(null);
  const [reviewToUserId, setReviewToUserId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [complaintOpen, setComplaintOpen] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateProfile.mutateAsync({ avatar_url: publicUrl });
    toast.success("Аватар обновлён");
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: editName.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      toast.success("Профиль обновлён");
      setEditOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReview = async () => {
    if (!reviewDealId || !reviewToUserId) return;
    try {
      await createReview.mutateAsync({
        dealId: reviewDealId,
        toUserId: reviewToUserId,
        rating: reviewRating,
        text: reviewText,
      });
      toast.success("Отзыв оставлен");
      setReviewDealId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold">{profile?.username?.[0]?.toUpperCase()}</span>
            )}
          </div>
          {isOwnProfile && (
            <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer">
              <Camera className="h-3 w-3" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{profile?.username}</h1>
          {profile?.full_name && <p className="text-sm text-muted-foreground">{profile.full_name}</p>}
          {rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
              <span className="text-sm font-medium">{rating.average}</span>
              <span className="text-xs text-muted-foreground">({rating.count} отзывов)</span>
            </div>
          )}
        </div>
        {isOwnProfile && (
          <div className="flex gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditName(profile?.full_name || ""); setEditPhone(profile?.phone || ""); }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Редактировать профиль</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Имя</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} />
                  </div>
                  <div className="space-y-1">
                    <Label>Телефон</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} maxLength={20} placeholder="+7..." />
                  </div>
                  <Button onClick={handleSaveProfile} className="w-full">Сохранить</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/auth"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!isOwnProfile && (
          <Button variant="ghost" size="icon" onClick={() => setComplaintOpen(true)}>
            <Flag className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue={isOwnProfile ? "listings" : "reviews"}>
        <TabsList className="w-full">
          {isOwnProfile && <TabsTrigger value="listings" className="flex-1">Объявления</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="deals" className="flex-1">Сделки</TabsTrigger>}
          <TabsTrigger value="reviews" className="flex-1">Отзывы</TabsTrigger>
        </TabsList>

        {isOwnProfile && (
          <TabsContent value="listings" className="space-y-3 mt-3">
            {listings?.map((l: any) => (
              <Card
                key={l.id}
                className="p-3 cursor-pointer"
                onClick={() => navigate(`/listings/${l.id}`)}
              >
                <div className="flex items-center gap-3">
                  {l.photos?.[0] ? (
                    <img src={l.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      {(() => { const I = typeIcons[l.type]; return I ? <I className="h-5 w-5 text-muted-foreground" /> : null; })()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.title}</p>
                    <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-[10px] mt-1">{l.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}
            {(!listings || listings.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-6">Нет объявлений</p>
            )}
          </TabsContent>
        )}

        {isOwnProfile && (
          <TabsContent value="deals" className="space-y-3 mt-3">
            {deals?.map((d: any) => {
              const otherProfile = d.user_a === user?.id ? d.profileB : d.profileA;
              const canConfirm = d.status === "proposed" && d.proposed_by !== user?.id;
              const canReview = d.status === "confirmed";
              return (
                <Card key={d.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium truncate">{d.listings?.title}</p>
                    <Badge variant={d.status === "confirmed" ? "default" : d.status === "canceled" ? "destructive" : "secondary"} className="text-[10px]">
                      {d.status === "proposed" ? "Ожидает" : d.status === "confirmed" ? "Завершена" : "Отменена"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">с {otherProfile?.username}</p>
                  <div className="flex gap-2">
                    {canConfirm && (
                      <>
                        <Button size="sm" onClick={() => confirmDeal.mutate(d.id)}>
                          <Check className="h-3 w-3 mr-1" />Подтвердить
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => cancelDeal.mutate(d.id)}>
                          <X className="h-3 w-3 mr-1" />Отклонить
                        </Button>
                      </>
                    )}
                    {canReview && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setReviewDealId(d.id);
                        setReviewToUserId(otherProfile?.id);
                        setReviewRating(5);
                        setReviewText("");
                      }}>
                        <Star className="h-3 w-3 mr-1" />Отзыв
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
            {(!deals || deals.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-6">Нет сделок</p>
            )}
          </TabsContent>
        )}

        <TabsContent value="reviews" className="space-y-3 mt-3">
          {reviews?.map((r: any) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{r.profiles?.username}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-accent fill-accent" : "text-muted"}`} />
                  ))}
                </div>
              </div>
              {r.text && <p className="text-sm text-muted-foreground">{r.text}</p>}
            </Card>
          ))}
          {(!reviews || reviews.length === 0) && (
            <p className="text-center text-sm text-muted-foreground py-6">Нет отзывов</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewDealId} onOpenChange={(open) => !open && setReviewDealId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Оставить отзыв</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex gap-1 justify-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setReviewRating(i + 1)}>
                  <Star className={`h-7 w-7 ${i < reviewRating ? "text-accent fill-accent" : "text-muted"}`} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Комментарий (необязательно)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              maxLength={500}
            />
            <Button onClick={handleReview} className="w-full">Отправить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ComplaintDialog
        open={complaintOpen}
        onOpenChange={setComplaintOpen}
        targetType="user"
        targetUserId={profileId}
      />
    </div>
  );
}
