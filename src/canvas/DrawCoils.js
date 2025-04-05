// DrawCoils.js
import * as PIXI from 'pixi.js';
import { getPosition, isLocked, getDisplayName } from '../utils/CoilUtils.js';

/**
 * Draws coils onto a PIXI container.
 * @param {PIXI.Container} container - The container to draw coils into (e.g., layer1CoilsContainer).
 * @param {Array} coils - Array of hydrated coil objects.
 * @param {Object} [options] - Optional styling or debug flags.
 */
export function drawCoils(container, coils, options = {}) {
  container.removeChildren(); // Clear previous render

  for (const coil of coils) {
    const { x, y } = getPosition(coil);

    const g = new PIXI.Graphics();
    g.lineStyle(2, isLocked(coil) ? 0xff0000 : 0x2d89ef, 1);
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 2000); // Coils are often ~2m outer diameter
    g.endFill();

    g.position.set(x, y);
    g.eventMode = 'static';
    g.cursor = 'pointer';
    g.coilId = coil.material_id;

    if (options.debugLabels) {
      const label = new PIXI.Text(getDisplayName(coil), {
        fontSize: 14,
        fill: 0x000000,
        align: 'center'
      });
      label.anchor.set(0.5);
      label.position.set(0, -2200);
      g.addChild(label);
    }

    container.addChild(g);
  }
} 
