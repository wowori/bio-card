(function () {
  'use strict';

  const CARD_W = 1500;
  const CARD_H = 900;

  const state = {
    line1: 'HELLO',
    line2: 'WORLD',
    bgColor: '#969696',
    fontSize: 220,
    fontFamily: 'system-ui, sans-serif',
    ratio: 70,
    tilt: -25,
    bgPattern: 'grid',
    patternSize: 50,
    shadowIntensity: 50,
    imgRadius: 14,
    imageSize: 420,
    showImage: true,
    singleLine: false,
    sourceImage: null,
    processedData: null,
    hasImage: false,
  };

  /* ── DOM refs ── */
  const canvas     = document.getElementById('cardCanvas');
  const ctx        = canvas.getContext('2d');
  const line1El    = document.getElementById('line1');
  const line2El    = document.getElementById('line2');
  const colorEl    = document.getElementById('bgColor');
  const hexEl      = document.getElementById('colorHex');
  const fontSel    = document.getElementById('fontSelect');
  const fontSlider = document.getElementById('fontSize');
  const fontSizeLbl= document.getElementById('fontSizeLabel');
  const ratioSlider= document.getElementById('ratioSlider');
  const ratioLabel = document.getElementById('ratioLabel');
  const tiltSlider = document.getElementById('tiltSlider');
  const tiltLabel  = document.getElementById('tiltLabel');
  const gridToggle = document.getElementById('showGrid');
  const patternSizeEl = document.getElementById('patternSize');
  const patternSizeLbl= document.getElementById('patternSizeLabel');
  const patternSel = document.getElementById('bgPattern');
  const shadowSlider=document.getElementById('shadowSlider');
  const shadowLabel= document.getElementById('shadowLabel');
  const radiusSlider=document.getElementById('radiusSlider');
  const radiusLabel= document.getElementById('radiusLabel');
  const sizeField   = document.getElementById('sizeField');
  const imageSizeEl = document.getElementById('imageSize');
  const imageSizeLbl= document.getElementById('imageSizeLabel');
  const showImgToggle=document.getElementById('showImageToggle');
  const singleLineToggle=document.getElementById('singleLineToggle');
  const radiusField = document.getElementById('radiusField');
  const imageField  = document.getElementById('imageField');
  const fileEl     = document.getElementById('imageInput');
  const uploadEl   = document.getElementById('uploadArea');
  const hintEl     = document.getElementById('uploadHint');
  const dlBtn      = document.getElementById('downloadBtn');
  const resetBtn   = document.getElementById('resetBtn');

  /* ── roundRect polyfill ── */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      const r = typeof radii === 'number' ? radii : (radii || 0);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      return this;
    };
  }

  /* ── Diagonal helper ── */
  function calcSplit(W, ratio, tilt) {
    const center = W * (ratio / 100);
    const maxTilt = W * 0.25;
    const tiltAmt = (tilt / 50) * maxTilt;
    return { splitTop: center + tiltAmt, splitBot: center - tiltAmt };
  }


  function generatePlaceholderData(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = c.getContext('2d');
    t.fillStyle = '#d8d8d8';
    t.beginPath(); t.arc(w*0.5, h*0.3, w*0.18, 0, Math.PI*2); t.fill();
    t.beginPath(); t.moveTo(w*0.22, h*0.92); t.lineTo(w*0.78, h*0.92);
    t.lineTo(w*0.65, h*0.38); t.lineTo(w*0.35, h*0.38); t.closePath(); t.fill();
    return t.getImageData(0, 0, w, h);
  }

  /* ── Pattern renderers ── */
  function drawPattern(ctx, W, H, splitTop, splitBot, pattern, gs) {
    if (pattern === 'solid') return;
    ctx.lineWidth = 1;
    if (pattern === 'grid' || pattern === 'lines') {
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      const maxX = Math.max(splitTop, splitBot) + gs;
      if (pattern === 'grid') {
        for (let x = 0; x <= maxX; x += gs) {
          ctx.beginPath(); ctx.moveTo(Math.round(x)+0.5, 0); ctx.lineTo(Math.round(x)+0.5, H); ctx.stroke();
        }
      }
      for (let y = 0; y <= H; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, Math.round(y)+0.5);
        ctx.lineTo(Math.round(splitTop + (splitBot-splitTop)*(y/H)) + gs + 0.5, Math.round(y)+0.5);
        ctx.stroke();
      }
    }
    if (pattern === 'grid' || pattern === 'dots') {
      const maxX = Math.max(splitTop, splitBot);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (let x = 0; x <= maxX; x += gs)
        for (let y = 0; y <= H; y += gs) {
          ctx.beginPath(); ctx.arc(Math.round(x)+0.5, Math.round(y)+0.5, 1.5, 0, Math.PI*2); ctx.fill();
        }
    }
    if (pattern === 'crosshatch') {
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      const maxX = Math.max(splitTop, splitBot) + gs;
      for (let i = -H*2; i <= maxX*2; i += gs) {
        ctx.beginPath();
        ctx.moveTo(i-0.5, 0.5);
        const endY = H;
        const endX = splitTop + (splitBot-splitTop) * (endY / H);
        ctx.lineTo(i - endY + 0.5, endY + 0.5);
        ctx.stroke();
      }
    }
  }

  /* ── Draw card ── */
  function drawCard() {
    const W = CARD_W, H = CARD_H;
    const { splitTop, splitBot } = calcSplit(W, state.ratio, state.tilt);


    // — Left zone: grid/pattern —
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(splitTop, 0); ctx.lineTo(splitBot, H); ctx.lineTo(0, H);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, W, H);
    if (state.showGrid) {
      drawPattern(ctx, W, H, splitTop, splitBot, state.bgPattern, state.patternSize);
    }
    ctx.restore();

    // — Right zone: pastel (with shadow for layered effect) —
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 45;
    ctx.shadowOffsetX = -10;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = state.bgColor;
    ctx.beginPath();
    ctx.moveTo(splitTop, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(splitBot, H);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // gradient overlay (clipped to pastel zone)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(splitTop, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(splitBot, H);
    ctx.closePath(); ctx.clip();
    const grad = ctx.createRadialGradient(W*0.72, H*0.5, 0, W*0.72, H*0.5, W*0.5);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // — Image (optional) —
    if (state.showImage) {
      const imgSize = state.imageSize;
      const imgW = imgSize, imgH = imgSize;
      const diagMid = (splitTop + splitBot) * 0.5;
      const imgX = diagMid - imgW/2 + 30;
      const imgY = (H - imgH) / 2;
      const imgR = state.imgRadius;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 45; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 14;
      ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, imgR); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();

      if (state.processedData) {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, imgR); ctx.clip();
        const tmp = document.createElement('canvas'); tmp.width = imgW; tmp.height = imgH;
        tmp.getContext('2d').putImageData(state.processedData, 0, 0);
        ctx.drawImage(tmp, imgX, imgY);
        ctx.restore();
      } else {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, imgR); ctx.fillStyle = '#f2f2f2'; ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, imgR); ctx.stroke();
      ctx.restore();
    }

    // — Text —
    const textX = 70;
    const textCenterY = H / 2;
    const fontSize = state.fontSize;
    const lineGap = fontSize * 0.65;
    const fontStack = `${fontSize}px ${state.fontFamily}`;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const shadowAlpha = state.shadowIntensity / 100;

    if (state.singleLine) {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${0.55 * shadowAlpha})`;
      ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
      ctx.font = `900 ${fontStack}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(state.line1 || ' ', textX, textCenterY);
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${0.55 * shadowAlpha})`;
      ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
      ctx.font = `900 ${fontStack}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(state.line1, textX, textCenterY - lineGap * 0.45);
      ctx.restore();

      ctx.save();
      ctx.font = `900 ${fontStack}`;
      ctx.fillStyle = state.bgColor;
      ctx.fillText(state.line2, textX, textCenterY + lineGap * 0.55);
      ctx.shadowColor = `rgba(0,0,0,${0.12 * shadowAlpha})`;
      ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      ctx.fillText(state.line2, textX, textCenterY + lineGap * 0.55);
      ctx.restore();
    }
  }
  /* ── Re-process image ── */
  function reDither() {
    if (state.sourceImage) {
      const cropSize = Math.min(state.sourceImage.width, state.sourceImage.height);
      const sx = (state.sourceImage.width - cropSize) / 2;
      const sy = (state.sourceImage.height - cropSize) / 2;
      const tmp = document.createElement('canvas');
      tmp.width = state.imageSize;
      tmp.height = state.imageSize;
      tmp.getContext('2d').drawImage(state.sourceImage, sx, sy, cropSize, cropSize, 0, 0, state.imageSize, state.imageSize);
      state.processedData = tmp.getContext('2d').getImageData(0, 0, state.imageSize, state.imageSize);
      drawCard();
    } else if (state.showImage) {
      state.processedData = generatePlaceholderData(state.imageSize, state.imageSize);
      drawCard();
    } else {
      drawCard();
    }
  }

  /* ── Image loading ── */
  function loadImage(file) {
    if (!file) {
      state.hasImage = false;
      state.sourceImage = null;
      state.processedData = null;
      hintEl.textContent = 'Нажмите для загрузки';
      uploadEl.classList.remove('has-image');
      drawCard();
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        state.sourceImage = img;
        state.hasImage = true;
        state.processedData = null;
        hintEl.textContent = file.name;
        uploadEl.classList.add('has-image');
        const cropSize = Math.min(img.width, img.height);
        const sx = (img.width - cropSize) / 2;
        const sy = (img.height - cropSize) / 2;
        const tmp = document.createElement('canvas');
        tmp.width = state.imageSize;
        tmp.height = state.imageSize;
        tmp.getContext('2d').drawImage(img, sx, sy, cropSize, cropSize, 0, 0, state.imageSize, state.imageSize);
        state.processedData = tmp.getContext('2d').getImageData(0, 0, state.imageSize, state.imageSize);
        drawCard();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  /* ── Toggle image controls ── */
  function toggleImageUI(show) {
    radiusField.style.display = show ? '' : 'none';
    sizeField.style.display = show ? '' : 'none';
    imageField.style.display = show ? '' : 'none';
  }

  /* ── Reset ── */
  function resetAll() {
    line1El.value = 'HELLO';
    line2El.value = 'WORLD';
    colorEl.value = '#969696';
    hexEl.textContent = '#969696';
    fontSlider.value = '220';
    fontSizeLbl.textContent = '220px';
    tiltSlider.value = '-25';
    tiltLabel.textContent = '-25';
    gridToggle.checked = true;
    patternSel.value = 'grid';
    shadowSlider.value = '50';
    shadowLabel.textContent = '50%';
    radiusSlider.value = '14';
    radiusLabel.textContent = '14px';
    showImgToggle.checked = true;
    singleLineToggle.checked = false;
    imageSizeEl.value = '420';
    imageSizeLbl.textContent = '420px';
    ratioSlider.value = '70';
    ratioLabel.textContent = '70%';
    state.line2 = 'WORLD';
    state.line1 = 'HELLO';
    patternSizeEl.value = '50';
    patternSizeLbl.textContent = '50px';
    state.patternSize = 50;
    state.bgColor = '#969696';
    state.fontSize = 220;
    state.tilt = -25;
    state.imageSize = 420;
    state.shadowIntensity = 50;
    state.showGrid = true;
    state.bgPattern = 'grid';
    state.fontFamily = 'system-ui, sans-serif';
    fontSel.value = 'system-ui, sans-serif';
    state.imgRadius = 14;
    state.showImage = true;
    state.ratio = 70;
    state.singleLine = false;
    fileEl.value = '';
    toggleImageUI(true);
    loadImage(null);
  }

  /* ── Download ── */
  function downloadPNG() {
    const link = document.createElement('a');
    link.download = 'bio-card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /* ── Init ── */
  function init() {
    line1El.addEventListener('input', function () {
      state.line1 = this.value.trim().toUpperCase() || ' ';
      drawCard();
    });
    line2El.addEventListener('input', function () {
      state.line2 = this.value.trim().toUpperCase() || ' ';
      drawCard();
    });
    fontSel.addEventListener('change', function () {
      state.fontFamily = this.value;
      drawCard();
    });
    fontSlider.addEventListener('input', function () {
      state.fontSize = parseInt(this.value, 10);
      fontSizeLbl.textContent = this.value + 'px';
      drawCard();
    });
    ratioSlider.addEventListener('input', function () {
      state.ratio = parseInt(this.value, 10);
      ratioLabel.textContent = this.value + '%';
      drawCard();
    });
    tiltSlider.addEventListener('input', function () {
      state.tilt = parseInt(this.value, 10);
      tiltLabel.textContent = this.value;
      drawCard();
    });
    colorEl.addEventListener('input', function () {
      state.bgColor = this.value;
      hexEl.textContent = this.value;
      drawCard();
    });
    gridToggle.addEventListener('change', function () {
      state.showGrid = this.checked;
      drawCard();
    });
    patternSel.addEventListener('change', function () {
      state.bgPattern = this.value;
      drawCard();
    });
    patternSizeEl.addEventListener('input', function () {
      state.patternSize = parseInt(this.value, 10);
      patternSizeLbl.textContent = this.value + 'px';
      drawCard();
    });
    shadowSlider.addEventListener('input', function () {
      state.shadowIntensity = parseInt(this.value, 10);
      shadowLabel.textContent = this.value + '%';
      drawCard();
    });
    radiusSlider.addEventListener('input', function () {
      state.imgRadius = parseInt(this.value, 10);
      radiusLabel.textContent = this.value + 'px';
      drawCard();
    });
    showImgToggle.addEventListener('change', function () {
      state.showImage = this.checked;
      toggleImageUI(this.checked);
      drawCard();
    });
    singleLineToggle.addEventListener('change', function () {
      state.singleLine = this.checked;
      drawCard();
    });
    imageSizeEl.addEventListener('input', function () {
      state.imageSize = parseInt(this.value, 10);
      imageSizeLbl.textContent = this.value + 'px';
      reDither();
    });
    fileEl.addEventListener('change', function () {
      loadImage(this.files[0]);
    });
    dlBtn.addEventListener('click', downloadPNG);
    resetBtn.addEventListener('click', resetAll);

    state.processedData = null;
    toggleImageUI(true);
    drawCard();
  }

  init();
})();
