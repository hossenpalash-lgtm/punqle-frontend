function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface FitResult {
  lines: string[];
  fontSize: number;
}

// The core anti-overflow guarantee: shrinks font size until the wrapped
// text fits inside maxWidth x maxHeight, rather than drawing at a fixed
// size and letting the panel grow to match (the old behavior, and the
// direct cause of the "excessively large / overflowing" bug — a long
// caption at a fixed font size just produced a very tall block with no
// ceiling). If even the minimum readable size still doesn't fit — only
// possible with pathologically long input — truncates with an ellipsis
// on the last visible line instead of ever drawing past maxHeight.
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startPx: number,
  minPx: number,
  lineHeightMult: number,
  fontWeight: number,
  fontFamily: string,
): FitResult {
  let fontSize = Math.max(startPx, minPx);
  while (fontSize > minPx) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length * fontSize * lineHeightMult <= maxHeight) return { lines, fontSize };
    fontSize -= 1;
  }
  ctx.font = `${fontWeight} ${minPx}px ${fontFamily}`;
  let lines = wrapText(ctx, text, maxWidth);
  const maxLines = Math.max(1, Math.floor(maxHeight / (minPx * lineHeightMult)));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return { lines, fontSize: minPx };
}

// Waits for the specific font weights/families this render needs to
// actually be loaded before measuring/drawing text — canvas silently
// falls back to a generic font for the very first paint of a web font
// that hasn't finished loading yet, which would throw off every width
// measurement fitText relies on. Best-effort: a failure here shouldn't
// block the export, just risk a less precise fit on that one call.
async function ensureFontsReady(specs: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all(specs.map((s) => document.fonts.load(s)));
    await document.fonts.ready;
  } catch {
    // Best-effort only.
  }
}

// One visual identity per style, reused from the same vocabulary
// Step 2's style previews already established (VisualDirectionStep.tsx)
// so the finished creative actually looks like the direction the user
// picked — restrained serif for Warm & Lifestyle, bold caps for Bold &
// Energetic, a flat restrained panel for Minimal & Editorial, etc.
// Weights are limited to what's actually loaded via Google Fonts (see
// __root.tsx) — Inter 400/500/600/700/800, Playfair Display 700/800 —
// so nothing silently falls back to a faux-bold synthetic weight.
interface StyleTextConfig {
  headlineFamily: string;
  headlineWeight: number;
  headlineCase: "uppercase" | "none";
  headlineScale: number; // relative starting size vs. the shared baseline
  supportingWeight: number;
  supportingItalic: boolean;
  ctaShape: "pill-filled" | "pill-outline" | "plain" | "sticker";
  panelSolid: boolean; // true = flat panel, false = edge-fade gradient (existing look)
}

const INTER = '"Inter","Plus Jakarta Sans",sans-serif';
// Premium editorial headline pairing (2026-09) — deliberately distinct
// from the app chrome's own "Playfair Display","Inter" pairing
// (styles.css's --font-display/--font-sans), so an ad creative doesn't
// read as "part of the Punqle app" when a business posts it externally.
// Only loaded at 400/500 (see __root.tsx) — this pairing's whole point
// is a restrained regular/medium weight, never a heavy bold.
const LORA = '"Lora","Georgia",serif';

