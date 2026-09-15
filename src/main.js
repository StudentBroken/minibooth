import './style.css';
import { sfx } from './audio.js';
import { CameraManager } from './camera.js';
import { LAYOUTS, getLayoutById } from './layouts.js';
import { frameManager } from './frames.js';
import { FILTERS } from './filters.js';
import { renderStrip } from './renderer.js';

// LocalStorage Persistence Key
const SETTINGS_STORAGE_KEY = 'retro_comic_photobooth_settings_v1';

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read settings from localStorage:', e);
  }
  return {};
}

const saved = loadStoredSettings();

// Application State (Hydrated from LocalStorage)
const state = {
  activeView: 'booth', // 'booth' or 'studio'
  capturedPhotos: [],  // Array of 5 photo dataURLs
  selectedLayoutId: saved.selectedLayoutId || 'strip-4',
  slottedPhotos: [],   // Array of photo dataURLs for each slot of the layout
  activeSlotIndex: 0,  // Currently targeted slot for photo placement
  selectedFilterId: saved.selectedFilterId || 'comic-halftone',
  boothTitle: saved.boothTitle !== undefined ? saved.boothTitle : '★ RETRO COMIC BOOTH ★',
  boothDate: saved.boothDate || '',
  isShooting: false,
  cancelShooting: false,
  hasCameraPermission: !!saved.hasCameraPermission
};

// Restore saved Frame
if (saved.selectedFrameId) {
  frameManager.selectFrame(saved.selectedFrameId);
}

// Restore saved Sound setting
if (saved.soundEnabled !== undefined) {
  sfx.enabled = saved.soundEnabled;
}

/**
 * Persist current settings to LocalStorage
 */
