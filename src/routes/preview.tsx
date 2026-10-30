import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Hand, ImagePlus, Loader2, Move, ZoomIn } from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { ProductSheet } from "@/components/flyer/ProductSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProduct, type Product } from "@/data/products";
import { loadFlyerImage, loadHotspots, type Hotspot } from "@/lib/flyer-storage";

const FlyerPreviewCanvas = lazy(() => import("@/components/flyer/FlyerPreviewCanvas"));

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Flyer Preview — Interactive Digital Flyer" },
      {
        name: "description",
        content:
          "Customer preview: tap a product on the flyer to see a circular highlight and its deal details in a bottom sheet.",
      },
      { property: "og:title", content: "Flyer Preview — Interactive Digital Flyer" },
      {
        property: "og:description",
        content:
          "Tap a product on the flyer to see a circular highlight and its deal details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const ownUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = loadHotspots();
      const blob = await loadFlyerImage();
      if (cancelled) return;
      if (blob) {
        const url = URL.createObjectURL(blob);
        ownUrlRef.current = url;
        setImageUrl(url);
      } else {
        setImageUrl(sampleFlyerUrl);
      }
      setHotspots(saved);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
      if (ownUrlRef.current) URL.revokeObjectURL(ownUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.onload = () => setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) ?? null;
  const selectedProduct: Product | null = selectedHotspot
    ? (getProduct(selectedHotspot.productId) ?? null)
    : null;

  const hasContent = Boolean(imageUrl) || hotspots.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to home">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">Weekly flyer</h1>
            <p className="text-xs text-muted-foreground">Tap a product to see its deal</p>
          </div>
          <Badge variant="secondary">{hotspots.length} products</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {checked && !hasContent ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-card p-16 text-center">
            <ImagePlus className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">No flyer saved yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Open the editor to upload a flyer and map a few products — then come back
              here to try the customer view.
            </p>
            <Button asChild>
              <Link to="/admin">Open the editor</Link>
            </Button>
          </div>
        ) : imageUrl ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ZoomIn className="h-3.5 w-3.5" /> Scroll or buttons to zoom
              </span>
              <span className="inline-flex items-center gap-1">
                <Move className="h-3.5 w-3.5" /> Drag to pan when zoomed
              </span>
              <span className="inline-flex items-center gap-1">
                <Hand className="h-3.5 w-3.5" /> Tap a product
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card p-2 shadow-sm">
              <ClientOnly
                fallback={
                  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading flyer…
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading flyer…
                    </div>
                  }
                >
                  <FlyerPreviewCanvas
                    imageUrl={imageUrl}
                    imageWidth={imgSize.width}
                    imageHeight={imgSize.height}
                    hotspots={hotspots}
                    selectedHotspotId={selectedHotspotId}
                    onSelectHotspot={setSelectedHotspotId}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          </>
        ) : null}
      </main>

      <ProductSheet product={selectedProduct} onClose={() => setSelectedHotspotId(null)} />
    </div>
  );
}
