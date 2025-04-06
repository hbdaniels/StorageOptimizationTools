import * as PIXI from "pixi.js";
import rackrow_sub from "../jsonFiles/storagelocation_rackrow_sub.json"
import AttributeHandler from './attributeHandler.js';
import storageLocationHandler from "./storageLocationHandler";
import evaluateRule from "./storageEvaluator";
import parsedRules from "../jsonFiles/parsed_storage_rules.json";
import { DropShadowFilter } from '@pixi/filter-drop-shadow';
import chroma from "chroma-js";
import loadingStations from "../jsonFiles/storagelocation_loadingstation.json";
import { initCanvas } from './canvas/initCanvas.js';
import { drawRackRows } from './canvas/drawRackRows.js';
import { renderBitmapLabels } from './canvas/renderBitmapLabels.js';
import { runHeatmap } from "./canvas/heatmap.js";
import { renderAttributePanel, renderLocationAttributeSummary } from './ui/attributePanel.js';
import coilsData from "../jsonFiles/coils.json";
import { hydrateCoil, getPosition, isLocked } from './utils/CoilUtils.js';
import { drawCoils } from './canvas/drawCoils.js';



const rawCoils = coilsData.results[0].items;
const coils = rawCoils.map(hydrateCoil);
const flowCoilIds = ["1199561410", "1199595830", "2302016920", "2104007300" ];

const {
  app,
  viewport,
  zoomScale,
  layer1Container,
  layer1CoilsContainer,
  layer2Container,
  layer2CoilsContainer,
  flowLayerContainer,
  labelLayer,
  shopFloorContainer,
  attributeUnderlay
} = await initCanvas();

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

resizeRenderer(app.view, GAME_WIDTH, GAME_HEIGHT);
window.addEventListener('resize', () => resizeRenderer(app.view, GAME_WIDTH, GAME_HEIGHT));

const colorScale = chroma.scale(['#FF0000', '#FFFF00', '#00FF00']).domain([0, 1000]);

const rackrow_subs = rackrow_sub.results[0].items
const attrHandler = new AttributeHandler(rackrow_subs);
console.log("🔍 attrHandler.attributeMap:", attrHandler.attributeMap);
console.log(rackrow_subs);

const storedColors = JSON.parse(localStorage.getItem("attributeColors") || "{}");
const visibleAttributes = new Set();

const selector = document.getElementById("ruleSelector");
window.ruleSelector = selector; // 👈 attach to global window object




let labelsVisible = false;
let previousZoom = zoomScale.value;
let selectedSprite = null;

const rowLabelMeta = [];
const locationMap = new Map();

//app.stage.scale.x = -1;
//app.stage.position.x = app.screen.width;
// app.stage.position.x = -300;
// app.stage.position.y = -150;
app.stage.addChild(viewport);


let isDragging = false;
let lastPos = { x: 0, y: 0 };

let heatmapEnabled = document.getElementById("heatmapToggle")?.checked;
viewport.interactive = true;
viewport.cursor = 'grab';
viewport.eventMode = 'static';

document.getElementById("layer2Toggle")?.addEventListener("change", (e) => {
  layer2Container.visible = e.target.checked;
    
  });
document.getElementById("layer2CoilsToggle")?.addEventListener("change", (e) => {
  layer2CoilsContainer.visible = e.target.checked;
  
});

document.getElementById("layer1CoilsToggle")?.addEventListener("change", (e) => {
  console.log("🔘 Layer 1 toggle changed:", e.target.checked);
  layer1CoilsContainer.visible = e.target.checked;
});

document.getElementById("flowLayerToggle")?.addEventListener("change", (e) => {
  flowLayerContainer.visible = e.target.checked;
});
const flowLayerToggle = document.getElementById("flowLayerToggle");
const showFlowLayer = flowLayerToggle?.checked ?? true;
    flowLayerContainer.visible = showFlowLayer;


  
  main();

function createLabelCenteredInSprite(text, sprite, fontSize = 1000) {
    const dummy = new PIXI.BitmapText({
      text,
      style: { fontName: "DefaultFont", fontSize }
    });
  
    return {
      text,
      x: sprite.x + (sprite.width / 2) + (dummy.width / 2) -300,
      y: sprite.y + (sprite.height / 2) - (dummy.height / 2) + 200
    };
  }

  
  
  

app.ticker.add(() => {
  const shouldShow = zoomScale.value >= 0.0075;

  if (shouldShow !== labelsVisible || Math.abs(previousZoom - zoomScale.value) > 0.00001) {
    labelsVisible = shouldShow;
    previousZoom = zoomScale.value;

    if (labelsVisible) {
      renderBitmapLabels({
        rowLabelMeta,
        locationMap,
        labelLayer,
        layer2Container,
        zoomScale: zoomScale.value
      });
    } else {
      labelLayer.removeChildren();
    }
  }
});

  

