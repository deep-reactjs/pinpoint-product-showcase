import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { discountPercent, formatPrice, type Product } from "@/data/products";

interface ProductSheetProps {
  product: Product | null;
  onClose: () => void;
}

/** Customer-facing bottom sheet with the tapped product's details. */
export function ProductSheet({ product, onClose }: ProductSheetProps) {
  const discount = product ? discountPercent(product) : 0;

  return (
    <Drawer open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerDescription asChild>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product?.brand} · {product?.category}
            </span>
          </DrawerDescription>
          <DrawerTitle className="text-xl font-semibold">{product?.name}</DrawerTitle>
        </DrawerHeader>
        {product && (
          <div className="flex gap-4 px-4 pb-6">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-contain p-2"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{product.description}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(product.offerPrice)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.regularPrice)}
                </span>
                {discount > 0 && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                    {discount}% off
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
