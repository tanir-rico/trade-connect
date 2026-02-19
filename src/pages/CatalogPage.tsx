import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useListings, ListingType } from "@/hooks/useListings";
import { useCategories } from "@/hooks/useCategories";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, BookOpen, Package, Wrench, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const typeLabels: Record<string, string> = { book: "Книга", item: "Вещь", service: "Услуга" };
const typeIcons: Record<string, any> = { book: BookOpen, item: Package, service: Wrench };

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ListingType | undefined>(searchParams.get("type") as ListingType || undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: listings, isLoading } = useListings({ type, categoryId, search: search || undefined });
  const { data: categories } = useCategories();

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск объявлений..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm font-medium mb-2">Тип</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant={!type ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setType(undefined)}
                  >Все</Badge>
                  {(["book", "item", "service"] as const).map((t) => (
                    <Badge
                      key={t}
                      variant={type === t ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setType(type === t ? undefined : t)}
                    >{typeLabels[t]}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Категория</p>
                <ScrollArea className="h-48">
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={!categoryId ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setCategoryId(undefined)}
                    >Все</Badge>
                    {categories?.map((c: any) => (
                      <Badge
                        key={c.id}
                        variant={categoryId === c.id ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                      >{c.name}</Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Type chips */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto">
        <Badge
          variant={!type ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap"
          onClick={() => setType(undefined)}
        >Все</Badge>
        {(["book", "item", "service"] as const).map((t) => (
          <Badge
            key={t}
            variant={type === t ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setType(type === t ? undefined : t)}
          >{typeLabels[t]}</Badge>
        ))}
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3">
        {listings?.map((listing: any) => (
          <Card
            key={listing.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/listings/${listing.id}`)}
          >
            {listing.photos && listing.photos.length > 0 ? (
              <img
                src={listing.photos[0]}
                alt={listing.title}
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-muted flex items-center justify-center">
                {(() => { const I = typeIcons[listing.type]; return I ? <I className="h-8 w-8 text-muted-foreground" /> : null; })()}
              </div>
            )}
            <div className="p-2.5">
              <p className="text-sm font-medium truncate">{listing.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{listing.profiles?.username}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1.5">
                {typeLabels[listing.type]}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Загрузка...</p>}
      {!isLoading && listings?.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</p>
      )}
    </div>
  );
}
