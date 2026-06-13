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
