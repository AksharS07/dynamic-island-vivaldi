/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         VIVALDI DYNAMIC ISLAND  –  v3.1 (safe build)        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

(function () {
  'use strict';

  // ─── Guard: only run once ────────────────────────────────────
  if (document.getElementById('vdi')) return;

  // ─── Config ───────────────────────────────────────────────────
  var CFG = {
    collapseDelay  : 500,
    pollInterval   : 1500,
    tickInterval   : 1000,
    idleDelay      : 9000,
    islandTop      : 54,
    defaultAccent  : '#6366f1',
    defaultGradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
    defaultDark    : 'hsl(244,40%,6%)',
    lyricsApi      : 'https://lrclib.net/api/get',
  };

  // ─── State ────────────────────────────────────────────────────
  var S = {
    isPlaying   : false,
    title       : '',
    artist      : '',
    artwork     : null,
    duration    : 0,
    position    : 0,
    hasMedia    : false,
    tabId       : null,
    windowId    : null,
    lastArtwork : null,
    volume      : 1,
    supportsPiP : false,
    lyricsOn    : false,
    lyricsLines : [],
    lyricsIdx   : -1,
    lastLyricsKey: '',
    isIdle      : false,
  };

  // ══════════════════════════════════════════════════════════════
  //  CSS
  // ══════════════════════════════════════════════════════════════
  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = [
    '#vdi{',
      'position:fixed;top:' + CFG.islandTop + 'px;left:50%;transform:translateX(-50%);',
      'z-index:2147483647;border-radius:32px;overflow:hidden;user-select:none;cursor:default;',
      'width:168px;height:34px;',
      'background:' + CFG.defaultDark + ';',
      'box-shadow:0 0 0 1px rgba(255,255,255,.07),0 8px 32px rgba(0,0,0,.8),0 0 80px rgba(99,102,241,.18);',
      'opacity:0;pointer-events:none;',
      'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
      'transition:width .55s cubic-bezier(.32,.72,0,1),height .55s cubic-bezier(.32,.72,0,1),',
        'border-radius .55s cubic-bezier(.32,.72,0,1),background .7s ease,box-shadow .7s ease,opacity .3s ease;',
    '}',
    '#vdi.vdi-visible{opacity:1;pointer-events:all;}',
    '#vdi.vdi-expanded{width:400px;height:152px;border-radius:26px;}',
    '#vdi.vdi-idle{width:12px!important;height:12px!important;border-radius:50%!important;opacity:.2!important;}',

    /* collapsed */
    '#vdi-col{position:absolute;inset:0;display:flex;align-items:center;gap:8px;padding:0 13px;opacity:1;transition:opacity .18s ease;}',
    '#vdi.vdi-expanded #vdi-col,#vdi.vdi-idle #vdi-col{opacity:0;pointer-events:none;}',
    '#vdi-dot{width:8px;height:8px;border-radius:50%;background:' + CFG.defaultAccent + ';flex-shrink:0;transition:background .7s ease;animation:vdi-pulse 2s ease-in-out infinite;}',
    '@keyframes vdi-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}',
    '#vdi-col-text{flex:1;overflow:hidden;white-space:nowrap;}',
    '#vdi-col-inner{display:inline-block;font-size:11px;font-weight:500;color:rgba(255,255,255,.82);animation:vdi-scroll 9s linear infinite;}',
    '@keyframes vdi-scroll{0%,28%{transform:translateX(0)}72%{transform:translateX(-55%)}100%{transform:translateX(0)}}',
    '#vdi-col-btn{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;flex-shrink:0;}',

    /* expanded */
    '#vdi-exp{position:absolute;inset:0;display:flex;align-items:center;padding:14px 15px;gap:13px;',
      'opacity:0;transform:scale(.9);transition:opacity .28s ease .13s,transform .28s ease .13s;pointer-events:none;}',
    '#vdi.vdi-expanded #vdi-exp{opacity:1;transform:scale(1);pointer-events:all;}',

    /* art */
    '#vdi-art{width:74px;height:74px;border-radius:14px;flex-shrink:0;overflow:hidden;',
      'background:var(--vdi-grad,' + CFG.defaultGradient + ');',
      'box-shadow:0 4px 20px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;position:relative;',
      'transition:background .7s ease,box-shadow .7s ease;}',
    '#vdi-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:14px;opacity:0;transition:opacity .4s ease;}',
    '#vdi-art img.ok{opacity:1;}',
    '#vdi-art-ph{font-size:28px;line-height:1;}',

    /* track */
    '#vdi-track{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}',
    '#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;}',
    '#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#vdi-pip-btn{width:22px;height:22px;border-radius:6px;border:none;background:rgba(255,255,255,.07);',
      'color:rgba(255,255,255,.55);display:none;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;',
      'transition:background .2s,color .2s,transform .15s;}',
    '#vdi-pip-btn.show{display:flex;}',
    '#vdi-pip-btn:hover{background:rgba(255,255,255,.14);color:#fff;transform:scale(1.1);}',
    '#vdi-pip-btn svg{width:13px;height:13px;pointer-events:none;}',
    '#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',

    /* progress */
    '#vdi-prog-row{display:flex;align-items:center;gap:5px;}',
    '.vdi-t{font-size:9px;color:rgba(255,255,255,.25);min-width:22px;}',
    '#vdi-prog{flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:99px;cursor:pointer;position:relative;}',
    '#vdi-prog-fill{height:100%;width:0%;border-radius:99px;',
      'background:var(--vdi-accent,' + CFG.defaultAccent + ');',
      'transition:width .6s linear,background .7s ease;}',

    /* controls */
    '#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}',
    '#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}',
    '#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}',
    '.vdi-btn{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);',
      'transition:background .2s,transform .15s,color .15s;}',
    '.vdi-btn:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}',
    '.vdi-btn:active{transform:scale(.92);}',
    '.vdi-btn svg{width:16px;height:16px;pointer-events:none;}',
    '.vdi-icon-btn{width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);',
      'transition:background .2s,color .2s,transform .15s;}',
    '.vdi-icon-btn:hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.08);}',
    '.vdi-icon-btn.active{color:var(--vdi-accent,' + CFG.defaultAccent + ');}',
    '.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}',
    '#vdi-play{width:40px;height:40px;background:var(--vdi-grad,' + CFG.defaultGradient + ');',
      'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);',
      'transition:background .7s ease,box-shadow .7s ease,transform .15s;}',
    '#vdi-play:hover{filter:brightness(1.15);transform:scale(1.12);}',
    '#vdi-play svg{width:18px;height:18px;}',

    /* lyrics */
    '#vdi-lyrics-panel{position:fixed;top:' + (CFG.islandTop + 165) + 'px;left:50%;transform:translateX(-50%) translateY(-10px);',
      'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
      'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
      'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
      'opacity:0;pointer-events:none;transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
      'display:flex;flex-direction:column;padding:24px 0;}',
    '#vdi-lyrics-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}',
    '#vdi-lyrics-scroll{flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 32px;',
      'mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
      '-webkit-mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);}',
    '#vdi-lyrics-scroll::-webkit-scrollbar{display:none;}',
    '.vdi-lyric-line{font-size:20px;font-weight:700;line-height:1.4;color:rgba(255,255,255,0.4);',
      'padding:12px 0;transition:color 0.4s ease, transform 0.4s cubic-bezier(.32,.72,0,1);',
      'transform-origin:left center; cursor:pointer;}',
    '.vdi-lyric-line.active{color:#fff;transform:scale(1.08);text-shadow:0 4px 16px rgba(0,0,0,0.5);}',
    '.vdi-lyric-line.unsynced{font-size:16px;color:rgba(255,255,255,0.8);transform:none;}',
  ].join('');
  document.head.appendChild(css);

  // ══════════════════════════════════════════════════════════════
  //  DOM
  // ══════════════════════════════════════════════════════════════
  var island = document.createElement('div');
  island.id = 'vdi';
  island.innerHTML =
    '<div id="vdi-col">' +
      '<div id="vdi-dot"></div>' +
      '<div id="vdi-col-text"><span id="vdi-col-inner">No media</span></div>' +
      '<div id="vdi-col-btn"><svg id="vdi-col-icon" viewBox="0 0 24 24" fill="white" width="10" height="10"><path d="M8 5v14l11-7z"/></svg></div>' +
    '</div>' +
    '<div id="vdi-exp">' +
      '<div id="vdi-art">' +
        '<div id="vdi-art-ph">\uD83C\uDFB5</div>' +
        '<img id="vdi-art-img" src="" alt="" crossorigin="anonymous"/>' +
      '</div>' +
      '<div id="vdi-track">' +
        '<div id="vdi-title-row">' +
          '<div id="vdi-title">No media</div>' +
          '<button id="vdi-pip-btn" title="Picture-in-Picture">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7H9c-1.1 0-2 .9-2 2v3H5v3h2v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 10H9v-3h4v-3h6v6z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="vdi-artist">Open a media tab</div>' +
        '<div id="vdi-prog-row">' +
          '<span class="vdi-t" id="vdi-pos">0:00</span>' +
          '<div id="vdi-prog"><div id="vdi-prog-fill"></div></div>' +
          '<span class="vdi-t" id="vdi-dur" style="text-align:right">0:00</span>' +
        '</div>' +
        '<div id="vdi-ctrl-row">' +
          '<div id="vdi-ctrl-main">' +
            '<button class="vdi-btn" id="vdi-prev" title="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z"/></svg></button>' +
            '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg></button>' +
            '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zM7.66 12.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z"/></svg></button>' +
          '</div>' +
          '<div id="vdi-ctrl-extra">' +
            '<button class="vdi-icon-btn" id="vdi-lyr-btn" title="Lyrics" style="display:none">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(island);

  var lyrPanel = document.createElement('div');
  lyrPanel.id = 'vdi-lyrics-panel';
  lyrPanel.innerHTML = '<div id="vdi-lyrics-scroll"></div>';
  document.body.appendChild(lyrPanel);

  // ─── Helpers ──────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function setVar(k, v) { island.style.setProperty(k, v); }

  function fmt(s) {
    if (!s || !isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function setPlayIcon(playing) {
    var path = playing
      ? '<path d="M8 19c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2z"/>'
      : '<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>';
    $('vdi-pp').innerHTML     = path;
    $('vdi-col-icon').innerHTML = path;
  }

  // ══════════════════════════════════════════════════════════════
  //  Colour extraction
  // ══════════════════════════════════════════════════════════════
  function extractVibrant(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var W = 40, H = 40;
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        var d = cx.getImageData(0, 0, W, H).data;
        var bH = 0, bScore = -1;
        for (var i = 0; i < d.length; i += 4) {
          var r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
          var mx = Math.max(r,g,b), mn = Math.min(r,g,b);
          var l = (mx+mn)/2, delta = mx-mn;
          if (l < .15 || l > .88 || delta < .1) continue;
          var sat = delta / (1 - Math.abs(2*l-1));
          if (sat < .35) continue;
          var h = 0;
          if (mx===r)      h = ((g-b)/delta) % 6;
          else if (mx===g) h = (b-r)/delta + 2;
          else             h = (r-g)/delta + 4;
          h = Math.round(h*60); if (h<0) h+=360;
          var score = sat * (1 - Math.abs(l-.5)*1.4);
          if (score > bScore) { bScore = score; bH = h; }
        }
        if (bScore < 0) { cb(null); return; }
        cb({
          accent  : 'hsl(' + bH + ',82%,58%)',
          gradient: 'linear-gradient(135deg,hsl(' + bH + ',82%,58%),hsl(' + ((bH+38)%360) + ',76%,50%))',
          dark    : 'hsl(' + bH + ',38%,6%)',
          glow    : 'hsla(' + bH + ',78%,55%,.28)',
        });
      } catch(e) { cb(null); }
    };
    img.onerror = function() { cb(null); };
    img.src = url;
  }

  function applyTheme(c) {
    var accent = c ? c.accent   : CFG.defaultAccent;
    var grad   = c ? c.gradient : CFG.defaultGradient;
    var dark   = c ? c.dark     : CFG.defaultDark;
    var glow   = c ? c.glow     : 'rgba(99,102,241,.2)';
    setVar('--vdi-accent', accent);
    setVar('--vdi-grad',   grad);
    island.style.background = dark;
    island.style.boxShadow  =
      '0 0 0 1px rgba(255,255,255,.07),0 8px 32px rgba(0,0,0,.8),0 0 80px ' + glow;
    $('vdi-dot').style.background = accent;
  }

  // ══════════════════════════════════════════════════════════════
  //  UI update
  // ══════════════════════════════════════════════════════════════
  function updateUI() {
    if (!S.hasMedia) { island.classList.remove('vdi-visible'); return; }
    island.classList.add('vdi-visible');

    var label = [S.title, S.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
    $('vdi-col-inner').textContent = label;
    $('vdi-title').textContent     = S.title  || 'Unknown Track';
    $('vdi-artist').textContent    = S.artist || 'Unknown Artist';

    setPlayIcon(S.isPlaying);

    if (S.supportsPiP) $('vdi-pip-btn').classList.add('show');
    else               $('vdi-pip-btn').classList.remove('show');

    if (S.artwork && S.artwork !== S.lastArtwork) {
      S.lastArtwork = S.artwork;
      var img = $('vdi-art-img');
      img.classList.remove('ok');
      img.src = S.artwork;
      img.onload  = function() { img.classList.add('ok'); $('vdi-art-ph').style.display='none'; };
      img.onerror = function() { $('vdi-art-ph').style.display='flex'; };
      extractVibrant(S.artwork, applyTheme);
    } else if (!S.artwork && S.lastArtwork) {
      S.lastArtwork = null;
      var im2 = $('vdi-art-img');
      im2.classList.remove('ok');
      im2.src = '';
      $('vdi-art-ph').style.display = 'flex';
      applyTheme(null);
    }

    refreshProgress();
  }

  function refreshProgress() {
    var pct = S.duration > 0 ? Math.min(100, (S.position/S.duration)*100) : 0;
    $('vdi-prog-fill').style.width = pct + '%';
    $('vdi-pos').textContent = fmt(S.position);
    $('vdi-dur').textContent = fmt(S.duration);
  }

  // ══════════════════════════════════════════════════════════════
  //  Tab scripts  (plain functions – no arrow fns, no async)
  // ══════════════════════════════════════════════════════════════
    function TAB_getState() {
    var vids = document.querySelectorAll('video');
    var isYTMusic = window.location.hostname === 'music.youtube.com';
    var uiCur = null, uiDur = null;
    
    try {
      if (isYTMusic) {
        var timeInfo = document.querySelector('.time-info.ytmusic-player-bar');
        if (timeInfo) {
          var parts = timeInfo.textContent.trim().split('/');
          if (parts.length === 2) {
            uiCur = parts[0].trim().split(':').reduce(function(a,v){return (60*a) + parseInt(v);}, 0);
            uiDur = parts[1].trim().split(':').reduce(function(a,v){return (60*a) + parseInt(v);}, 0);
          }
        }
      } else if (window.location.hostname.indexOf('youtube.com') > -1) {
        var tc = document.querySelector('.ytp-time-current');
        var td = document.querySelector('.ytp-time-duration');
        if (tc) uiCur = tc.textContent.trim().split(':').reduce(function(a,v){return (60*a) + parseInt(v);}, 0);
        if (td) uiDur = td.textContent.trim().split(':').reduce(function(a,v){return (60*a) + parseInt(v);}, 0);
      }
    } catch(e) {}

    var el = null;
    for (var i=0; i<vids.length; i++) {
      if (!vids[i].paused && vids[i].currentTime > 0) { el = vids[i]; break; }
    }
    if (!el) el = document.querySelector('.html5-main-video');
    if (!el && vids.length) el = vids[vids.length - 1];

    try {
      var ms = navigator.mediaSession;
      var art = null;
      if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
        art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
      }
      var pipOk = !!(!isYTMusic && document.pictureInPictureEnabled && vids.length &&
                     Array.prototype.slice.call(vids).some(function(v){return !v.disablePictureInPicture;}));

      return {
        title    : (ms && ms.metadata && ms.metadata.title)  || '',
        artist   : (ms && ms.metadata && ms.metadata.artist) || '',
        artwork  : art,
        isPlaying: (ms && ms.playbackState==='playing') || (el ? !el.paused : false),
        duration : (uiDur !== null && uiDur > 0) ? uiDur : (el ? (isFinite(el.duration) ? el.duration : 0) : 0),
        position : (uiCur !== null && uiCur >= 0) ? uiCur : (el ? el.currentTime : 0),
        hasMedia : !!(el || (ms && ms.metadata && ms.metadata.title)),
        volume   : el ? el.volume : 1,
        pipOk    : pipOk,
      };
    } catch(e) { return null; }
  }

    function TAB_doAction(act, val) {
    try {
      var ms  = navigator.mediaSession;
      var els = Array.prototype.slice.call(document.querySelectorAll('video,audio'));
      var el  = null;
      for (var i=0;i<els.length;i++) { if(!els[i].paused&&!els[i].ended){el=els[i];break;} }
      if (!el) for (var j=0;j<els.length;j++) { if(els[j].paused&&els[j].currentTime>0){el=els[j];break;} }
      if (!el && els.length) el = els[0];

      function tryH(name) {
        try {
          if (!ms) return false;
          var h = ms._actionHandlers && ms._actionHandlers.get && ms._actionHandlers.get(name);
          if (h) { h({}); return true; }
        } catch(e) {}
        return false;
      }

      if (act === 'toggle') {
        if (el) {
          if (el.paused) { if (!tryH('play'))  el.play(); }
          else           { if (!tryH('pause')) el.pause(); }
        }
      } else if (act === 'prev') {
        if (!tryH('previoustrack') && el) {
          var pb = document.querySelector('.ytp-prev-button') || document.querySelector('.previous-button');
          if (pb) pb.click(); else el.currentTime = 0;
        }
      } else if (act === 'next') {
        if (!tryH('nexttrack') && el) {
          var nb = document.querySelector('.ytp-next-button') || document.querySelector('.next-button');
          if (nb) nb.click(); else el.currentTime = el.duration;
        }
      } else if (act === 'seek' && typeof val === 'number') {
        var u = null;
        try {
          if (window.location.hostname === 'music.youtube.com') {
            var t = document.querySelector('.time-info.ytmusic-player-bar');
            if (t) {
              var p = t.textContent.trim().split('/');
              if (p.length === 2) {
                u = p[0].trim().split(':').reduce(function(a,x){return (60*a)+parseInt(x);},0);
              }
            }
          } else if (window.location.hostname.indexOf('youtube.com') > -1) {
            var tc = document.querySelector('.ytp-time-current');
            if (tc) {
              u = tc.textContent.trim().split(':').reduce(function(a,x){return (60*a)+parseInt(x);},0);
            }
          }
        } catch(e){}
        var target = document.querySelector('.html5-main-video') || el;
        if (target) {
          var offset = (u !== null && u >= 0) ? (target.currentTime - u) : 0;
          target.currentTime = val + offset;
        }
      }
    } catch(e) {}
  }

  function TAB_togglePiP() {
    try {
      var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
      var v = null;
      for (var i=0;i<vids.length;i++) { if(!vids[i].paused){v=vids[i];break;} }
      if (!v && vids.length) v = vids[0];
      if (!v || !document.pictureInPictureEnabled) return false;
      if (document.pictureInPictureElement) document.exitPictureInPicture();
      else v.requestPictureInPicture();
      return true;
    } catch(e) { return false; }
  }

  // ──────────────────────────────────────────────────────────────
  function execInTab(tabId, fn, args, cb) {
    if (!tabId) { if (cb) cb(null); return; }
    try {
      if (chrome && chrome.scripting && chrome.scripting.executeScript) {
        var spec = { target:{tabId:tabId,allFrames:false}, func:fn };
        if (args && args.length) spec.args = args;
        chrome.scripting.executeScript(spec, function(res) {
          if (chrome.runtime.lastError || !res) { if (cb) cb(null); return; }
          if (cb) cb(res[0] ? res[0].result : null);
        });
      } else if (chrome && chrome.tabs && chrome.tabs.executeScript) {
        var argStr = args ? args.map(function(a){return JSON.stringify(a);}).join(',') : '';
        chrome.tabs.executeScript(tabId, {code:'(' + fn.toString() + ')(' + argStr + ')'}, function(res) {
          if (chrome.runtime.lastError || !res) { if (cb) cb(null); return; }
          if (cb) cb(res[0] !== undefined ? res[0] : null);
        });
      } else {
        if (cb) cb(null);
      }
    } catch(e) { if (cb) cb(null); }
  }

  function rapidPoll() {
    clearTimeout(S.pollTimer1); clearTimeout(S.pollTimer2); clearTimeout(S.pollTimer3);
    S.pollTimer1 = setTimeout(poll, 150);
    S.pollTimer2 = setTimeout(poll, 400);
    S.pollTimer3 = setTimeout(poll, 900);
  }

  function feedback(isSkip) {
    var info = document.getElementById('vdi-info');
    if (info) info.style.opacity = '0.4';
    if (isSkip) {
      S.pendingTrackChange = true;
      S.pendingOldTitle = S.title;
      if (S.skipTimeout) clearTimeout(S.skipTimeout);
      S.skipTimeout = setTimeout(function() {
        S.pendingTrackChange = false;
        if (info) info.style.opacity = '1';
      }, 2500);
    }
  }

  function sendAction(act, val) {
    if (act === 'next' || act === 'prev') feedback(true);
    else feedback(false);
    var args = (val !== undefined) ? [act, val] : [act];
    execInTab(S.tabId, TAB_doAction, args, null);
    rapidPoll();
  }

  // ══════════════════════════════════════════════════════════════
  //  Media polling
  // ══════════════════════════════════════════════════════════════
  function poll() {
    try {
      if (!chrome || !chrome.tabs) return;
      chrome.tabs.query({ audible: true }, function(tabs) {
        try {
          if (chrome.runtime.lastError) return;
          var tab = (tabs && tabs.length) ? tabs[0] : null;

          if (!tab) {
            if (S.tabId !== null) {
              execInTab(S.tabId, TAB_getState, [], function(res) {
                if (!res) { S.hasMedia=false; updateUI(); return; }
                S.isPlaying = res.isPlaying;
                S.position  = res.position;
                S.duration  = res.duration;
                if (!res.hasMedia) S.hasMedia = false;
                updateUI();
              });
            } else if (S.hasMedia) {
              S.hasMedia = false; updateUI();
            }
            return;
          }

          S.tabId    = tab.id;
          S.windowId = tab.windowId;

          execInTab(tab.id, TAB_getState, [], function(res) {
            try {
              if (!res) { S.hasMedia=true; updateUI(); return; }
              
              if (S.pendingTrackChange) {
                if (res.title === S.pendingOldTitle || !res.title) {
                  res.title = S.title;
                  res.artist = S.artist;
                  res.artwork = S.artwork;
                } else {
                  S.pendingTrackChange = false;
                  if (S.skipTimeout) clearTimeout(S.skipTimeout);
                  var info = document.getElementById('vdi-info');
                  if (info) info.style.opacity = '1';
                }
              } else {
                var info = document.getElementById('vdi-info');
                if (info && info.style.opacity === '0.4' && res.title === S.title) {
                  info.style.opacity = '1';
                }
              }

              S.hasMedia    = res.hasMedia || true;
              S.isPlaying   = res.isPlaying;
              S.title       = res.title  || tab.title || '';
              S.artist      = res.artist || '';
              S.artwork     = res.artwork || null;
              S.duration    = res.duration || 0;
              S.position    = res.position || 0;
              S.supportsPiP = res.pipOk || false;
              updateUI();
              var key = S.title + '|' + S.artist;
              if (key !== S.lastLyricsKey && S.title) fetchLyrics(S.title, S.artist, S.duration);
            } catch(e) {}
          });
        } catch(e) {}
      });
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════
  //  Lyrics  (fetch with XMLHttpRequest – no async/await)
  // ══════════════════════════════════════════════════════════════
  function fetchLyrics(title, artist, duration) {
    var key = title + '|' + artist;
    S.lastLyricsKey = key;
    S.lyricsLines   = [];
    S.lyricsIdx     = -1;
    S.lyricsSynced  = false;
    $('vdi-lyr-btn').style.display = 'none';
    lyrPanel.classList.remove('show');
    $('vdi-lyrics-scroll').innerHTML = '';

    try {
      var params = 'track_name=' + encodeURIComponent(title) +
                   '&artist_name=' + encodeURIComponent(artist || '');
      if (duration > 0) params += '&duration=' + Math.round(duration);

      var xhr = new XMLHttpRequest();
      xhr.open('GET', CFG.lyricsApi + '?' + params, true);
      xhr.timeout = 5000;
      xhr.onload = function() {
        try {
          if (xhr.status !== 200) return;
          // Check track still matches
          if (key !== S.lastLyricsKey) return;
          var data = JSON.parse(xhr.responseText);
          var lines = [];

          if (data.syncedLyrics) {
            S.lyricsSynced = true;
            var raw = data.syncedLyrics.split('\n');
            for (var i=0; i<raw.length; i++) {
              var m = raw[i].match(/\[(\d+):(\d+\.\d+)\](.*)/);
              if (m) lines.push({ time: parseInt(m[1])*60 + parseFloat(m[2]), text: m[3].trim() });
            }
            lines.sort(function(a,b){return a.time-b.time;});
          } else if (data.plainLyrics) {
            S.lyricsSynced = false;
            var plines = data.plainLyrics.split('\n');
            for (var j=0; j<plines.length; j++) lines.push({ time:0, text:plines[j].trim() });
          }

          if (lines.length) {
            S.lyricsLines = lines;
            var html = '';
            for (var k=0; k<lines.length; k++) {
              var cls = S.lyricsSynced ? 'vdi-lyric-line' : 'vdi-lyric-line unsynced';
              html += '<div class="' + cls + '" id="vdi-lyr-' + k + '">' + (lines[k].text || '&nbsp;') + '</div>';
            }
            $('vdi-lyrics-scroll').innerHTML = html;
            $('vdi-lyr-btn').style.display = 'flex';
            if (S.lyricsOn) lyrPanel.classList.add('show');
            
            // Add interactivity to synced lyrics
            if (S.lyricsSynced) {
              for (var n=0; n<lines.length; n++) {
                (function(tTarget) {
                  var lineEl = $('vdi-lyr-' + n);
                  if (lineEl) {
                    lineEl.addEventListener('click', function(e) {
                      e.stopPropagation();
                      S.position = tTarget;
                      refreshProgress();
                      sendAction('seek', tTarget);
                    });
                  }
                })(lines[n].time);
              }
            }
          }
        } catch(e) {}
      };
      xhr.onerror = xhr.ontimeout = function() {};
      xhr.send();
    } catch(e) {}
  }

  function syncLyrics() {
    if (!S.lyricsLines.length || !S.lyricsSynced) return;
    var pos = S.position;
    var idx = -1;
    for (var i = S.lyricsLines.length-1; i>=0; i--) {
      if (S.lyricsLines[i].time <= pos + 0.3) { idx=i; break; } // 300ms lookahead
    }
    if (idx !== S.lyricsIdx && idx >= 0) {
      if (S.lyricsIdx >= 0) {
        var old = $('vdi-lyr-' + S.lyricsIdx);
        if (old) old.classList.remove('active');
      }
      S.lyricsIdx = idx;
      var cur = $('vdi-lyr-' + idx);
      if (cur) {
        cur.classList.add('active');
        if (S.lyricsOn) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Idle dot
  // ══════════════════════════════════════════════════════════════
  var idleTimer = null;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (S.isIdle) { S.isIdle=false; island.classList.remove('vdi-idle'); }
    idleTimer = setTimeout(function() {
      if (!S.hasMedia) return;
      S.isIdle = true; island.classList.add('vdi-idle');
    }, CFG.idleDelay);
  }
  document.addEventListener('mousemove', function(e) {
    if (!S.hasMedia) return;
    var r = island.getBoundingClientRect();
    if (e.clientX>=r.left-80&&e.clientX<=r.right+80&&e.clientY>=r.top-60&&e.clientY<=r.bottom+60) resetIdle();
  });

  // ══════════════════════════════════════════════════════════════
  //  Expand / collapse
  // ══════════════════════════════════════════════════════════════
  var colTimer = null;
  island.addEventListener('mouseenter', function() {
    clearTimeout(colTimer);
    if (S.isIdle) { S.isIdle=false; island.classList.remove('vdi-idle'); }
    island.classList.add('vdi-expanded');
    resetIdle();
  });
  island.addEventListener('mouseleave', function() {
    clearTimeout(colTimer);
    colTimer = setTimeout(function(){ island.classList.remove('vdi-expanded'); }, CFG.collapseDelay);
    resetIdle();
  });

  // ──── Double-click → jump to media tab ────────────────────────
  island.addEventListener('dblclick', function() {
    if (S.tabId === null) return;
    try { chrome.tabs.update(S.tabId, { active: true }); } catch(e){}
    try { if (S.windowId !== null) chrome.windows.update(S.windowId, { focused: true }); } catch(e){}
  });

  // ══════════════════════════════════════════════════════════════
  //  Button events
  // ══════════════════════════════════════════════════════════════
  $('vdi-prev').addEventListener('click', function(e) { e.stopPropagation(); sendAction('prev'); });
  $('vdi-next').addEventListener('click', function(e) { e.stopPropagation(); sendAction('next'); });
  $('vdi-play').addEventListener('click', function(e) {
    e.stopPropagation();
    sendAction('toggle');
    S.isPlaying = !S.isPlaying;
    setPlayIcon(S.isPlaying);
  });
  $('vdi-prog').addEventListener('click', function(e) {
    e.stopPropagation();
    if (!S.duration) return;
    var r = e.currentTarget.getBoundingClientRect();
    S.position = ((e.clientX - r.left) / r.width) * S.duration;
    refreshProgress();
    sendAction('seek', S.position);
  });
  $('vdi-pip-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    execInTab(S.tabId, TAB_togglePiP, [], null);
  });
  $('vdi-lyr-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    S.lyricsOn = !S.lyricsOn;
    $('vdi-lyr-btn').classList.toggle('active', S.lyricsOn);
    if (S.lyricsOn) {
      lyrPanel.classList.add('show');
      if (S.lyricsSynced && S.lyricsIdx >= 0) {
        var cur = $('vdi-lyr-' + S.lyricsIdx);
        if (cur) cur.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    } else {
      lyrPanel.classList.remove('show');
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  Tick
  // ══════════════════════════════════════════════════════════════
  setInterval(function() {
    if (S.isPlaying && S.duration > 0) {
      S.position = Math.min(S.duration, S.position + 1);
      refreshProgress();
    }
    syncLyrics();
  }, CFG.tickInterval);

  // ══════════════════════════════════════════════════════════════
  //  Start
  // ══════════════════════════════════════════════════════════════
  poll();
  setInterval(poll, CFG.pollInterval);
  resetIdle();

  console.log('[Vivaldi Dynamic Island v3.1] Loaded OK');

})();




