import * as PIXI from "pixi.js";
import rackrow_sub from "../jsonFiles/storagelocation_rackrow_sub.json"

const rackrow_subs = rackrow_sub.results[0].items
console.log(rackrow_subs);
// Create PIXI app
const app = new PIXI.Application({
  width: 1200,
  height: 800,
  backgroundColor: 0xeeeeee,
});

await app.init();
document.body.appendChild(app.canvas);


// Main container for zoom/pan
const viewport = new PIXI.Container();
const worldScale = 0.002;
viewport.scale.set(worldScale); // Only once

const labelLayer = new PIXI.Container();

const labelCache = new Map();
const rowLabelMeta = []; // Will hold minimal label metadata


//viewport.scale.x = -1;
app.stage.scale.x = -1;
app.stage.position.x = app.screen.width;
viewport.scale.set(worldScale);
app.stage.addChild(viewport);

// Zoom/pan settings
let isDragging = false;
let lastPos = { x: 0, y: 0 };
let zoomScale = .002;

// Enable interaction
viewport.interactive = true;
viewport.cursor = 'grab';
viewport.eventMode = 'static'; // Pixi v7

const locationMap = new Map();

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

// Function to draw an area
function drawArea(name, x1, y1, x2, y2, color = 0x3498db, rotation = 0) {
  const scale = 0.002;

  // Convert and normalize coordinates
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
  
  //const style = new PIXI.BitmapTextStyle({ fill: "#FFFFFF", fontSize: 5000 });
  const label = new PIXI.BitmapText(name);
  label.x = 5 + label.width;
  label.y = 5;
  label.scale.x = -1;
  container.addChild(label);

  
  viewport.addChild(container);
}

function drawRackRow(rack, color = 0xFFFFFF) {
  
  const maxLocations = 100; // safety cap
  const locWidth = 1230;
  const startX = rack.locationncoord;
  const endX = rack.location1coord;
  const rowY = rack.rowcoord;
  const height = rack.locationheight;
  const rackWidth = Math.abs(endX - startX);
  const numLocations = Math.min(Math.floor(rackWidth / locWidth), maxLocations);
  const direction = 1;

  for (let i = 0; i < numLocations; i++) {
    const container = new PIXI.Container();
    container.x = startX + i * direction * locWidth;
    container.y = rowY;

    const rect = new PIXI.Graphics();
    rect.beginFill(color);
    rect.lineStyle(1, 0x000000);
    rect.drawRect(0, 0, locWidth, height);
    rect.endFill();

    const label = new PIXI.BitmapText(`${rack.rowname}-${12 - i}`, { // location 12 → 1
      fontSize: 12 / worldScale,
      fill: "#000000"
    });

    container.addChild(rect);
    container.addChild(label);
    viewport.addChild(container);
  }
  // const rect = new PIXI.Graphics();
  // rect.beginFill(color);
  // rect.lineStyle(1, 0x000000);
  // rect.drawRect(0, 0, width, height); //width, height);
  // rect.endFill();

  //rect.y = rowY;/// worldScale;
  //rect.x = startX;
  console.log(`${rack.from_location}-${rack.to_location}`)
  //const label2 = new PIXI.BitmapTextString(rack.rowname, {)
  const label = new PIXI.BitmapText(`${rack.rowname}`, { //${rack.from_location}-${rack.to_location}`, {
    fontSize: 3 / worldScale,
    fill: "#000000"
  });
  label.y = rack.rowcoord - label.height/2 //+ label.height //+ 10;
  label.x = rack.location1coord + 10;
  label.scale.x = -1;
  

  // const container = new PIXI.Container();

  // container.addChild(rect);
  // container.addChild(label);
  
}






