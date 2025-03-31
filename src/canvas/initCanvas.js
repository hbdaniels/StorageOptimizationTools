// initCanvas.js
import * as PIXI from "pixi.js";

export async function initCanvas({ width = 1200, height = 800, backgroundColor = 0xdbedff } = {}) {
  const app = new PIXI.Application({
    width,
    height,
    antialias: true,
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

  app.stage.scale.x = -1;
  app.stage.position.x = app.screen.width;
  app.stage.addChild(viewport);

  // Enable panning and zoom
  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let zoomScale = 0.002;

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

  app.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
    zoomScale *= zoomAmount;
    zoomScale = Math.min(Math.max(zoomScale, 0.002), 5);

    const rect = app.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const localX = (mouseX - viewport.x) / viewport.scale.x;
    const localY = (mouseY - viewport.y) / viewport.scale.y;
    viewport.scale.set(zoomScale);
    viewport.x = mouseX - localX * zoomScale;
    viewport.y = mouseY - localY * zoomScale;
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
