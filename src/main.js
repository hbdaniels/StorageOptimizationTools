import * as PIXI from "pixi.js";
import rackrow_sub from "../jsonFiles/storagelocation_rackrow_sub.json"
import attributeHandler from "./attributeHandler";
import storageLocationHandler from "./storageLocationHandler";
import evaluateRule from "./storageEvaluator";
import parsedRules from "../jsonFiles/parsed_storage_rules.json";
import { DropShadowFilter } from '@pixi/filter-drop-shadow';
import chroma from "chroma-js";
import loadingStations from "../jsonFiles/storagelocation_loadingstation.json";

const colorScale = chroma.scale(['#FF0000', '#FFFF00', '#00FF00']).domain([0, 1000]);

const rackrow_subs = rackrow_sub.results[0].items
let attrHandler = new attributeHandler(rackrow_subs);
console.log(rackrow_subs);

const storedColors = JSON.parse(localStorage.getItem("attributeColors") || "{}");
const visibleAttributes = new Set();

const app = new PIXI.Application({
    width: 1200,
    height: 800,
    antialias: true,
});


await app.init();
app.renderer.background.color = 0xdbedff;
document.body.appendChild(app.canvas);

const selector = document.getElementById("ruleSelector");
window.ruleSelector = selector; // 👈 attach to global window object

const viewport = new PIXI.Container();

const worldScale = 0.002;
viewport.scale.set(worldScale);
const shopFloorContainer = new PIXI.Container();
viewport.addChild(shopFloorContainer); // after viewport is created
const layer1Container = new PIXI.Container();
viewport.addChild(layer1Container); // after viewport is created
const layer2Container = new PIXI.Container();
viewport.addChild(layer2Container); // after viewport is created
const attributeUnderlay = new PIXI.Container();
viewport.addChild(attributeUnderlay); // after viewport is created

const labelLayer = new PIXI.Container();

let zoomScale = 0.002;
let labelsVisible = false;
let previousZoom = zoomScale;

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
  

app.canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  lastPos = { x: e.clientX, y: e.clientY };
  viewport.cursor = 'grabbing';
  console.log(screenToWorld(e.clientX, e.clientY));
});

app.canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
  
    // Fix horizontal drift by accounting for flipped stage scale
    const scaleFixX = app.stage.scale.x === -1 ? -1 : 1;
  
    viewport.x += dx * scaleFixX;
    viewport.y += dy;
  
    lastPos = { x: e.clientX, y: e.clientY };
    //renderLabels();
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
  const mouseX = (e.clientX - rect.left);
  const mouseY = (e.clientY - rect.top);
  const localX = (mouseX - viewport.x) / viewport.scale.x;
  const localY = (mouseY - viewport.y) / viewport.scale.y;
  viewport.scale.set(zoomScale);
  viewport.x = mouseX - localX * zoomScale;
  viewport.y = mouseY - localY * zoomScale;
  console.log("zoomScale:", zoomScale);
  //renderLabels();
}, { passive: false });

main();