function drawArea(name, x1, y1, x2, y2, color = 0x3498db, rotation = 0) {
  let x = Math.min(x1, x2);
  let y = Math.min(y1, y2);
  let width = Math.abs(x2 - x1);
  let height = Math.abs(y2 - y1);
  const graphics = new PIXI.Graphics();
  graphics.beginFill(color, 1);
  graphics.lineStyle(2, 0x000000);
  const container = new PIXI.Container();

  if (rotation === 90) {
    [width, height] = [height, width];
    graphics.drawRect(0, 0, width, height);
    container.x = x + height;
    container.y = y;
    container.rotation = Math.PI / 2;
  } else {
    graphics.drawRect(0, 0, width, height);
    container.x = x;
    container.y = y;
  }
  container.name=name;
  graphics.endFill();
  container.addChild(graphics);
  const label = new PIXI.BitmapText(name);
  label.x = 5 + label.width;
  label.y = 5;
  label.scale.x = -1;
  shopFloorContainer.addChild(container)
  //container.addChild(label);
  //viewport.addChild(container);
}

function drawLoadingStations() {
    const lStations = loadingStations.results[0].items;
  
    lStations.forEach(station => {
      const x = Math.min(station.fromcoordx, station.tocoordx);
      const y = Math.min(station.fromcoordy, station.tocoordy);
      const width = Math.abs(station.tocoordx - station.fromcoordx);
      const height = Math.abs(station.tocoordy - station.fromcoordy);
  
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0xb6b6b6, 1); // semi-transparent blue
      graphics.lineStyle(2, 0x000000, 1);
      graphics.drawRect(0, 0, width, height);
      graphics.endFill();
  
      const container = new PIXI.Container();
      container.addChild(graphics);
      container.x = x;
      container.y = y;
  
      const label = new PIXI.BitmapText(station.rowname || "Station", {
        fontName: "Roboto Mono SemiBold",
        fontSize: 2500,
        tint: 0x000000,
      });
      label.tint = 0x000000;
      label.scale.x = -1;
      label.x = width - 1250 //- label.width - 20;
      label.y = height/2 - 1000;
  
      container.addChild(label);
      layer1Container.addChild(container);
      //viewport.addChild(container);
    });
  }
  
  function spriteOnClick(sprite) {
    selectedSprite = sprite;
  
    showLocationDetails(sprite);
  
    const attrContainer = document.getElementById("location-details-attributes");
    if (attrContainer) {
      renderLocationAttributeSummary({
        containerEl: attrContainer,
        attributes: sprite.attributes,
        attrHandler,
        onToggleAttribute
      });
    }
  }

 function toggleAttributeVisibility(attrId, visible) {
     if (visible) {
       visibleAttributes.add(attrId);
     } else {
       visibleAttributes.delete(attrId);
     }
     locationMap.forEach(sprite => {
       if (!sprite.attributes || sprite.attributes.length === 0) return;
       const visibleAttrs = sprite.attributes.filter(a => visibleAttributes.has(a.id));
       if (visibleAttrs.length === 0) {
         sprite.tint = 0xFFFFFF;
       } else {
         const hexColors = visibleAttrs.map(a =>
           attrHandler.attributeMeta.get(a.id)?.color || "#00cc66"
         );
         sprite.tint = blendColors(hexColors);
       }
     });
   }
  
  
  function blendColors(hexColors) {
    const rgb = hexColors.map(hex => {
      const num = parseInt(hex.replace("#", ""), 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    });
  
    const total = rgb.length;
    const avg = rgb.reduce((acc, c) => ({
      r: acc.r + c.r / total,
      g: acc.g + c.g / total,
      b: acc.b + c.b / total,
    }), { r: 0, g: 0, b: 0 });
  
    return (avg.r << 16 | avg.g << 8 | avg.b);
  }
    
  
  function showLocationDetails(locationData) {
    const panel = document.getElementById("location-details-content");
  
    if (!panel) {
      console.warn("No location details panel found!");
      return;
    }
  
    panel.innerHTML = `
      <p><strong>Name:</strong> ${locationData.locationKey}</p>
      <p><strong>X:</strong> ${locationData.x}</p>
      <p><strong>Y:</strong> ${locationData.y}</p>
      <p><strong>Attributes:</strong></p>
      <div id="location-details-attributes"></div>
    `;
  
    // Example: render attributes nicely into #location-details-attributes
    const attrContainer = document.getElementById("location-details-attributes");
    if (attrContainer && locationData.attributes) {
      Object.entries(locationData.attributes).forEach(([key, value]) => {
        const row = document.createElement("div");
        row.className = "location-attr-row";
        row.innerHTML = `
          <span class="color-swatch" style="background-color: ${value.color || '#ccc'};"></span>
          <span>${key}: ${value.label || value}</span>
        `;
        attrContainer.appendChild(row);
      });
    }
  }
  

   function updateAttributeColor(attrId, color) {
     locationMap.forEach(sprite => {
       if (sprite.attributes && sprite.attributes.some(a => a.id === attrId)) {
         if (sprite.visible) sprite.tint = color;
         sprite.attributes.color = color;
       }
     });
   }

  
  

  function extractRowChar(key) {
    // ST22-A2-G-40 → returns "G"
    return key.split("-")[2];
  }
  
  function extractLocationNum(key) {
    // ST22-A2-G-40 → returns 40
    return parseInt(key.split("-")[3]);
  }

  function heatColor(t) {
    const r = Math.round(255 * t);
    const g = 64; // constant for a bit of brightness
    const b = Math.round(255 * (1 - t));
    return (r << 16) | (g << 8) | b;
  }


  function screenToWorld(screenX, screenY) {
    const rect = app.canvas.getBoundingClientRect();
    const px = screenX - rect.left;
    const py = screenY - rect.top;
  
    const worldX = (px - viewport.x) / viewport.scale.x;
    const worldY = (py - viewport.y) / viewport.scale.y;
  
    return { x: worldX, y: worldY };
  }

  function worldToScreen(worldX, worldY) {
    const screenX = worldX * viewport.scale.x + viewport.x;
    const screenY = worldY * viewport.scale.y + viewport.y;
  
    const rect = app.canvas.getBoundingClientRect();
    return {
      x: screenX + rect.left,
      y: screenY + rect.top
    };
  }

  document.getElementById("heatmapToggle").addEventListener("change", () => {
    // Trigger a redraw of heatmap tints vs. attribute tints
    if (heatmapEnabled) {
        heatmapEnabled = false;
        toggleAttributeVisibility(0, true);
        console.log("🔥 Heatmap disabled");
      } else {
        heatmapEnabled = true;
        window.ruleSelector.dispatchEvent(new Event('change'));
        console.log("🔥 Heatmap enabled");
      }
    // Replace with your actual redraw function
  });

  function onToggleAttribute(attrId, isChecked) {
    // Your existing logic here, for example:
    if (isChecked) {
      visibleAttributes.add(attrId);
    } else {
      visibleAttributes.delete(attrId);
    }
  
    locationMap.forEach(sprite => {
      if (!sprite.attributes || sprite.attributes.length === 0) return;
  
      const visibleAttrs = sprite.attributes.filter(a => visibleAttributes.has(a.id));
  
      if (visibleAttrs.length === 0) {
        sprite.tint = 0xFFFFFF;
      } else {
        const hexColors = visibleAttrs.map(a =>
          attrHandler.attributeMeta.get(a.id)?.color || "#00cc66"
        );
        sprite.tint = blendColors(hexColors);
      }
    });
  }
  
  


  function resizeRenderer(view, gameWidth, gameHeight) {
    const ratio = gameWidth / gameHeight;
    const windowRatio = window.innerWidth / window.innerHeight;
  
    let newWidth, newHeight;
  
    // if (windowRatio >= ratio) {
    //   newHeight = window.innerHeight;
    //   newWidth = newHeight * ratio;
    // } else {
    //   newWidth = window.innerWidth;
    //   newHeight = newWidth / ratio;
    // }
    if (windowRatio >= ratio) {
      // Fill horizontally, crop top/bottom
      newWidth = window.innerWidth;
      newHeight = newWidth / ratio;
    } else {
      // Fill vertically, crop left/right
      newHeight = window.innerHeight;
      newWidth = newHeight * ratio;
    }
  
    view.style.width = `${newWidth}px`;
    view.style.height = `${newHeight}px`;
    view.style.position = 'absolute';
    view.style.left = `${(window.innerWidth - newWidth) / 2}px`;
    view.style.top = `${(window.innerHeight - newHeight) / 2}px`;
  }

  function drawPullArrow(container, from, to, color = 0xff80bf, thickness = 300, alpha = 1, headLength = 800) {
    const fullDx = to.x - from.x;
    const fullDy = to.y - from.y;
    const totalLength = Math.sqrt(fullDx * fullDx + fullDy * fullDy);
    const margin = 500;
  
    const ratio = (totalLength - margin) / totalLength;
    const dx = fullDx * ratio;
    const dy = fullDy * ratio;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
  
    const bodyLength = length - headLength;
  
    const gradientTexture = PIXI.Texture.from(generateFlowGradient(color));
  
    // 📦 Gradient-filled arrow body as sprite
    const body = new PIXI.Sprite(gradientTexture);
    body.width = bodyLength;
    body.height = thickness;
    body.y = -thickness / 2;
    body.alpha = alpha;
  
    // 🔺 Arrowhead as triangle graphic
    const head = new PIXI.Graphics();
    head.beginFill(color, alpha);
    head.moveTo(0, -thickness);
    head.lineTo(headLength, 0);
    head.lineTo(0, thickness);
    head.endFill();
    head.x = bodyLength;
  
    // 🪝 Group arrow body and head together
    const g = new PIXI.Container();
    g.addChild(body);
    g.addChild(head);
    g.position.set(from.x, from.y);
    g.rotation = angle;
  
    container.addChild(g);
  
    // 💓 Subtle pulse animation
    let pulse = 0;
    app.ticker.add(() => {
      pulse += 0.05;
      const scaleFactor = 1 + 0.03 * Math.sin(pulse);
      g.scale.set(scaleFactor);
    });
  
    return g;
  }
  
  
  function generateFlowGradient(colorHex) {
  const colorStr = typeof colorHex === 'number'
    ? `#${colorHex.toString(16).padStart(6, '0')}`
    : colorHex;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  // ✅ ENABLE SMOOTHING
  ctx.imageSmoothingEnabled = true;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, colorStr);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return canvas;
}