const STYLE_TEXT_CONFIG: Record<string, StyleTextConfig> = {
  clean_premium: {
    headlineFamily: INTER,
    headlineWeight: 700,
    headlineCase: "none",
    headlineScale: 1,
    supportingWeight: 500,
    supportingItalic: false,
    ctaShape: "pill-outline",
    panelSolid: false,
  },
  bold_energetic: {
    headlineFamily: INTER,
    headlineWeight: 800,
    headlineCase: "uppercase",
    headlineScale: 1.08,
    supportingWeight: 600,
    supportingItalic: false,
    ctaShape: "pill-filled",
    panelSolid: false,
  },
  // Editorial pairing (Lora headline / Inter body), 2026-09 — swapped
  // off Playfair Display specifically to stop overlapping the app
  // chrome's own headline font. Weight capped at 500 (Medium) per this
  // pairing's own "regular or medium, never heavy bold" rule — every
  // other style below keeps its original Inter/weight treatment
  // untouched, since flattening Bold & Energetic/Vibrant & Playful's
  // deliberately loud 800-weight uppercase Inter onto a quiet serif
  // would contradict what those two styles are for.
  warm_lifestyle: {
    headlineFamily: LORA,
    headlineWeight: 500,
    headlineCase: "none",
    headlineScale: 0.95,
    supportingWeight: 500,
    supportingItalic: true,
    ctaShape: "pill-filled",
    panelSolid: false,
  },
  minimal_editorial: {
    headlineFamily: LORA,
    headlineWeight: 500,
    headlineCase: "uppercase",
    headlineScale: 0.85,
    supportingWeight: 400,
    supportingItalic: false,
    ctaShape: "plain",
    panelSolid: true,
  },
  vibrant_playful: {
    headlineFamily: INTER,
    headlineWeight: 800,
    headlineCase: "none",
    headlineScale: 1.05,
    supportingWeight: 600,
    supportingItalic: false,
    ctaShape: "sticker",
    panelSolid: false,
  },
};
const DEFAULT_STYLE_CONFIG = STYLE_TEXT_CONFIG.clean_premium;

// Small pill/sticker/plain badge for the CTA tier — deliberately its own
// draw call rather than reusing fitText, since a CTA is always meant to
// be one short punchy line (never invented; only ever a real offer/CTA
// the idea actually stated), so shrink-to-fit width instead of wrapping.
function drawCtaBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  height: number,
  shape: StyleTextConfig["ctaShape"],
  textColor: string,
  maxWidth: number,
): void {
  let fontSize = Math.round(height * 0.5);
  const maxBadgeWidth = maxWidth * 0.82;
  ctx.font = `700 ${fontSize}px ${INTER}`;
  const label = text.toUpperCase();
  while (fontSize > 10 && ctx.measureText(label).width + fontSize * 1.8 > maxBadgeWidth) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px ${INTER}`;
  }
  const textWidth = ctx.measureText(label).width;

  if (shape === "plain") {
    ctx.textBaseline = "top";
    ctx.fillStyle = textColor;
    ctx.fillText(label, centerX - textWidth / 2, y);
    return;
  }

  const padX = fontSize * 0.9;
  const badgeW = textWidth + padX * 2;
  const x = centerX - badgeW / 2;

  ctx.save();
  if (shape === "sticker") {
    const cy = y + height / 2;
    ctx.translate(centerX, cy);
    ctx.rotate(-0.035);
    ctx.translate(-centerX, -cy);
  }

  if (shape === "pill-outline") {
    ctx.strokeStyle = textColor;
    ctx.lineWidth = Math.max(1.5, height * 0.06);
    ctx.beginPath();
    ctx.roundRect(x, y, badgeW, height, height / 2);
    ctx.stroke();
    ctx.fillStyle = textColor;
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.roundRect(x, y, badgeW, height, height / 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
  }
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + height / 2 + fontSize * 0.04);
  ctx.restore();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// Perceptual luminance — decides whether text on top of the brand-color
// bar should be white or near-black, since a user-picked brand color
// could be dark (needs white text, like the default black bar) or light
// (needs dark text, or white-on-light would be unreadable).
function isLight({ r, g, b }: { r: number; g: number; b: number }): boolean {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export interface BrandKit {
  color?: string | null;
  logoDataUrl?: string | null;
  name?: string | null;
}

// A freeform placement, all fields 0-1 relative to the canvas's own
// width/height so it's resolution-independent — same box works whether
// the source image is square, 4:5, or 9:16.
export interface Box {
  x: number; // left edge
  y: number; // top edge
  width: number;
}

// Per-post overrides on top of the Brand Kit defaults — the "quick edit"
// panel. barColorOverride is tri-state: undefined = use brandKit.color,
// null = force the default black bar for this post, a hex string = use
// that color just for this post. textBox/logoBox are unset until the
// user actually drags something in the drag-and-drop editor — until
// then, rendering falls back to the original edge-anchored gradient bar
// and fixed top-left logo badge, unchanged from before this existed.
export interface EditOptions {
  fontScale?: number; // 1 = default; ~0.8 small, ~1.25 large
  barPosition?: "top" | "bottom"; // default "bottom" — ignored once textBox is set
  barColorOverride?: string | null;
  showLogo?: boolean; // default true
  textBox?: Box;
  logoBox?: Box;
}

// The text actually baked onto the image — deliberately NOT the full
// social caption. `headline` is a short, standalone line (in practice
// the already-generated WhatsApp message, which is written to be a
// complete short sentence on its own — see _generate_captions_with_style
// in main.py); `cta` is only ever real, idea-stated offer text (e.g.
// "20% off"), never invented. `supporting` exists for a genuine second
// short line when one is available, but nothing upstream currently
// supplies it — the engine supports 3 tiers, callers only ever fill in
// what's real. The full Facebook caption stays purely a caption, edited
// and copied separately in the Post Kit's own caption section.
export interface CreativeText {
  headline: string;
  supporting?: string;
  cta?: string;
}

// The on-image headline is the already-generated WhatsApp message — a
// genuinely short, standalone line written for exactly this kind of use
// (see _generate_captions_with_style in main.py), never the full
// Facebook caption. Falls back to a short lead clause of the caption
// only in the rare case a variant has no WhatsApp message at all — still
// never the full caption.
export function deriveOnImageHeadline(whatsappMessage: string, facebookCaption: string): string {
  const wa = whatsappMessage.trim();
  if (wa) return wa;
  const trimmed = facebookCaption.trim();
  if (trimmed.length <= 70) return trimmed;
  const cut = trimmed.slice(0, 70);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 30 ? lastSpace : 70)}…`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
  });
}

