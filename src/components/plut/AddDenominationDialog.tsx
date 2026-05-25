import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brandById, countryById } from "@/data/mock";

export function AddDenominationDialog({ brandId, countryId, onClose }: {
  brandId: string; countryId: string | null; onClose: () => void;
}) {
  const open = countryId !== null;
  const brand = brandById(brandId);
  const country = countryId ? countryById(countryId) : null;
  const [face, setFace] = useState("");
  const [type, setType] = useState<"Physical" | "E-code">("Physical");

  const submit = () => {
    if (!face) { toast.error("Face value required"); return; }
    toast.success(`Added ${country?.currency}${face} ${type} for ${brand?.name} · ${country?.name}.`);
    setFace(""); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Denomination</DialogTitle>
          <DialogDescription>{brand?.name} · {country?.name} ({country?.code} · {country?.currency})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Face value *</label>
            <Input type="number" value={face} onChange={(e) => setFace(e.target.value)} placeholder="100" className="font-mono" />
            <p className="text-xs text-muted-foreground">Common: 10, 25, 50, 100, 200, 500</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Card type *</label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Physical">Physical</SelectItem><SelectItem value="E-code">E-code</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Add Denomination</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}