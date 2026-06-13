/**
 * Dynamic Island - Chrome Extension Platform
 * Content script that communicates with background service worker
 */

var VDI = VDI || {};

VDI.Platform = VDI.Platform || {};

VDI.Platform.ChromeExt = (function() {
  'use strict';

  /* Content Script Side */

  function sendAction(action, value) {
    chrome.runtime.sendMessage({
      type: 'VDI_ACTION',
      act: action,
      val: value
    });
  }

  function jumpToTab() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'jump' });
  }

  function requestPiP() {
    chrome.runtime.sendMessage({ type: 'VDI_ACTION', act: 'pip' });
  }

  function requestState(callback) {
    try {
      chrome.runtime.sendMessage({ type: 'VDI_REQUEST_STATE' }, function(state) {
        if (callback) callback(state);
      });
    } catch (e) {
      if (callback) callback(null);
    }
  }

  function onStateUpdate(callback) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg.type === 'VDI_UPDATE') {
        callback(msg.state);
      }
    });
  }

  /* Background Script Side (for background.js) */

  function createBackgroundWorker() {
    var S = {
      isPlaying: false,
      title: '',
      artist: '',
      artwork: null,
      duration: 0,
      position: 0,
      hasMedia: false,
      tabId: null,
      windowId: null,
      supportsPiP: false
    };

    var pollInterval = 1000;

    function execInTab(tabId, fn, args, cb) {
      if (!tabId) {
        if (cb) cb(null);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: false },
        func: fn,
        args: args || [],
        world: 'ISOLATED'
      }, function(res) {
        if (chrome.runtime.lastError || !res) {
          if (cb) cb(null);
          return;
        }
        if (cb) cb(res[0] ? res[0].result : null);
      });
    }

    function broadcastState() {
      chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, { type: 'VDI_UPDATE', state: S }, function() {
            if (chrome.runtime.lastError) {} // suppress "no listener" errors
          });
        }
      });
    }

    function poll() {
      chrome.tabs.query({ audible: true }, function(tabs) {
        var tab = (tabs && tabs.length) ? tabs[0] : null;

        if (!tab) {
          if (S.tabId !== null) {
            execInTab(S.tabId, VDI.Core.getTabMediaState, [], function(res) {
              if (!res) {
                S.hasMedia = false;
                broadcastState();
                return;
              }
              S.isPlaying = res.isPlaying;
              S.position = res.position;
              S.duration = res.duration;
              if (!res.hasMedia) S.hasMedia = false;
              broadcastState();
            });
          } else if (S.hasMedia) {
            S.hasMedia = false;
            broadcastState();
          }
          return;
        }

        S.tabId = tab.id;
        S.windowId = tab.windowId;

        execInTab(tab.id, VDI.Core.getTabMediaState, [], function(res) {
          if (!res) {
            S.hasMedia = true;
            broadcastState();
            return;
          }

          S.hasMedia = res.hasMedia || true;
          S.isPlaying = res.isPlaying;
          S.title = res.title || tab.title || '';
          S.artist = res.artist || '';
          S.artwork = res.artwork || null;
          S.duration = res.duration || 0;
          S.position = res.position || 0;
          S.supportsPiP = res.pipOk || false;

          broadcastState();
        });
      });
    }

    function handleMessage(msg, sender, sendResponse) {
      if (msg.type === 'VDI_ACTION') {
        if (msg.act === 'pip') {
          execInTab(S.tabId, VDI.Core.togglePiP, [], null);
        } else if (msg.act === 'jump') {
          if (S.tabId !== null) {
            chrome.tabs.update(S.tabId, { active: true });
            if (S.windowId !== null) {
              chrome.windows.update(S.windowId, { focused: true });
            }
          }
        } else {
          var args = msg.val !== undefined ? [msg.act, msg.val] : [msg.act];
          execInTab(S.tabId, VDI.Core.executeMediaAction, args, null);

          // Rapid poll after actions
          setTimeout(poll, 200);
          setTimeout(poll, 500);
          setTimeout(poll, 1000);
        }
      } else if (msg.type === 'VDI_REQUEST_STATE') {
        sendResponse(S);
      }
    }

    function start() {
      setInterval(poll, pollInterval);
      poll();

      chrome.runtime.onMessage.addListener(handleMessage);
      chrome.tabs.onActivated.addListener(function() { poll(); });
      chrome.windows.onFocusChanged.addListener(function() { poll(); });
    }

    return {
      start: start,
      getState: function() { return S; }
    };
  }

  return {
    // Content script methods
    sendAction: sendAction,
    jumpToTab: jumpToTab,
    requestPiP: requestPiP,
    requestState: requestState,
    onStateUpdate: onStateUpdate,

    // Background script factory
    createBackgroundWorker: createBackgroundWorker
  };
})();
