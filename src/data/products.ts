import cocaCola from "@/assets/products/coca-cola.jpg";
import lays from "@/assets/products/lays.jpg";
import oreo from "@/assets/products/oreo.jpg";
import tide from "@/assets/products/tide.jpg";
import doritos from "@/assets/products/doritos.jpg";
import redBull from "@/assets/products/red-bull.jpg";
import frootLoops from "@/assets/products/froot-loops.jpg";
import colgate from "@/assets/products/colgate.jpg";

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  regularPrice: number;
  offerPrice: number;
  image: string;
  category: string;
}

/**
 * Local sample catalog. Swap this module for a real API later —
 * the editor and viewer only depend on the `Product` shape.
 */
export const PRODUCTS: Product[] = [
  {
    id: "product_001",
    name: "Coca-Cola 12 Pack",
    brand: "Coca-Cola",
    description: "Classic Coca-Cola soft drink, 12-pack of 12 fl oz cans.",
    regularPrice: 8.99,
    offerPrice: 5.99,
    image: cocaCola,
    category: "Beverages",
  },
  {
    id: "product_002",
    name: "Lay's Classic Chips",
    brand: "Lay's",
    description: "Classic salted potato chips, 8 oz bag.",
    regularPrice: 4.99,
    offerPrice: 2.99,
    image: lays,
    category: "Snacks",
  },
  {
    id: "product_003",
    name: "Oreo Chocolate Cookies",
    brand: "Nabisco",
    description: "Chocolate sandwich cookies, 14.3 oz pack.",
    regularPrice: 5.49,
    offerPrice: 3.49,
    image: oreo,
    category: "Snacks",
  },
  {
    id: "product_004",
    name: "Tide Liquid Detergent",
    brand: "Tide",
    description: "Original scent liquid laundry detergent, 100 fl oz, 64 loads.",
    regularPrice: 12.99,
    offerPrice: 9.99,
    image: tide,
    category: "Household",
  },
  {
    id: "product_005",
    name: "Doritos Nacho Cheese",
    brand: "Doritos",
    description: "Nacho cheese flavored tortilla chips, 15 oz bag.",
    regularPrice: 5.99,
    offerPrice: 3.99,
    image: doritos,
    category: "Snacks",
  },
  {
    id: "product_006",
    name: "Red Bull Energy Drink",
    brand: "Red Bull",
    description: "Energy drink to vitalize body and mind, 4-pack of 250 ml cans.",
    regularPrice: 9.99,
    offerPrice: 7.99,
    image: redBull,
    category: "Beverages",
  },
  {
    id: "product_007",
    name: "Froot Loops Cereal",
    brand: "Kellogg's",
    description: "Sweetened multi-grain breakfast cereal, 12.2 oz box.",
    regularPrice: 4.49,
    offerPrice: 2.99,
    image: frootLoops,
    category: "Breakfast",
  },
  {
    id: "product_008",
    name: "Colgate Total Toothpaste",
    brand: "Colgate",
    description: "Clean mint whole mouth health toothpaste, 4.8 oz.",
    regularPrice: 6.49,
    offerPrice: 4.99,
    image: colgate,
    category: "Personal Care",
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function discountPercent(product: Product): number {
  if (product.regularPrice <= 0) return 0;
  return Math.max(0, Math.round((1 - product.offerPrice / product.regularPrice) * 100));
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}
