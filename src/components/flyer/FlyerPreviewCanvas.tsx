import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Ellipse, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import { Minus, Maximize, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Hotspot } from "@/lib/flyer-storage";
import { useHtmlImage } from "@/hooks/use-html-image";

interface FlyerPreviewCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Hotspot[];
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspotId: string | null) => void;
}

interface ViewState {
  scale: number;
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const HIT_FILL = "rgba(255,255,255,0.001)";

/**
 * Customer-side viewer: zoom/pan the flyer, tap a product to select it
 * (animated circular red highlight) or tap empty space to deselect.
 */
export default function FlyerPreviewCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  hotspots,
  selectedHotspotId,
  onSelectHotspot,
}: FlyerPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const highlightRef = useRef<Konva.Ellipse>(null);
  const panRef = useRef({ active: false, moved: 0, lastX: 0, lastY: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [view, setView] = useState<ViewState>({ scale: 1, x: 0, y: 0 });
  const image = useHtmlImage(imageUrl);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitScale = imageWidth > 0 && containerWidth > 0 ? containerWidth / imageWidth : 0;
  const stageWidth = Math.round(imageWidth * fitScale);
  const stageHeight = Math.round(imageHeight * fitScale);

  const clampView = (next: ViewState): ViewState => {
    const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.scale));
    const maxX = 0;
    const minX = stageWidth * (1 - scale);
    const maxY = 0;
    const minY = stageHeight * (1 - scale);
    return {
      scale,
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
    };
  };

  const zoomAtPoint = (point: { x: number; y: number } | null, factor: number) => {
    setView((current) => {
      const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.scale * factor));
      if (nextScale === current.scale) return current;
      const anchor =
        point ?? { x: stageWidth / 2, y: stageHeight / 2 };
      const contentX = (anchor.x - current.x) / current.scale;
      const contentY = (anchor.y - current.y) / current.scale;
      return clampView({
        scale: nextScale,
        x: anchor.x - contentX * nextScale,
        y: anchor.y - contentY * nextScale,
      });
    });
  };

  // Animated circular highlight: pop-in tween + slowly marching dashes.
  useEffect(() => {
    const node = highlightRef.current;
    if (!node || !selectedHotspotId) return;
    node.opacity(0);
    node.scale({ x: 0.55, y: 0.55 });
    const tween = new Konva.Tween({
      node,
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 0.4,
      easing: Konva.Easings.BackEaseOut,
    });
    tween.play();
    const start = performance.now();
    let raf = 0;
    const march = (time: number) => {
      node.dashOffset(-(((time - start) / 50) % 34));
      raf = requestAnimationFrame(march);
    };
    raf = requestAnimationFrame(march);
    return () => {
      tween.destroy();
      cancelAnimationFrame(raf);
    };
  }, [selectedHotspotId]);

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    zoomAtPoint(pointer, 1.15 ** direction);
  };

  const handleMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (view.scale <= MIN_ZOOM + 0.02) {
      panRef.current.active = false;
      return;
    }
    if (event.target.getStage() !== event.target) return;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    panRef.current = { active: true, moved: 0, lastX: pointer.x, lastY: pointer.y };
  };

  const handleMouseMove = () => {
    const pan = panRef.current;
    if (!pan.active) return;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const dx = pointer.x - pan.lastX;
    const dy = pointer.y - pan.lastY;
    pan.moved += Math.abs(dx) + Math.abs(dy);
    pan.lastX = pointer.x;
    pan.lastY = pointer.y;
    setView((current) => clampView({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const handleMouseUp = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const pan = panRef.current;
    panRef.current.active = false;
    if (pan.moved < 4 && event.target.getStage() === event.target) {
      onSelectHotspot(null);
    }
  };

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) ?? null;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {image && stageWidth > 0 && (
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          style={{ cursor: view.scale > MIN_ZOOM + 0.02 ? "grab" : "pointer" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer scaleX={view.scale} scaleY={view.scale} x={view.x} y={view.y}>
            <KonvaImage image={image} width={stageWidth} height={stageHeight} listening={false} />
            {hotspots.map((hotspot) => (
              <Rect
                key={hotspot.id}
                x={hotspot.x * stageWidth}
                y={hotspot.y * stageHeight}
                width={hotspot.width * stageWidth}
                height={hotspot.height * stageHeight}
                fill={HIT_FILL}
                onClick={(event) => {
                  event.cancelBubble = true;
                  onSelectHotspot(hotspot.id);
                }}
                onTap={(event) => {
                  event.cancelBubble = true;
                  onSelectHotspot(hotspot.id);
                }}
              />
            ))}
            {selectedHotspot && (
              <Ellipse
                ref={highlightRef}
                x={(selectedHotspot.x + selectedHotspot.width / 2) * stageWidth}
                y={(selectedHotspot.y + selectedHotspot.height / 2) * stageHeight}
                radiusX={
                  (Math.max(selectedHotspot.width * stageWidth, selectedHotspot.height * stageHeight) /
                    2) *
                  1.18
                }
                radiusY={
                  (Math.max(selectedHotspot.width * stageWidth, selectedHotspot.height * stageHeight) /
                    2) *
                  1.18
                }
                stroke="#dc2626"
                strokeWidth={Math.max(3, stageWidth / 220)}
                dash={[10, 7]}
                fill="rgba(220,38,38,0.10)"
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
          </Layer>
        </Stage>
      )}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Zoom in"
          onClick={() => zoomAtPoint(null, 1.3)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Zoom out"
          onClick={() => zoomAtPoint(null, 1 / 1.3)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Reset zoom"
          onClick={() => setView({ scale: 1, x: 0, y: 0 })}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
