import fs from "fs";
import path from "path";

let cachedFont: Buffer | null = null;

export function getOgFont(): Buffer {
  if (!cachedFont) {
    const fontPath = path.join(process.cwd(), "src", "assets", "fonts", "NotoSans-Regular.ttf");
    cachedFont = fs.readFileSync(fontPath);
  }
  return cachedFont;
}