function getLocationCenter(locationKey, locationMap) {
  const sprite = locationMap.get(locationKey);
  
  if (!sprite) {
    console.warn(`❓ Location not found for key: ${locationKey}`);
    return null;
  }

  // If your sprite has anchor (0.5), position is already the center
  // If not, calculate it manually:
  return {
    x: sprite.x + sprite.width / 2,
    y: sprite.y + sprite.height / 2
  };
}

function centroidOf(locationKeys, locationMap) {
  const validCoords = locationKeys
    .map(key => getLocationCenter(key, locationMap))
    .filter(Boolean);

  if (validCoords.length === 0) return null;

  const total = validCoords.reduce((acc, pos) => {
    acc.x += pos.x;
    acc.y += pos.y;
    return acc;
  }, { x: 0, y: 0 });

  return {
    x: total.x / validCoords.length,
    y: total.y / validCoords.length
  };
}

function centerOfSprite(sprite) {
  return {
    x: sprite.x + sprite.width / 2,
    y: sprite.y + sprite.height / 2
  };
}

function getPackEntryPoints(locationMap) {
  const entries = {
    ST21: null,
    ST22: null
  };

  for (const [key, sprite] of locationMap.entries()) {
    if (!sprite.attributes) continue;

    for (const attr of sprite.attributes) {
      if (attr.name === "3tn_ST21_PP_Entry") {
        console.log("🎯 Found ST21 PACK entry at", key);
        entries.ST21 = sprite;
      }
      if (attr.name === "3tn_ST22_PP_Entry") {
        console.log("🎯 Found ST22 PACK entry at", key);
        entries.ST22 = sprite;
      }
    }
  }

  console.log("📦 Final pack entry points:", entries);
  return entries;
}