function persistSettings() {
  try {
    const dataToSave = {
      selectedLayoutId: state.selectedLayoutId,
      selectedFilterId: state.selectedFilterId,
      selectedFrameId: frameManager.selectedFrameId,
      boothTitle: state.boothTitle,
      boothDate: state.boothDate,
      soundEnabled: sfx.enabled,
      facingMode: camera ? camera.facingMode : (saved.facingMode || 'user'),
      deviceId: camera ? camera.deviceId : (saved.deviceId || null),
      isMirrored: camera ? camera.isMirrored : (saved.isMirrored !== undefined ? saved.isMirrored : true),
      hasCameraPermission: !!state.hasCameraPermission
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Could not save settings to localStorage:', e);
  }
}

// DOM Elements
const elements = {
  // Views
  viewBooth: document.getElementById('view-booth'),
  viewStudio: document.getElementById('view-studio'),
  btnSwitchView: document.getElementById('btn-switch-view'),
  switchViewText: document.getElementById('switch-view-text'),
  boothIndicator: document.getElementById('booth-indicator'),

  // Sound
  btnSoundToggle: document.getElementById('btn-sound-toggle'),
  soundIcon: document.getElementById('sound-icon'),

  // Camera
  videoFeed: document.getElementById('camera-feed'),
  cameraSelect: document.getElementById('camera-select'),
  btnFlipCam: document.getElementById('btn-flip-cam'),
  btnMirrorCam: document.getElementById('btn-mirror-cam'),
  countdownOverlay: document.getElementById('countdown-overlay'),
  countdownTimerBar: document.getElementById('countdown-timer-bar'),
  countdownNum: document.getElementById('countdown-num'),
  countdownSub: document.getElementById('countdown-sub'),
  shotBadge: document.getElementById('shot-badge'),
  currentShotIndex: document.getElementById('current-shot-index'),
  shutterFlash: document.getElementById('shutter-flash'),
  boothThumbnails: document.getElementById('booth-thumbnails'),
  cameraFallback: document.getElementById('camera-fallback-msg'),
  btnRetryCamera: document.getElementById('btn-retry-camera'),
  btnMockPhotos: document.getElementById('btn-mock-photos'),

  // Booth Actions
  btnStartBooth: document.getElementById('btn-start-booth'),
  boothActiveStatus: document.getElementById('booth-active-status'),
  boothStatusText: document.getElementById('booth-status-text'),
  btnCancelBooth: document.getElementById('btn-cancel-booth'),

  // Studio Elements
  capturedPhotosTray: document.getElementById('captured-photos-tray'),
  stripCanvas: document.getElementById('strip-canvas'),
  canvasMount: document.getElementById('canvas-mount'),
  activeSlotPill: document.getElementById('active-slot-pill'),
  btnQuickFill: document.getElementById('btn-quick-fill'),
  btnClearSlots: document.getElementById('btn-clear-slots'),
  btnRetakeBooth: document.getElementById('btn-retake-booth'),

  // Tabs & Customizers
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  layoutOptionsGrid: document.getElementById('layout-options-grid'),
  frameOptionsGrid: document.getElementById('frame-options-grid'),
  filterOptionsGrid: document.getElementById('filter-options-grid'),
  inputCustomFrame: document.getElementById('input-custom-frame'),
  inputBoothTitle: document.getElementById('input-booth-title'),
  inputBoothDate: document.getElementById('input-booth-date'),
  btnDownloadStrip: document.getElementById('btn-download-strip'),
  btnShareStrip: document.getElementById('btn-share-strip'),

  // Modal Elements
  previewModal: document.getElementById('preview-modal'),
  previewModalImg: document.getElementById('preview-modal-img'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnModalShare: document.getElementById('btn-modal-share'),
  btnModalNewTab: document.getElementById('btn-modal-new-tab'),
  btnModalDownload: document.getElementById('btn-modal-download'),
  btnModalCloseBottom: document.getElementById('btn-modal-close-bottom'),

  // Toast
  toast: document.getElementById('comic-toast')
};

// Variables to store current exported artifacts
let currentExportedBlob = null;
let currentExportedDataUrl = null;
let currentExportedFile = null;
let currentExportedFileName = 'photobooth-strip.png';

/**
 * Generate formatted filename for the photo strip
 */
function generateStripFileName(baseName = 'photobooth-strip') {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${baseName}-${dateStr}.png`;
}

/**
 * Synchronously convert base64 Data URL to Blob (instant, no async callback delay)
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Trigger file download from Blob with guaranteed valid filename & extension
 */
function downloadBlobFile(blob, baseName = 'photobooth-strip') {
  const fileName = currentExportedFileName || generateStripFileName(baseName);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.setAttribute('href', blobUrl);
  link.setAttribute('download', fileName);

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(blobUrl);
  }, 4000);

  return fileName;
}

// Initialize Camera Manager with saved preferences
const camera = new CameraManager(elements.videoFeed, {
  facingMode: saved.facingMode || 'user',
  deviceId: saved.deviceId || null,
  isMirrored: saved.isMirrored !== undefined ? saved.isMirrored : true
});

/**
 * Show a comic styled toast message
 */
function showToast(message, duration = 2500) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, duration);
}

/**
 * Switch Views
 */
function switchView(viewName) {
  state.activeView = viewName;
  if (viewName === 'booth') {
    elements.viewBooth.classList.add('active');
    elements.viewStudio.classList.remove('active');
    elements.btnSwitchView.style.display = state.capturedPhotos.length > 0 ? 'inline-flex' : 'none';
    elements.switchViewText.textContent = 'VIEW STRIP ➔';
  } else {
    elements.viewBooth.classList.remove('active');
    elements.viewStudio.classList.add('active');
    elements.btnSwitchView.style.display = 'inline-flex';
    elements.switchViewText.textContent = '📷 CAMERA';
    renderStudio();
  }
}

/**
 * Camera Initialization
 */
async function setupCamera() {
  try {
    elements.cameraFallback.style.display = 'none';
    await camera.init();
    state.hasCameraPermission = true;
    persistSettings();
    populateCameraDevices();
    showToast('★ CAMERA READY! 5-SHOT BOOTH IS LIVE ★', 2200);
  } catch (err) {
    console.warn('Camera start issue:', err);
    elements.cameraFallback.style.display = 'flex';
  }
}

function populateCameraDevices() {
  elements.cameraSelect.innerHTML = '';
  if (camera.devices.length <= 1) {
    elements.cameraSelect.style.display = 'none';
    return;
  }
  elements.cameraSelect.style.display = 'inline-block';
  camera.devices.forEach((dev, idx) => {
    const opt = document.createElement('option');
    opt.value = dev.deviceId;
    opt.textContent = dev.label || `Camera ${idx + 1}`;
    if (camera.deviceId && dev.deviceId === camera.deviceId) {
      opt.selected = true;
    }
    elements.cameraSelect.appendChild(opt);
  });
}

/**
 * 5-Shot Sequence with 6-second countdown per shot
 */
async function startBoothSequence() {
  if (state.isShooting) return;
  state.isShooting = true;
  state.cancelShooting = false;
  state.capturedPhotos = [];

  // Reset UI
  elements.btnStartBooth.style.display = 'none';
  elements.boothActiveStatus.style.display = 'flex';
  elements.boothIndicator.classList.add('busy');
  resetThumbnails();

  const TOTAL_SHOTS = 5;
  const COUNTDOWN_SECONDS = 6;

  for (let shot = 1; shot <= TOTAL_SHOTS; shot++) {
    if (state.cancelShooting) break;

    elements.boothStatusText.textContent = `PREPARING SHOT ${shot} OF ${TOTAL_SHOTS}...`;
    elements.currentShotIndex.textContent = shot;
    elements.shotBadge.style.display = 'block';
    elements.countdownOverlay.classList.add('active');
    if (elements.countdownTimerBar) {
      elements.countdownTimerBar.style.width = '100%';
    }

    // 6-second countdown
    for (let c = COUNTDOWN_SECONDS; c >= 1; c--) {
      if (state.cancelShooting) break;

      elements.countdownNum.classList.remove('snap');
      elements.countdownNum.textContent = c;
      elements.countdownSub.textContent = c <= 2 ? 'HOLD POSE!' : 'GET READY!';

      // Animate top timer bar
      if (elements.countdownTimerBar) {
        elements.countdownTimerBar.style.width = `${((c - 1) / COUNTDOWN_SECONDS) * 100}%`;
      }

      // Audio tick
      sfx.playTick(c <= 2);

      // Wait 1 second
      await new Promise(r => setTimeout(r, 1000));
    }

    if (state.cancelShooting) break;

    // SNAP MOMENT!
    elements.countdownNum.classList.add('snap');
    elements.countdownNum.textContent = '📸';
    elements.countdownSub.textContent = '★ SNAP! ★';
    if (elements.countdownTimerBar) {
      elements.countdownTimerBar.style.width = '0%';
    }

    // Trigger visual flash
    elements.shutterFlash.classList.add('flashing');
    sfx.playShutter();

    // Capture photo from video feed
    const photoDataUrl = camera.capturePhoto();
    state.capturedPhotos.push(photoDataUrl);

    // Update thumbnail in roll
    updateThumbnail(shot - 1, photoDataUrl);

    await new Promise(r => setTimeout(r, 150));
    elements.shutterFlash.classList.remove('flashing');

    // Brief preview delay before next shot
    if (shot < TOTAL_SHOTS) {
      elements.countdownSub.textContent = `SHOT ${shot} SAVED! NEXT UP...`;
      await new Promise(r => setTimeout(r, 700));
    }
  }

  // End of session
  elements.countdownOverlay.classList.remove('active');
  elements.shotBadge.style.display = 'none';
  elements.btnStartBooth.style.display = 'flex';
  elements.boothActiveStatus.style.display = 'none';
  elements.boothIndicator.classList.remove('busy');
  state.isShooting = false;

  if (state.cancelShooting) {
    showToast('PHOTOBOOTH SESSION CANCELLED');
    return;
  }

  // Successfully captured all 5 photos!
  showToast('🎉 ALL 5 PHOTOS CAPTURED! OPENING STUDIO...', 2000);

  // Auto-slot photos into the layout
  autoFillSlots();

  // Auto-switch to Studio view
  setTimeout(() => {
    switchView('studio');
  }, 900);
}

function resetThumbnails() {
  const slots = elements.boothThumbnails.querySelectorAll('.shot-thumb-slot');
  slots.forEach((slot, i) => {
    slot.innerHTML = `<span>#${i + 1}</span>`;
    slot.classList.remove('filled');
  });
}

