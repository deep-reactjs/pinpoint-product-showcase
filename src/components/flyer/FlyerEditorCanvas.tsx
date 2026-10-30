import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";

import { PRODUCTS, type Product } from "@/data/products";
import { useHtmlImage } from "@/hooks/use-html-image";

interface FlyerEditorCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Hotspot[];
  selectedId: string | null;
  /** When set, the next drag on the flyer creates a hotspot for this product. */
  drawProduct: Product | null;
  onSelect: (id: string | null) => void;
  onCreate: (rect: HotspotRect) => void;
  onUpdate: (id: string, rect: HotspotRect) => void;
}

interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STROKE_IDLE = "#2563eb";
const STROKE_SELECTED = "#dc2626";

/**
 * Admin-side Konva editor: draw, drag and resize rectangular hotspots
 * over the uploaded flyer. All coordinates are normalized (0–1).
 */
export default function FlyerEditorCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  hotspots,
  selectedId,
  drawProduct,
  onSelect,
  onCreate,
  onUpdate,
}: FlyerEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const drawingRef = useRef<{ startX: number; startY: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [draft, setDraft] = useState<StageRect | null>(null);
  const image = useHtmlImage(imageUrl);

  const productsById = useMemo(() => new Map(PRODUCTS.map((p) => [p.id, p])), []);

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

  const scale = imageWidth > 0 && containerWidth > 0 ? containerWidth / imageWidth : 0;
  const stageWidth = Math.round(imageWidth * scale);
  const stageHeight = Math.round(imageHeight * scale);

  // Keep the transformer attached to the selected hotspot group.
  useEffect(() => {
    const transformer = trRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, hotspots, scale, containerWidth]);

  const handleMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawProduct || scale === 0) return;
    // The flyer image is non-listening, so a click on the surface targets the stage.
    if (event.target.getStage() !== event.target) return;
    const position = stageRef.current?.getPointerPosition();
    if (!position) return;
    drawingRef.current = { startX: position.x, startY: position.y };
    setDraft({ x: position.x, y: position.y, width: 0, height: 0 });
  };

  const handleMouseMove = () => {
    const start = drawingRef.current;
    if (!start) return;
    const position = stageRef.current?.getPointerPosition();
    if (!position) return;
    setDraft({
      x: Math.min(start.startX, position.x),
      y: Math.min(start.startY, position.y),
      width: Math.abs(position.x - start.startX),
      height: Math.abs(position.y - start.startY),
    });
  };

  const handleMouseUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = null;
    const rect = draft;
    setDraft(null);
    if (!rect || scale === 0) return;
    const normalized: HotspotRect = {
      x: clamp01(rect.x / stageWidth),
      y: clamp01(rect.y / stageHeight),
      width: clamp01(rect.width / stageWidth),
      height: clamp01(rect.height / stageHeight),
    };
    if (normalized.width < 0.02 || normalized.height < 0.02) return;
    onCreate(normalized);
  };

  return (
    <div
      ref={containerRef}
      className="w-full select-none"
      style={{ cursor: drawProduct ? "crosshair" : "default" }}
    >
      {image && stageWidth > 0 && (
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <KonvaImage
              image={image}
              width={stageWidth}
              height={stageHeight}
              listening={false}
            />
            {hotspots.map((hotspot) => {
              const product = productsById.get(hotspot.productId);
              const selected = hotspot.id === selectedId;
              return (
                <Rect
                  key={hotspot.id}
                  id={hotspot.id}
                  name="hotspot"
                  x={hotspot.x * stageWidth}
                  y={hotspot.y * stageHeight}
                  width={hotspot.width * stageWidth}
                  height={hotspot.height * stageHeight}
                  draggable={!drawProduct}
                  stroke={selected ? STROKE_SELECTED : STROKE_IDLE}
                  strokeWidth={selected ? 3 : 2}
                  fill={selected ? "rgba(220,38,38,0.12)" : "rgba(37,99,235,0.08)"}
                  dash={[6, 4]}
                  onClick={() => onSelect(hotspot.id)}
                  onTap={() => onSelect(hotspot.id)}
                  onDragEnd={(event) => {
                    const node = event.target;
                    onUpdate(hotspot.id, {
                      x: clamp01(node.x() / stageWidth),
                      y: clamp01(node.y() / stageHeight),
                      width: hotspot.width,
                      height: hotspot.height,
                    });
                  }}
                  onTransformEnd={(event) => {
                    const node = event.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onUpdate(hotspot.id, {
                      x: clamp01(node.x() / stageWidth),
                      y: clamp01(node.y() / stageHeight),
                      width: clamp01((node.width() * scaleX) / stageWidth),
                      height: clamp01((node.height() * scaleY) / stageHeight),
                    });
                  }}
                />
              );
            })}
            {hotspots.map((hotspot) => {
              const product = productsById.get(hotspot.productId);
              if (!product) return null;
              const labelY = Math.max(2, hotspot.y * stageHeight - 20);
              return (
                <Text
                  key={`label-${hotspot.id}`}
                  x={hotspot.x * stageWidth}
                  y={labelY}
                  text={product.name}
                  fontSize={12}
                  fontStyle="600"
                  fill={hotspot.id === selectedId ? STROKE_SELECTED : STROKE_IDLE}
                  shadowColor="rgba(255,255,255,0.9)"
                  shadowBlur={4}
                  listening={false}
                />
              );
            })}
            {draft && (
              <Rect
                x={draft.x}
                y={draft.y}
                width={draft.width}
                height={draft.height}
                stroke="#ffffff"
                strokeWidth={2}
                dash={[8, 5]}
                fill="rgba(255,255,255,0.15)"
                listening={false}
              />
            )}
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              flipEnabled={false}
              keepRatio={false}
              borderStroke={STROKE_SELECTED}
              anchorStroke={STROKE_SELECTED}
              anchorFill="#ffffff"
              anchorSize={9}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      )}
      {/* Provide a hit surface name for the stage itself */}
      <style>{`.konvajs-content .stage-surface { display: none; }`}</style>
    </div>
  );
}