function drawPulseAt(container, center, color = 0x66ccff, maxRadius = 5000) {
  const pulse = new PIXI.Graphics();
  pulse.position.set(center.x, center.y);
  container.addChild(pulse);

  let t = 0;

  app.ticker.add(() => {
    t += 0.03;
    const radius = (Math.sin(t) * 0.5 + 0.5) * maxRadius;
    const alpha = 0.1 + 0.05 * Math.sin(t * 2); // soft fade pulse

    pulse.clear();
    pulse.beginFill(color, alpha);
    pulse.drawCircle(0, 0, radius);
    pulse.endFill();
  });
}

function startGravityWaveEmitter(center, container, options = {}) {
  const {
    color = 0x66ccff,
    spawnInterval = 40,   // Ticks between each new wave
    maxRadius = 60000,
    life = 120,           // Ticks each wave lives
    baseAlpha = 0.25,
  } = options;

  const waves = [];
  let tick = 0;

  app.ticker.add(() => {
    tick++;

    // 💥 Spawn new wave periodically
    if (tick % spawnInterval === 0) {
      const ring = new PIXI.Graphics();
      ring.life = 0; // time since spawn
      waves.push(ring);
      container.addChild(ring);
    }

    // 🌀 Update and draw all waves
    for (let i = waves.length - 1; i >= 0; i--) {
      const ring = waves[i];
      ring.life++;

      const progress = ring.life / life;
      const radius = progress * maxRadius;
      const alpha = baseAlpha * (1 - progress);

      ring.clear();
      ring.beginFill(color, alpha);
      ring.drawCircle(0, 0, radius);
      ring.endFill();
      ring.position.set(center.x, center.y);

      // 💀 Remove faded-out rings
      if (ring.life >= life) {
        container.removeChild(ring);
        waves.splice(i, 1);
      }
    }
  });
}

function createShockwaveRipple(center, container, {
  color = 0x66ccff,
  duration = 120,
  maxRadius = 8000,
  pulseCount = 3,
  interval = 30
} = {}) {
  for (let i = 0; i < pulseCount; i++) {
    setTimeout(() => {
      const ripple = new PIXI.Graphics();
      ripple.beginFill(color, 0.25);
      ripple.drawCircle(0, 0, 50); // 👈 Give it some visible starting size
      ripple.endFill();
      ripple.position.set(center.x, center.y);
      container.addChild(ripple);

      let age = 0;

      const animate = () => {
        age++;
        const progress = age / duration;
        ripple.scale.set(progress * maxRadius / 50); // Normalize to original radius
        ripple.alpha = 1 - progress;

        if (age >= duration) {
          app.ticker.remove(animate);
          container.removeChild(ripple);
        }
      };

      app.ticker.add(animate);
    }, i * interval);
  }
}

