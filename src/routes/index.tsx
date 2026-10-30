import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MousePointerClick, ScanSearch, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Interactive Digital Flyer — Upload, Map Products & Preview" },
      {
        name: "description",
        content:
          "Upload a flyer image, map products onto it, and preview a shoppable interactive flyer with circular product highlights — entirely in the browser.",
      },
      { property: "og:title", content: "Interactive Digital Flyer — Upload, Map Products & Preview" },
      {
        property: "og:description",
        content:
          "Upload a flyer image, map products onto it, and preview a shoppable interactive flyer with circular product highlights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    icon: Upload,
    title: "Upload the flyer",
    description: "Drop in a JPG, PNG or WebP image. It stays in your browser.",
  },
  {
    icon: ScanSearch,
    title: "Map the products",
    description: "Pick products from the catalog and draw a rectangle over each one.",
  },
  {
    icon: MousePointerClick,
    title: "Share the preview",
    description: "Customers tap a product to see a highlight and its deal details.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <Badge variant="secondary" className="mb-5">
          Proof of concept
        </Badge>
        <h1 className="max-w-2xl text-center text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Turn any flyer image into a shoppable experience
        </h1>
        <p className="mt-4 max-w-xl text-center text-base text-muted-foreground">
          Upload a flyer, mark where each product sits, and let customers tap it — a
          circular highlight plus deal details, no backend needed.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/admin">
              Open the editor
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/preview">View customer preview</Link>
          </Button>
        </div>
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {index + 1}
              </p>
              <h2 className="mt-1 font-semibold text-foreground">{step.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
