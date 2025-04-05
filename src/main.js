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

const {
  app,
  viewport,
  zoomScale,
  layer1Container,
  layer1CoilsContainer,
  layer2Container,
  layer2CoilsContainer,
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
      viewport.addChild(container);
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
  drawCoils(layer1CoilsContainer, coils, { coilTexture });
  //viewport.addChild(layer1CoilsContainer);
  
  
  drawLoadingStations();
  viewport.addChild(labelLayer);

  const header = document.getElementById("ui-panel-header");
  const body = document.getElementById("ui-panel-body");
  
  
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
    
    


    // Optionally auto-select first rule on load:
    // if (ruleGroups.length > 0) {
    //   selector.value = ruleGroups[0].name;
    //   const defaultGroup = ruleGroups[0];
    //   runHeatmap({
    //     rules: defaultGroup.rules,
    //     ruleName: defaultGroup.name,
    //     color: defaultGroup.color || "#ff0000",
    //     locationMap,
    //     evaluateRule,
    //     colorScale,
    //     renderBitmapLabels: () =>
    //     renderBitmapLabels({
    //       rowLabelMeta,
    //       locationMap,
    //       labelLayer,
    //       zoomScale: zoomScale.value
    //     })
      
    //   });

    // }
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