/**
 * Layout styles for photobooth strips and comic cards
 * All photo panels strictly stick to a 1:1 SQUARE aspect ratio!
 */
export const LAYOUTS = [
  {
    id: 'strip-4',
    name: 'Classic 4-Strip',
    desc: '4 square photos in a classic vertical strip',
    slotCount: 4,
    badge: '★ POPULAR',
    baseWidth: 600,
    baseHeight: 2460,
    getSlots(w, h) {
      const padding = Math.round(w * 0.07);
      const gap = Math.round(w * 0.045);
      const topOffset = Math.round(w * 0.08);
      const slotW = w - padding * 2;
      const slotH = slotW; // STRICT 1:1 SQUARE

      const slots = [];
      for (let i = 0; i < 4; i++) {
        slots.push({
          index: i,
          x: padding,
          y: topOffset + i * (slotH + gap),
          width: slotW,
          height: slotH
        });
      }

      const footerY = topOffset + 4 * (slotH + gap) - gap + Math.round(w * 0.04);
      const footerH = Math.max(110, h - footerY - padding);

      return {
        slots,
        footer: {
          x: padding,
          y: footerY,
          width: slotW,
          height: footerH
        }
      };
    }
  },
  {
    id: 'strip-3',
    name: 'Comic 3-Panel',
    desc: '3 square photos in a vertical strip',
    slotCount: 3,
    badge: '3-PANEL',
    baseWidth: 600,
    baseHeight: 1900,
    getSlots(w, h) {
      const padding = Math.round(w * 0.07);
      const gap = Math.round(w * 0.045);
      const topOffset = Math.round(w * 0.08);
      const slotW = w - padding * 2;
      const slotH = slotW; // STRICT 1:1 SQUARE

      const slots = [];
      for (let i = 0; i < 3; i++) {
        slots.push({
          index: i,
          x: padding,
          y: topOffset + i * (slotH + gap),
          width: slotW,
          height: slotH
        });
      }

      const footerY = topOffset + 3 * (slotH + gap) - gap + Math.round(w * 0.04);
      const footerH = Math.max(110, h - footerY - padding);

      return {
        slots,
        footer: {
          x: padding,
          y: footerY,
          width: slotW,
          height: footerH
        }
      };
    }
  },
  {
    id: 'grid-4',
    name: '2x2 Comic Quad',
    desc: '4 square photos in a 2x2 square card',
    slotCount: 4,
    badge: '2x2 QUAD',
    baseWidth: 1000,
    baseHeight: 1180,
    getSlots(w, h) {
      const padding = Math.round(w * 0.06);
      const gap = Math.round(w * 0.04);
      const topOffset = Math.round(w * 0.06);

      const slotW = Math.round((w - padding * 2 - gap) / 2);
      const slotH = slotW; // STRICT 1:1 SQUARE

      const slots = [
        { index: 0, x: padding, y: topOffset, width: slotW, height: slotH },
        { index: 1, x: padding + slotW + gap, y: topOffset, width: slotW, height: slotH },
        { index: 2, x: padding, y: topOffset + slotH + gap, width: slotW, height: slotH },
        { index: 3, x: padding + slotW + gap, y: topOffset + slotH + gap, width: slotW, height: slotH }
      ];

      const footerY = topOffset + (slotH + gap) * 2 + Math.round(w * 0.02);
      const footerH = Math.max(110, h - footerY - padding);

      return {
        slots,
        footer: {
          x: padding,
          y: footerY,
          width: w - padding * 2,
          height: footerH
        }
      };
    }
  },
  {
    id: 'strip-5',
    name: 'Full 5-Shot Strip',
    desc: 'All 5 square shots in an ultra-tall vintage strip',
    slotCount: 5,
    badge: 'ALL 5',
    baseWidth: 600,
    baseHeight: 3020,
    getSlots(w, h) {
      const padding = Math.round(w * 0.07);
      const gap = Math.round(w * 0.04);
      const topOffset = Math.round(w * 0.07);
      const slotW = w - padding * 2;
      const slotH = slotW; // STRICT 1:1 SQUARE

      const slots = [];
      for (let i = 0; i < 5; i++) {
        slots.push({
          index: i,
          x: padding,
          y: topOffset + i * (slotH + gap),
          width: slotW,
          height: slotH
        });
      }

      const footerY = topOffset + 5 * (slotH + gap) - gap + Math.round(w * 0.03);
      const footerH = Math.max(110, h - footerY - padding);

      return {
        slots,
        footer: {
          x: padding,
          y: footerY,
          width: slotW,
          height: footerH
        }
      };
    }
  },
  {
    id: 'grid-5',
    name: '5-Shot Comic Collage',
    desc: '1 large square hero + 4 square companion panels',
    slotCount: 5,
    badge: 'HERO + 4',
    baseWidth: 1000,
    baseHeight: 1480,
    getSlots(w, h) {
      const padding = Math.round(w * 0.06);
      const gap = Math.round(w * 0.035);
      const topOffset = Math.round(w * 0.06);

      const totalW = w - padding * 2;
      // Top Hero slot centered as a large square
      const heroSize = Math.round(totalW * 0.68);
      const heroX = padding + Math.round((totalW - heroSize) / 2);

      // Bottom 4 slots arranged in a row or 2x2 grid of squares
      const subSlotW = Math.round((totalW - gap * 3) / 4);
      const subSlotH = subSlotW; // STRICT 1:1 SQUARE

      const slots = [
        { index: 0, x: heroX, y: topOffset, width: heroSize, height: heroSize },
        { index: 1, x: padding, y: topOffset + heroSize + gap * 1.5, width: subSlotW, height: subSlotH },
        { index: 2, x: padding + (subSlotW + gap), y: topOffset + heroSize + gap * 1.5, width: subSlotW, height: subSlotH },
        { index: 3, x: padding + (subSlotW + gap) * 2, y: topOffset + heroSize + gap * 1.5, width: subSlotW, height: subSlotH },
        { index: 4, x: padding + (subSlotW + gap) * 3, y: topOffset + heroSize + gap * 1.5, width: subSlotW, height: subSlotH }
      ];

      const footerY = topOffset + heroSize + gap * 1.5 + subSlotH + gap;
      const footerH = Math.max(110, h - footerY - padding);

      return {
        slots,
        footer: {
          x: padding,
          y: footerY,
          width: totalW,
          height: footerH
        }
      };
    }
  }
];

export function getLayoutById(id) {
  return LAYOUTS.find(l => l.id === id) || LAYOUTS[0];
}
