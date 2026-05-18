/**
 * share-card.js — Easy Sport
 * Génère une image de partage de séance 1080×1350 px sur Canvas.
 * Inspiré du style Strava : fond sombre/clair, stats, mini-carte GPS.
 *
 * API publique :
 *   ShareCard.generate(sessionData, options)  → Promise<HTMLCanvasElement>
 *   ShareCard.download(canvas, filename)
 *   ShareCard.share(canvas, filename)         → Promise<boolean>
 *
 * sessionData : {
 *   activityLabel : string,
 *   activityIcon  : string (emoji),
 *   distanceKm    : number|null,
 *   durationMin   : number|null,
 *   pace          : string|null,
 *   elevationM    : number|null,
 *   date          : number (timestamp),
 *   trace         : Array<{lat, lng}>  (optionnel)
 * }
 * options : { darkMode: boolean }
 */

const ShareCard = (() => {
  // ── Dimensions ──────────────────────────────────────────────
  const W = 1080;
  const H = 1350;

  // ── Thèmes ──────────────────────────────────────────────────
  const THEMES = {
    dark: {
      bg1: '#0f0f1a',
      bg2: '#1a1a2e',
      accent1: '#4ade80',
      accent2: '#22c55e',
      grad1: '#4ade80',
      grad2: '#3b82f6',
      text: '#f0f0ff',
      textSub: 'rgba(240,240,255,0.60)',
      textMuted: 'rgba(240,240,255,0.35)',
      card: 'rgba(255,255,255,0.05)',
      cardBorder: 'rgba(255,255,255,0.10)',
      mapBg: '#111827',
      trace: '#ef4444',
      traceGlow: 'rgba(239,68,68,0.35)',
      logoGrad1: '#e040fb',
      logoGrad2: '#7c3aed'
    },
    light: {
      bg1: '#f8f9fa',
      bg2: '#e8f5e9',
      accent1: '#16a34a',
      accent2: '#15803d',
      grad1: '#16a34a',
      grad2: '#2563eb',
      text: '#0f172a',
      textSub: 'rgba(15,23,42,0.60)',
      textMuted: 'rgba(15,23,42,0.40)',
      card: 'rgba(0,0,0,0.04)',
      cardBorder: 'rgba(0,0,0,0.10)',
      mapBg: '#e2e8f0',
      trace: '#dc2626',
      traceGlow: 'rgba(220,38,38,0.25)',
      logoGrad1: '#c026d3',
      logoGrad2: '#7c3aed'
    }
  };

  // ── Helpers ─────────────────────────────────────────────────

  function _dpr() { return 1; } // Canvas mémoire = taille réelle

  /** Formate une durée en minutes → 'Xh YYmin' ou 'XXmin' */
  function _formatDuration(min) {
    if (!min) return '--';
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${m} min`;
  }

  /** Formate une date en FR */
  function _formatDate(ts) {
    return new Date(ts).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /** Capitalise la 1ère lettre */
  function _cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /** Normalise les points GPS → coordonnées canvas */
  function _normalizePoints(points, x, y, w, h, padding) {
    if (!points || points.length < 2) return [];
    const pad = padding || 24;
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const rangeY = maxLat - minLat || 0.0001;
    const rangeX = maxLng - minLng || 0.0001;
    // Keep aspect ratio
    const availW = w - pad * 2;
    const availH = h - pad * 2;
    const scaleX = availW / rangeX;
    const scaleY = availH / rangeY;
    const scale = Math.min(scaleX, scaleY);
    const offX = x + pad + (availW - rangeX * scale) / 2;
    const offY = y + pad + (availH - rangeY * scale) / 2;
    return points.map(p => [
      offX + (p[1] - minLng) * scale,
      offY + (maxLat - p[0]) * scale  // invert Y (lat up)
    ]);
  }

  /** Dessine la mini-carte GPS sur le canvas */
  function _drawMiniMap(ctx, theme, trace, x, y, w, h) {
    // Fond carte
    ctx.save();
    const r = 20;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = theme.mapBg;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    if (!trace || trace.length < 2) {
      // Pas de trace : afficher texte centré
      ctx.fillStyle = theme.textMuted;
      ctx.font = `400 28px 'SF Pro Rounded', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Séance sans trace GPS', x + w / 2, y + h / 2);
      ctx.restore();
      return;
    }

    // Convertir trace → points [lat, lng]
    const points = trace.map(p => [p.lat !== undefined ? p.lat : p[0], p.lng !== undefined ? p.lng : p[1]]);
    const norm = _normalizePoints(points, x, y, w, h, 32);

    if (norm.length < 2) { ctx.restore(); return; }

    // Halo (glow) de la trace
    ctx.shadowColor = theme.traceGlow;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(norm[0][0], norm[0][1]);
    for (let i = 1; i < norm.length; i++) ctx.lineTo(norm[i][0], norm[i][1]);
    ctx.strokeStyle = theme.traceGlow;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Trace principale
    ctx.beginPath();
    ctx.moveTo(norm[0][0], norm[0][1]);
    for (let i = 1; i < norm.length; i++) ctx.lineTo(norm[i][0], norm[i][1]);
    ctx.strokeStyle = theme.trace;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Point départ (vert)
    ctx.beginPath();
    ctx.arc(norm[0][0], norm[0][1], 10, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Point arrivée (rouge)
    const last = norm[norm.length - 1];
    ctx.beginPath();
    ctx.arc(last[0], last[1], 10, 0, Math.PI * 2);
    ctx.fillStyle = theme.trace;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  /** Dessine une carte stat individuelle */
  function _drawStatCard(ctx, theme, x, y, w, h, value, label, unit) {
    // Fond
    ctx.save();
    const r = 16;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = theme.card;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Valeur
    ctx.fillStyle = theme.text;
    ctx.font = `700 ${value && value.length > 5 ? 40 : 46}px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value || '--', x + w / 2, y + h / 2 - 14);

    // Unité
    if (unit) {
      ctx.fillStyle = theme.accent1;
      ctx.font = `600 26px 'SF Pro Rounded', system-ui, sans-serif`;
      ctx.fillText(unit, x + w / 2, y + h / 2 + 20);
    }

    // Label
    ctx.fillStyle = theme.textMuted;
    ctx.font = `400 22px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.fillText(label, x + w / 2, y + h - 18);

    ctx.restore();
  }

  // ── Générateur principal ─────────────────────────────────────

  /**
   * Génère le canvas de partage.
   * @param {Object} sessionData
   * @param {{ darkMode?: boolean }} options
   * @returns {HTMLCanvasElement}
   */
  function generate(sessionData, options) {
    options = options || {};
    const isDark = options.darkMode !== false;
    const T = isDark ? THEMES.dark : THEMES.light;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── 1. Fond dégradé ──────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.6, H);
    bgGrad.addColorStop(0, T.bg1);
    bgGrad.addColorStop(1, T.bg2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Lumière diagonale subtile
    const glowGrad = ctx.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, W * 0.9);
    glowGrad.addColorStop(0, isDark ? 'rgba(74,222,128,0.07)' : 'rgba(22,163,74,0.06)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. En-tête logo Easy Sport ───────────────────────────
    const HEADER_H = 120;
    // Bande de fond header
    ctx.save();
    const hGrad = ctx.createLinearGradient(0, 0, W, HEADER_H);
    hGrad.addColorStop(0, T.logoGrad1 + (isDark ? '22' : '18'));
    hGrad.addColorStop(1, T.logoGrad2 + (isDark ? '11' : '0d'));
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, W, HEADER_H);

    // Ligne décorative basse
    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
    lineGrad.addColorStop(0, T.grad1);
    lineGrad.addColorStop(1, T.grad2);
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, HEADER_H - 3, W, 3);
    ctx.restore();

    // Logo SVG dessiné à la main (cercle + EKG)
    const LOGO_X = 54, LOGO_Y = 22, LOGO_R = 38;
    ctx.save();
    const lgGrad = ctx.createLinearGradient(LOGO_X - LOGO_R, LOGO_Y, LOGO_X + LOGO_R, LOGO_Y + LOGO_R * 2);
    lgGrad.addColorStop(0, T.logoGrad1);
    lgGrad.addColorStop(1, T.logoGrad2);
    ctx.beginPath();
    ctx.arc(LOGO_X, LOGO_Y + LOGO_R, LOGO_R, 0, Math.PI * 2);
    ctx.fillStyle = lgGrad;
    ctx.fill();
    // EKG path
    const ekgPts = [[LOGO_X - 26, LOGO_Y + LOGO_R], [LOGO_X - 12, LOGO_Y + LOGO_R],
      [LOGO_X - 5, LOGO_Y + LOGO_R - 18], [LOGO_X + 5, LOGO_Y + LOGO_R + 14],
      [LOGO_X + 12, LOGO_Y + LOGO_R - 8], [LOGO_X + 22, LOGO_Y + LOGO_R - 8]];
    ctx.beginPath();
    ctx.moveTo(ekgPts[0][0], ekgPts[0][1]);
    for (let i = 1; i < ekgPts.length; i++) ctx.lineTo(ekgPts[i][0], ekgPts[i][1]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Texte "Easy Sport"
    ctx.save();
    ctx.fillStyle = T.text;
    ctx.font = `700 52px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Easy Sport', LOGO_X + LOGO_R + 20, LOGO_Y + LOGO_R + 1);

    // Tagline
    ctx.fillStyle = T.textMuted;
    ctx.font = `400 26px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.fillText('Séance extérieure', LOGO_X + LOGO_R + 20, LOGO_Y + LOGO_R + 42);
    ctx.restore();

    // ── 3. Titre activité + emoji ────────────────────────────
    const TITLE_Y = HEADER_H + 60;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const icon = sessionData.activityIcon || '🏃';
    const label = sessionData.activityLabel || 'Séance';

    ctx.font = `500 70px 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif`;
    ctx.fillText(icon, W / 2, TITLE_Y);

    ctx.font = `700 58px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.fillStyle = T.text;
    ctx.fillText(label, W / 2, TITLE_Y + 76);
    ctx.restore();

    // ── 4. Grille de stats ───────────────────────────────────
    const STATS_Y = TITLE_Y + 160;
    const STAT_GAP = 20;
    const COLS = 2;
    const STAT_W = (W - 80 - STAT_GAP) / COLS;
    const STAT_H = 158;

    const stats = [];
    if (sessionData.distanceKm != null && sessionData.distanceKm > 0) {
      stats.push({ value: parseFloat(sessionData.distanceKm).toFixed(2), unit: 'km', label: 'Distance' });
    }
    if (sessionData.durationMin != null && sessionData.durationMin > 0) {
      stats.push({ value: _formatDuration(sessionData.durationMin), unit: null, label: 'Durée' });
    }
    if (sessionData.pace && sessionData.pace !== '--\'--"') {
      stats.push({ value: sessionData.pace, unit: '/km', label: 'Allure moy.' });
    }
    if (sessionData.elevationM != null && sessionData.elevationM > 0) {
      stats.push({ value: '+' + Math.round(sessionData.elevationM), unit: 'm', label: 'Dénivelé +' });
    }

    // Si on n'a que 1 stat, l'afficher sur toute la largeur
    let statsRendered = 0;
    stats.forEach((s, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const sx = 40 + col * (STAT_W + STAT_GAP);
      const sy = STATS_Y + row * (STAT_H + STAT_GAP);
      const sw = (stats.length === 1 || (stats.length % 2 !== 0 && i === stats.length - 1)) && stats.length === 1
        ? W - 80 : STAT_W;
      _drawStatCard(ctx, T, sx, sy, STAT_W, STAT_H, s.value, s.label, s.unit);
      statsRendered = row + 1;
    });

    // Si aucune stat, afficher placeholder
    if (stats.length === 0) {
      _drawStatCard(ctx, T, 40, STATS_Y, W - 80, STAT_H, '--', 'Aucune donnée', null);
      statsRendered = 1;
    }

    const STATS_ROWS = Math.max(1, Math.ceil(stats.length / COLS));

    // ── 5. Mini-carte GPS ────────────────────────────────────
    const MAP_TOP = STATS_Y + STATS_ROWS * (STAT_H + STAT_GAP) + 30;
    const MAP_H = Math.min(340, H - MAP_TOP - 160);
    const MAP_W = W - 80;

    _drawMiniMap(ctx, T, sessionData.trace || null, 40, MAP_TOP, MAP_W, MAP_H);

    // ── 6. Date FR ───────────────────────────────────────────
    const DATE_Y = MAP_TOP + MAP_H + 44;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = T.textSub;
    ctx.font = `400 30px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.fillText(_cap(_formatDate(sessionData.date || Date.now())), W / 2, DATE_Y);
    ctx.restore();

    // ── 7. Footer ────────────────────────────────────────────
    const FOOTER_Y = H - 80;
    // Ligne déco
    const flineGrad = ctx.createLinearGradient(80, 0, W - 80, 0);
    flineGrad.addColorStop(0, 'transparent');
    flineGrad.addColorStop(0.2, T.grad1 + '88');
    flineGrad.addColorStop(0.8, T.grad2 + '88');
    flineGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flineGrad;
    ctx.fillRect(80, FOOTER_Y - 16, W - 160, 1.5);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = T.textMuted;
    ctx.font = `500 26px 'SF Pro Rounded', system-ui, sans-serif`;
    ctx.fillText('Easy Sport · easysport.app', W / 2, FOOTER_Y + 8);
    ctx.restore();

    return canvas;
  }

  // ── Téléchargement ───────────────────────────────────────────

  /**
   * Déclenche le téléchargement du canvas en PNG.
   * @param {HTMLCanvasElement} canvas
   * @param {string} filename
   */
  function download(canvas, filename) {
    filename = filename || 'seance-easy-sport.png';
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('[ShareCard] download error', e);
      if (typeof App !== 'undefined') App.showToast('Erreur lors du téléchargement', 'error');
    }
  }

  // ── Partage Web Share API ─────────────────────────────────────

  /**
   * Tente de partager via Web Share API (avec blob PNG).
   * Fallback: téléchargement.
   * @param {HTMLCanvasElement} canvas
   * @param {string} filename
   * @returns {Promise<boolean>} true si partagé, false si fallback téléchargement
   */
  async function share(canvas, filename) {
    filename = filename || 'seance-easy-sport.png';

    // Vérifier support Web Share API + sharing files
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise((resolve, reject) => {
          try {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('toBlob returned null'));
            }, 'image/png', 1.0);
          } catch (e) {
            reject(e);
          }
        });

        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Ma séance Easy Sport',
            text: 'Découvrez ma séance enregistrée sur Easy Sport !'
          });
          return true;
        }
      } catch (e) {
        // AbortError = l'utilisateur a annulé → ne pas fallback en silencieux
        if (e.name === 'AbortError') return false;
        // Autre erreur → fallback téléchargement
        console.warn('[ShareCard] Web Share failed, fallback to download', e);
      }
    }

    // Fallback téléchargement
    download(canvas, filename);
    return false;
  }

  // ── Modal de partage ─────────────────────────────────────────

  /**
   * Affiche le modal de prévisualisation + actions (télécharger / partager).
   * @param {Object} sessionData
   * @param {{ darkMode?: boolean }} options
   */
  async function showShareModal(sessionData, options) {
    // Fermer un éventuel modal précédent
    const existingModal = document.getElementById('share-card-overlay');
    if (existingModal) existingModal.remove();

    // Overlay de chargement
    const loadOverlay = document.createElement('div');
    loadOverlay.id = 'share-card-loading';
    loadOverlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);
      display:flex;align-items:center;justify-content:center;
      z-index:9999;
    `;
    loadOverlay.innerHTML = `
      <div style="text-align:center;color:#fff">
        <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.3);
          border-top-color:#4ade80;border-radius:50%;animation:spin 0.8s linear infinite;
          margin:0 auto 12px"></div>
        <div style="font-size:14px;opacity:0.8">Génération en cours...</div>
      </div>
    `;
    // Injection CSS animation spin
    if (!document.getElementById('share-card-spin-style')) {
      const style = document.createElement('style');
      style.id = 'share-card-spin-style';
      style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }
    document.body.appendChild(loadOverlay);

    let canvas;
    try {
      canvas = generate(sessionData, options);
    } catch (e) {
      loadOverlay.remove();
      if (typeof App !== 'undefined') App.showToast('Erreur génération image', 'error');
      return;
    }

    loadOverlay.remove();

    // Créer la preview (thumbnail)
    let previewUrl;
    try {
      previewUrl = canvas.toDataURL('image/jpeg', 0.7);
    } catch (e) {
      previewUrl = null;
    }

    // Vérifier si Web Share est dispo
    const canWebShare = !!(navigator.share && navigator.canShare);

    const overlay = document.createElement('div');
    overlay.id = 'share-card-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-large share-card-modal">
        <div class="modal-header">
          <h3 class="modal-title">Partager la séance</h3>
          <button class="btn-icon" id="sc-modal-close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${previewUrl ? `
            <div class="sc-preview-wrap">
              <img src="${previewUrl}" alt="Aperçu de la carte" class="sc-preview-img">
            </div>
          ` : ''}
          <p class="sc-hint">Image 1080×1350 px prête à partager</p>
        </div>
        <div class="modal-footer sc-footer">
          <button class="btn-ghost sc-btn-dl" id="sc-btn-download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Télécharger
          </button>
          <button class="btn-primary sc-btn-share" id="sc-btn-share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="2"/>
              <circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              <circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="2"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${canWebShare ? 'Partager' : 'Télécharger PNG'}
          </button>
        </div>
      </div>
    `;

    // Générer un nom de fichier
    const actLabel = (sessionData.activityLabel || 'seance').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const dateStr = new Date(sessionData.date || Date.now()).toISOString().slice(0, 10);
    const filename = `easy-sport-${actLabel}-${dateStr}.png`;

    overlay.querySelector('#sc-modal-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#sc-btn-download').addEventListener('click', () => {
      download(canvas, filename);
      if (typeof App !== 'undefined') App.showToast('Image téléchargée !', 'success');
    });
    overlay.querySelector('#sc-btn-share').addEventListener('click', async () => {
      const btn = overlay.querySelector('#sc-btn-share');
      btn.disabled = true;
      const shared = await share(canvas, filename);
      btn.disabled = false;
      if (shared && typeof App !== 'undefined') App.showToast('Partagé !', 'success');
      else if (!shared && !canWebShare && typeof App !== 'undefined') App.showToast('Image téléchargée !', 'success');
    });

    document.body.appendChild(overlay);
  }

  // ── API publique ─────────────────────────────────────────────
  return { generate, download, share, showShareModal };
})();

// Exposition globale explicite (nécessaire pour outdoor.js + Samsung WebView)
window.ShareCard = ShareCard;
console.log('[ShareCard] chargé ✓', typeof window.ShareCard);