// Bakes short creative text onto the banner as real pixels — image
// models render text poorly/unreliably, so the model only produces the
// background and this step adds the actual words. Shared by the
// single-post form, the weekly-plan form's per-day generation, and the
// carousel builder. Every text size here is fit to the available space
// (see fitText) rather than drawn at a fixed size — the panel height is
// DERIVED from the actual fitted content, capped at a hard ceiling, so
// it can never grow to cover most of the photo the way an unbounded
// fixed-size render of a long caption used to.
export async function compositeImage(
  base64: string,
  text: CreativeText,
  brandKit?: BrandKit,
  editOptions?: EditOptions,
  visualDirection?: string,
): Promise<string> {
  // Existing callers always pass a raw PNG base64 payload (AI-generated
  // images are always PNG). A caller can also pass a full data: URL
  // directly (e.g. the carousel builder including a user's own uploaded
  // JPEG/PNG) — detected here so its real mime type is preserved instead
  // of being mislabeled as PNG.
  const src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  const img = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the image.");
  ctx.drawImage(img, 0, 0);

  const fontScale = editOptions?.fontScale ?? 1;
  const style = STYLE_TEXT_CONFIG[visualDirection ?? ""] ?? DEFAULT_STYLE_CONFIG;

  await ensureFontsReady([
    `${style.headlineWeight} 16px ${style.headlineFamily}`,
    `${style.supportingWeight} 16px ${INTER}`,
    `700 16px ${INTER}`,
  ]);

  // undefined -> brand color, null -> explicit black, string -> that color
  const effectiveColor = editOptions?.barColorOverride !== undefined ? editOptions.barColorOverride : brandKit?.color;
  const barRgb = effectiveColor ? hexToRgb(effectiveColor) : { r: 0, g: 0, b: 0 };
  const textColor = effectiveColor && isLight(barRgb) ? "#1a1a1a" : "#ffffff";
  const rgb = `${barRgb.r},${barRgb.g},${barRgb.b}`;

  const headlineDisplay = style.headlineCase === "uppercase" ? text.headline.toUpperCase() : text.headline;
  const supportingFont = `${style.supportingItalic ? "italic " : ""}${style.supportingWeight} ${INTER}`;

  if (editOptions?.textBox) {
    // Freeform mode (user dragged the caption in the drag-and-drop
    // editor) — a solid rounded panel that can sit anywhere, since the
    // edge-fade gradient below only makes visual sense anchored to an
    // actual image edge. The box has no independent height (it's always
    // derived from its fitted content), so the one hard constraint here
    // is that it must never run past the bottom of the canvas — that's
    // what maxBoxHeight enforces, on top of fitText's own per-tier cap.
    const box = editOptions.textBox;
    const boxX = box.x * canvas.width;
    const boxY = box.y * canvas.height;
    const boxWidth = box.width * canvas.width;
    const padding = canvas.width * 0.032 * fontScale;
    const maxTextWidth = boxWidth - padding * 2;
    const maxBoxHeight = Math.max(canvas.height * 0.14, canvas.height - boxY - canvas.height * 0.03);

    const ctaReserve = text.cta ? canvas.width * 0.06 : 0;
    const headlineBudget = maxBoxHeight - padding * 2 - ctaReserve;
    const { lines: headlineLines, fontSize: headlineSize } = fitText(
      ctx,
      headlineDisplay,
      maxTextWidth,
      headlineBudget,
      canvas.width * 0.065 * style.headlineScale * fontScale,
      canvas.width * 0.03,
      1.24,
      style.headlineWeight,
      style.headlineFamily,
    );
    const headlineLineHeight = headlineSize * 1.24;
    const headlineHeight = headlineLines.length * headlineLineHeight;

    let supportingLines: string[] = [];
    let supportingSize = 0;
    let supportingLineHeight = 0;
    const afterHeadline = headlineBudget - headlineHeight;
    if (text.supporting && afterHeadline > canvas.width * 0.03) {
      const fit = fitText(
        ctx,
        text.supporting,
        maxTextWidth,
        afterHeadline - headlineSize * 0.25,
        Math.min(canvas.width * 0.038, headlineSize * 0.55),
        canvas.width * 0.02,
        1.3,
        style.supportingWeight,
        INTER,
      );
      supportingLines = fit.lines;
      supportingSize = fit.fontSize;
      supportingLineHeight = supportingSize * 1.3;
    }
    const supportingGap = supportingLines.length ? headlineSize * 0.3 : 0;
    const ctaGap = text.cta ? headlineSize * 0.3 : 0;
    const ctaBadgeHeight = text.cta ? canvas.width * 0.045 : 0;

    const boxHeight = Math.min(
      maxBoxHeight,
      padding * 2 +
        headlineHeight +
        supportingGap +
        supportingLines.length * supportingLineHeight +
        ctaGap +
        ctaBadgeHeight,
    );

    ctx.fillStyle = `rgba(${rgb},0.88)`;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, canvas.width * 0.014);
    ctx.fill();

    ctx.textBaseline = "top";
    let y = boxY + padding;
    ctx.font = `${style.headlineWeight} ${headlineSize}px ${style.headlineFamily}`;
    ctx.fillStyle = textColor;
    for (const line of headlineLines) {
      const lineWidth = ctx.measureText(line).width;
      ctx.fillText(line, boxX + (boxWidth - lineWidth) / 2, y);
      y += headlineLineHeight;
    }
    if (supportingLines.length) {
      y += supportingGap;
      ctx.font = `${supportingSize}px ${supportingFont}`;
      for (const line of supportingLines) {
        const lineWidth = ctx.measureText(line).width;
        ctx.fillText(line, boxX + (boxWidth - lineWidth) / 2, y);
        y += supportingLineHeight;
      }
    }
    if (text.cta) {
      y += ctaGap;
      drawCtaBadge(ctx, text.cta, boxX + boxWidth / 2, y, ctaBadgeHeight, style.ctaShape, textColor, boxWidth);
    }
  } else {
    const marginX = canvas.width * 0.06;
    const contentWidth = canvas.width - marginX * 2;
    const padding = canvas.width * 0.045 * fontScale;
    const maxBarHeight = canvas.height * 0.38; // hard ceiling — never more than ~38% of the photo
    const barAtTop = editOptions?.barPosition === "top";

    const ctaReserve = text.cta ? canvas.width * 0.075 : 0;
    const headlineBudget = maxBarHeight - padding * 2 - ctaReserve;
    const { lines: headlineLines, fontSize: headlineSize } = fitText(
      ctx,
      headlineDisplay,
      contentWidth,
      headlineBudget,
      canvas.width * 0.075 * style.headlineScale * fontScale,
      canvas.width * 0.032,
      1.22,
      style.headlineWeight,
      style.headlineFamily,
    );
    const headlineLineHeight = headlineSize * 1.22;
    const headlineHeight = headlineLines.length * headlineLineHeight;

    let supportingLines: string[] = [];
    let supportingSize = 0;
    let supportingLineHeight = 0;
    const afterHeadline = headlineBudget - headlineHeight;
    if (text.supporting && afterHeadline > canvas.width * 0.03) {
      const fit = fitText(
        ctx,
        text.supporting,
        contentWidth,
        afterHeadline - headlineSize * 0.25,
        Math.min(canvas.width * 0.04, headlineSize * 0.55),
        canvas.width * 0.022,
        1.3,
        style.supportingWeight,
        INTER,
      );
      supportingLines = fit.lines;
      supportingSize = fit.fontSize;
      supportingLineHeight = supportingSize * 1.3;
    }
    const supportingGap = supportingLines.length ? headlineSize * 0.3 : 0;
    const ctaGap = text.cta ? headlineSize * 0.35 : 0;
    const ctaBadgeHeight = text.cta ? canvas.width * 0.052 : 0;

    const barHeight = Math.min(
      maxBarHeight,
      padding * 2 +
        headlineHeight +
        supportingGap +
        supportingLines.length * supportingLineHeight +
        ctaGap +
        ctaBadgeHeight,
    );

    // The bar always fades from transparent (blending into the photo, at
    // whichever edge is closest to the photo's center) to solid (at the
    // actual image edge) — mirrored depending on which edge the bar sits
    // on. Minimal & Editorial uses a flat panel instead, matching its
    // more restrained identity.
    const barY = barAtTop ? 0 : canvas.height - barHeight;
    if (style.panelSolid) {
      ctx.fillStyle = `rgba(${rgb},0.9)`;
      ctx.fillRect(0, barY, canvas.width, barHeight);
    } else {
      const gradient = barAtTop
        ? ctx.createLinearGradient(0, 0, 0, barHeight)
        : ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      if (barAtTop) {
        gradient.addColorStop(0, `rgba(${rgb},0.92)`);
        gradient.addColorStop(0.35, `rgba(${rgb},0.8)`);
        gradient.addColorStop(1, `rgba(${rgb},0)`);
      } else {
        gradient.addColorStop(0, `rgba(${rgb},0)`);
        gradient.addColorStop(0.35, `rgba(${rgb},0.8)`);
        gradient.addColorStop(1, `rgba(${rgb},0.92)`);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, barY, canvas.width, barHeight);
    }

    ctx.textBaseline = "top";
    let y = barY + padding;
    ctx.font = `${style.headlineWeight} ${headlineSize}px ${style.headlineFamily}`;
    ctx.fillStyle = textColor;
    for (const line of headlineLines) {
      const lineWidth = ctx.measureText(line).width;
      ctx.fillText(line, (canvas.width - lineWidth) / 2, y);
      y += headlineLineHeight;
    }
    if (supportingLines.length) {
      y += supportingGap;
      ctx.font = `${supportingSize}px ${supportingFont}`;
      for (const line of supportingLines) {
        const lineWidth = ctx.measureText(line).width;
        ctx.fillText(line, (canvas.width - lineWidth) / 2, y);
        y += supportingLineHeight;
      }
    }
    if (text.cta) {
      y += ctaGap;
      drawCtaBadge(ctx, text.cta, canvas.width / 2, y, ctaBadgeHeight, style.ctaShape, textColor, canvas.width);
    }
  }

  if (brandKit?.logoDataUrl && editOptions?.showLogo !== false && editOptions?.logoBox) {
    // Freeform dragged position — logo only. The name pill below only
    // renders in the default (non-dragged) position, since it doesn't
    // have its own drag handle yet and would risk overlapping a logo
    // the user moved elsewhere.
    try {
      const logo = await loadImage(brandKit.logoDataUrl);
      const box = editOptions.logoBox;
      const logoW = box.width * canvas.width;
      const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
      const boxX = box.x * canvas.width;
      const boxY = box.y * canvas.height;
      const pad = logoW * 0.15;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, logoW + pad, logoH + pad, 10);
      ctx.fill();
      ctx.drawImage(logo, boxX + pad / 2, boxY + pad / 2, logoW, logoH);
    } catch {
      // Logo failed to load (corrupt data, etc.) — the post is still
      // useful without it, so this isn't worth failing the whole thing.
    }
  } else if ((brandKit?.logoDataUrl || brandKit?.name) && editOptions?.showLogo !== false && !editOptions?.logoBox) {
    // Default top-left position — logo plate and/or a name pill next to
    // it, mirroring how Facebook/Instagram ads pair a small profile
    // picture with the page name.
    const pad = canvas.width * 0.03;
    let cursorX = pad;
    let badgeHeight = 0;

    let logo: HTMLImageElement | null = null;
    if (brandKit?.logoDataUrl) {
      try {
        logo = await loadImage(brandKit.logoDataUrl);
      } catch {
        logo = null;
      }
    }

    if (logo) {
      const logoW = canvas.width * 0.16;
      const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
      const plateW = logoW + pad;
      const plateH = logoH + pad;
      badgeHeight = plateH;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect(cursorX, pad, plateW, plateH, 10);
      ctx.fill();
      ctx.drawImage(logo, cursorX + pad / 2, pad + pad / 2, logoW, logoH);
      cursorX += plateW + pad * 0.5;
    }

    if (brandKit?.name) {
      const nameFontSize = Math.round(canvas.width * 0.032);
      ctx.font = `700 ${nameFontSize}px "Inter", "Plus Jakarta Sans", sans-serif`;
      const textWidth = ctx.measureText(brandKit.name).width;
      const namePadX = nameFontSize * 0.6;
      const nameBadgeH = badgeHeight || nameFontSize + nameFontSize * 0.9;
      const nameBadgeW = textWidth + namePadX * 2;

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect(cursorX, pad, nameBadgeW, nameBadgeH, nameBadgeH / 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a1a";
      ctx.textBaseline = "middle";
      ctx.fillText(brandKit.name, cursorX + namePadX, pad + nameBadgeH / 2);
    }
  }

  drawWatermarkBadge(ctx, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.92);
}

// Every generated ad gets posted publicly by the business that made it —
// a small badge turns each one into free organic distribution for us, at
// zero extra engineering cost since this one function already sits
// between every flow (Single Post, Weekly Plan, Carousel) and the final
// exported image. Unconditional for now since there's no paid tier yet
// to gate it behind (no payment flow exists) — making it removable for
// paying customers is a natural next step once one does. Placed top-right
// since the defaults put the logo top-left and the caption bar at the
// bottom edge; a user's own dragged caption/logo can still cover it, same
// tradeoff every watermarked tool accepts.
function drawWatermarkBadge(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const badgeText = "Made with Punqle";
  const fontSize = Math.round(canvasWidth * 0.026);
  ctx.font = `600 ${fontSize}px "Inter", "Plus Jakarta Sans", sans-serif`;
  const textWidth = ctx.measureText(badgeText).width;
  const padX = fontSize * 0.65;
  const padY = fontSize * 0.5;
  const badgeW = textWidth + padX * 2;
  const badgeH = fontSize + padY * 2;
  const margin = canvasWidth * 0.025;
  const badgeX = canvasWidth - badgeW - margin;
  const badgeY = margin;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + padX, badgeY + badgeH / 2 + fontSize * 0.05);
}
