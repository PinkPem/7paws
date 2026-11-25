import "./paint.css";
import type { BrushStroke, RefCatApi } from "./pet/sevenPaws.ts";

const BRUSH_KEY = "7paws.brush";
const isTauri = "__TAURI_INTERNALS__" in window || "__TAURI__" in window;

const stage = document.getElementById("stage") as HTMLDivElement;
const swatches = document.getElementById("swatches") as HTMLDivElement;
const colorInput = document.getElementById("color") as HTMLInputElement;
const sizeInput = document.getElementById("size") as HTMLInputElement;
const sizeOut = document.getElementById("sizeOut") as HTMLOutputElement;
const mirrorInput = document.getElementById("mirror") as HTMLInputElement;
const hint = document.getElementById("hint") as HTMLParagraphElement;

const params = new URLSearchParams(location.search);
const coatId = params.get("coat") || localStorage.getItem("7paws.coat") || "gray-white-blaze";

/** Colours offered as one-click swatches: the coat's own palette first, then the two inks. */
const SWATCHES = ["#f7f3ea", "#666d78", "#3a404a", "#241f1c", "#c59aa0", "#c3c95f"];

let color = SWATCHES[0];
let mirror = mirrorInput.checked;
let drawing = false;
let points: [number, number][] = [];
let part: "head" | "body" = "head";

const api = window.createCat?.(stage, {
  coat: coatId,
  sleepMinutes: 1e12,
  idleActions: false,
  paintMode: true,
}) ?? null;

if (!api) {
  hint.textContent = "渲染器没能启动，画笔不可用。";
  throw new Error("7paws renderer is missing");
}

function readStrokes(): BrushStroke[] {
  try {
    const raw = localStorage.getItem(BRUSH_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeStrokes(list: BrushStroke[]) {
  try {
    localStorage.setItem(BRUSH_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the drawing still shows for this session.
  }
  if (isTauri) {
    void import("@tauri-apps/api/event").then(({ emit }) => emit("cat-brush", list)).catch(() => undefined);
  }
}

function brushOptions() {
  return { color, size: Number(sizeInput.value), mirror };
}

function startStroke(x: number, y: number) {
  const hit = api!.coatUvAt(x, y);
  if (!hit) return false;
  drawing = true;
  part = hit.part;
  points = [[hit.u, hit.v]];
  api!.setBrushPreview(part, points, brushOptions());
  return true;
}

function extendStroke(x: number, y: number) {
  if (!drawing) return;
  const hit = api!.coatUvAt(x, y);
  if (!hit || hit.part !== part) return;
  const last = points[points.length - 1];
  const [u, v] = [hit.u, hit.v];
  // Skip micro moves: they only bloat the stored strokes.
  if (Math.abs(u - last[0]) + Math.abs(v - last[1]) < 0.0015) return;
  // A jump around the seam means the ray slid along the silhouette; drop it instead of smearing across the cat.
  const du = Math.min(Math.abs(u - last[0]), 1 - Math.abs(u - last[0]));
  if (du > 0.12) return;
  points.push([u, v]);
  api!.setBrushPreview(part, points, brushOptions());
}

function endStroke() {
  if (!drawing) return;
  drawing = false;
  if (!points.length) return;
  api!.brushStroke(part, points, brushOptions());
  writeStrokes(api!.getBrush());
  points = [];
}

function buildSwatches() {
  for (const hex of SWATCHES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = hex;
    btn.title = hex;
    btn.dataset.color = hex;
    btn.addEventListener("click", () => {
      color = hex;
      colorInput.value = hex;
      markSwatch();
    });
    swatches.appendChild(btn);
  }
  markSwatch();
}

function markSwatch() {
  for (const el of swatches.querySelectorAll<HTMLButtonElement>(".swatch")) {
    el.dataset.active = String(el.dataset.color?.toLowerCase() === color.toLowerCase());
  }
}

stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  try { stage.setPointerCapture(event.pointerId); } catch { /* synthetic events */ }
  if (!startStroke(event.clientX, event.clientY)) return;
});

stage.addEventListener("pointermove", (event) => {
  extendStroke(event.clientX, event.clientY);
});

stage.addEventListener("pointerup", (event) => {
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  endStroke();
});

stage.addEventListener("pointercancel", () => {
  endStroke();
});

colorInput.addEventListener("input", () => {
  color = colorInput.value;
  markSwatch();
});

sizeInput.addEventListener("input", () => {
  sizeOut.textContent = sizeInput.value;
});

mirrorInput.addEventListener("change", () => {
  mirror = mirrorInput.checked;
});

document.getElementById("undo")?.addEventListener("click", () => {
  api!.undoBrush();
  writeStrokes(api!.getBrush());
});

document.getElementById("clear")?.addEventListener("click", () => {
  if (!confirm("清空全部笔迹？")) return;
  api!.clearBrush();
  writeStrokes([]);
});

document.getElementById("copy")?.addEventListener("click", () => {
  const data = JSON.stringify(api!.getBrush());
  const writing = navigator.clipboard?.writeText(data);
  if (!writing) {
    hint.textContent = "这个环境不能写剪贴板。";
    return;
  }
  void writing.then(
    () => { hint.textContent = "笔迹 JSON 已复制，可以粘进预设的 brush 字段。"; },
    () => { hint.textContent = "复制失败，请稍后再试。"; },
  );
});

document.getElementById("done")?.addEventListener("click", () => {
  writeStrokes(api!.getBrush());
  if (isTauri) {
    void import("@tauri-apps/api/core").then(({ invoke }) => invoke("close_paint")).catch(() => undefined);
  } else {
    window.close();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.getElementById("done")?.click();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    api!.undoBrush();
    writeStrokes(api!.getBrush());
  }
});

buildSwatches();
api.setBrush(readStrokes());
sizeOut.textContent = sizeInput.value;
hint.textContent = "在猫身上按住拖动即可涂色；对称绘制会把笔迹镜像到另一半。";
