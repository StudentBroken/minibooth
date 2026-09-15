/**
 * Frame Background Patterns Registry
 * Loads pattern files from /frames/ directory and supports custom user additions
 */

const baseUrl = import.meta.env.BASE_URL || './';
const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export const BUILTIN_FRAMES = [
  {
    id: 'ben-day-dots',
    name: 'Ben-Day Dots',
    file: `${cleanBase}frames/ben-day-dots.svg`,
    badge: 'COMIC',
    desc: 'Classic vintage comic halftone pattern'
  },
  {
    id: 'action-burst',
    name: 'Action Burst',
    file: `${cleanBase}frames/action-burst.svg`,
    badge: 'ACTION',
    desc: 'Vintage pop-art comic ray burst'
  },
  {
    id: 'vintage-checkers',
    name: 'Diner Checkers',
    file: `${cleanBase}frames/vintage-checkers.svg`,
    badge: 'RETRO',
    desc: '1950s beige & sand photobooth tile'
  },
  {
    id: 'retro-stripes',
    name: '70s Stripes',
    file: `${cleanBase}frames/retro-stripes.svg`,
    badge: '70s',
    desc: 'Warm caramel, rust & teal diagonal stripes'
  },
  {
    id: 'kraft-paper',
    name: 'Kraft Newsprint',
    file: `${cleanBase}frames/kraft-paper.svg`,
    badge: 'PULP',
    desc: 'Textured aged paper with subtle print grain'
  },
  {
    id: 'comic-halftone-grid',
    name: 'Comic Crosshair',
    file: `${cleanBase}frames/comic-halftone-grid.svg`,
    badge: 'INK',
    desc: 'Comic book grid lines with alignment crosshairs'
  },
  {
    id: 'vintage-stars',
    name: 'Retro Sparkles',
    file: `${cleanBase}frames/vintage-stars.svg`,
    badge: 'SPARK',
    desc: 'Retro 4-point comic star twinkles'
  },
  {
    id: 'classic-cream',
    name: 'Classic Cream',
    file: `${cleanBase}frames/classic-cream.svg`,
    badge: 'CLEAN',
    desc: 'Minimalist warm beige canvas texture'
  }
];

class FrameManager {
  constructor() {
    this.frames = [...BUILTIN_FRAMES];
    this.imageCache = new Map();
    this.selectedFrameId = this.frames[0].id;
  }

  getFrames() {
    return this.frames;
  }

  getSelectedFrame() {
    return this.frames.find(f => f.id === this.selectedFrameId) || this.frames[0];
  }

  selectFrame(id) {
    const found = this.frames.find(f => f.id === id);
    if (found) {
      this.selectedFrameId = id;
    }
  }

  /**
   * Load image and return HTMLImageElement (cached)
   */
  async loadFrameImage(frame) {
    const cacheKey = frame.file || frame.dataUrl;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(cacheKey, img);
        resolve(img);
      };
      img.onerror = (err) => {
        console.warn(`Could not load frame pattern image: ${cacheKey}`, err);
        // Fallback to simple colored pattern
        resolve(null);
      };
      img.src = frame.dataUrl || frame.file;
    });
  }

  /**
   * Add a custom frame from an uploaded file
   */
  addCustomFrame(name, dataUrl) {
    const newFrame = {
      id: `custom-${Date.now()}`,
      name: name || 'Custom Pattern',
      dataUrl: dataUrl,
      badge: 'CUSTOM',
      desc: 'User uploaded frame pattern'
    };
    this.frames.unshift(newFrame);
    this.selectedFrameId = newFrame.id;
    return newFrame;
  }
}

export const frameManager = new FrameManager();
