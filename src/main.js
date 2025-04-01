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
import { renderAttributePanel } from './ui/attributePanel.js';


const {
  app,
  viewport,
  zoomScale,
  layer1Container,
  layer2Container,
  labelLayer,
  shopFloorContainer,
  attributeUnderlay
} = await initCanvas();

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

const rowLabelMeta = [];
const locationMap = new Map();

app.stage.scale.x = -1;
app.stage.position.x = app.screen.width;
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
    console.log("Clicked location:", sprite.locationKey);
    console.log("Sprite X:", sprite.x, "Sprite Y:", sprite.y);
        if (sprite.attributes && sprite.attributes.length) {
          sprite.attributes.forEach(attr => {
            console.log("Attribute:", attr.name);
            console.log("Description:", attr.description);
            console.log("Heat Score:", sprite.heatScore);
            console.log("attribute id:", attr.id);
          });
        } else {
          console.log("No attributes on this location");
        }
    showLocationDetails(sprite);
}

 function toggleAttributeVisibility(attrId, visible) {
     if (visible) {
       visibleAttributes.add(attrId);
     } else {
       visibleAttributes.delete(attrId);
     }
     console.log("Affected sprite keys:");
     locationMap.forEach((sprite, key) => {
       if (sprite.attributes?.some(a => visibleAttributes.has(a.id))) {
         console.log("✔️", key, sprite.tint.toString(16));
       }
     });
     locationMap.forEach((sprite, key) => {
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
    const locationDetailsDiv = document.createElement("div");
    locationDetailsDiv.id = "location-details-panel";
    document.body.appendChild(locationDetailsDiv);
    const panel = document.getElementById("location-details-panel");
    panel.innerHTML = `
      <h4>Location Info</h4>
      <p><strong>Name:</strong> ${locationData.locationKey}</p>
      <p><strong>X:</strong> ${locationData.x}</p>
      <p><strong>Y:</strong> ${locationData.y}</p>
      <p><strong>Attributes:</strong></p>
      <ul>${(locationData.attributes || []).map(attr => `<li>${attr.name}</li>`).join('')}</ul>
    `;
    panel.style.display = "block";
  }

  function updateAttributeColor(attrId, color) {
    const numericColor = parseInt(color.replace("#", "0x"), 16);
  
    locationMap.forEach(sprite => {
      if (Array.isArray(sprite.attributes)) {
        const hasMatch = sprite.attributes.some(a => a.id === attrId);
        if (hasMatch) {
          sprite.tint = numericColor;
        }
      }
    });
  
    const meta = attrHandler.attributeMeta.get(attrId);
    if (meta) {
      meta.color = color;
      const colorMap = {};
      attrHandler.attributeMeta.forEach((meta, id) => {
        colorMap[id] = meta.color;
      });
      localStorage.setItem("attributeColors", JSON.stringify(colorMap));
    }
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
  rackrow_subs.forEach(rack => {
    drawRackRows(rack, locationTexture, attrHandler, locationMap, rowLabelMeta, spriteOnClick, layer1Container, layer2Container);

  });
  // rackrow_subs.forEach(rack => {
  //   drawRackRows(rack, 0, locationTexture);
  // });
  drawLoadingStations();
  viewport.addChild(labelLayer);
  //slHandler.init();



  const header = document.getElementById("ui-panel-header");
  const body = document.getElementById("ui-panel-body");
  
  header.addEventListener("click", () => {
    const isVisible = body.style.display !== "none";
    body.style.display = isVisible ? "none" : "block";
    header.querySelector("strong").textContent = `Attributes ${isVisible ? '▶' : '▼'}`;
  });

 
  
  const context = {
    Order: { Rulename: "3tn_ST22_BC-123" },
    Row: "G",
    Location: 42
  };
  
  //const score = evaluateRule(rule, context);
  //console.log("Rule", rule)
  //console.log("Score:", score);
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
            zoomScale: zoomScale.value
          })
        
        });

      }
    });
    


    // Optionally auto-select first rule on load:
    if (ruleGroups.length > 0) {
      selector.value = ruleGroups[0].name;
      const defaultGroup = ruleGroups[0];
      runHeatmap({
        rules: defaultGroup.rules,
        ruleName: defaultGroup.name,
        color: defaultGroup.color || "#ff0000",
        locationMap,
        evaluateRule,
        colorScale,
        renderBitmapLabels: () =>
        renderBitmapLabels({
          rowLabelMeta,
          locationMap,
          labelLayer,
          zoomScale: zoomScale.value
        })
      
      });

    }
  });
 

}