function startShockwaveEmitter(center, container, {
  color = 0x66ccff,
  duration = 120,
  maxRadius = 8000,
  pulseCount = 3,
  interval = 30,
  loopInterval = 2000 // milliseconds between full ripple sets
} = {}) {
  const emitRipples = () => {
    for (let i = 0; i < pulseCount; i++) {
      setTimeout(() => {
        const ripple = new PIXI.Graphics();
        ripple.beginFill(color, 0.25);
        ripple.drawCircle(0, 0, 50); // Initial radius
        ripple.endFill();
        ripple.position.set(center.x, center.y);
        container.addChild(ripple);

        let age = 0;

        const animate = () => {
          age++;
          const progress = age / duration;
          ripple.scale.set(progress * maxRadius / 50); // Normalized to initial radius
          ripple.alpha = 1 - progress;

          if (age >= duration) {
            app.ticker.remove(animate);
            container.removeChild(ripple);
          }
        };

        app.ticker.add(animate);
      }, i * interval);
    }
  };

  emitRipples(); // start immediately
  setInterval(emitRipples, loopInterval);
}




function createDirectionalRipple(from, to, container, options = {}) {
  const {
    color = 0x00ccff,
    waveLength = 100000,
    speed = 2000,
    lifetime = 100,
    alpha = 0.1
  } = options;

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const wave = new PIXI.Graphics();
  container.addChild(wave);

  let t = 0;

  app.ticker.add(() => {
    if (t > lifetime) {
      container.removeChild(wave);
      return;
    }

    const offset = speed * t;
    const x = from.x + Math.cos(angle) * offset;
    const y = from.y + Math.sin(angle) * offset;

    wave.clear();
    wave.beginFill(color, alpha * (1 - t / lifetime));
    wave.drawCircle(0, 0, waveLength * (t / lifetime));
    wave.endFill();
    wave.position.set(x, y);

    t++;
  });
}



  
  
  
  
  

