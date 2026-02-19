import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateListing, useUpdateListing, useListing, ListingType } from "@/hooks/useListings";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<ListingType, string> = { book: "Книга", item: "Вещь", service: "Услуга" };

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existing } = useListing(isEdit ? id : undefined);
  const { data: categories } = useCategories();
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();

  const [type, setType] = useState<ListingType>((existing?.type as ListingType) || "item");
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [categoryId, setCategoryId] = useState(existing?.category_id || "");
  const [offering, setOffering] = useState(existing?.offering || "");
  const [wanting, setWanting] = useState(existing?.wanting || "");
  const [photos, setPhotos] = useState<string[]>(existing?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync when existing loads
  useState(() => {
    if (existing) {
      setType(existing.type as ListingType);
      setTitle(existing.title);
      setDescription(existing.description || "");
      setCategoryId(existing.category_id || "");
      setOffering(existing.offering || "");
      setWanting(existing.wanting || "");
      setPhotos(existing.photos || []);
    }
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      const newPhotos: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("listings").upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("listings").getPublicUrl(path);
        newPhotos.push(publicUrl);
      }
      setPhotos((p) => [...p, ...newPhotos]);
    } catch (e: any) {
      toast.error("Ошибка загрузки: " + e.message);
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Введите заголовок"); return; }
    setSaving(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        offering: offering.trim() || null,
        wanting: wanting.trim() || null,
        photos,
      };
      if (isEdit && id) {
        await updateListing.mutateAsync({ id, ...payload } as any);
        toast.success("Объявление обновлено");
      } else {
        await createListing.mutateAsync(payload as any);
        toast.success("Объявление создано");
      }
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">{isEdit ? "Редактировать" : "Новое объявление"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select value={type} onValueChange={(v) => setType(v as ListingType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(typeLabels) as ListingType[]).map((t) => (
                <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Заголовок</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
        </div>

        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
        </div>

        <div className="space-y-2">
          <Label>Категория</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
            <SelectContent>
              {categories?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Что предлагаю</Label>
          <Input value={offering} onChange={(e) => setOffering(e.target.value)} maxLength={200} />
        </div>

        <div className="space-y-2">
          <Label>Что хочу взамен</Label>
          <Input value={wanting} onChange={(e) => setWanting(e.target.value)} maxLength={200} />
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <Label>Фото</Label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={url} alt="" className="w-full h-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            </label>
          </div>
          {uploading && <p className="text-xs text-muted-foreground">Загрузка...</p>}
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
        </Button>
      </form>
    </div>
  );
}
