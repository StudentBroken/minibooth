/**
 * Retro & Comic filters for Canvas photo rendering
 */
export const FILTERS = [
  {
    id: 'comic-halftone',
    name: 'Comic Halftone',
    desc: 'Ben-Day dot ink shading & posterized comic tones',
    badge: '★ POP'
  },
  {
    id: 'retro-70s',
    name: '70s Analog',
    desc: 'Warm beige/amber analog tone with soft shadows',
    badge: 'WARM'
  },
  {
    id: 'noir-comic',
    name: 'Noir Ink B&W',
    desc: 'Stark black & white comic graphic contrast',
    badge: 'INK'
  },
  {
    id: 'sepia-newsprint',
    name: 'Vintage Newsprint',
    desc: 'Aged newsprint sepia with paper warmth',
    badge: 'RETRO'
  },
  {
    id: 'pop-art',
    name: 'Pop Art CMYK',
    desc: 'Punchy saturated comic book color print',
    badge: 'BOLD'
  },
  {
    id: 'disposable-90s',
    name: '90s Disposable',
    desc: 'Flash tint with authentic analog grain',
    badge: 'GRAIN'
  },
  {
    id: 'natural',
    name: 'Crisp Natural',
    desc: 'Original true-to-life colors',
    badge: 'CLEAN'
  }
];

/**
 * Apply selected filter to a canvas context
 */
export function applyFilterToContext(ctx, filterId, width, height) {
  if (filterId === 'natural') return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  switch (filterId) {
    case 'comic-halftone': {
      // 1. Boost contrast and posterize
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];

        // Slight saturation boost
        const avg = (r + g + b) / 3;
        r = Math.min(255, Math.max(0, avg + (r - avg) * 1.35));
        g = Math.min(255, Math.max(0, avg + (g - avg) * 1.35));
        b = Math.min(255, Math.max(0, avg + (b - avg) * 1.35));

        // Posterize to 5 comic color levels
        const step = 255 / 4;
        r = Math.round(r / step) * step;
        g = Math.round(g / step) * step;
        b = Math.round(b / step) * step;

        // Warm paper tint
        d[i] = Math.min(255, r * 1.05);
        d[i + 1] = Math.min(255, g * 0.98);
        d[i + 2] = Math.min(255, b * 0.88);
      }
      ctx.putImageData(imgData, 0, 0);

      // 2. Draw Ben-Day halftone dot pattern on top
      ctx.save();
      const dotSpacing = Math.max(6, Math.round(width / 60));
      const dotRadius = dotSpacing * 0.22;
      ctx.fillStyle = 'rgba(30, 27, 24, 0.12)';
      for (let x = 0; x < width; x += dotSpacing) {
        for (let y = 0; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x + (Math.floor(y / dotSpacing) % 2) * (dotSpacing / 2), y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      return;
    }

    case 'retro-70s': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Lift blacks, boost warm red/yellow, tint blues towards teal/beige
        d[i] = Math.min(255, r * 1.15 + 25);
        d[i + 1] = Math.min(255, g * 1.05 + 15);
        d[i + 2] = Math.min(255, b * 0.82 + 10);
      }
      ctx.putImageData(imgData, 0, 0);
      return;
    }

    case 'noir-comic': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Grayscale with dramatic ink weighting
        let gray = r * 0.35 + g * 0.55 + b * 0.1;

        // High contrast comic curve
        gray = gray < 100 ? gray * 0.6 : 100 + (gray - 100) * 1.45;
        gray = Math.min(255, Math.max(0, gray));

        // Newsprint ink tint (off-black and off-white)
        const inkTone = gray < 128 ? gray * 0.85 : 40 + gray * 0.84;
        d[i] = inkTone;
        d[i + 1] = inkTone * 0.96;
        d[i + 2] = inkTone * 0.88;
      }
      ctx.putImageData(imgData, 0, 0);
      return;
    }

    case 'sepia-newsprint': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;

        d[i] = Math.min(255, tr * 1.05);
        d[i + 1] = Math.min(255, tg * 0.98);
        d[i + 2] = Math.min(255, tb * 0.82);
      }
      ctx.putImageData(imgData, 0, 0);
      return;
    }

    case 'pop-art': {
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];

        // Strong comic book print saturation boost
        const avg = (r + g + b) / 3;
        r = Math.min(255, Math.max(0, avg + (r - avg) * 1.6));
        g = Math.min(255, Math.max(0, avg + (g - avg) * 1.6));
        b = Math.min(255, Math.max(0, avg + (b - avg) * 1.6));

        // High contrast S-curve
        d[i] = r < 128 ? (r * r) / 128 : 255 - ((255 - r) * (255 - r)) / 128;
        d[i + 1] = g < 128 ? (g * g) / 128 : 255 - ((255 - g) * (255 - g)) / 128;
        d[i + 2] = b < 128 ? (b * b) / 128 : 255 - ((255 - b) * (255 - b)) / 128;
      }
      ctx.putImageData(imgData, 0, 0);
      return;
    }

    case 'disposable-90s': {
      // Disposable camera flash with subtle grain
      for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 22;
        d[i] = Math.min(255, Math.max(0, d[i] * 1.08 + noise + 10));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * 1.04 + noise));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * 0.92 + noise - 5));
      }
      ctx.putImageData(imgData, 0, 0);
      return;
    }
  }
}