function drawRackRow2(rack, baseY = 0, texture) {
  //const locWidth = 1230;
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
  console.log(locCount);
  let locWidth = rackWidth / locCount;
  if (locWidth < 500) {
    console.warn("rack width math didn't work defaulted to 1500 width", locWidth);
    locWidth = 1500;
    //return;
  }
  const numLocations = Math.min(Math.floor(rackWidth / locWidth), maxLocations);
  const direction = 1;
  const x0 = startX;

  let firstSprite = null;
  let lastSprite = null;
  console.log(numLocations)
  
  for (let i = 0; i < locCount; i++) {
    const sprite = new PIXI.Sprite(texture);
    sprite.x = x0 + i * direction * locWidth;
    sprite.y = rowY;
    sprite.width = locWidth-200;
    sprite.height = height;

    // Assign a unique key — use from_location or composite
    const locKey = rack.rowname + '-' + String(parseInt(rack.to_location) + parseInt(i));
    console.log(locKey + " " + i);
    locationMap.set(locKey, sprite);

    viewport.addChild(sprite);

    if (i === 0) firstSprite = sprite;
    if (i === numLocations - 1) lastSprite = sprite;
  }

  // Store row-level label metadata
  if (firstSprite && lastSprite) {
    // Row name (centered between first/last)
    const rowMidX = (firstSprite.x + lastSprite.x + locWidth) / 2;
    const rowMidY = rowY + height - 1000; // offset below

    rowLabelMeta.push({
      text: rack.rowname,
      x: rowMidX,
      y: rowMidY,
    });

    rowLabelMeta.push({
      text: `${rack.to_location}`,
      x: firstSprite.x + locWidth / 2,
      y: firstSprite.y //+ height / 2,
    });
    
    rowLabelMeta.push({
      text: `${rack.from_location}`,
      x: lastSprite.x + locWidth * 2,
      y: lastSprite.y //+ height / 2,
    });
    
  }
}


function renderLabels() {
  labelLayer.removeChildren();

  if (zoomScale < 0.01) return;

  rowLabelMeta.forEach(meta => {
    const label = new PIXI.BitmapText(meta.text, {
      fontName: 'Arial', // <-- match your font name here
      fontSize: 1500,
      tint: 0x000000
    });

    label.x = meta.x - label.width / 2;
    label.y = meta.y - label.height / 2;

    // Optional: flip if needed (try commenting out)
    label.scale.x = -1;
    // const debugDot = new PIXI.Graphics();
    // debugDot.beginFill(0xff0000);
    // debugDot.drawCircle(meta.x, meta.y, 20);
    // debugDot.endFill();
    // labelLayer.addChild(debugDot);
    labelLayer.addChild(label);
  });

  console.log(`Rendered ${rowLabelMeta.length} labels`);
}






const rackRow1 = {
  BAY: "ST22",
  ROWNAME: "A2",
  ORIENTATION: "Q",
  LOCATION1COORD: 223950,
  LOCATIONNCOORD: 363320,
  LOCATIONHEIGHT: 347810,
  //RACKGEOMETRY: "763;763;2200;2200",
  //HOST_STORAGE_TYPE: "800;800;2000;2000"
};

//viewport.scale.set(worldScale); // Only once

// Draw warehouse zones first
// drawArea("ST21", 173208, 242700, 523520, 278100);
// drawArea("ST22", 173208, 203005, 523520, 240358, 0xe67e22);

// rackrow_subs.forEach(rack => {
//   drawRackRowWLocations(rack);
//   //drawRackRowWLocations(rack);
// });
async function main() {
  
  await PIXI.Assets.load('/src/assets/pngFont.fnt'); // path to your font
  //console.log("Loaded bitmap font:", fontData);

  const rackrow_subs = rackrow_sub.results[0].items;
  console.log("Rack count:", rackrow_subs.length);

  // Draw areas first
  drawArea("ST21", 173208, 242700, 523520, 278100);
  drawArea("ST22", 173208, 203005, 523520, 240358, 0xe67e22);

  // Create a base texture once for reuse
  const g = new PIXI.Graphics();
  g.beginFill(0xFFFFFF);
  g.lineStyle(1, 0x000000);
  g.drawRect(0, 0, 1230, 600); // Replace 600 with typical location height
  g.endFill();
  let locationTexture = app.renderer.generateTexture(g);



  // Only draw a few rows for now (until it's confirmed safe)
  rackrow_subs.forEach(rack => {
    drawRackRow2(rack, 0, locationTexture);
  });

  viewport.addChild(labelLayer);

  const target = locationMap.get("G-40");
  if (target) {
    target.tint = 0xff0000; // red highlight
  }

}
//await app.init();
//document.body.appendChild(app.canvas);

// Call main ONCE

//drawRackRow2(rackrow_subs[0]);

// Then draw racks
// drawRackRow({
//   BAY: "ST22",
//   ROWNAME: "A2",
//   ORIENTATION: "Q",
//   LOCATION1COORD: 223950,
//   LOCATIONNCOORD: 363320,
//   RACKGEOMETRY: "763;763;2200;2200",
//   HOST_STORAGE_TYPE: "800;800;2000;2000"
// });


