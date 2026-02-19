import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/hooks/useListings";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, BookOpen, Package, Wrench, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const typeLabels = { book: "Книга", item: "Вещь", service: "Услуга" };
const typeIcons = { book: BookOpen, item: Package, service: Wrench };

export default function HomePage() {
  const { user } = useAuth();
  const { data: listings } = useListings();
  const navigate = useNavigate();
  const recent = listings?.slice(0, 6) ?? [];

  return (
    <div className="px-4 pt-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <ArrowLeftRight className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">BarterHub</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Обменивайтесь книгами, вещами и услугами
        </p>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {(["book", "item", "service"] as const).map((type) => {
          const Icon = typeIcons[type];
          return (
            <button
              key={type}
              onClick={() => navigate(`/catalog?type=${type}`)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
            >
              <Icon className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">{typeLabels[type]}</span>
            </button>
          );
        })}
      </div>

      {/* Recent listings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Новые объявления</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="text-xs">
            Все <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <div className="space-y-3">
          {recent.map((listing: any) => (
            <Card
              key={listing.id}
              className="p-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/listings/${listing.id}`)}
            >
              <div className="flex gap-3">
                {listing.photos && listing.photos.length > 0 ? (
                  <img
                    src={listing.photos[0]}
                    alt={listing.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {(() => { const I = typeIcons[listing.type as keyof typeof typeIcons]; return <I className="h-6 w-6 text-muted-foreground" />; })()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{listing.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {listing.profiles?.username}
                  </p>
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {typeLabels[listing.type as keyof typeof typeLabels]}
                    </Badge>
                    {listing.categories?.name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {listing.categories.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {recent.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Пока нет объявлений. Создайте первое!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