async function main() {
  await PIXI.Assets.load('/src/assets/pngFont.fnt');

  drawArea("ST21", 173208, 242700, 523520, 278100, 0x3c486c);
  drawArea("ST22", 173208, 203005, 523520, 240358, 0x3c486c);

  renderAttributePanel({
    attrHandler: attrHandler,
    locationMap: locationMap,
    attributeMeta: attrHandler.attributeMeta,
    onToggleAttribute: toggleAttributeVisibility,
    onUpdateColor: updateAttributeColor
  });

  let locationTexture = await PIXI.Assets.load('/src/assets/deposit.png')
  rackrow_subs.slice().reverse().forEach(rack => {
    drawRackRows(
      rack,
      locationTexture,
      attrHandler,
      locationMap,
      rowLabelMeta,
      spriteOnClick,
      layer1Container,
      layer2Container 
    );
  });

  //drawCoils(layer1CoilsContainer, coils, { debugLabels: true });
  
  const coilTexture = await PIXI.Assets.load('/src/assets/coil.png');
  drawCoils(layer1CoilsContainer, layer2CoilsContainer, coils, {
    coilTexture,
    locationMap,
    showLocationDetails,
    renderLocationAttributeSummary,
    attrHandler,
    onToggleAttribute,
  });
  //viewport.addChild(layer1CoilsContainer);
  
  
  drawLoadingStations();
  viewport.addChild(labelLayer);

  const header = document.getElementById("ui-panel-header");
  const body = document.getElementById("ui-panel-body");
  
  const slhPullTarget = { x: 458150, y: 229350 };
  console.log("🧭 flowLayerContainer:", flowLayerContainer);

  

  for (const coil of coils) {
    if (
      coil.succesive_plant_code === "SLH" &&
      flowCoilIds.includes(coil.material_id)
    ) {
      const from = { x: coil.coord_x, y: coil.coord_y };
      const to = { x: 458150, y: 229350 };

      const d = new PIXI.Graphics();
      d.beginFill(0xff0000);
      d.drawCircle(0, 0, 500);
      d.endFill();
      d.position.set(from.x, from.y);
      console.log(from, to);
      flowLayerContainer.addChild(d);

      console.log("🧭 Drawing SLH flow line from", from, "to", to);
  
      drawPullArrow(flowLayerContainer, from, to, 0xd36aa1);
      drawPullArrow(flowLayerContainer, from, to, 0x66ccff);
      // animateParticlesAlongArrow(from, to, flowLayerContainer, {
      //   color: 0x66ccff,
      //   count: 20,
      //   size: 400,
      //   speed: 0.007
      // });
      recruitWigglyCousinsToMarch(from, to, flowLayerContainer, {
        color: 0x66ccff,
        count: 20,
        size: 200,
        speed: 0.0005
      });
      animateProfessionalCousins(from, to, flowLayerContainer, {
        colorStart: '#66ccff',
        colorEnd: '#ff66cc',
        count: 20,
        size: 1000,
        speed: 0.002
      });
      
      
      

  
      // 🎯 New effects
      createShockwaveRipple(to, flowLayerContainer, { color: 0xff66cc });
      createDirectionalRipple(from, to, flowLayerContainer);
    }
  }
  

  const packEntryPoints = getPackEntryPoints(locationMap);

  for (const coil of coils) {
    if (coil.succesive_plant_code !== "PACK") continue;

    if (!coil.locationKey) {
      console.log(coil);
      console.warn(`🧯 Coil ${coil.material_id} is missing a locationKey`);
      continue;
    }
    
    const from = getLocationCenter(coil.locationKey, locationMap);
    let to = null;
  
    if (coil.bay === "ST21" && packEntryPoints.ST21) {
      console.log(`📦 Coil ${coil.material_id} → ${coil.bay} → PACK`);
      to = {
        x: packEntryPoints.ST21.x + packEntryPoints.ST21.width / 2,
        y: packEntryPoints.ST21.y + packEntryPoints.ST21.height / 2
      };
      recruitWigglyCousinsToMarch(from, to, flowLayerContainer, {
        color: 0x66ccff,
        count: 20,
        size: 300,
        speed: 0.0005
      });
    } else if (coil.bay === "ST22" && packEntryPoints.ST22) {
      to = {
        x: packEntryPoints.ST22.x + packEntryPoints.ST22.width / 2,
        y: packEntryPoints.ST22.y + packEntryPoints.ST22.height / 2
      };
    }
  
    if (from && to) {

      drawPullArrow(flowLayerContainer, from, to, 0x66ccff);
      

      

    }
  }

  //drawPulseAt(flowLayerContainer, centerOfSprite(packEntryPoints.ST21), 0xff00ff, 200000);
  drawPulseAt(flowLayerContainer, centerOfSprite(packEntryPoints.ST21));
  drawPulseAt(flowLayerContainer, centerOfSprite(packEntryPoints.ST22));


  // startGravityWaveEmitter(centerOfSprite(packEntryPoints.ST21), flowLayerContainer);
  // startGravityWaveEmitter(centerOfSprite(packEntryPoints.ST22), flowLayerContainer);

  
  startShockwaveEmitter(centerOfSprite(packEntryPoints.ST21), flowLayerContainer, { color: 0xff66cc });
  //testStaticParticles(flowLayerContainer);
  
  //Do not touch these fun loving wiggly cousins
  testAnimatedParticles(flowLayerContainer);



  
  const blurFilter = new PIXI.BlurFilter(0.1);
  const coilBlurFilter = new PIXI.BlurFilter(0.1);
  flowLayerContainer.filters = [blurFilter];
  layer1CoilsContainer.filters = [coilBlurFilter];

  

  app.ticker.add(() => {
    const z = zoomScale.value;
    blurFilter.blur = z < 0.003 ? 0.4 : z < 0.005 ? 0.2 : z < 0.01 ? 0 : 0.3;
    coilBlurFilter.blur = z < 0.003 ? .05 : z < 0.005 ? .025 : z < 0.01 ? .01 : 0.3;
  });

  const target = locationMap.get("ST21-A2-G-40");
  if (target) {
    target.tint = 0xff0000;
  }

  const context = {
    Order: { Rulename: "3tn_ST22_BC-123" },
    Row: "G",
    Location: 42
  };
  
  fetch('./jsonFiles/parsed_storage_rules.json')
  .then(res => res.json())
  .then((ruleGroups) => {
    const selector = document.getElementById('ruleSelector');
    ruleGroups.forEach((group) => {
      const option = document.createElement('option');
      option.value = group.name;
      option.textContent = `${group.name} (${group.bay})`;
      selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
      const selectedName = e.target.value;
      const selectedGroup = ruleGroups.find(r => r.name === selectedName);
      if (selectedGroup) {
        console.log("📌 Selected rule group:", selectedGroup.name);
        runHeatmap({
          rules: selectedGroup.rules,
          ruleName: selectedGroup.name,
          color: selectedGroup.color || "#ff0000",
          locationMap,
          evaluateRule,
          colorScale,
          renderBitmapLabels: () =>
          renderBitmapLabels({
            rowLabelMeta,
            locationMap,
            labelLayer,
            layer2Container,
            zoomScale: zoomScale.value
          })
        
        });

      }
    });
    

  });
 
  setupUIPanels();

}

function setupUIPanels() {
  const toggles = document.querySelectorAll('.panel-toggle');
  if (!toggles.length) {
    console.warn('No panel toggles found!');
    return;
  }

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
  });

  // Expand the first panel by default
  toggles[0].nextElementSibling.style.display = 'block';
  
}

function testStaticParticles(container) {
  const particles = [];

  for (let i = 0; i < 20; i++) {
    const p = new PIXI.Sprite(PIXI.Texture.WHITE);
    p.tint = 0x66ccff;
    p.width = p.height = 800;
    p.alpha = 0.5;

    // Scatter around a center
    const baseX = 300000 + Math.random() * 10000;
    const baseY = 220000 + Math.random() * 10000;
    p.position.set(baseX, baseY);
    p.vx = Math.random() * 10 - 5;
    p.vy = Math.random() * 10 - 5;

    particles.push(p);
    container.addChild(p);
  }

  app.ticker.add(() => {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off small radius bounds
      if (p.x < 295000 || p.x > 305000) p.vx *= -1;
      if (p.y < 215000 || p.y > 225000) p.vy *= -1;
    }
  });
}

