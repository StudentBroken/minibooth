import { applyFilterToContext } from './filters.js';
import { frameManager } from './frames.js';

// Cache for loaded photo image objects
const photoImageCache = new Map();

async function loadImage(url) {
  if (photoImageCache.has(url)) {
    return photoImageCache.get(url);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      photoImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Render complete photo strip onto a canvas
 */
export async function renderStrip({
  targetCanvas,
  layout,
  slottedPhotos, // array of photo URLs or null for each slot
  frame,
  filterId,
  title = '★ RETRO BOOTH ★',
  dateText = '',
  scale = 1,
  activeSlotIndex = -1
}) {
  const width = Math.round(layout.baseWidth * scale);
  const height = Math.round(layout.baseHeight * scale);

  targetCanvas.width = width;
  targetCanvas.height = height;
  const ctx = targetCanvas.getContext('2d');

  // 1. Draw Base Background Paper
  ctx.fillStyle = '#F5EFE0';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Frame Background Pattern
  if (frame) {
    const frameImg = await frameManager.loadFrameImage(frame);
    if (frameImg) {
      ctx.save();
      const pattern = ctx.createPattern(frameImg, 'repeat');
      if (pattern) {
        // Scale pattern slightly with canvas scale
        if (scale !== 1 && pattern.setTransform) {
          const matrix = new DOMMatrix();
          matrix.scaleSelf(scale, scale);
          pattern.setTransform(matrix);
        }
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }
  }

  // 3. Outer Comic Ink Border & Corner Rivets
  const outerBorder = Math.max(3, Math.round(6 * scale));
  ctx.lineWidth = outerBorder;
  ctx.strokeStyle = '#1E1B18';
  ctx.strokeRect(outerBorder / 2, outerBorder / 2, width - outerBorder, height - outerBorder);

  // Inner subtle paper border line
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
  ctx.strokeStyle = 'rgba(30, 27, 24, 0.2)';
  const innerInset = Math.round(14 * scale);
  ctx.strokeRect(innerInset, innerInset, width - innerInset * 2, height - innerInset * 2);

  // 4. Draw Photo Slots
  const { slots, footer } = layout.getSlots(width, height);

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const photoUrl = slottedPhotos[i];
    const isActive = activeSlotIndex === i;

    // Slot drop shadow (comic hard shadow)
    const shadowOffset = Math.round(5 * scale);
    ctx.fillStyle = '#1E1B18';
    ctx.fillRect(
      slot.x + shadowOffset,
      slot.y + shadowOffset,
      slot.width,
      slot.height
    );

    // Slot white photo paper margin
    const photoMatMargin = Math.round(7 * scale);
    ctx.fillStyle = '#FAF7EE';
    ctx.fillRect(slot.x, slot.y, slot.width, slot.height);

    const innerX = slot.x + photoMatMargin;
    const innerY = slot.y + photoMatMargin;
    const innerW = slot.width - photoMatMargin * 2;
    const innerH = slot.height - photoMatMargin * 2;

    if (photoUrl) {
      const img = await loadImage(photoUrl);
      if (img) {
        // Draw into temporary offscreen canvas to apply filter
        const offCanvas = document.createElement('canvas');
        offCanvas.width = innerW;
        offCanvas.height = innerH;
        const offCtx = offCanvas.getContext('2d');

        // Cover crop math
        const imgAspect = img.width / img.height;
        const slotAspect = innerW / innerH;
        let sW, sH, sX, sY;

        if (imgAspect > slotAspect) {
          sH = img.height;
          sW = Math.round(img.height * slotAspect);
          sX = Math.round((img.width - sW) / 2);
          sY = 0;
        } else {
          sW = img.width;
          sH = Math.round(img.width / slotAspect);
          sX = 0;
          sY = Math.round((img.height - sH) / 2);
        }

        offCtx.drawImage(img, sX, sY, sW, sH, 0, 0, innerW, innerH);

        // Apply comic/retro filter
        applyFilterToContext(offCtx, filterId, innerW, innerH);

        // Draw onto main canvas
        ctx.drawImage(offCanvas, innerX, innerY);
      }
    } else {
      // Empty slot placeholder
      ctx.fillStyle = '#EFE5D3';
      ctx.fillRect(innerX, innerY, innerW, innerH);

      // Comic dashed outline
      ctx.save();
      ctx.strokeStyle = '#9C8E7B';
      ctx.lineWidth = Math.max(2, Math.round(2.5 * scale));
      ctx.setLineDash([8 * scale, 6 * scale]);
      ctx.strokeRect(innerX + 4 * scale, innerY + 4 * scale, innerW - 8 * scale, innerH - 8 * scale);
      ctx.restore();

      // Comic slot number & prompt
      ctx.fillStyle = '#1E1B18';
      ctx.font = `bold ${Math.round(36 * scale)}px Bangers, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PANEL #${i + 1}`, innerX + innerW / 2, innerY + innerH / 2 - 12 * scale);

      ctx.fillStyle = '#7C6E5A';
      ctx.font = `${Math.round(18 * scale)}px "Space Grotesk", sans-serif`;
      ctx.fillText('Tap photo above to place', innerX + innerW / 2, innerY + innerH / 2 + 20 * scale);
    }

    // Comic Ink Border for photo frame
    ctx.lineWidth = Math.max(2.5, Math.round(4.5 * scale));
    ctx.strokeStyle = '#1E1B18';
    ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

    // Active selection highlight
    if (isActive) {
      ctx.save();
      ctx.lineWidth = Math.max(3, Math.round(6 * scale));
      ctx.strokeStyle = '#E63946';
      ctx.strokeRect(slot.x - 3 * scale, slot.y - 3 * scale, slot.width + 6 * scale, slot.height + 6 * scale);
      ctx.restore();
    }
  }

  // 5. Draw Footer Comic Badge & Date
  if (footer) {
    const fCenterY = footer.y + footer.height / 2;
    const fCenterX = footer.x + footer.width / 2;

    // Vintage Comic Badge Box
    const badgeW = Math.min(footer.width * 0.92, Math.round(footer.width - 20 * scale));
    const badgeH = Math.round(footer.height * 0.72);
    const badgeX = fCenterX - badgeW / 2;
    const badgeY = fCenterY - badgeH / 2;

    // Hard drop shadow
    ctx.fillStyle = '#1E1B18';
    ctx.fillRect(badgeX + 3 * scale, badgeY + 3 * scale, badgeW, badgeH);

    // Badge body (Cream with subtle yellow tint)
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

    ctx.lineWidth = Math.max(2, Math.round(3.5 * scale));
    ctx.strokeStyle = '#1E1B18';
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    // Title Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E63946';
    ctx.font = `bold ${Math.round(28 * scale)}px Bangers, sans-serif`;
    ctx.fillText(title, fCenterX, badgeY + badgeH * 0.38);

    // Date & Stamp Text
    const formattedDate = dateText || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();

    ctx.fillStyle = '#2B2621';
    ctx.font = `${Math.round(14 * scale)}px "Special Elite", monospace`;
    ctx.fillText(`• ${formattedDate} • ED. 005 •`, fCenterX, badgeY + badgeH * 0.74);
  }
}