function drawRackRows(rack, baseY = 0, texture) {
  const maxLocations = 100;
  const startX = parseFloat(rack.location1coord);
  const endX = parseFloat(rack.locationncoord);
  const rowY = parseFloat(rack.rowcoord);
  const height = parseFloat(rack.locationheight);

  if ([startX, endX, rowY, height].some(isNaN)) {
    console.warn("Invalid rack data", rack);
    return;
  }

  const rackWidth = Math.abs(endX - startX);
  const locCount = (rack.to_location - rack.from_location) + 1;
  let locWidth = rackWidth / locCount;
  if (locWidth < 500) locWidth = 1500;

  let firstSprite = null;
  let lastSprite = null;
  const x0 = endX;

  for (let i = 0; i < locCount; i++) {
    const locKey = rack.bay + '-' + rack.area + '-' + rack.rowname + '-' + String(parseInt(rack.to_location) - parseInt(i));
    const sprite = new PIXI.Sprite(texture);
    sprite.x = x0 + i * locWidth;
    sprite.y = rowY;
    sprite.width = locWidth - 200;
    sprite.height = height;
    
    const attrList = attrHandler.attributeMap.get(locKey);
    if (attrList && attrList.length > 0) {
      sprite.attributes = attrList.map(attr => {
        const meta = attrHandler.attributeMeta.get(attr.attributeId);
        return {
          id: attr.attributeId,
          name: meta?.name || `Attribute ${attr.attributeId}`,
          description: meta?.description || ""
        };
      });

      // Optional: visually mark the sprite if it has attributes
      //sprite.tint = 0x00cc66;
    }

    locationMap.set(locKey, sprite);
    sprite.locationKey = locKey;
    //viewport.addChild(sprite);
    layer1Container.addChild(sprite);
    if (i === 0) firstSprite = sprite;
    if (i === locCount - 1) lastSprite = sprite;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.on("pointerdown", () => {
        
        spriteOnClick(sprite);
      });
      
  }

if (firstSprite && lastSprite) {
    let rowMidX = (firstSprite.x + lastSprite.x + locWidth) / 2;
    let rowMidY = rowY - height;
    if (rack.rowname === "SHO" || rack.rowname ==="PR1" || rack.rowname ==="PR2" || rack.rowname ==="PR3" || rack.rowname === "SHI" || rack.rowname ==="CPL" || rack.rowname === "PAC"){
        rowMidX = ((firstSprite.x + lastSprite.x ) / 2) ;
        rowMidY = rowY + height/2 - 200;
        rowLabelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY , type: "mid"});
    }else if (rack.rowname === "CPL"){
        rowMidX = ((firstSprite.x + lastSprite.x ) / 2) + locWidth - 200;
        rowLabelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY , type: "mid"});

    }else{
        rowMidX = ((firstSprite.x + lastSprite.x ) / 2) + locWidth - 200;
        rowLabelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY , type: "mid"});
    }
    // Mid-row label
    //rowLabelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY , type: "mid"});
  
    // Start label (to_location) - inside first sprite
    rowLabelMeta.push({
        ...createLabelCenteredInSprite(`${rack.to_location}`, firstSprite),
        type: "start"
      });
    // End label (from_location) - inside last sprite
    rowLabelMeta.push({
        ...createLabelCenteredInSprite(`${rack.from_location}`, lastSprite),
        type: "end"
      });
  }
  
  
  
  
}

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
  
  
  
