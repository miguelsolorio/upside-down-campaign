// The contact sheet (record.mjs --sheet): one frame of each shot in a grid, each with its id under it in the game's font.
import { drawText } from '../gfx/index.ts';

const TILE_W = 480;
const TILE_H = 270;
const LABEL = 22;

/** Lays the frames out `cols` across and returns the sheet as a PNG data URL. */
export async function contactSheet(tiles: { id: string; url: string }[], cols: number): Promise<string> {
  const rows = Math.ceil(tiles.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * TILE_W;
  c.height = rows * (TILE_H + LABEL);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const images = await Promise.all(tiles.map((t) => new Promise<HTMLImageElement>((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error(`tile ${t.id} did not load`));
    img.src = t.url;
  })));
  tiles.forEach((t, i) => {
    const x = (i % cols) * TILE_W;
    const y = Math.floor(i / cols) * (TILE_H + LABEL);
    ctx.drawImage(images[i] as HTMLImageElement, x, y, TILE_W, TILE_H);
    ctx.save();
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    drawText(ctx, `${String(i + 1).padStart(2, '0')} ${t.id.toUpperCase()}`, (x + 6) / 2, (y + TILE_H + 4) / 2, 'bone');
    ctx.restore();
  });
  return c.toDataURL('image/png');
}
