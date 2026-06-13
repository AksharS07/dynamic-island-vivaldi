(function() {
'use strict';

/**
 * Dynamic Island - Shared Core Module
 * Common utilities, color extraction, and lyrics handling
 */

var VDI = VDI || {};

VDI.Core = (function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // Time formatting
  // ─────────────────────────────────────────────────────────────
  function formatTime(s) {
    if (!s || !isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  // ─────────────────────────────────────────────────────────────
  // Play/Pause icon SVG paths
  // ─────────────────────────────────────────────────────────────
  var ICONS = {
    play: '<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>',
    pause: '<path d="M8 19c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2s2 .9 2 2v10c0 1.1-.9 2-2 2z"/>'
  };

  function getPlayIcon(playing) {
    return playing ? ICONS.pause : ICONS.play;
  }

  // ─────────────────────────────────────────────────────────────
  // Color extraction from album art
  // ─────────────────────────────────────────────────────────────
  function extractVibrant(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var W = 40, H = 40;
        var cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        var d = cx.getImageData(0, 0, W, H).data;

        // 36 buckets for hue ranges (10 degrees each)
        var buckets = new Array(36);
        for (var i = 0; i < 36; i++) {
          buckets[i] = { sumS: 0, maxS: 0, r: 0, g: 0, b: 0 };
        }

        for (var i = 0; i < W * H * 4; i += 4) {
          var r = d[i] / 255;
          var g = d[i + 1] / 255;
          var b = d[i + 2] / 255;
          var mx = Math.max(r, g, b);
          var mn = Math.min(r, g, b);
          var l = (mx + mn) / 2;
          var delta = mx - mn;

          // Skip very dark, very light, or grayscale pixels
          if (l < 0.05 || l > 0.95 || delta < 0.02) continue;

          var sat = delta / (1 - Math.abs(2 * l - 1));

          // Calculate hue
          var h = 0;
          if (mx === r) h = ((g - b) / delta) % 6;
          else if (mx === g) h = (b - r) / delta + 2;
          else h = (r - g) / delta + 4;
          h = Math.round(h * 60);
          if (h < 0) h += 360;

          var bIdx = Math.floor(h / 10) % 36;
          var score = sat * (l > 0.5 ? (1 - l) * 2 : l * 2);
          buckets[bIdx].sumS += score;

          if (sat > buckets[bIdx].maxS) {
            buckets[bIdx].maxS = sat;
            buckets[bIdx].r = r;
            buckets[bIdx].g = g;
            buckets[bIdx].b = b;
          }
        }

        // Find the bucket with highest saturation score
        var best = null;
        var maxSum = -1;
        for (var j = 0; j < 36; j++) {
          if (buckets[j].sumS > maxSum) {
            maxSum = buckets[j].sumS;
            best = buckets[j];
          }
        }

        if (!best || maxSum === 0) {
          cb(null);
          return;
        }

        // Convert to HSL with boosted saturation
        var mxA = Math.max(best.r, best.g, best.b);
        var mnA = Math.min(best.r, best.g, best.b);
        var hA = 0, sA = 0, lA = (mxA + mnA) / 2;

        if (mxA !== mnA) {
          var dA = mxA - mnA;
          sA = lA > 0.5 ? dA / (2 - mxA - mnA) : dA / (mxA + mnA);
          if (mxA === best.r) hA = (best.g - best.b) / dA + (best.g < best.b ? 6 : 0);
          else if (mxA === best.g) hA = (best.b - best.r) / dA + 2;
          else hA = (best.r - best.g) / dA + 4;
          hA = Math.round(hA * 60);
        }

        // Boost saturation and constrain lightness
        sA = Math.min(1, sA * 1.5 + 0.3);
        lA = Math.max(0.4, Math.min(0.65, lA));

        cb({
          accent: 'hsl(' + hA + ',' + Math.round(sA * 100) + '%,' + Math.round(lA * 100) + '%)',
          gradient: 'linear-gradient(135deg, hsl(' + hA + ',' + Math.round(sA * 100) + '%,' + Math.round(lA * 100) + '%), hsl(' + ((hA + 35) % 360) + ',' + Math.round(sA * 90) + '%,' + Math.round((lA - 0.15) * 100) + '%))',
          dark: 'hsl(' + hA + ', ' + Math.round(sA * 40) + '%, 12%)',
          glow: 'hsla(' + hA + ', ' + Math.round(sA * 100) + '%, ' + Math.round(lA * 100) + '%, 0.45)'
        });
      } catch (e) {
        cb(null);
      }
    };
    img.onerror = function() {
      cb(null);
    };
    img.src = url;
  }

  // ─────────────────────────────────────────────────────────────
  // Lyrics fetching from lrclib.net
  // ─────────────────────────────────────────────────────────────
  var LYRICS_API = 'https://lrclib.net/api/get';

  function fetchLyrics(title, artist, duration, cb) {
    var params = 'track_name=' + encodeURIComponent(title) +
                 '&artist_name=' + encodeURIComponent(artist || '');
    if (duration > 0) params += '&duration=' + Math.round(duration);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', LYRICS_API + '?' + params, true);
    xhr.timeout = 5000;
    xhr.onload = function() {
      try {
        if (xhr.status !== 200) {
          cb(null, null);
          return;
        }
        var data = JSON.parse(xhr.responseText);
        var lines = [];
        var synced = false;

        if (data.syncedLyrics) {
          synced = true;
          var raw = data.syncedLyrics.split('\n');
          for (var i = 0; i < raw.length; i++) {
            var m = raw[i].match(/\[(\d+):(\d+\.\d+)\](.*)/);
            if (m) {
              lines.push({
                time: parseInt(m[1]) * 60 + parseFloat(m[2]),
                text: m[3].trim()
              });
            }
          }
          lines.sort(function(a, b) { return a.time - b.time; });
        } else if (data.plainLyrics) {
          synced = false;
          var plines = data.plainLyrics.split('\n');
          for (var j = 0; j < plines.length; j++) {
            lines.push({ time: 0, text: plines[j].trim() });
          }
        }

        cb(lines, synced);
      } catch (e) {
        cb(null, null);
      }
    };
    xhr.onerror = xhr.ontimeout = function() {
      cb(null, null);
    };
    xhr.send();
  }

  // ─────────────────────────────────────────────────────────────
  // Tab media state extraction (injected into content pages)
  // ─────────────────────────────────────────────────────────────
  function getTabMediaState() {
    var vids = document.querySelectorAll('video');
    var auds = document.querySelectorAll('audio');
    var isYTMusic = window.location.hostname === 'music.youtube.com';
    var pipOk = !!(!isYTMusic && document.pictureInPictureEnabled && vids.length &&
      Array.prototype.slice.call(vids).some(function(v) { return !v.disablePictureInPicture; }));

    var uiDur = null;
    var uiCur = null;

    try {
      if (isYTMusic) {
        var timeInfo = document.querySelector('.time-info.ytmusic-player-bar');
        if (timeInfo) {
          var parts = timeInfo.textContent.trim().split('/');
          if (parts.length === 2) {
            var parseTime = function(str) {
              var p = str.trim().split(':').map(Number);
              return p.length === 2 ? p[0] * 60 + p[1] : (p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0);
            };
            uiCur = parseTime(parts[0]);
            uiDur = parseTime(parts[1]);
          }
        }
      } else if (window.location.hostname.indexOf('youtube.com') > -1) {
        var td = document.querySelector('.ytp-time-duration');
        if (td) {
          uiDur = td.textContent.trim().split(':').reduce(function(a, v) {
            return (60 * a) + parseInt(v);
          }, 0);
        }
      }
    } catch (e) {}

    // Find the best video element
    var el = null;

    // For YouTube (non-Music), match by duration
    if (uiDur !== null && uiDur > 0 && !isYTMusic) {
      for (var i = 0; i < vids.length; i++) {
        if (Math.abs(vids[i].duration - uiDur) <= 2) {
          el = vids[i];
          break;
        }
      }
    }

    // Find currently playing video
    if (!el) {
      for (var i = 0; i < vids.length; i++) {
        if (!vids[i].paused && vids[i].currentTime > 0) {
          el = vids[i];
          break;
        }
      }
    }

    // Fallback to main video selector
    if (!el) el = document.querySelector('.html5-main-video');
    if (!el && vids.length) el = vids[vids.length - 1];
    if (!el && auds.length) el = auds[0];

    try {
      var ms = navigator.mediaSession;
      var art = null;
      if (ms && ms.metadata && ms.metadata.artwork && ms.metadata.artwork.length) {
        art = ms.metadata.artwork[ms.metadata.artwork.length - 1].src;
      }

      return {
        title: (ms && ms.metadata && ms.metadata.title) || '',
        artist: (ms && ms.metadata && ms.metadata.artist) || '',
        artwork: art,
        isPlaying: (ms && ms.playbackState === 'playing') || (el ? !el.paused : false),
        duration: (uiDur !== null && uiDur > 0) ? uiDur : (el ? (isFinite(el.duration) ? el.duration : 0) : 0),
        position: (uiCur !== null && uiDur > 0) ? uiCur : (el ? el.currentTime : 0),
        hasMedia: !!(el || (ms && ms.metadata && ms.metadata.title)),
        volume: el ? el.volume : 1,
        pipOk: pipOk
      };
    } catch (e) {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Media actions (injected into content pages)
  // ─────────────────────────────────────────────────────────────
  function executeMediaAction(act, val) {
    try {
      var els = Array.prototype.slice.call(document.querySelectorAll('video,audio'));
      var el = null;

      // Find active element
      for (var i = 0; i < els.length; i++) {
        if (!els[i].paused && !els[i].ended) {
          el = els[i];
          break;
        }
      }
      if (!el) {
        for (var j = 0; j < els.length; j++) {
          if (els[j].paused && els[j].currentTime > 0) {
            el = els[j];
            break;
          }
        }
      }
      if (!el && els.length) el = els[0];

      if (act === 'toggle') {
        if (el) {
          if (el.paused) el.play();
          else el.pause();
        }
      } else if (act === 'prev') {
        if (el) {
          var pb = document.querySelector('ytmusic-player-bar .previous-button') ||
                   document.querySelector('.ytp-prev-button') ||
                   document.querySelector('.previous-button');
          if (pb) pb.click();
          else el.currentTime = 0;
        }
      } else if (act === 'next') {
        if (el) {
          var nb = document.querySelector('ytmusic-player-bar .next-button') ||
                   document.querySelector('.ytp-next-button') ||
                   document.querySelector('.next-button');
          if (nb) nb.click();
          else el.currentTime = el.duration;
        }
      } else if (act === 'seek' && typeof val === 'number') {
        var isYTM = window.location.hostname === 'music.youtube.com';
        var v = document.querySelectorAll('video');
        var u = null;
        var uc = null;

        try {
          if (isYTM) {
            var t = document.querySelector('.time-info.ytmusic-player-bar');
            if (t) {
              var p = t.textContent.trim().split('/');
              if (p.length === 2) {
                var pT = function(s) {
                  var z = s.trim().split(':').map(Number);
                  return z.length === 2 ? z[0] * 60 + z[1] : (z.length === 3 ? z[0] * 3600 + z[1] * 60 + z[2] : 0);
                };
                uc = pT(p[0]);
                u = pT(p[1]);
              }
            }
          } else {
            var td = document.querySelector('.ytp-time-duration');
            if (td) {
              u = td.textContent.trim().split(':').reduce(function(a, x) {
                return (60 * a) + parseInt(x);
              }, 0);
            }
          }
        } catch (e) {}

        var target = null;
        if (u > 0 && !isYTM) {
          for (var i = 0; i < v.length; i++) {
            if (Math.abs(v[i].duration - u) <= 2) {
              target = v[i];
              break;
            }
          }
        }
        if (!target) target = document.querySelector('.html5-main-video');
        if (!target && v.length) target = v[v.length - 1];

        if (target) {
          if (isYTM && uc !== null && u > 0) {
            var offset = target.currentTime - uc;
            target.currentTime = val + offset;
          } else {
            target.currentTime = val;
          }
        }
      }
    } catch (e) {}
  }

  function togglePiP() {
    try {
      var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
      var v = null;
      for (var i = 0; i < vids.length; i++) {
        if (!vids[i].paused) {
          v = vids[i];
          break;
        }
      }
      if (!v && vids.length) v = vids[0];
      if (!v || !document.pictureInPictureEnabled) return false;

      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else {
        v.requestPictureInPicture();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────
  return {
    formatTime: formatTime,
    getPlayIcon: getPlayIcon,
    extractVibrant: extractVibrant,
    fetchLyrics: fetchLyrics,
    getTabMediaState: getTabMediaState,
    executeMediaAction: executeMediaAction,
    togglePiP: togglePiP
  };
})();

})();

(function() {
'use strict';

/**
 * Dynamic Island - Shared CSS Styles
 * Generates CSS string based on configuration
 */

var VDI = VDI || {};

VDI.Styles = (function() {
  'use strict';

  var DEFAULTS = {
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
    dark: 'hsl(244,40%,6%)'
  };

  function generate(opts) {
    opts = opts || {};
    var islandTop = opts.islandTop || 10;
    var accent = opts.accent || DEFAULTS.accent;
    var gradient = opts.gradient || DEFAULTS.gradient;
    var dark = opts.dark || DEFAULTS.dark;

    var rules = [];

    // ═══════════════════════════════════════════════════════════
    // Main Container
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi{',
        'position:fixed;top:' + islandTop + 'px;left:50%;transform:translateX(-50%);',
        'z-index:2147483647;border-radius:32px;overflow:hidden;user-select:none;cursor:default;',
        'width:168px;height:34px;',
        'background:var(--vdi-dark,' + dark + ');',
        'box-shadow:0 0 0 1px rgba(255,255,255,.08),0 10px 40px rgba(0,0,0,.8),0 0 80px var(--vdi-glow,rgba(99,102,241,.18));',
        'opacity:0;pointer-events:none;',
        'font-family:-apple-system,Inter,Segoe UI,sans-serif;',
        'transition:width .55s cubic-bezier(.32,.72,0,1),height .55s cubic-bezier(.32,.72,0,1),',
          'border-radius .55s cubic-bezier(.32,.72,0,1),background .7s ease,box-shadow .7s ease,opacity .3s ease;',
      '}'
    );

    // State classes
    rules.push('#vdi.vdi-visible{opacity:1;pointer-events:all;}');
    rules.push('#vdi.vdi-expanded{width:400px;height:152px;border-radius:26px;}');
    rules.push('#vdi.vdi-idle{width:28px!important;height:28px!important;border-radius:14px!important;opacity:.95!important;}');

    // ═══════════════════════════════════════════════════════════
    // Collapsed Pill View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-col{',
        'position:absolute;inset:0;display:flex;align-items:center;gap:8px;padding:0 13px;',
        'opacity:1;transition:opacity .18s ease;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-col{opacity:0;pointer-events:none;}');
    rules.push('#vdi.vdi-idle #vdi-col{justify-content:center;padding:0;}');
    rules.push('#vdi.vdi-idle #vdi-col-text,#vdi.vdi-idle #vdi-col-btn{display:none;}');

    // EQ Visualizer
    rules.push(
      '#vdi-eq{',
        'display:flex;align-items:flex-end;justify-content:center;gap:3px;',
        'width:16px;height:12px;flex-shrink:0;',
      '}'
    );
    rules.push(
      '.vdi-eq-bar{',
        'width:3px;height:3px;',
        'background:var(--vdi-accent,' + accent + ');',
        'border-radius:1.5px;',
        'transition:height .15s ease, background .7s ease;',
      '}'
    );

    // Track text
    rules.push('#vdi-col-text{flex:1;overflow:hidden;white-space:nowrap;}');
    rules.push(
      '#vdi-col-inner{',
        'display:inline-block;font-size:11px;font-weight:500;color:rgba(255,255,255,.82);',
        'animation:vdi-scroll 9s linear infinite;',
      '}'
    );
    rules.push('@keyframes vdi-scroll{0%,28%{transform:translateX(0)}72%{transform:translateX(-55%)}100%{transform:translateX(0)}}');
    rules.push('#vdi-col-btn{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}');

    // ═══════════════════════════════════════════════════════════
    // Expanded View
    // ═══════════════════════════════════════════════════════════
    rules.push(
      '#vdi-exp{',
        'position:absolute;inset:0;display:flex;align-items:center;padding:14px 15px;gap:13px;',
        'opacity:0;transform:scale(.9);',
        'transition:opacity .28s ease .13s,transform .28s ease .13s;pointer-events:none;',
      '}'
    );
    rules.push('#vdi.vdi-expanded #vdi-exp{opacity:1;transform:scale(1);pointer-events:all;}');

    // Album Art
    rules.push(
      '#vdi-art{',
        'width:74px;height:74px;border-radius:14px;flex-shrink:0;overflow:hidden;isolation:isolate;',
        'background:var(--vdi-grad,' + gradient + ');',
        'box-shadow:0 4px 20px rgba(0,0,0,.5);',
        'display:flex;align-items:center;justify-content:center;position:relative;',
        'transition:background .7s ease;',
      '}'
    );
    rules.push('#vdi-art img{position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:cover;border-radius:14px;opacity:0;transition:opacity .4s ease;}');
    rules.push('#vdi-art img.ok{opacity:1;}');
    rules.push('#vdi-art-ph{font-size:28px;line-height:1;}');

    // Track Info
    rules.push('#vdi-track{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}');
    rules.push('#vdi-title-row{display:flex;align-items:center;gap:6px;min-width:0;}');
    rules.push('#vdi-title{flex:1;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // PiP Button
    rules.push(
      '#vdi-pip-btn{',
        'width:22px;height:22px;border-radius:6px;border:none;background:rgba(255,255,255,.07);',
        'color:rgba(255,255,255,.55);display:none;align-items:center;justify-content:center;',
        'cursor:pointer;flex-shrink:0;',
        'transition:background .2s,color .2s,transform .15s;',
      '}'
    );
    rules.push('#vdi-pip-btn.show{display:flex;}');
    rules.push('#vdi-pip-btn:hover{background: #fff;transform:scale(1.1);}');
    rules.push('#vdi-pip-btn svg{width:13px;height:13px;pointer-events:none;}');

    rules.push('#vdi-artist{font-size:11px;color:rgba(255,255,255,.38);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}');

    // ═══════════════════════════════════════════════════════════
    // Progress Bar
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-prog-row{display:flex;align-items:center;gap:5px;}');
    rules.push('.vdi-t{font-size:9px;color:rgba(255,255,255,.5);min-width:22px;}');
    rules.push('#vdi-prog{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:99px;cursor:pointer;position:relative;}');
    rules.push(
      '#vdi-prog-fill{',
        'height:100%;width:0%;border-radius:99px;',
        'background:var(--vdi-accent,' + accent + ') ;',
        'transition:width .6s linear, background .7s ease;',
      '}'
    );

    // ═══════════════════════════════════════════════════════════
    // Control Buttons
    // ═══════════════════════════════════════════════════════════
    rules.push('#vdi-ctrl-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;}');
    rules.push('#vdi-ctrl-main{display:flex;align-items:center;gap:6px;}');
    rules.push('#vdi-ctrl-extra{display:flex;align-items:center;gap:3px;}');

    // Standard button
    rules.push(
      '.vdi-btn{',
        'width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);',
        'transition:background .2s,transform .15s,color .15s;',
      '}'
    );
    rules.push('.vdi-btn:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}');
    rules.push('.vdi-btn:active{transform:scale(.92);}');
    rules.push('.vdi-btn svg{width:16px;height:16px;pointer-events:none;}');

    // Icon button (smaller, square-ish)
    rules.push(
      '.vdi-icon-btn{',
        'width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);',
        'transition:background .2s,color .2s,transform .15s;',
      '}'
    );
    rules.push('.vdi-icon-btn:hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.08);}');
    rules.push('.vdi-icon-btn.active{color:var(--vdi-accent,' + accent + ');}');
    rules.push('.vdi-icon-btn svg{width:15px;height:15px;pointer-events:none;}');

    // Play button (special styling)
    rules.push(
      '#vdi-play{',
        'width:40px;height:40px;border-radius:50%;',
        'background:var(--vdi-grad,' + gradient + ');',
        'color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);',
        'display:flex;align-items:center;justify-content:center;border:none;',
        'cursor:pointer;transition:background .7s ease, transform .15s;',
      '}'
    );
    rules.push('#vdi-play:hover{transform:scale(1.08);filter:brightness(1.1);}');
    rules.push('#vdi-play svg{width:18px;height:18px;}');

    // ═══════════════════════════════════════════════════════════
    // Lyrics Panel
    // ═══════════════════════════════════════════════════════════
    var lyricsTop = islandTop + 165;
    rules.push(
      '#vdi-lyrics-panel{',
        'position:fixed;top:' + lyricsTop + 'px;left:50%;transform:translateX(-50%) translateY(-10px);',
        'z-index:2147483646;width:400px;height:380px;border-radius:32px;overflow:hidden;',
        'background:rgba(0,0,0,0.5);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);',
        'border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);',
        'opacity:0;pointer-events:none;',
        'transition:opacity 0.4s cubic-bezier(.32,.72,0,1), transform 0.4s cubic-bezier(.32,.72,0,1);',
        'display:flex;flex-direction:column;padding:24px 0;',
      '}'
    );
    rules.push('#vdi-lyrics-panel.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}');

    rules.push(
      '#vdi-lyrics-scroll{',
        'flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 32px;',
        'mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
        '-webkit-mask-image:linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);',
      '}'
    );
    rules.push('#vdi-lyrics-scroll::-webkit-scrollbar{display:none;}');

    // Lyric lines
    rules.push(
      '.vdi-lyric-line{',
        'font-size:22px;font-weight:700;line-height:1.5;color:rgba(255,255,255,0.25);',
        'padding:14px 0;',
        'transition:color 0.8s ease,transform 0.8s cubic-bezier(0.2,0.8,0.2,1), filter 0.8s ease;',
        'transform-origin:left center;cursor:pointer;',
        'filter:blur(1.5px);transform:scale(0.95);',
      '}'
    );
    rules.push('.vdi-lyric-line:hover{color:rgba(255,255,255,0.6);filter:blur(0px);}');
    rules.push('.vdi-lyric-line.active{color:#fff;transform:scale(1.1);text-shadow:0 4px 20px rgba(0,0,0,0.6);filter:blur(0px);}');
    rules.push('.vdi-lyric-line.unsynced{font-size:16px;color:rgba(255,255,255,0.8);transform:none;filter:none;}');

    return rules.join('');
  }

  return {
    generate: generate,
    DEFAULTS: DEFAULTS
  };
})();

})();

(function() {
'use strict';

/**
 * Dynamic Island - Vivaldi Platform
 * Uses chrome.tabs and chrome.scripting directly from browser UI context
 */

var VDI = VDI || {};

VDI.Platform = VDI.Platform || {};

VDI.Platform.Vivaldi = (function() {
  'use strict';

  function execInTab(tabId, fn, args, cb) {
    if (!tabId) {
      if (cb) cb(null);
      return;
    }
    try {
      if (chrome && chrome.scripting && chrome.scripting.executeScript) {
        var spec = {
          target: { tabId: tabId, allFrames: false },
          func: fn
        };
        if (args && args.length) spec.args = args;

        chrome.scripting.executeScript(spec, function(res) {
          if (chrome.runtime.lastError || !res) {
            if (cb) cb(null);
            return;
          }
          if (cb) cb(res[0] ? res[0].result : null);
        });
      } else if (chrome && chrome.tabs && chrome.tabs.executeScript) {
        // Legacy API fallback
        var argStr = args ? args.map(function(a) { return JSON.stringify(a); }).join(',') : '';
        chrome.tabs.executeScript(tabId, { code: '(' + fn.toString() + ')(' + argStr + ')' }, function(res) {
          if (chrome.runtime.lastError || !res) {
            if (cb) cb(null);
            return;
          }
          if (cb) cb(res[0] !== undefined ? res[0] : null);
        });
      } else {
        if (cb) cb(null);
      }
    } catch (e) {
      if (cb) cb(null);
    }
  }

  function sendAction(tabId, action, value, onUpdate) {
    var args = (value !== undefined) ? [action, value] : [action];
    execInTab(tabId, VDI.Core.executeMediaAction, args, null);

    // Rapid poll after action to reflect changes
    setTimeout(onUpdate, 150);
    setTimeout(onUpdate, 400);
    setTimeout(onUpdate, 900);
  }

  function jumpToTab(tabId, windowId) {
    if (tabId === null) return;
    try {
      chrome.tabs.update(tabId, { active: true });
    } catch (e) {}
    try {
      if (windowId !== null) {
        chrome.windows.update(windowId, { focused: true });
      }
    } catch (e) {}
  }

  function requestPiP(tabId) {
    execInTab(tabId, VDI.Core.togglePiP, [], null);
  }

  function pollMedia(callback) {
    try {
      if (!chrome || !chrome.tabs) return;

      chrome.tabs.query({ audible: true }, function(tabs) {
        try {
          if (chrome.runtime.lastError) return;
          var tab = (tabs && tabs.length) ? tabs[0] : null;

          callback(tab);
        } catch (e) {}
      });
    } catch (e) {}
  }

  function getMediaStateFromTab(tabId, callback) {
    execInTab(tabId, VDI.Core.getTabMediaState, [], callback);
  }

  return {
    execInTab: execInTab,
    sendAction: sendAction,
    jumpToTab: jumpToTab,
    requestPiP: requestPiP,
    pollMedia: pollMedia,
    getMediaStateFromTab: getMediaStateFromTab
  };
})();

})();

(function() {
'use strict';

/**
 * Dynamic Island - Shared UI Component
 * Manages the DOM, interactions, and visual updates
 */

var VDI = VDI || {};

VDI.UI = (function() {
  'use strict';

  var DEFAULTS = VDI.Styles.DEFAULTS;

  function createIsland(opts) {
    opts = opts || {};

    var island = document.createElement('div');
    island.id = 'vdi';

    island.innerHTML =
      '<div id="vdi-col">' +
        '<div id="vdi-eq">' +
          '<div class="vdi-eq-bar b1"></div>' +
          '<div class="vdi-eq-bar b2"></div>' +
          '<div class="vdi-eq-bar b3"></div>' +
        '</div>' +
        '<div id="vdi-col-text"><span id="vdi-col-inner">No media</span></div>' +
        '<div id="vdi-col-btn"><svg id="vdi-col-icon" viewBox="0 0 24 24" fill="white" width="10" height="10">' + VDI.Core.getPlayIcon(false) + '</svg></div>' +
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
              '<button class="vdi-btn" id="vdi-prev" title="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>' +
              '<button class="vdi-btn" id="vdi-play" title="Play/Pause"><svg id="vdi-pp" viewBox="0 0 24 24" fill="currentColor">' + VDI.Core.getPlayIcon(false) + '</svg></button>' +
              '<button class="vdi-btn" id="vdi-next" title="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' +
            '</div>' +
            '<div id="vdi-ctrl-extra">' +
              '<button class="vdi-icon-btn" id="vdi-lyr-btn" title="Lyrics">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return island;
  }

  function createLyricsPanel(opts) {
    opts = opts || {};
    var panel = document.createElement('div');
    panel.id = 'vdi-lyrics-panel';
    panel.innerHTML = '<div id="vdi-lyrics-scroll"></div>';
    return panel;
  }

  function createController(island, lyrPanel, platform, opts) {
    opts = opts || {};
    var isVivaldi = opts.isVivaldi || false;

    var state = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      lastArtwork: null,
      lastArtTitle: null,
      supportsPiP: false,
      lyricsOn: false,
      lyricsLines: [],
      lyricsIdx: -1,
      lastLyricsKey: '',
      isIdle: false,
      lyricsSynced: false
    };

    var idleTimer = null;
    var colTimer = null;
    var tickInterval = opts.tickInterval || 1000;
    var idleDelay = opts.idleDelay || 9000;
    var collapseDelay = opts.collapseDelay || 500;

    // Helper
    function $(id) { return document.getElementById(id); }

    // Theme application
    function applyTheme(c) {
      var accent = c ? c.accent : DEFAULTS.accent;
      var grad = c ? c.gradient : DEFAULTS.gradient;
      var dark = c ? c.dark : DEFAULTS.dark;
      var glow = c ? c.glow : 'rgba(99,102,241,.2)';

      island.style.setProperty('--vdi-accent', accent);
      island.style.setProperty('--vdi-grad', grad);
      island.style.setProperty('--vdi-dark', dark);
      island.style.setProperty('--vdi-glow', glow);
    }

    // Update progress bar
    function refreshProgress() {
      var pct = state.duration > 0 ? Math.min(100, (state.position / state.duration) * 100) : 0;
      $('vdi-prog-fill').style.width = pct + '%';
      $('vdi-pos').textContent = VDI.Core.formatTime(state.position);
      $('vdi-dur').textContent = VDI.Core.formatTime(state.duration);
    }

    // Update play/pause icons
    function setPlayIcon(playing) {
      var svg = VDI.Core.getPlayIcon(playing);
      if ($('vdi-pp')) $('vdi-pp').innerHTML = svg;
      if ($('vdi-col-icon')) $('vdi-col-icon').innerHTML = svg;
    }

    // Main UI update
    function updateUI() {
      if (!state.hasMedia) {
        island.classList.remove('vdi-visible');
        return;
      }
      island.classList.add('vdi-visible');

      var label = [state.title, state.artist].filter(Boolean).join(' \u2014 ') || 'Now Playing';
      $('vdi-col-inner').textContent = label;
      $('vdi-title').textContent = state.title || 'Unknown Track';
      $('vdi-artist').textContent = state.artist || 'Unknown Artist';

      setPlayIcon(state.isPlaying);

      if (state.supportsPiP) $('vdi-pip-btn').classList.add('show');
      else $('vdi-pip-btn').classList.remove('show');

      // Album art
      if (state.artwork && (state.artwork !== state.lastArtwork || state.title !== state.lastArtTitle)) {
        state.lastArtwork = state.artwork;
        state.lastArtTitle = state.title;
        var img = $('vdi-art-img');
        img.classList.remove('ok');
        img.src = state.artwork;
        img.onload = function() {
          img.classList.add('ok');
          $('vdi-art-ph').style.display = 'none';
        };
        img.onerror = function() {
          $('vdi-art-ph').style.display = 'flex';
        };
        VDI.Core.extractVibrant(state.artwork, applyTheme);
      } else if (!state.artwork && state.lastArtwork) {
        state.lastArtwork = null;
        var im2 = $('vdi-art-img');
        im2.classList.remove('ok');
        im2.src = '';
        $('vdi-art-ph').style.display = 'flex';
        applyTheme(null);
      }

      refreshProgress();
    }

    // Lyrics handling
    function fetchAndRenderLyrics() {
      var key = state.title + '|' + state.artist;
      state.lastLyricsKey = key;
      state.lyricsLines = [];
      state.lyricsIdx = -1;
      state.lyricsSynced = false;

      $('vdi-lyr-btn').style.display = 'flex';
      $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">Loading lyrics...</div>';

      VDI.Core.fetchLyrics(state.title, state.artist, state.duration, function(lines, synced) {
        if (key !== state.lastLyricsKey) return;

        if (!lines || !lines.length) {
          $('vdi-lyrics-scroll').innerHTML = '<div class="vdi-lyric-line unsynced" style="text-align:center;margin-top:50px;">No lyrics found for this track.</div>';
          return;
        }

        state.lyricsLines = lines;
        state.lyricsSynced = synced;

        var html = '';
        for (var k = 0; k < lines.length; k++) {
          var cls = synced ? 'vdi-lyric-line' : 'vdi-lyric-line unsynced';
          html += '<div class="' + cls + '" id="vdi-lyr-' + k + '">' + (lines[k].text || '&nbsp;') + '</div>';
        }
        $('vdi-lyrics-scroll').innerHTML = html;
        $('vdi-lyr-btn').style.display = 'flex';

        if (state.lyricsOn) lyrPanel.classList.add('show');

        // Bind click handlers for synced lyrics
        if (synced) {
          for (var n = 0; n < lines.length; n++) {
            (function(tTarget, idx) {
              var lineEl = document.getElementById('vdi-lyr-' + idx);
              if (lineEl) {
                lineEl.addEventListener('click', function(e) {
                  e.stopPropagation();
                  state.position = tTarget;
                  refreshProgress();
                  platform.sendAction(state.tabId, 'seek', tTarget);
                });
              }
            })(lines[n].time, n);
          }
        }
      });
    }

    function syncLyrics() {
      if (!state.lyricsLines.length || !state.lyricsSynced) return;

      var pos = state.position;
      var idx = -1;

      for (var i = state.lyricsLines.length - 1; i >= 0; i--) {
        if (state.lyricsLines[i].time <= pos + 0.3) {
          idx = i;
          break;
        }
      }

      if (idx !== state.lyricsIdx && idx >= 0) {
        if (state.lyricsIdx >= 0) {
          var old = $('vdi-lyr-' + state.lyricsIdx);
          if (old) old.classList.remove('active');
        }
        state.lyricsIdx = idx;
        var cur = $('vdi-lyr-' + idx);
        if (cur) {
          cur.classList.add('active');
          if (state.lyricsOn) {
            cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }

    // Idle handling
    function resetIdle() {
      clearTimeout(idleTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      idleTimer = setTimeout(function() {
        if (!state.hasMedia) return;
        state.isIdle = true;
        island.classList.add('vdi-idle');
      }, idleDelay);
    }

    // Expand/collapse
    function handleMouseEnter() {
      clearTimeout(colTimer);
      if (state.isIdle) {
        state.isIdle = false;
        island.classList.remove('vdi-idle');
      }
      island.classList.add('vdi-expanded');
      resetIdle();
    }

    function handleMouseLeave() {
      clearTimeout(colTimer);
      colTimer = setTimeout(function() {
        island.classList.remove('vdi-expanded');
        if (state.lyricsOn) {
          state.lyricsOn = false;
          $('vdi-lyr-btn').classList.remove('active');
          lyrPanel.classList.remove('show');
        }
      }, collapseDelay);
      resetIdle();
    }

    // Event binding
    function bindEvents() {
      island.addEventListener('mouseenter', handleMouseEnter);
      island.addEventListener('mouseleave', handleMouseLeave);
      lyrPanel.addEventListener('mouseenter', handleMouseEnter);
      lyrPanel.addEventListener('mouseleave', handleMouseLeave);

      document.addEventListener('mousemove', function(e) {
        if (!state.hasMedia) return;
        var r = island.getBoundingClientRect();
        if (e.clientX >= r.left - 80 && e.clientX <= r.right + 80 &&
            e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) {
          resetIdle();
        }
      });

      // Double-click to jump to tab
      island.addEventListener('dblclick', function() {
        platform.jumpToTab(state.tabId, state.windowId);
      });

      // Controls
      $('vdi-prev').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'prev');
      });

      $('vdi-next').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'next');
      });

      $('vdi-play').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.sendAction(state.tabId, 'toggle');
        state.isPlaying = !state.isPlaying;
        setPlayIcon(state.isPlaying);
      });

      $('vdi-prog').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.duration) return;
        var r = e.currentTarget.getBoundingClientRect();
        state.position = ((e.clientX - r.left) / r.width) * state.duration;
        refreshProgress();
        platform.sendAction(state.tabId, 'seek', state.position);
      });

      $('vdi-pip-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        platform.requestPiP(state.tabId);
      });

      $('vdi-lyr-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        state.lyricsOn = !state.lyricsOn;
        $('vdi-lyr-btn').classList.toggle('active', state.lyricsOn);

        if (state.lyricsOn) {
          lyrPanel.classList.add('show');
          if (state.lyricsSynced && state.lyricsIdx >= 0) {
            var cur = $('vdi-lyr-' + state.lyricsIdx);
            if (cur) cur.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        } else {
          lyrPanel.classList.remove('show');
        }
      });
    }

    // Tick update
    function startTick() {
      setInterval(function() {
        if (state.isPlaying && state.duration > 0) {
          state.position = Math.min(state.duration, state.position + 1);
          refreshProgress();
        }
        syncLyrics();
      }, tickInterval);

      // EQ animation
      setInterval(function() {
        var bars = document.querySelectorAll('.vdi-eq-bar');
        if (!bars.length) return;
        for (var i = 0; i < bars.length; i++) {
          if (!state.isPlaying) {
            bars[i].style.height = '3px';
          } else {
            bars[i].style.height = Math.floor(4 + Math.random() * 9) + 'px';
          }
        }
      }, 200);
    }

    // Fullscreen handling
    function setupFullscreen() {
      document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
          island.style.display = 'none';
          if (lyrPanel) lyrPanel.style.display = 'none';
        } else {
          island.style.display = '';
          if (lyrPanel) lyrPanel.style.display = '';
        }
      });
    }

    // Public state getter/setter
    function setState(newState) {
      if (!newState) return;

      var prevKey = state.title + '|' + state.artist;

      state.hasMedia = newState.hasMedia;
      state.isPlaying = newState.isPlaying;
      state.title = newState.title;
      state.artist = newState.artist;
      state.artwork = newState.artwork;
      state.duration = newState.duration;
      state.position = newState.position;
      state.supportsPiP = newState.supportsPiP;
      state.tabId = newState.tabId !== undefined ? newState.tabId : state.tabId;
      state.windowId = newState.windowId !== undefined ? newState.windowId : state.windowId;

      updateUI();

      var key = state.title + '|' + state.artist;
      if (key !== prevKey && state.title) {
        fetchAndRenderLyrics();
      }
    }

    function getState() {
      return state;
    }

    // Initialize
    function init() {
      bindEvents();
      startTick();
      setupFullscreen();
      resetIdle();
    }

    return {
      init: init,
      setState: setState,
      getState: getState,
      updateUI: updateUI,
      refreshProgress: refreshProgress
    };
  }

  return {
    createIsland: createIsland,
    createLyricsPanel: createLyricsPanel,
    createController: createController
  };
})();

})();


