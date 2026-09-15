/**
 * Camera manager for mobile & desktop:
 * - Switches between front & back cameras on mobile
 * - Selects available video inputs on PC
 * - Handles mirroring for selfie mode
 * - Captures high-resolution still frames
 * - Supports demo/mock photos for testing without hardware
 */
export class CameraManager {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.stream = null;
    this.facingMode = options.facingMode || 'user'; // 'user' (front) or 'environment' (back)
    this.deviceId = options.deviceId || null;
    this.devices = [];
    this.isMirrored = options.isMirrored !== undefined ? options.isMirrored : (this.facingMode === 'user');
    this.isMockMode = options.isMockMode || false;
  }

  getState() {
    return {
      facingMode: this.facingMode,
      deviceId: this.deviceId,
      isMirrored: this.isMirrored,
      isMockMode: this.isMockMode
    };
  }

  async init() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API not supported in this browser.');
    }
    await this.refreshDeviceList();
    return this.startStream();
  }

  async refreshDeviceList() {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.devices = allDevices.filter(d => d.kind === 'videoinput');
    } catch (e) {
      console.warn('Unable to enumerate devices:', e);
      this.devices = [];
    }
  }

  async startStream() {
    this.stopStream();

    const constraints = {
      audio: false,
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    if (this.deviceId) {
      constraints.video.deviceId = { exact: this.deviceId };
    } else {
      constraints.video.facingMode = this.facingMode;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', 'true');
      this.video.setAttribute('webkit-playsinline', 'true');
      await this.video.play();
      this.isMockMode = false;

      this.updateMirrorStyle();

      await this.refreshDeviceList();
      return true;
    } catch (err) {
      console.error('Camera stream error:', err);
      throw err;
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  async switchFacingMode() {
    this.deviceId = null; // reset specific device
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.isMirrored = (this.facingMode === 'user');
    return this.startStream();
  }

  async selectDevice(deviceId) {
    this.deviceId = deviceId;
    return this.startStream();
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    this.updateMirrorStyle();
    return this.isMirrored;
  }

  updateMirrorStyle() {
    if (this.isMirrored) {
      this.video.style.transform = 'scaleX(-1)';
    } else {
      this.video.style.transform = 'scaleX(1)';
    }
  }

  /**
   * Capture a photo from the live video stream into an image data URL
   * Locked to 1:1 square aspect ratio
   */
  capturePhoto() {
    if (this.isMockMode || !this.video.videoWidth) {
      return this.generateMockPhoto();
    }

    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;

    // Strict 1:1 square crop centered in the camera frame
    const minDim = Math.min(vw, vh);
    const cropX = Math.round((vw - minDim) / 2);
    const cropY = Math.round((vh - minDim) / 2);

    const canvas = document.createElement('canvas');
    // High-resolution square output
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    if (this.isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(this.video, cropX, cropY, minDim, minDim, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  /**
   * Fallback mock photo generator when camera is unavailable (strictly 1:1 square)
   */
  generateMockPhoto(index = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Fun retro comic mockup scene
    const bgColors = ['#E76F51', '#2A9D8F', '#E9C46A', '#F4A261', '#457B9D'];
    ctx.fillStyle = bgColors[(index - 1) % bgColors.length];
    ctx.fillRect(0, 0, 1080, 1080);

    // Ben-Day dots overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let x = 15; x < 1080; x += 36) {
      for (let y = 15; y < 1080; y += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Comic Character Silhouette / Silhouette Face
    ctx.fillStyle = '#1E1B18';
    ctx.beginPath();
    ctx.arc(540, 500, 240, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(540, 1050, 360, 380, 0, 0, Math.PI * 2);
    ctx.fill();

    // Comic sunglasses
    ctx.fillStyle = '#F4EBD9';
    ctx.fillRect(400, 460, 120, 65);
    ctx.fillRect(560, 460, 120, 65);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1E1B18';
    ctx.strokeRect(400, 460, 120, 65);
    ctx.strokeRect(560, 460, 120, 65);
    ctx.beginPath();
    ctx.moveTo(520, 492);
    ctx.lineTo(560, 492);
    ctx.stroke();

    // Comic Pose label
    const poses = ['POUT!', 'WINK ;)', 'PEACE ✌', 'SMILE!', 'ROCK ON 🎸'];
    ctx.fillStyle = '#FAF5E8';
    ctx.font = 'bold 70px Bangers, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 16;
    const text = `SHOT #${index}: ${poses[(index - 1) % poses.length]}`;
    ctx.strokeText(text, 540, 180);
    ctx.fillText(text, 540, 180);

    return canvas.toDataURL('image/jpeg', 0.95);
  }
}
