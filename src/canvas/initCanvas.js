// initCanvas.js
import * as PIXI from "pixi.js";

export async function initCanvas({ width = 1200, height = 800, backgroundColor = 0xdbedff } = {}) {
  const app = new PIXI.Application({
    width,
    height,
    antialias: true,
  });

  const GAME_WIDTH = 1920;
  const GAME_HEIGHT = 1080;
  
  // Add this code in your JS file (e.g., initCanvas.js or main.js)
  window.addEventListener('load', () => {
    // Get the splash screen element
    const splashScreen = document.getElementById('splash-screen');

    // Fade out after 1 second (adjust timing as needed)
    setTimeout(() => {
      splashScreen.style.opacity = 0;

      // Remove splash screen from DOM after the fade-out
      setTimeout(() => {
        splashScreen.remove();
      }, 1000);  // 2000ms for the fade-out duration
    }, 500);  // 1000ms delay before starting fade-out
  });

  await app.init();
  app.renderer.background.color = backgroundColor;
  document.body.appendChild(app.canvas);

  const viewport = new PIXI.Container();
  const worldScale = 0.002;
  viewport.scale.set(worldScale);

  // Layers
  const shopFloorContainer = new PIXI.Container();
  const layer1Container = new PIXI.Container();
  const layer2Container = new PIXI.Container();
  const attributeUnderlay = new PIXI.Container();
  const labelLayer = new PIXI.Container();

  viewport.addChild(shopFloorContainer);
  viewport.addChild(layer1Container);
  viewport.addChild(layer2Container);
  viewport.addChild(attributeUnderlay);
  viewport.addChild(labelLayer);

  app.stage.scale.x = -1;
  app.stage.position.x = app.screen.width;
  app.stage.addChild(viewport);

  // Enable panning and zoom
  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let zoomScale = { value: 0.002 };

  viewport.interactive = true;
  viewport.cursor = 'grab';
  viewport.eventMode = 'static';

  app.canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastPos = { x: e.clientX, y: e.clientY };
    viewport.cursor = 'grabbing';
  });

  app.canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    const scaleFixX = app.stage.scale.x === -1 ? -1 : 1;
    viewport.x += dx * scaleFixX;
    viewport.y += dy;
    lastPos = { x: e.clientX, y: e.clientY };
  });

  app.canvas.addEventListener('pointerup', () => {
    isDragging = false;
    viewport.cursor = 'grab';
  });

  // app.canvas.addEventListener('wheel', (e) => {
  //   e.preventDefault();
  //   const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
  //   zoomScale.value *= zoomAmount;
  //   zoomScale.value = Math.min(Math.max(zoomScale.value, 0.002), 5);

  //   const rect = app.canvas.getBoundingClientRect();
  //   const mouseX = e.clientX - rect.left;
  //   const mouseY = e.clientY - rect.top;
  //   const localX = (mouseX - viewport.x) / viewport.scale.x;
  //   const localY = (mouseY - viewport.y) / viewport.scale.y;
  //   viewport.scale.set(zoomScale.value);
  //   viewport.x = mouseX - localX * zoomScale.value;
  //   viewport.y = mouseY - localY * zoomScale.value;
  // }, { passive: false });

  //THE ZOOM MINES, BEWARE ALL WHO ENTER
  //I think the way I have flipped the canvas is the real issue. Of course the inversion impacts the
  //relationship between world coordinates and screen coordinates. 
  //But I have REALLY struggled to wrangle this in. I think I need to review the nature
  //of how I flipped it exactly and what would be a best practice. 
  //OR I need to revisit WHY I flipped it and see if there is a better way to handle the sprites that 
  //wouldn't require the inversion but still use the coordinates from TWMS.
  app.canvas.addEventListener('wheel', (e) => {
  e.preventDefault();

  const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
  zoomScale.value *= zoomAmount;
  zoomScale.value = Math.min(Math.max(zoomScale.value, 0.002), 5);

  const rect = app.canvas.getBoundingClientRect();
  const screenMouseX = e.clientX - rect.left;
  const screenMouseY = e.clientY - rect.top;

  // 🔁 Reverse the screen X position into world space using flipped scale
  const worldX = (rect.width - screenMouseX - viewport.x) / viewport.scale.x;
  const worldY = (screenMouseY - viewport.y) / viewport.scale.y;

  // 🔐 Keep stage flipped, scale viewport uniformly
  viewport.scale.set(zoomScale.value);

  // 🧭 Apply new position to keep world point under cursor
  viewport.x = rect.width - screenMouseX - worldX * viewport.scale.x;
  viewport.y = screenMouseY - worldY * viewport.scale.y;
}, { passive: false });

  
  
  

  return {
    app,
    viewport,
    zoomScale,
    layer1Container,
    layer2Container,
    labelLayer,
    shopFloorContainer,
    attributeUnderlay
  };
}