function updateThumbnail(index, dataUrl) {
  const slots = elements.boothThumbnails.querySelectorAll('.shot-thumb-slot');
  if (slots[index]) {
    slots[index].innerHTML = `<img src="${dataUrl}" alt="Shot ${index + 1}" />`;
    slots[index].classList.add('filled');
  }
}

/**
 * Studio: Auto-fill layout slots with captured photos
 */
function autoFillSlots() {
  const layout = getLayoutById(state.selectedLayoutId);
  state.slottedPhotos = new Array(layout.slotCount).fill(null);

  // Fill in sequential order
  for (let i = 0; i < layout.slotCount; i++) {
    if (state.capturedPhotos[i]) {
      state.slottedPhotos[i] = state.capturedPhotos[i];
    }
  }
  state.activeSlotIndex = 0;
}

/**
 * Studio: Render top tray of 5 captured photos
 */
function renderCapturedTray() {
  elements.capturedPhotosTray.innerHTML = '';
  const layout = getLayoutById(state.selectedLayoutId);

  state.capturedPhotos.forEach((photoUrl, idx) => {
    const card = document.createElement('div');
    card.className = 'tray-photo-card';

    // Find which slots in the current strip contain this photo
    const assignedSlots = [];
    state.slottedPhotos.forEach((slottedUrl, sIdx) => {
      if (slottedUrl === photoUrl) {
        assignedSlots.push(`#${sIdx + 1}`);
      }
    });

    const usageBadge = assignedSlots.length > 0
      ? `<span class="tray-photo-usage" title="Assigned to ${assignedSlots.join(', ')}">P: ${assignedSlots.join(', ')}</span>`
      : '';

    card.innerHTML = `
      <img src="${photoUrl}" alt="Shot #${idx + 1}" />
      <span class="tray-photo-pin">#${idx + 1}</span>
      ${usageBadge}
    `;

    // Click to place into targeted slot
    card.addEventListener('click', () => {
      placePhotoInSlot(photoUrl, state.activeSlotIndex);
      sfx.playTick(false);

      // Advance targeted slot automatically to next slot for convenience
      state.activeSlotIndex = (state.activeSlotIndex + 1) % layout.slotCount;
      updateActiveSlotIndicator();
      renderStudio();
    });

    elements.capturedPhotosTray.appendChild(card);
  });
}

