// Obrazki podglądu linku (`lib/og-image.ts`): punkt kadrowania z panelu
// i kadr 1200×630 w obu wariantach (contain / cover).

import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { OG_HEIGHT, OG_WIDTH, parseFocal, renderContain, renderCover } from "@/lib/og-image";

async function solid(width: number, height: number, rgb: { r: number; g: number; b: number }) {
  return sharp({ create: { width, height, channels: 3, background: rgb } }).png().toBuffer();
}

describe("parseFocal", () => {
  it("czyta format object-position i klamruje do 0–1", () => {
    expect(parseFocal("50% 30%")).toEqual({ x: 0.5, y: 0.3 });
    expect(parseFocal("120% -5%")).toEqual({ x: 1, y: 0 });
    expect(parseFocal("")).toEqual({ x: 0.5, y: 0.5 });
    expect(parseFocal(undefined)).toEqual({ x: 0.5, y: 0.5 });
    expect(parseFocal("center")).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("renderContain", () => {
  it("oddaje JPEG 1200×630 z całym zdjęciem (pionowe dostaje tło po bokach)", async () => {
    const out = await renderContain(await solid(400, 800, { r: 0, g: 0, b: 0 }));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(OG_WIDTH);
    expect(meta.height).toBe(OG_HEIGHT);
    // Skrajna lewa kolumna to tło (cream), środek – zdjęcie
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => data[(y * OG_WIDTH + x) * 3];
    expect(px(5, 300)).toBeGreaterThan(200);
    expect(px(600, 300)).toBeLessThan(30);
  });
});

describe("renderCover", () => {
  it("wypełnia kadr i kadruje wg punktu z panelu", async () => {
    // Lewa połowa czarna, prawa biała – 4000×630, więc kadr 1200 px to wycinek
    const left = await solid(2000, 630, { r: 0, g: 0, b: 0 });
    const src = await sharp({ create: { width: 4000, height: 630, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .composite([{ input: left, left: 0, top: 0 }])
      .png()
      .toBuffer();

    const fromLeft = await renderCover(src, "0% 50%");
    const fromRight = await renderCover(src, "100% 50%");
    for (const out of [fromLeft, fromRight]) {
      const meta = await sharp(out).metadata();
      expect(meta.width).toBe(OG_WIDTH);
      expect(meta.height).toBe(OG_HEIGHT);
    }
    const lum = async (buf: Buffer) => {
      const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      return data[(315 * OG_WIDTH + 600) * 3];
    };
    expect(await lum(fromLeft)).toBeLessThan(30);
    expect(await lum(fromRight)).toBeGreaterThan(220);
  });

  it("małe zdjęcie jest powiększane do pełnego kadru", async () => {
    const out = await renderCover(await solid(300, 200, { r: 10, g: 10, b: 10 }));
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(OG_WIDTH);
    expect(meta.height).toBe(OG_HEIGHT);
  });
});
