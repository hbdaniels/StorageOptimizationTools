import * as PIXI from "pixi.js";
import rackrow_sub from "../jsonFiles/storagelocation_rackrow_sub.json"
import attributesRaw from "../jsonFiles/storage_location_attributes.json"

const rackrow_subs = rackrow_sub.results[0].items
const attributeRows = attributesRaw.results[0].items
console.log(rackrow_subs);

const attributeMap = new Map();

import availableAttributes from "../jsonFiles/available_attributes.json";

const attributeMeta = new Map();
availableAttributes.results[0].items.forEach(attr => {
  attributeMeta.set(attr.id, {
    name: attr.attribute,
    description: attr.description
  });
});


// Build attribute map from raw attributes
attributeRows.forEach(row => {
  const parts = row.storage_location.split(":");
  const area = parts[3];
  const rowName = parts[4];
  const locationStart = parts[5];
  const startIndex = parseInt(parts[6]);
  const endIndex = parseInt(parts[9]);

  if (!area || !rowName || !locationStart || isNaN(startIndex)) return;

  // Handle range if defined
  if (!isNaN(endIndex) && endIndex >= startIndex) {
    for (let i = startIndex; i <= endIndex; i++) {
      const locKey = `${rowName}-${locationStart}${i}`;
      attributeMap.set(locKey, {
        attributeId: row.attribute_id,
        raw: row
      });
    }
  } else {
    const locKey = `${rowName}-${locationStart}${startIndex}`;
    attributeMap.set(locKey, {
      attributeId: row.attribute_id,
      raw: row
    });
  }
});

const app = new PIXI.Application({
  width: 1200,
  height: 800,
  backgroundColor: 0xeeeeee,
});

await app.init();
document.body.appendChild(app.canvas);

const viewport = new PIXI.Container();
const worldScale = 0.002;
viewport.scale.set(worldScale);
const labelLayer = new PIXI.Container();
const labelCache = new Map();
const rowLabelMeta = [];
const locationMap = new Map();

app.stage.scale.x = -1;
app.stage.position.x = app.screen.width;
app.stage.addChild(viewport);

let isDragging = false;
let lastPos = { x: 0, y: 0 };
let zoomScale = .002;

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
  viewport.x += dx *-1;
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
  renderLabels();
}, { passive: false });

main();

function drawRackRow2(rack, baseY = 0, texture) {
  const maxLocations = 100;
  const startX = parseFloat(rack.locationncoord);
  const endX = parseFloat(rack.location1coord);
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
  const x0 = startX;

  for (let i = 0; i < locCount; i++) {
    const locKey = rack.rowname + '-' + String(parseInt(rack.to_location) + parseInt(i));
    const sprite = new PIXI.Sprite(texture);
    sprite.x = x0 + i * locWidth;
    sprite.y = rowY;
    sprite.width = locWidth - 200;
    sprite.height = height;

    const attr = attributeMap.get(locKey);
    if (attr) {
        const meta = attributeMeta.get(attr.attributeId);
        sprite.tint = 0x00cc66;
        sprite.attribute = {
            id: attr.attributeId,
            name: meta?.name || `Attribute ${attr.attributeId}`,
            description: meta?.description || ""
        };
    }
    
    locationMap.set(locKey, sprite);
    viewport.addChild(sprite);

    if (i === 0) firstSprite = sprite;
    if (i === locCount - 1) lastSprite = sprite;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.on("pointerdown", () => {
      console.log("Clicked location:", locKey);
      if (sprite.attribute) {
        console.log("Attribute:", sprite.attribute.name);
        console.log("Description:", sprite.attribute.description);
      } else {
        console.log("No attribute on this location");
      }
    });
  }

  if (firstSprite && lastSprite) {
    const rowMidX = (firstSprite.x + lastSprite.x + locWidth) / 2;
    const rowMidY = rowY + height - 1000;
    rowLabelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY });
    rowLabelMeta.push({ text: `${rack.to_location}`, x: firstSprite.x + locWidth / 2, y: firstSprite.y });
    rowLabelMeta.push({ text: `${rack.from_location}`, x: lastSprite.x + locWidth * 2, y: lastSprite.y });
  }
}

function renderLabels() {
  labelLayer.removeChildren();
  if (zoomScale < 0.01) return;

  rowLabelMeta.forEach(meta => {
    const label = new PIXI.BitmapText(meta.text, {
      fontName: 'Arial',
      fontSize: 1500,
      tint: 0x000000
    });
    label.x = meta.x - label.width / 2;
    label.y = meta.y - label.height / 2;
    label.scale.x = -1;
    labelLayer.addChild(label);
  });
}

function drawArea(name, x1, y1, x2, y2, color = 0x3498db, rotation = 0) {
  let x = Math.min(x1, x2);
  let y = Math.min(y1, y2);
  let width = Math.abs(x2 - x1);
  let height = Math.abs(y2 - y1);
  const graphics = new PIXI.Graphics();
  graphics.beginFill(color, 0.5);
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

  graphics.endFill();
  container.addChild(graphics);
  const label = new PIXI.BitmapText(name);
  label.x = 5 + label.width;
  label.y = 5;
  label.scale.x = -1;
  container.addChild(label);
  viewport.addChild(container);
}

async function main() {
  await PIXI.Assets.load('/src/assets/pngFont.fnt');

  drawArea("ST21", 173208, 242700, 523520, 278100);
  drawArea("ST22", 173208, 203005, 523520, 240358, 0xe67e22);

  const g = new PIXI.Graphics();
  g.beginFill(0xFFFFFF);
  g.lineStyle(1, 0x000000);
  g.drawRect(0, 0, 1230, 600);
  g.endFill();
  let locationTexture = app.renderer.generateTexture(g);

  rackrow_subs.forEach(rack => {
    drawRackRow2(rack, 0, locationTexture);
  });

  viewport.addChild(labelLayer);
  const target = locationMap.get("G-40");
if (target) {
  target.tint = 0xff0000; // Highlight in red
}
}
