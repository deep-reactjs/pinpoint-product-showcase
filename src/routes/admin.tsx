import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { discountPercent, formatPrice, PRODUCTS, type Product } from "@/data/products";
import {
  clearFlyerImage,
  loadFlyerImage,
  loadHotspots,
  saveFlyerImage,
  saveHotspots,
  saveMeta,
  type Hotspot,
  type HotspotRect,
} from "@/lib/flyer-storage";
import { cn } from "@/lib/utils";

const FlyerEditorCanvas = lazy(() => import("@/components/flyer/FlyerEditorCanvas"));

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Flyer Editor — Interactive Digital Flyer" },
      {
        name: "description",
        content:
          "Upload a flyer image, search the product catalog and draw hotspots over each product. Coordinates are saved in your browser.",
      },
      { property: "og:title", content: "Flyer Editor — Interactive Digital Flyer" },
      {
        property: "og:description",
        content:
          "Upload a flyer image, search the product catalog and draw hotspots over each product.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("sample-flyer.jpg");
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawProduct, setDrawProduct] = useState<Product | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  const ownUrlRef = useRef<string | null>(null);
  const uploadedFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load a previously saved configuration from localStorage / IndexedDB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = loadHotspots();
      const blob = await loadFlyerImage();
      if (cancelled) return;
      if (blob) {
        const url = URL.createObjectURL(blob);
        ownUrlRef.current = url;
        uploadedFileRef.current = null;
        setFileName("Saved flyer");
        setImageUrl(url);
      } else {
        setImageUrl(sampleFlyerUrl);
      }
      if (saved.length) setHotspots(saved);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
      if (ownUrlRef.current) URL.revokeObjectURL(ownUrlRef.current);
    };
  }, []);

  // Read natural image dimensions whenever the image changes.
  useEffect(() => {
    if (!imageUrl) {
      setImgSize({ width: 0, height: 0 });
      return;
    }
    const img = new window.Image();
    img.onload = () => setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Persist hotspots and metadata as they change.
  useEffect(() => {
    if (!loaded) return;
    saveHotspots(hotspots);
  }, [hotspots, loaded]);

  useEffect(() => {
    if (!loaded || !imgSize.width) return;
    saveMeta({ fileName, width: imgSize.width, height: imgSize.height, savedAt: Date.now() });
  }, [imgSize, fileName, loaded]);

  const replaceImage = (url: string, name: string, file: File | null) => {
    if (ownUrlRef.current) URL.revokeObjectURL(ownUrlRef.current);
    ownUrlRef.current = file ? url : null;
    uploadedFileRef.current = file;
    setFileName(name);
    setImageUrl(url);
    setSelectedId(null);
    setDrawProduct(null);
    setHotspots([]);
  };

  const handleFile = async (file: File) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      toast.error("Please choose a JPG, JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("That image is larger than 15 MB.");
      return;
    }
    replaceImage(URL.createObjectURL(file), file.name, file);
    await saveFlyerImage(file);
    toast.success("Flyer uploaded — draw a rectangle over each product.");
  };

  const handleUseSample = async () => {
    replaceImage(sampleFlyerUrl, "sample-flyer.jpg", null);
    await clearFlyerImage();
  };

  const handleCreate = (rect: HotspotRect) => {
    if (!drawProduct) return;
    const hotspot: Hotspot = { id: newHotspotId(), productId: drawProduct.id, ...rect };
    setHotspots((prev) => [...prev, hotspot]);
    setSelectedId(hotspot.id);
    toast.success(`${drawProduct.name} mapped`);
    setDrawProduct(null);
  };

  const handleUpdate = (id: string, rect: HotspotRect) => {
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, ...rect } : h)));
  };

  const handleDelete = (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  const handleSave = async () => {
    if (!imageUrl || !imgSize.width) {
      toast.error("Upload a flyer first.");
      return;
    }
    try {
      const blob =
        uploadedFileRef.current ??
        (await fetch(imageUrl === ownUrlRef.current ? imageUrl : imageUrl).then((r) => r.blob()));
      await saveFlyerImage(blob);
    } catch {
      // image persistence is best-effort in the POC
    }
    saveMeta({ fileName, width: imgSize.width, height: imgSize.height, savedAt: Date.now() });
    saveHotspots(hotspots);
    toast.success("Flyer saved — it will still be here after a refresh.");
  };

  const selectedHotspot = hotspots.find((h) => h.id === selectedId) ?? null;
  const query = search.trim().toLowerCase();
  const filteredProducts = query
    ? PRODUCTS.filter((p) =>
        [p.name, p.brand, p.category].some((field) => field.toLowerCase().includes(query)),
      )
    : PRODUCTS;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to home">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">Flyer editor</h1>
            {imgSize.width > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                {fileName} · {imgSize.width} × {imgSize.height} px · {hotspots.length} product
                {hotspots.length === 1 ? "" : "s"} mapped
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleSave}>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
          <Button asChild>
            <Link to="/preview">Preview</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          {imageUrl ? (
            <div className="overflow-hidden rounded-xl border bg-card p-2 shadow-sm">
              <ClientOnly
                fallback={
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading editor…
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading editor…
                    </div>
                  }
                >
                  <FlyerEditorCanvas
                    imageUrl={imageUrl}
                    imageWidth={imgSize.width}
                    imageHeight={imgSize.height}
                    hotspots={hotspots}
                    selectedId={selectedId}
                    drawProduct={drawProduct}
                    onSelect={setSelectedId}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card p-16 text-center transition-colors hover:bg-accent/40"
            >
              <ImagePlus className="h-10 w-10 text-muted-foreground" />
              <span className="font-medium text-foreground">Upload flyer image</span>
              <span className="text-sm text-muted-foreground">
                JPG, JPEG, PNG or WebP · up to 15 MB
              </span>
            </button>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {/* Flyer source */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Flyer</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {imageUrl ? "Replace" : "Upload"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleUseSample}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Use sample flyer
              </Button>
            </div>
          </div>

          {/* Add product */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add product hotspot</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPickerOpen((open) => !open);
                  setSearch("");
                }}
                disabled={!imageUrl}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {drawProduct ? (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={drawProduct.image}
                    alt=""
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="h-10 w-10 rounded-md border bg-muted/40 object-contain p-0.5"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-medium">{drawProduct.name}</p>
                    <p className="text-muted-foreground">
                      Drag on the flyer to draw its rectangle.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Cancel drawing"
                    onClick={() => setDrawProduct(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : pickerOpen ? (
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products…"
                    className="pl-8"
                    autoFocus
                  />
                </div>
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDrawProduct(product);
                          setPickerOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                      >
                        <img
                          src={product.image}
                          alt=""
                          loading="lazy"
                          width={1024}
                          height={1024}
                          className="h-9 w-9 rounded-md border bg-muted/40 object-contain p-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{product.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {product.brand} · {product.category}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          {formatPrice(product.offerPrice)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredProducts.length === 0 && (
                    <li className="p-3 text-center text-xs text-muted-foreground">
                      No products match “{search}”.
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Pick a product, then drag a rectangle over it on the flyer.
              </p>
            )}
          </div>

          {/* Mapped hotspots */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Mapped products</h2>
            {hotspots.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing mapped yet. Save the flyer, then click Preview to try the customer
                view.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {hotspots.map((hotspot) => {
                  const product = PRODUCTS.find((p) => p.id === hotspot.productId);
                  const active = hotspot.id === selectedId;
                  return (
                    <li key={hotspot.id}>
                      <div
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg p-2 transition-colors",
                          active ? "bg-accent" : "hover:bg-accent/60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(hotspot.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          {product && (
                            <img
                              src={product.image}
                              alt=""
                              loading="lazy"
                              width={1024}
                              height={1024}
                              className="h-9 w-9 rounded-md border bg-muted/40 object-contain p-0.5"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {product?.name ?? hotspot.productId}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              x {hotspot.x.toFixed(2)} · y {hotspot.y.toFixed(2)} ·{" "}
                              {(hotspot.width * 100).toFixed(0)}% ×{" "}
                              {(hotspot.height * 100).toFixed(0)}%
                            </p>
                          </div>
                          {product && (
                            <span className="text-xs font-semibold text-primary">
                              -{discountPercent(product)}%
                            </span>
                          )}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${product?.name ?? "hotspot"}`}
                          onClick={() => handleDelete(hotspot.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

function newHotspotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