function testAnimatedParticles(container) {
  const particles = [];

  for (let i = 0; i < 30; i++) {
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    sprite.tint = 0x66ccff;
    sprite.width = sprite.height = 800;
    sprite.alpha = 0.5;

    const baseX = 305000 + Math.random() * 2000;
    const baseY = 225000 + Math.random() * 2000;
    sprite.position.set(baseX, baseY); // ✅ immediately place

    // Store animation info
    sprite.baseX = baseX;
    sprite.baseY = baseY;
    sprite.phase = Math.random() * Math.PI * 2;
    sprite.freq = 0.01 + Math.random() * 0.01;
    sprite.amp = 2000 + Math.random() * 2000;

    container.addChild(sprite);
    particles.push(sprite);
  }

  let tick = 0;
  app.ticker.add(() => {
    tick += 1;
    for (const p of particles) {
      const t = tick * p.freq + p.phase;
      p.x = p.baseX + Math.cos(t) * p.amp;
      p.y = p.baseY + Math.sin(t * 1.5) * p.amp * 0.5;
    }
  });
}

function createFlowStream(center, container) {
  const particles = [];

  for (let i = 0; i < 50; i++) {
    const p = new PIXI.Sprite(PIXI.Texture.WHITE);
    p.tint = 0x66ccff;
    p.width = p.height = 400;
    p.alpha = 0.3 + Math.random() * 0.3;
    
    const x = center.x + Math.random() * 20000 - 10000;
    const y = center.y + Math.random() * 20000 - 10000;
    p.position.set(x, y);

    p.vx = 100 + Math.random() * 100;
    p.life = 0;
    container.addChild(p);
    particles.push(p);
  }

  app.ticker.add(() => {
    for (const p of particles) {
      p.x += p.vx;
      p.life++;
      if (p.life > 200) {
        p.x = center.x + Math.random() * 20000 - 10000;
        p.y = center.y + Math.random() * 20000 - 10000;
        p.life = 0;
      }
    }
  });
}

function createFlickerAura(center, container) {
  const particles = [];

  for (let i = 0; i < 20; i++) {
    const p = new PIXI.Sprite(PIXI.Texture.WHITE);
    p.tint = 0xff66cc;
    p.width = p.height = 1200;
    p.anchor.set(0.5);
    p.alpha = 0.1;

    const angle = Math.random() * Math.PI * 2;
    const dist = 4000 + Math.random() * 2000;
    p.baseX = center.x + Math.cos(angle) * dist;
    p.baseY = center.y + Math.sin(angle) * dist;
    p.phase = Math.random() * Math.PI * 2;

    p.position.set(p.baseX, p.baseY);
    container.addChild(p);
    particles.push(p);
  }

  app.ticker.add(() => {
    for (const p of particles) {
      const t = performance.now() / 100;
      p.alpha = 0.2 + 0.2 * Math.sin(t + p.phase);
      p.scale.set(0.9 + 0.1 * Math.sin(t * 1.5 + p.phase));
    }
  });
}

function animateParticlesAlongArrow(from, to, container, {
  color = 0x66ccff,
  count = 30,
  size = 800,
  speed = 0.005
} = {}) {
  const particles = [];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  flowLayerContainer.filters = []; // <- 🔕 no blur

  for (let i = 0; i < count; i++) {
    const p = new PIXI.Sprite(PIXI.Texture.WHITE);
  
    // 🔁 Set size FIRST, then anchor, then scale
    p.width = p.height = size;
    p.anchor.set(0.5);
    p.scale.set(1);
    p.alpha = 0.5;
    p.tint = color;
  
    const t = i / count;
    p.baseX = from.x + dx * t;
    p.baseY = from.y + dy * t;
    p.phase = Math.random() * Math.PI * 2;
    p.freq = 0.01 + Math.random() * 0.01;
    p.amp = 0;
  
    p.position.set(p.baseX, p.baseY);
  
    if (i === 0) {
      p.tint = 0xff0000;
      p.alpha = 1;
      p.width = p.height = 2000; // again, BEFORE anchor
      p.anchor.set(0.5);
      p.scale.set(1);
      console.log("🔴 BIG PARTICLE @", p.baseX, p.baseY);
    }
  
    container.addChild(p);
    particles.push(p);
  }
  

  let tick = 0;
app.ticker.add(() => {
  tick += 1;

  if (tick % 60 === 0) {
    console.log(`🔄 Tick ${tick} — particles: ${particles.length}`);
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const t = tick * p.freq + p.phase;

    p.x = p.baseX + Math.cos(t) * p.amp;
    p.y = p.baseY + Math.sin(t) * p.amp;

    p.alpha = 0.5 + 0.5 * Math.sin(t * 2);
    const scale = 0.8 + 0.3 * Math.cos(t * 3);
    p.scale.set(scale);

    // 🔍 Only log the first one every 60 ticks
    if (i === 0 && tick % 60 === 0) {
      console.log(`🧼 P0 → x: ${p.x.toFixed(1)} y: ${p.y.toFixed(1)} alpha: ${p.alpha.toFixed(2)} scale: ${scale.toFixed(2)}`);
    }
  }
});

}

