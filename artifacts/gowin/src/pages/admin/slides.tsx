import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Eye, EyeOff, ImageIcon } from "lucide-react";

interface Slide {
  id: number;
  filename: string;
  url: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

export default function AdminSlides() {
  const { token } = useAuth();
  const { t } = useSiteSettings();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: slides = [], isLoading } = useQuery<Slide[]>({
    queryKey: ["/api/admin/slides"],
    queryFn: async () => {
      const res = await fetch("/api/admin/slides", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/slides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/slides"] });
      qc.invalidateQueries({ queryKey: ["slides"] });
      toast({ title: t("admin.slides.deleted"), variant: "success" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await fetch(`/api/admin/slides/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/slides"] });
      qc.invalidateQueries({ queryKey: ["slides"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const file of Array.from(files)) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/admin/slides", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dataUrl, name: file.name }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error);
        }
        uploaded++;
      } catch (err: any) {
        toast({
          title: `Failed to upload ${file.name}`,
          description: err.message,
          variant: "destructive",
        });
      }
    }

    if (uploaded > 0) {
      qc.invalidateQueries({ queryKey: ["/api/admin/slides"] });
      qc.invalidateQueries({ queryKey: ["slides"] });
      toast({ title: `${uploaded} slide${uploaded > 1 ? "s" : ""} uploaded` });
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t("admin.slides.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.slides.desc")}</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? t("admin.slides.uploading") : t("admin.slides.upload")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[16/5] bg-accent/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl">
          <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">{t("admin.slides.none")}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t("admin.slides.none_desc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`relative rounded-xl overflow-hidden border transition-all ${
                slide.active ? "border-border" : "border-border/40 opacity-60"
              }`}
            >
              <img
                src={slide.url}
                alt={slide.filename}
                className="w-full object-cover"
                style={{ aspectRatio: "1035/200" }}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <Badge
                  variant={slide.active ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0.5"
                >
                  {slide.active ? t("admin.slides.active") : t("admin.slides.hidden")}
                </Badge>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-white/80 truncate max-w-[60%]">
                  {slide.filename}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({ id: slide.id, active: !slide.active })
                    }
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title={slide.active ? "Hide slide" : "Show slide"}
                  >
                    {slide.active ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("admin.slides.delete_confirm"))) deleteMutation.mutate(slide.id);
                    }}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-red-500/70 text-white transition-colors"
                    title="Delete slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