(function() {
  'use strict';

  // Guard: only run once
  if (document.getElementById('vdi')) return;

  // Inject CSS
  var css = document.createElement('style');
  css.id = 'vdi-css';
  css.textContent = VDI.Styles.generate({ islandTop: 54 });
  document.head.appendChild(css);

  // Create UI
  var island = VDI.UI.createIsland();
  var lyrPanel = VDI.UI.createLyricsPanel();
  document.body.appendChild(island);
  document.body.appendChild(lyrPanel);

  // Platform adapter
  var platform = {
    sendAction: function(tabId, action, value) {
      var onUpdate = poll;
      VDI.Platform.Vivaldi.sendAction(tabId, action, value, onUpdate);
    },
    jumpToTab: VDI.Platform.Vivaldi.jumpToTab,
    requestPiP: VDI.Platform.Vivaldi.requestPiP
  };

  // Create controller
  var ctrl = VDI.UI.createController(island, lyrPanel, platform, {
    isVivaldi: true,
    tickInterval: 1000,
    idleDelay: 9000,
    collapseDelay: 500
  });

  ctrl.init();

  // Media polling for Vivaldi
  var pollInterval = 1500;
  var pollTimer = null;

  function poll() {
    VDI.Platform.Vivaldi.pollMedia(function(tab) {
      var state = ctrl.getState();

      if (!tab) {
        if (state.tabId !== null) {
          VDI.Platform.Vivaldi.getMediaStateFromTab(state.tabId, function(res) {
            if (!res) {
              ctrl.setState({ hasMedia: false });
              return;
            }
            ctrl.setState({
              isPlaying: res.isPlaying,
              position: res.position,
              duration: res.duration,
              hasMedia: res.hasMedia
            });
          });
        } else if (state.hasMedia) {
          ctrl.setState({ hasMedia: false });
        }
        return;
      }

      state.tabId = tab.id;
      state.windowId = tab.windowId;

      VDI.Platform.Vivaldi.getMediaStateFromTab(tab.id, function(res) {
        if (!res) {
          ctrl.setState({ hasMedia: true, tabId: tab.id, windowId: tab.windowId });
          return;
        }

        ctrl.setState({
          hasMedia: res.hasMedia || true,
          isPlaying: res.isPlaying,
          title: res.title || tab.title || '',
          artist: res.artist || '',
          artwork: res.artwork,
          duration: res.duration || 0,
          position: res.position || 0,
          supportsPiP: res.pipOk || false,
          tabId: tab.id,
          windowId: tab.windowId
        });
      });
    });
  }

  poll();
  setInterval(poll, pollInterval);

  console.log('[Vivaldi Dynamic Island] Loaded OK');
})();