function recruitWigglyCousinsToMarch(from, to, container, {
  color = 0x66ccff,
  count = 20,
  size = 200,
  speed = 0.003
} = {}) {
  const particles = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  for (let i = 0; i < count; i++) {
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    sprite.tint = color;
    sprite.width = sprite.height = size;
    sprite.alpha = 0.5;
    sprite.anchor.set(0.5);

    const t = i / count;
    sprite._progress = t;
    sprite.baseX = from.x + dx * t;
    sprite.baseY = from.y + dy * t;
    sprite.freq = 1;
    sprite.amp = 0;

    sprite.position.set(sprite.baseX, sprite.baseY);
    container.addChild(sprite);
    particles.push(sprite);
  }

  app.ticker.add(() => {
    for (const p of particles) {
      p._progress += speed;
      if (p._progress > 1) p._progress = 0;
      p.rotation += 0.01;
      const progress = p._progress; // from 0 → 1
      p.tint = chroma.mix('#e413eb', '#87ec14', progress).num(); 



      const x = from.x + dx * p._progress;
      const y = from.y + dy * p._progress;
      p.position.set(x, y);
    }
  });
}

function animateProfessionalCousins(from, to, container, {
  colorStart = '#66ccff',
  colorEnd = '#ffffff',
  count = 20,
  size = 800,
  speed = 0.0015,
  trail = false
} = {}) {
  const chromaScale = chroma.scale([colorStart, colorEnd]);
  const particles = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const spacing = 1 / count;

  for (let i = 0; i < count; i++) {
    const p = new PIXI.Sprite(PIXI.Texture.WHITE);
    p.anchor.set(0.5);
    p.width = p.height = size; // 👈 this was missing for i === 0
    p.alpha = 0.7; // 🔧 baseline alpha to override tint invisibility
  
    const t = i * spacing;
    const baseX = from.x + dx * t;
    const baseY = from.y + dy * t;
    p.baseX = baseX;
    p.baseY = baseY;
    p._progress = t;
    p.phase = Math.random() * Math.PI * 2;
    p.freq = 0.01 + Math.random() * 0.01;
  
    // ❗ Immediately set position
    p.position.set(baseX, baseY);
  
    if (i === 0) {
      p.tint = 0xff0000;
      p.width = p.height = size * 2; // 👉 supersize for debugging
      p.alpha = 1;
    } else {
      p.tint = chroma(colorStart).num(); // 💡 initialize tint properly
    }
  
    container.addChild(p);
    particles.push(p);
  }
  

  let tick = 0;
  app.ticker.add((delta) => {
    tick += delta;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p._progress += speed * delta;
      if (p._progress > 1) p._progress -= 1;
      
      const t = p._progress;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      p.baseX = x;
      p.baseY = y;
      p.position.set(x, y); // ✅ Set every frame
      
      const softPulse = Math.sin((tick / 30 + i) * 0.3);
      p.alpha = 0.5 + 0.2 * softPulse;
      const scale = 0.9 + 0.1 * softPulse;
      p.scale.set(scale);

      const color = chromaScale(Math.min(Math.max(t, 0), 1)).num(); // 🛡️ clamp t safely
      p.tint = color;

    }
  });
}

function animateStraightLineCousins(from, to, container, {
  color = 0x66ccff,
  count = 20,
  size = 800,
  speed = 0.003
} = {}) {
  const particles = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  for (let i = 0; i < count; i++) {
    const p = new PIXI.Sprite(PIXI.Texture.WHITE);
    p.tint = color;
    p.width = p.height = size;
    p.anchor.set(0.5); // 🔑 important
    p.alpha = 0.8;

    // Calculate position along line
    const t = i / count;
    const baseX = from.x + dx * t;
    const baseY = from.y + dy * t;
    p._progress = t;
    p.baseX = baseX;
    p.baseY = baseY;

    p.position.set(baseX, baseY); // 🔥 this is where the mirror ghosts vanish if omitted

    if (i === 0) {
      p.tint = 0xff0000; // big red test cousin
      p.width = p.height = 2000;
      p.alpha = 1;
    }

    container.addChild(p);
    particles.push(p);
  }

  let tick = 0;
  app.ticker.add(() => {
    tick += 1;
    for (const p of particles) {
      // 🧠 Move forward
      p._progress += speed;
      if (p._progress > 1) p._progress = 0;

      const t = p._progress;
      p.x = from.x + dx * t;
      p.y = from.y + dy * t;

      // 🎨 Subtle alpha pulse
      p.alpha = 0.5 + 0.4 * Math.sin(tick * 0.05 + p.phase);
      const scale = 0.9 + 0.1 * Math.cos(tick * 0.1 + p.phase);
      p.scale.set(scale);
    }
  });
}








