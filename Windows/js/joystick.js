// Touch Joystick & Mobile On-Screen Controls Module for Corn Thief Maze
const Joystick = (() => {
  const $ = id => document.getElementById(id);
  let active = false;
  let joyTouchId = null;
  let lookTouchId = null;
  let startX = 0, startY = 0;
  let curX = 0, curY = 0;
  let moveX = 0, moveY = 0; // -1 to 1
  let isSprinting = false;
  let lastLookX = 0, lastLookY = 0;
  const RADIUS = 48; // Max thumb displacement in pixels

  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  }

  function init() {
    const wrap = $('touchControlsWrap');
    if (!wrap) return;

    // Show controls automatically if touch device or mobile screen
    if (isTouchDevice() || window.innerWidth <= 900) {
      wrap.style.display = 'block';
    }

    const joyZone = $('joyTouchZone');
    const joyKnob = $('joyKnob');
    const lookZone = $('lookTouchZone');

    if (!joyZone || !joyKnob) return;

    // --- JOYSTICK TOUCH HANDLERS ---
    joyZone.addEventListener('touchstart', e => {
      e.preventDefault();
      if (joyTouchId !== null) return;
      const touch = e.changedTouches[0];
      joyTouchId = touch.identifier;
      const rect = joyZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      startX = centerX;
      startY = centerY;
      updateKnob(touch.clientX, touch.clientY);
      active = true;
    }, { passive: false });

    joyZone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joyTouchId) {
          updateKnob(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: false });

    const endJoy = e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          resetJoy();
          break;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);

    // --- CAMERA LOOK TOUCH HANDLERS ---
    if (lookZone) {
      lookZone.addEventListener('touchstart', e => {
        if (lookTouchId !== null) return;
        // Ignore touches on interactive buttons
        const target = e.target;
        if (target.closest('.touch-btn') || target.closest('button')) return;

        const touch = e.changedTouches[0];
        lookTouchId = touch.identifier;
        lastLookX = touch.clientX;
        lastLookY = touch.clientY;
      }, { passive: true });

      lookZone.addEventListener('touchmove', e => {
        if (lookTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === lookTouchId) {
            const dx = touch.clientX - lastLookX;
            const dy = touch.clientY - lastLookY;
            lastLookX = touch.clientX;
            lastLookY = touch.clientY;

            // Apply camera rotation if in play state
            if (typeof G !== 'undefined' && G.p && typeof S !== 'undefined' && S.state === 'play' && !S.downed) {
              const sens = 0.0042;
              G.p.yaw -= dx * sens;
              G.p.pitch = Math.max(-1.2, Math.min(1.2, G.p.pitch - dy * sens));
            }
            break;
          }
        }
      }, { passive: true });

      const endLook = e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) {
            lookTouchId = null;
            break;
          }
        }
      };
      lookZone.addEventListener('touchend', endLook);
      lookZone.addEventListener('touchcancel', endLook);
    }

    // --- BUTTON HANDLERS ---
    const sprintBtn = $('touchSprintBtn');
    if (sprintBtn) {
      const startSprint = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSprinting = true;
        sprintBtn.classList.add('active');
      };
      const endSprint = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSprinting = false;
        sprintBtn.classList.remove('active');
      };
      sprintBtn.addEventListener('touchstart', startSprint, { passive: false });
      sprintBtn.addEventListener('touchend', endSprint, { passive: false });
      sprintBtn.addEventListener('touchcancel', endSprint, { passive: false });
      sprintBtn.addEventListener('mousedown', startSprint);
      sprintBtn.addEventListener('mouseup', endSprint);
    }

    const useBtn = $('touchUseBtn');
    if (useBtn) {
      useBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        triggerUse();
      }, { passive: false });
      useBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        triggerUse();
      });
    }

    const ventBtn = $('touchVentBtn');
    if (ventBtn) {
      ventBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof Game !== 'undefined' && Game.toggleVent) Game.toggleVent();
      }, { passive: false });
      ventBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof Game !== 'undefined' && Game.toggleVent) Game.toggleVent();
      });
    }

    const diveBtn = $('touchDiveBtn');
    if (diveBtn) {
      diveBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        triggerDiveOrMash();
      }, { passive: false });
      diveBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        triggerDiveOrMash();
      });
    }

    const toggleHudBtn = $('touchHudToggleBtn');
    if (toggleHudBtn) {
      toggleHudBtn.addEventListener('click', () => {
        const isHidden = wrap.style.display === 'none';
        wrap.style.display = isHidden ? 'block' : 'none';
      });
    }
  }

  function updateKnob(touchX, touchY) {
    const joyKnob = $('joyKnob');
    if (!joyKnob) return;

    let dx = touchX - startX;
    let dy = touchY - startY;
    const dist = Math.hypot(dx, dy);

    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    moveX = dx / RADIUS; // -1 to 1 (left to right)
    moveY = dy / RADIUS; // -1 to 1 (top to bottom)
  }

  function resetJoy() {
    joyTouchId = null;
    active = false;
    moveX = 0;
    moveY = 0;
    const joyKnob = $('joyKnob');
    if (joyKnob) {
      joyKnob.style.transform = 'translate(0px, 0px)';
    }
  }

  function triggerUse() {
    if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief') {
      if (Multiplayer.onCatchBtnClick) Multiplayer.onCatchBtnClick();
    } else {
      // Tap active item slot
      if (typeof Game !== 'undefined') {
        const keys = window.__gameKeys || {};
        keys['KeyE'] = true;
        setTimeout(() => { keys['KeyE'] = false; }, 150);
      }
      const activeSlot = document.querySelector('.slot.sel');
      if (activeSlot) activeSlot.click();
    }
  }

  function triggerDiveOrMash() {
    if (typeof Flood !== 'undefined') {
      if (typeof S !== 'undefined' && S.grab) {
        Flood.mash();
      } else {
        Flood.toggleDive();
      }
    }
  }

  return {
    init,
    getMove: () => ({
      fwd: -moveY, // Forward when dragging up
      str: moveX,  // Strafe right when dragging right
      active: active && (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1)
    }),
    get isSprinting() { return isSprinting; },
    get active() { return active; }
  };
})();