/**
 * Place a photo in a specific strip slot
 */
function placePhotoInSlot(photoUrl, slotIndex) {
  const layout = getLayoutById(state.selectedLayoutId);
  if (slotIndex < 0 || slotIndex >= layout.slotCount) return;
  state.slottedPhotos[slotIndex] = photoUrl;
  showToast(`Placed in Panel #${slotIndex + 1}!`, 1000);
}

/**
 * Update indicator pill showing which slot is currently targeted
 */
function updateActiveSlotIndicator() {
  elements.activeSlotPill.textContent = `Target: Panel #${state.activeSlotIndex + 1}`;
}

/**
 * Calculate safe export scale ensuring canvas dimensions never exceed 3200px
 * (Guarantees iOS WebKit memory & canvas buffer stability without crashes)
 */
function getSafeExportScale(layout) {
  const maxDim = Math.max(layout.baseWidth, layout.baseHeight);
  const maxAllowedDim = 3200;
  return Math.min(2, Math.max(1, Math.floor((maxAllowedDim / maxDim) * 10) / 10));
}

/**
 * Update high-res export cache and pre-generate blob/dataUrl/file
 */
async function updateExportCache() {
  try {
    const layout = getLayoutById(state.selectedLayoutId);
    const frame = frameManager.getSelectedFrame();
    const scale = getSafeExportScale(layout);

    const exportCanvas = document.createElement('canvas');
    await renderStrip({
      targetCanvas: exportCanvas,
      layout,
      slottedPhotos: state.slottedPhotos,
      frame,
      filterId: state.selectedFilterId,
      title: state.boothTitle,
      dateText: state.boothDate,
      scale,
      activeSlotIndex: -1 // Clean strip without red targeted panel outline
    });

    const dataUrl = exportCanvas.toDataURL('image/png');
    currentExportedDataUrl = dataUrl;

    const blob = dataUrlToBlob(dataUrl);
    currentExportedBlob = blob;

    const fileName = generateStripFileName('photobooth-strip');
    currentExportedFileName = fileName;
    currentExportedFile = new File([blob], fileName, {
      type: 'image/png',
      lastModified: Date.now()
    });

    if (elements.previewModalImg) {
      elements.previewModalImg.src = dataUrl;
    }
  } catch (err) {
    console.warn('Background export cache generation error:', err);
  }
}

