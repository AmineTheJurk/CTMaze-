// Touch Controls: D-Pad, Action Buttons, Look Box
const TouchControls = (() => {
  let isEnabled = false;
  const touches = {};
  let lastLookX = 0, lastLookY = 0;
  let isDragging = false;

  function init() {
    if (isEnabled) return;
    isEnabled = true;

    // Create control overlay
    const overlay = createControlsOverlay();
    document.body.appendChild(overlay);

    // Setup touch event handlers
    setupTouchHandlers(overlay);

    console.log('Touch controls initialized');
  }

  function createControlsOverlay() {
    const div = document.createElement('div');
    div.id = 'touchControls';
    div.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: auto;
      z-index: 2;
      user-select: none;
      font-family: 'Alfa Slab One', Georgia, serif;
    `;

    // Full-screen look box (camera control area) - excludes bottom HUD and control areas
    const lookBox = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: calc(140px + env(safe-area-inset-bottom, 0px)); pointer-events: auto; z-index: 1;" id="lookBox"></div>
    `;

    // D-Pad (left side - compact cross layout)
    const dpad = `
      <div style="position: fixed; left: 12px; bottom: calc(145px + env(safe-area-inset-bottom, 0px)); pointer-events: auto; z-index: 10;">
        <button class="dpad-btn dpad-up" data-key="KeyW" style="position: absolute; left: 16px; top: 0; width: 38px; height: 38px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 18px;">↑</button>
        <button class="dpad-btn dpad-left" data-key="KeyA" style="position: absolute; left: 0; top: 44px; width: 38px; height: 38px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 18px;">←</button>
        <button class="dpad-btn dpad-down" data-key="KeyS" style="position: absolute; left: 16px; top: 88px; width: 38px; height: 38px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 18px;">↓</button>
        <button class="dpad-btn dpad-right" data-key="KeyD" style="position: absolute; left: 60px; top: 44px; width: 38px; height: 38px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 18px;">→</button>
      </div>
    `;

    // Action Buttons (right side - 2x3 grid)
    const actions = `
      <div style="position: fixed; right: 12px; bottom: calc(145px + env(safe-area-inset-bottom, 0px)); pointer-events: auto; z-index: 10;">
        <button class="action-btn" data-key="KeyQ" style="position: absolute; right: 84px; bottom: 48px; width: 40px; height: 40px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 16px;">Q</button>
        <button class="action-btn" data-key="Space" style="position: absolute; right: 42px; bottom: 48px; width: 40px; height: 40px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 16px;">⚔</button>
        <button class="action-btn" data-key="ShiftLeft" style="position: absolute; right: 0; bottom: 48px; width: 40px; height: 40px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 12px;">RUN</button>
        <button class="action-btn" data-key="KeyE" style="position: absolute; right: 84px; bottom: 0; width: 40px; height: 40px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 16px;">E</button>
        <button class="action-btn" data-key="KeyV" style="position: absolute; right: 42px; bottom: 0; width: 40px; height: 40px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 12px;">V</button>
        <button class="action-btn" data-key="KeyM" style="position: absolute; right: 0; bottom: 0; width: 40px; height: 40px; background: rgba(200, 26, 26, 0.85); border: 2px solid #f2c230; color: #f2c230; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 14px;">M</button>
      </div>
    `;

    div.innerHTML = lookBox + dpad + actions;
    return div;
  }

  function setupTouchHandlers(overlay) {
    // D-Pad and action buttons
    overlay.querySelectorAll('.dpad-btn, .action-btn').forEach(btn => {
      const keyCode = btn.dataset.key;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        simulateKeyDown(keyCode);
        btn.style.background = 'rgba(200, 26, 26, 1)';
        btn.style.transform = 'scale(0.95)';
      });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        simulateKeyUp(keyCode);
        btn.style.background = 'rgba(200, 26, 26, 0.85)';
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Mouse support for testing
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        simulateKeyDown(keyCode);
        btn.style.background = 'rgba(200, 26, 26, 1)';
        btn.style.transform = 'scale(0.95)';
      });

      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        e.stopPropagation();
        simulateKeyUp(keyCode);
        btn.style.background = 'rgba(200, 26, 26, 0.85)';
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('mousemove', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Look box for camera control
    const lookBox = document.getElementById('lookBox');
    if (lookBox) {
      lookBox.addEventListener('touchstart', (e) => {
        const target = e.target;
        if (target && (target.classList.contains('dpad-btn') || target.classList.contains('action-btn'))) {
          return;
        }

        if (e.touches.length > 0) {
          const touch = e.touches[0];
          lastLookX = touch.clientX;
          lastLookY = touch.clientY;
          isDragging = true;
        }
      }, { passive: false });

      lookBox.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length === 0) return;
        e.preventDefault();

        const touch = e.touches[0];
        const dx = (touch.clientX - lastLookX) * 0.003;
        const dy = (touch.clientY - lastLookY) * 0.003;

        if (G && G.p) {
          G.p.yaw -= dx;
          G.p.pitch = Math.max(-1.2, Math.min(1.2, G.p.pitch - dy));
        }

        lastLookX = touch.clientX;
        lastLookY = touch.clientY;
      }, { passive: false });

      lookBox.addEventListener('touchend', (e) => {
        isDragging = false;
      }, { passive: true });

      lookBox.addEventListener('touchcancel', (e) => {
        isDragging = false;
      }, { passive: true });

      // Mouse support for testing
      lookBox.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target && (target.classList.contains('dpad-btn') || target.classList.contains('action-btn'))) {
          return;
        }

        if (e.button === 0) {
          lastLookX = e.clientX;
          lastLookY = e.clientY;
          isDragging = true;
        }
      });

      lookBox.addEventListener('mousemove', (e) => {
        if (!isDragging || e.buttons !== 1) return;

        const dx = (e.clientX - lastLookX) * 0.003;
        const dy = (e.clientY - lastLookY) * 0.003;

        if (G && G.p) {
          G.p.yaw -= dx;
          G.p.pitch = Math.max(-1.2, Math.min(1.2, G.p.pitch - dy));
        }

        lastLookX = e.clientX;
        lastLookY = e.clientY;
      });

      lookBox.addEventListener('mouseup', (e) => {
        isDragging = false;
      });

      lookBox.addEventListener('mouseleave', (e) => {
        isDragging = false;
      });
    }
  }

  function simulateKeyDown(keyCode) {
    const event = new KeyboardEvent('keydown', {
      code: keyCode,
      key: keyCodeToKey(keyCode),
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  function simulateKeyUp(keyCode) {
    const event = new KeyboardEvent('keyup', {
      code: keyCode,
      key: keyCodeToKey(keyCode),
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  function keyCodeToKey(code) {
    const map = {
      'KeyW': 'w', 'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd',
      'KeyQ': 'q', 'KeyE': 'e', 'KeyV': 'v', 'KeyM': 'm',
      'Space': ' ', 'ShiftLeft': 'Shift'
    };
    return map[code] || code;
  }

  return { init };
})();

// Auto-init touch controls when game starts
if (typeof Game !== 'undefined') {
  const originalSetup = Game.setup;
  Game.setup = function() {
    originalSetup.call(this);
    TouchControls.init();
  };
}
