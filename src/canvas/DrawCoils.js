// DrawCoils.js
import * as PIXI from 'pixi.js';

import { getPosition, isLocked, getDisplayName } from '../utils/CoilUtils.js';
import {coilColorRules} from '../canvas/CoilColorRules.js';


/**
 * Draws coils onto a PIXI container.
 * @param {PIXI.Container} container - The container to draw coils into (e.g., layer1CoilsContainer).
 * @param {Array} coils - Array of hydrated coil objects.
 * @param {Object} [options] - Optional styling or debug flags.
 */

export function drawCoils(layer1CoilsContainer, layer2CoilsContainer, coils, options = {}) {
    layer1CoilsContainer.removeChildren();
    layer2CoilsContainer.removeChildren();
  
    if (!options.coilTexture) {
      console.warn("No coilTexture provided in options");
      return;
    }

    
  
    for (const coil of coils) {
      const { x, y } = getPosition(coil);
      const sprite = new PIXI.Sprite(options.coilTexture);
  
      sprite.anchor.set(0.5);
      sprite.width = coil.outside_diameter || 2000;
      sprite.height = coil.width || 1000;
      sprite.position.set(0, 0); // Because containerNode will be positioned
  
      sprite.cursor = 'pointer';
      sprite.eventMode = 'static';
      sprite.coilId = coil.material_id;
  
      const rule = coilColorRules
        .filter(rule => rule.enabled && rule.condition(coil))
        .sort((a, b) => a.priority - b.priority)[0];
      if (rule) {
        sprite.tint = parseInt(rule.color.replace('#', '0x'), 16);
      }
  
      sprite.addEventListener('pointerdown', () => {
        const panel = document.getElementById('coil-details-content');
        if (!panel) return;
  
        //const locationString = `${coil.bay}-${coil.area}-${coil.rowname}-${coil.location}-${coil.layer}`;
        //console.log('📍 Coil Location String:', locationString);
        panel.innerHTML = renderCoilDetails(coil);
      });
  
      const containerNode = new PIXI.Container();
      containerNode.position.set(x, y);
      containerNode.addChild(sprite);
  
      if (options.debugLabels) {
        const label = new PIXI.Text(getDisplayName(coil), {
          fontSize: 14,
          fill: 0x000000,
          align: 'center'
        });
        label.anchor.set(0.5);
        label.position.set(0, -sprite.height / 2 - 100);
        containerNode.addChild(label);
      }

 
  
      // 🧠 Place coil in the correct layer container
      if (coil.layer === 2) {
        layer2CoilsContainer.addChild(containerNode);
      } else {
        layer1CoilsContainer.addChild(containerNode);
      }
    }

    // AFTER the loop ends:
    const layer1CoilsToggle = document.getElementById("layer1CoilsToggle");
    const showLayer1Coils = layer1CoilsToggle?.checked ?? true;
    layer1CoilsContainer.visible = showLayer1Coils;

    const layer2CoilsToggle = document.getElementById("layer2CoilsToggle");
    const showLayer2Coils = layer2CoilsToggle?.checked ?? true;
    layer2CoilsContainer.visible = showLayer2Coils;

  
    function renderCoilDetails(coil) {
      if (!coil) return '<p>No coil data available.</p>';
        console.log(coil);
      return `
        <h3>Coil: ${coil.material_id}</h3>
        <div class="location-attr-row"><strong>Location:</strong> ${coil.bay}-${coil.area}-${coil.rowname}-${coil.location}-${coil.layer}</div>
        <div class="location-attr-row"><strong>Diameter:</strong> ${coil.outside_diameter} mm</div>
        <div class="location-attr-row"><strong>Width:</strong> ${coil.width} mm</div>
        <div class="location-attr-row"><strong>Thickness:</strong> ${coil.thickness} mm</div>
        <div class="location-attr-row"><strong>Weight:</strong> ${coil.weight} kg</div>
        <div class="location-attr-row"><strong>On Hold:</strong> ${coil.on_hold}</div>
        <div class="location-attr-row"><strong>Previous Plant Code:</strong> ${coil.previous_plant_code || ''}</div>
        <div class="location-attr-row"><strong>Succesive Plant Code:</strong> ${coil.succesive_plant_code || ''}</div>
        
      `;
    }
  }
  