/**
 * Render complete Studio Customizer & Canvas
 */
async function renderStudio() {
  renderCapturedTray();
  updateActiveSlotIndicator();

  const layout = getLayoutById(state.selectedLayoutId);
  const frame = frameManager.getSelectedFrame();

  await renderStrip({
    targetCanvas: elements.stripCanvas,
    layout,
    slottedPhotos: state.slottedPhotos,
    frame,
    filterId: state.selectedFilterId,
    title: state.boothTitle,
    dateText: state.boothDate,
    scale: 1, // 1x for fast interactive preview
    activeSlotIndex: state.activeSlotIndex
  });

  // Update export cache immediately
  updateExportCache();
}

/**
 * Build Layout Option Cards
 */
function initLayoutOptions() {
  elements.layoutOptionsGrid.innerHTML = '';
  LAYOUTS.forEach(l => {
    const card = document.createElement('div');
    card.className = `option-card ${l.id === state.selectedLayoutId ? 'active' : ''}`;
    card.innerHTML = `
      <div class="option-header">
        <span class="option-badge">${l.badge}</span>
        <span style="font-size: 0.8rem; font-weight: bold;">${l.slotCount} PICS</span>
      </div>
      <div class="option-title">${l.name}</div>
      <div class="option-desc">${l.desc}</div>
    `;

    card.addEventListener('click', () => {
      state.selectedLayoutId = l.id;
      // Adjust slotted photos array size
      autoFillSlots();
      document.querySelectorAll('#layout-options-grid .option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      persistSettings();
      renderStudio();
    });

    elements.layoutOptionsGrid.appendChild(card);
  });
}

/**
 * Build Frame Pattern Option Cards
 */
function initFrameOptions() {
  elements.frameOptionsGrid.innerHTML = '';
  const frames = frameManager.getFrames();
  const selectedFrame = frameManager.getSelectedFrame();

  frames.forEach(f => {
    const card = document.createElement('div');
    card.className = `option-card ${f.id === selectedFrame.id ? 'active' : ''}`;

    const previewBg = f.dataUrl || f.file;
    card.innerHTML = `
      <div class="option-header">
        <span class="option-badge">${f.badge}</span>
      </div>
      <div class="frame-preview-thumb" style="background-image: url('${previewBg}');"></div>
      <div class="option-title">${f.name}</div>
      <div class="option-desc">${f.desc || ''}</div>
    `;

    card.addEventListener('click', () => {
      frameManager.selectFrame(f.id);
      document.querySelectorAll('#frame-options-grid .option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      persistSettings();
      renderStudio();
    });

    elements.frameOptionsGrid.appendChild(card);
  });
}

/**
 * Build Filter Option Cards
 */
function initFilterOptions() {
  elements.filterOptionsGrid.innerHTML = '';
  FILTERS.forEach(fil => {
    const card = document.createElement('div');
    card.className = `option-card ${fil.id === state.selectedFilterId ? 'active' : ''}`;
    card.innerHTML = `
      <div class="option-header">
        <span class="option-badge">${fil.badge}</span>
      </div>
      <div class="option-title">${fil.name}</div>
      <div class="option-desc">${fil.desc}</div>
    `;

    card.addEventListener('click', () => {
      state.selectedFilterId = fil.id;
      document.querySelectorAll('#filter-options-grid .option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      persistSettings();
      renderStudio();
    });

    elements.filterOptionsGrid.appendChild(card);
  });
}

/**
 * Setup Event Listeners
 */
function setupEvents() {
  // Sound toggle
  elements.btnSoundToggle.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    elements.soundIcon.textContent = sfx.enabled ? '🔊' : '🔇';
    persistSettings();
    showToast(sfx.enabled ? 'SOUND EFFECTS: ON' : 'SOUND EFFECTS: OFF', 1200);
  });

  // Camera buttons
  elements.btnFlipCam.addEventListener('click', async () => {
    try {
      await camera.switchFacingMode();
      persistSettings();
      showToast(`CAMERA: ${camera.facingMode.toUpperCase()}`, 1200);
    } catch (e) {
      showToast('Could not flip camera', 1500);
    }
  });

  elements.btnMirrorCam.addEventListener('click', () => {
    const isMirrored = camera.toggleMirror();
    persistSettings();
    showToast(isMirrored ? 'MIRROR: ON' : 'MIRROR: OFF', 1200);
  });

  elements.cameraSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      camera.selectDevice(e.target.value);
      persistSettings();
    }
  });

  elements.btnRetryCamera.addEventListener('click', setupCamera);

  // Mock demo photos button (for testing without camera hardware)
  elements.btnMockPhotos.addEventListener('click', () => {
    camera.isMockMode = true;
    elements.cameraFallback.style.display = 'none';
    showToast('★ DEMO PHOTO MODE ACTIVE ★', 1500);
  });

  // Start 5-Shot Photobooth
  elements.btnStartBooth.addEventListener('click', startBoothSequence);

  // Cancel 5-Shot Photobooth
  elements.btnCancelBooth.addEventListener('click', () => {
    state.cancelShooting = true;
  });

  // Switch View Masthead Button
  elements.btnSwitchView.addEventListener('click', () => {
    if (state.activeView === 'booth') {
      switchView('studio');
    } else {
      switchView('booth');
    }
  });

  // Studio: Click directly on the Canvas strip to select a slot
  elements.stripCanvas.addEventListener('click', (e) => {
    const rect = elements.stripCanvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * elements.stripCanvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * elements.stripCanvas.height;

    const layout = getLayoutById(state.selectedLayoutId);
    const { slots } = layout.getSlots(elements.stripCanvas.width, elements.stripCanvas.height);

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (
        clickX >= slot.x &&
        clickX <= slot.x + slot.width &&
        clickY >= slot.y &&
        clickY <= slot.y + slot.height
      ) {
        state.activeSlotIndex = i;
        sfx.playTick(false);
        renderStudio();
        showToast(`Targeted Panel #${i + 1}! Click any photo above to place.`, 1500);
        return;
      }
    }
  });

  // Studio: Quick Fill Order
  elements.btnQuickFill.addEventListener('click', () => {
    autoFillSlots();
    renderStudio();
    showToast('Photos placed in 1-2-3-4 order!', 1200);
  });

  // Studio: Clear Slots
  elements.btnClearSlots.addEventListener('click', () => {
    const layout = getLayoutById(state.selectedLayoutId);
    state.slottedPhotos = new Array(layout.slotCount).fill(null);
    state.activeSlotIndex = 0;
    renderStudio();
    showToast('Cleared panels! Click photos above to fill.', 1200);
  });

  // Studio: Retake 5 Pictures
  elements.btnRetakeBooth.addEventListener('click', () => {
    switchView('booth');
  });

  // Tab switching
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // Custom Frame File Upload
  elements.inputCustomFrame.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target.result;
      frameManager.addCustomFrame(file.name.replace(/\.[^/.]+$/, ''), dataUrl);
      initFrameOptions();
      persistSettings();
      renderStudio();
      showToast(`Custom Frame Added: ${file.name}!`, 1800);
    };
    reader.readAsDataURL(file);
  });

  // Text inputs
  elements.inputBoothTitle.addEventListener('input', (e) => {
    state.boothTitle = e.target.value;
    persistSettings();
    renderStudio();
  });

  elements.inputBoothDate.addEventListener('input', (e) => {
    state.boothDate = e.target.value;
    persistSettings();
    renderStudio();
  });

  /**
   * Get pre-rendered export package or generate one synchronously on-the-fly from stripCanvas
   * Guarantees zero null pointer and zero async wait during user gesture!
   */
  function getReadyExportPackage() {
    if (currentExportedBlob && currentExportedFile && currentExportedDataUrl) {
      return {
        blob: currentExportedBlob,
        file: currentExportedFile,
        dataUrl: currentExportedDataUrl,
        fileName: currentExportedFileName
      };
    }

    // Synchronous immediate fallback from live canvas
    try {
      const dataUrl = elements.stripCanvas.toDataURL('image/png');
      const blob = dataUrlToBlob(dataUrl);
      const fileName = generateStripFileName('photobooth-strip');
      const file = new File([blob], fileName, {
        type: 'image/png',
        lastModified: Date.now()
      });

      currentExportedDataUrl = dataUrl;
      currentExportedBlob = blob;
      currentExportedFile = file;
      currentExportedFileName = fileName;

      if (elements.previewModalImg) {
        elements.previewModalImg.src = dataUrl;
      }

      return { blob, file, dataUrl, fileName };
    } catch (e) {
      console.error('Fallback export generation failed:', e);
      return null;
    }
  }

  // Modal helpers
  function openPreviewModal() {
    const pkg = getReadyExportPackage();
    if (pkg && elements.previewModalImg) {
      elements.previewModalImg.src = pkg.dataUrl;
    }
    elements.previewModal.classList.add('active');
  }

  function closePreviewModal() {
    elements.previewModal.classList.remove('active');
  }

  /**
   * Open photo strip in a dedicated tab/window for 100% reliable iOS long-press saving
   */
  function openImageInNewTab() {
    const pkg = getReadyExportPackage();
    if (!pkg) {
      showToast('Could not open image', 1500);
      return;
    }

    try {
      const newTab = window.open('');
      if (newTab) {
        newTab.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>Photobooth Strip</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #201D1A;
      color: #FAF6ED;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 16px 12px 36px;
    }
    .save-banner {
      background: #E63946;
      color: #FFF;
      font-weight: 700;
      font-size: 15px;
      padding: 12px 20px;
      border-radius: 24px;
      margin-bottom: 18px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    }
    .img-wrap {
      display: flex;
      justify-content: center;
      width: 100%;
      max-width: 650px;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      -webkit-touch-callout: default !important;
      -webkit-user-select: auto !important;
      user-select: auto !important;
      pointer-events: auto !important;
    }
  </style>
</head>
<body>
  <div class="save-banner">📸 Touch &amp; Hold image below to Save to Photos</div>
  <div class="img-wrap">
    <img src="${pkg.dataUrl}" alt="Photobooth Strip" />
  </div>
</body>
</html>`);
        newTab.document.close();
        showToast('Opened in new tab! Touch & hold image to save.', 2500);
        return;
      }
    } catch (err) {
      console.warn('Could not open new tab:', err);
    }

    openPreviewModal();
  }

  /**
   * Native Share Sheet (strictly synchronous call on user gesture)
   * Note: On iOS Safari, passing only { files: [file] } is critical for native Camera Roll saving.
   */
  function triggerNativeShare() {
    const pkg = getReadyExportPackage();
    if (!pkg) {
      showToast('Preparing strip, please wait...', 1500);
      return;
    }

    if (navigator.canShare && navigator.canShare({ files: [pkg.file] })) {
      navigator.share({
        files: [pkg.file]
      }).then(() => {
        showToast('★ SHARED / SAVED! ★', 2000);
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Share error, opening preview modal:', err);
          openPreviewModal();
        }
      });
    } else {
      openPreviewModal();
      showToast('Touch & hold image to Save to Photos!', 3000);
    }
  }

  /**
   * Download / Save Handler (iOS & Desktop optimized)
   */
  function triggerDownloadOrSave() {
    const pkg = getReadyExportPackage();
    if (!pkg) {
      showToast('Preparing strip, please wait...', 1500);
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // On iPhone / iPad:
      // Try native Share Sheet first: has the native iOS "Save Image" to Photos option!
      if (navigator.canShare && navigator.canShare({ files: [pkg.file] })) {
        navigator.share({
          files: [pkg.file]
        }).then(() => {
          showToast('★ SAVED TO PHOTOS / SHARED! ★', 2200);
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('iOS share error, opening preview modal:', err);
            openPreviewModal();
          }
        });
        return;
      }

      // If Web Share is not supported (e.g. HTTP on local network):
      openPreviewModal();
      showToast('Touch & hold image to Save to Photos!', 3000);
    } else {
      // On Desktop / Android: trigger direct download
      const fileName = downloadBlobFile(pkg.blob, 'photobooth-strip');
      showToast(`★ DOWNLOADED: ${fileName} ★`, 2500);
    }
  }

  // Export Buttons
  elements.btnDownloadStrip.addEventListener('click', triggerDownloadOrSave);
  elements.btnShareStrip.addEventListener('click', triggerNativeShare);

  // Modal event listeners
  if (elements.btnModalShare) {
    elements.btnModalShare.addEventListener('click', triggerNativeShare);
  }
  if (elements.btnModalNewTab) {
    elements.btnModalNewTab.addEventListener('click', openImageInNewTab);
  }
  elements.btnModalDownload.addEventListener('click', () => {
    const pkg = getReadyExportPackage();
    if (pkg) {
      const fileName = downloadBlobFile(pkg.blob, 'photobooth-strip');
      showToast(`★ DOWNLOADED: ${fileName} ★`, 2000);
    }
  });
  if (elements.previewModalImg) {
    elements.previewModalImg.addEventListener('click', () => {
      showToast('Touch & hold image to Save to Photos!', 2200);
    });
  }
  elements.btnCloseModal.addEventListener('click', closePreviewModal);
  elements.btnModalCloseBottom.addEventListener('click', closePreviewModal);
  elements.previewModal.addEventListener('click', (e) => {
    if (e.target === elements.previewModal) {
      closePreviewModal();
    }
  });
}

/**
 * App Boot
 */
async function main() {
  // Synchronize UI inputs with saved localStorage values
  elements.inputBoothTitle.value = state.boothTitle;
  elements.inputBoothDate.value = state.boothDate;
  elements.soundIcon.textContent = sfx.enabled ? '🔊' : '🔇';

  initLayoutOptions();
  initFrameOptions();
  initFilterOptions();
  setupEvents();
  await setupCamera();
}

window.addEventListener('DOMContentLoaded', main);
