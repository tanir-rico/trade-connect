import { useState } from "react";
import { useCreateComplaint } from "@/hooks/useComplaints";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const reasons = [
  "Спам",
  "Мошенничество",
  "Оскорбление",
  "Запрещённый контент",
  "Другое",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "listing" | "user";
  targetListingId?: string;
  targetUserId?: string;
}

export default function ComplaintDialog({ open, onOpenChange, targetType, targetListingId, targetUserId }: Props) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const createComplaint = useCreateComplaint();

  const handleSubmit = async () => {
    if (!reason) { toast.error("Выберите причину"); return; }
    try {
      await createComplaint.mutateAsync({
        targetType,
        targetListingId,
        targetUserId,
        reason,
        description: description.trim() || undefined,
      });
      toast.success("Жалоба отправлена");
      onOpenChange(false);
      setReason("");
      setDescription("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пожаловаться</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label>Причина</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Выберите причину" /></SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Описание (необязательно)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">Отправить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
