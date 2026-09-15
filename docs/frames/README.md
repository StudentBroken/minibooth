# Frame Background Patterns

Place your custom frame background pattern files in this folder (`public/frames/`).

### Supported File Formats:
- SVG (`.svg`) - recommended for crisp vector scaling
- PNG (`.png`)
- JPEG / JPG (`.jpg`, `.jpeg`)
- WebP (`.webp`)

### How to Add Your Own Frame:
1. Copy your image or SVG file into this `public/frames/` folder (e.g. `my-pattern.png`).
2. Add an entry to `src/frames.js` in the `BUILTIN_FRAMES` array:
   ```javascript
   {
     id: 'my-pattern',
     name: 'My Custom Pattern',
     file: 'my-pattern.png',
     badge: 'CUSTOM'
   }
   ```
3. Alternatively, you can also click the **"Upload Frame"** button right inside the Photobooth web app to test any pattern file instantly without restarting!