function renderBitmapLabels() {
    labelLayer.removeChildren();
  
    if (zoomScale > 0.0075) {
  
        rowLabelMeta.forEach(meta => {
          const label = new PIXI.BitmapText({
            text: meta.text,
            style: {
              fontName: "Roboto Mono SemiBold", // match your .fnt name
              fontSize: 600,
            }
          });
      
          label.x = meta.x;
          if (zoomScale > 0.015 && (meta.type === "start" || meta.type === "end")) {
            label.y = meta.y - 1000;
          } else {
            label.y = meta.y;
          }
          label.scale.x = -1; // mirror to match flipped canvas
          labelLayer.addChild(label);
          label.tint = 0x000000;
        });
    }

    if (zoomScale > 0.015) {
        locationMap.forEach((sprite, key) => {
         // 🔥 Render heat score labels 
         if (sprite.heatScore == null || isNaN(sprite.heatScore)) return;
          const heatLabel = new PIXI.BitmapText({
            text: Math.round(sprite.heatScore).toString(),
            style: {
              fontName: "Roboto Mono SemiBold",
              fontSize: 400,
            }
          });
      
          heatLabel.x = sprite.x + sprite.width / 2;
          heatLabel.y = sprite.y + sprite.height / 2;
          heatLabel.anchor = { x: 0.5, y: 0.5 };
          heatLabel.scale.x = -1; // flip
          heatLabel.tint = 0x000000;
          labelLayer.addChild(heatLabel);
      

        console.log("✅ Rendered heat score labels.");
        
        });
    }

  }
  app.ticker.add(() => {
    const shouldShow = zoomScale >= 0.0075;
  
    // Only re-render if zoom state changes
    if (shouldShow !== labelsVisible || Math.abs(previousZoom - zoomScale) > 0.00001) {
      labelsVisible = shouldShow;
      previousZoom = zoomScale;
  
      if (labelsVisible) {
        renderBitmapLabels(); // render only once
      } else {
        labelLayer.removeChildren(); // hide all
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
    
  function groupAttributesByBay(attributeMetaMap) {
    const grouped = {};
    attributeMetaMap.forEach((meta, id) => {
      const bay = meta.name.includes("ST21") ? "ST21" : meta.name.includes("ST22") ? "ST22" : "Other";
      if (!grouped[bay]) grouped[bay] = [];
      grouped[bay].push({ id, ...meta });
    });
    return grouped;
  }
  
  function renderAttributList() {
    const attributeListEl = document.getElementById("attribute-panel");
    attributeListEl.innerHTML = "";
  
    const groupedAttrs = groupAttributesByBay(attrHandler.attributeMeta);
    Object.entries(groupedAttrs).forEach(([bay, attrs]) => {
      const sectionWrapper = document.createElement("div");
      sectionWrapper.classList.add("attribute-group");
  
      const header = document.createElement("div");
      header.classList.add("attribute-group-header");
      header.style.marginTop = "8px";
      
      // Use flex to lay things out: title left, checkbox+label right
      const headerWrapper = document.createElement("div");
      headerWrapper.style.display = "flex";
      headerWrapper.style.justifyContent = "space-between";
      headerWrapper.style.alignItems = "center";
      
      // 📌 Title: bay name, collapses group on click
      const titleWrapper = document.createElement("div");
      titleWrapper.style.flex = "1"; // take all available space
      titleWrapper.style.cursor = "pointer";
      titleWrapper.style.fontWeight = "bold";
      
      const titleSpan = document.createElement("span");
      titleSpan.textContent = `${bay} ▼`;
      
      titleWrapper.appendChild(titleSpan);
      titleSpan.style.cursor = "pointer";
      titleSpan.style.fontWeight = "bold";
      
    //   titleSpan.addEventListener("click", () => {
    //     const isVisible = body.style.display !== "none";
    //     body.style.display = isVisible ? "none" : "block";
    //     titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
    //   });
      titleWrapper.addEventListener("click", () => {
        const isVisible = body.style.display !== "none";
        body.style.display = isVisible ? "none" : "block";
        titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
      });
      
      // 📌 Right side: checkbox + label
      const checkAllContainer = document.createElement("div");
      checkAllContainer.style.display = "flex";
      checkAllContainer.style.alignItems = "center";
      checkAllContainer.style.gap = "6px";
      
      const checkAll = document.createElement("input");
      checkAll.type = "checkbox";
      checkAll.id = `check-all-${bay}`;
      
      const checkAllLabel = document.createElement("label");
      checkAllLabel.htmlFor = checkAll.id;
      checkAllLabel.textContent = "Check All";
      
      checkAll.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        attrs.forEach(({ id }) => {
          const cb = document.getElementById(`attr-${id}`);
          if (cb) {
            cb.checked = isChecked;
            cb.dispatchEvent(new Event("change"));
          }
        });
      });
      
      checkAllContainer.appendChild(checkAll);
      checkAllContainer.appendChild(checkAllLabel);
      
      // Put title on left, checkbox group on right
      headerWrapper.appendChild(titleSpan);
      headerWrapper.appendChild(checkAllContainer);
      
      header.appendChild(headerWrapper);
  
      const body = document.createElement("div");
      body.classList.add("attribute-group-body");
  
      // Sort attributes alphabetically
      attrs.sort((a, b) => a.name.localeCompare(b.name));
  
      attrs.forEach(({ id, name, color }) => {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "8px";
        container.style.marginBottom = "6px";
  
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `attr-${id}`;
        checkbox.dataset.attrId = id;
  
        checkbox.addEventListener("change", (e) => {
          const attrId = parseInt(e.target.dataset.attrId);
          toggleAttributeVisibility(attrId, e.target.checked);
        });
  
        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.textContent = name;
        label.style.flex = "1";
  
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = color;
  
        colorInput.addEventListener("input", (e) => {
          const newColor = e.target.value;
          if (color === newColor) return;
          attrHandler.setAttributeColor(`attr-color-${id}`, newColor);
          localStorage.setItem(`attr-color-${id}`, newColor);
          updateAttributeColor(e.target.dataset.attrId, newColor);
        });
  
        container.appendChild(colorInput);
        container.appendChild(checkbox);
        container.appendChild(label);
        body.appendChild(container);
      });
      titleSpan.addEventListener("click", () => {
        const isVisible = body.style.display !== "none";
        body.style.display = isVisible ? "none" : "block";
        titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
      });
    //   header.addEventListener("click", () => {
    //     const isVisible = body.style.display !== "none";
    //     body.style.display = isVisible ? "none" : "block";
    //     titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
    //   });
  
      sectionWrapper.appendChild(header);
      sectionWrapper.appendChild(body);
      attributeListEl.appendChild(sectionWrapper);
    });
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


  function runHeatmap(rules, ruleName = "Unknown", color = 0xff0000) {
    if (!heatmapEnabled) return;
    let minScore = Infinity;
    let maxScore = -Infinity;
  
    locationMap.forEach(sprite => {
      const [bay, area, row, loc] = sprite.locationKey.split("-");
      const context = {
        StorageLocation: sprite,
        Row: row,
        Location: parseInt(loc),
        Order: { Rulename: ruleName }
      };
      
  
      let score = 0;
      for (const rule of rules) {
        const result = evaluateRule(rule, context);
        if (typeof result === "number") {
          score += result;
        }
      }
  
      if (score !== 0) {
        sprite.heatScore = score;
        minScore = Math.min(minScore, score);
        maxScore = Math.max(maxScore, score);
      } else {
        sprite.heatScore = null;
      }
    });
  
    // Apply colors
    locationMap.forEach(sprite => {
      if (sprite.heatScore != null) {
        const t = (sprite.heatScore - minScore) / (maxScore - minScore + 0.0001);
        //sprite.tint = heatColor(t);
        sprite.tint = parseInt(colorScale(sprite.heatScore).hex().substring(1), 16);
      } else {
        sprite.tint = 0xcccccc;
      }
    });
    renderBitmapLabels();
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


//   const g = new PIXI.Graphics();
//     g.beginFill(0xFFFFFF);
//     g.lineStyle(2, 0x333333);  // subtle border
//     g.drawRoundedRect(0, 0, 1230, 600, 100);  // ← radius = 80
//     g.endFill();

  //let locationTexture = createGradientTexture("#ffffff", "#e0e0e0");
  //const locationTexture = createGradientRoundedTexture(1230, 600, 100, "#ffffff", "#dddddd");
  //const locationTexture = createStylizedTexture(1230, 600, 100, "#ffffff", "#dddddd");
  let locationTexture = await PIXI.Assets.load('/src/assets/deposit.png')
  rackrow_subs.forEach(rack => {
    drawRackRows(rack, 0, locationTexture);
  });
  drawLoadingStations();
  viewport.addChild(labelLayer);
  //slHandler.init();
  renderAttributList();
  const header = document.getElementById("ui-panel-header");
  const body = document.getElementById("ui-panel-body");
  
  header.addEventListener("click", () => {
    const isVisible = body.style.display !== "none";
    body.style.display = isVisible ? "none" : "block";
    header.querySelector("strong").textContent = `Attributes ${isVisible ? '▶' : '▼'}`;
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
        runHeatmap(selectedGroup.rules, selectedGroup.name, selectedGroup.color || 0xff0000);

      }
    });
    


    // Optionally auto-select first rule on load:
    if (ruleGroups.length > 0) {
      selector.value = ruleGroups[0].name;
      const defaultGroup = ruleGroups[0];
      runHeatmap(selectedGroup.rules, selectedGroup.name, selectedGroup.color || 0xff0000);

    }
  });
 

}
