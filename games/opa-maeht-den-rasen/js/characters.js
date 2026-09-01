const FACE_SOURCES = {
  opa: new URL("../assets/characters/opa-face-placeholder.png", import.meta.url).href,
};

const faceImages = new Map();

export function getFaceImage(characterId) {
  if (faceImages.has(characterId)) return faceImages.get(characterId);

  const src = FACE_SOURCES[characterId];
  if (!src) return null;

  const image = new Image();
  image.src = src;
  faceImages.set(characterId, image);
  return image;
}

/**
 * Draws a character's head image directly (no clipping) so the natural,
 * pre-cut silhouette of the photo (background already removed) shows
 * through as-is. The image is anchored by its bottom-center point, which
 * should line up with the neck of the body illustration.
 */
export function drawHead(ctx, characterId, cx, bottomY, targetWidth) {
  const image = getFaceImage(characterId);

  if (image && image.complete && image.naturalWidth > 0) {
    const scale = targetWidth / image.naturalWidth;
    const w = targetWidth;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, cx - w / 2, bottomY - h, w, h);
  } else {
    drawFallbackHead(ctx, cx, bottomY, targetWidth);
  }
}

function drawFallbackHead(ctx, cx, bottomY, targetWidth) {
  const radius = targetWidth / 2;
  const cy = bottomY - radius;

  ctx.fillStyle = "#f6c8a0";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a2c22";
  ctx.beginPath();
  ctx.arc(cx - radius * 0.32, cy - radius * 0.05, radius * 0.09, 0, Math.PI * 2);
  ctx.arc(cx + radius * 0.32, cy - radius * 0.05, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7a4a3a";
  ctx.lineWidth = Math.max(2, radius * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy + radius * 0.18, radius * 0.36, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}
