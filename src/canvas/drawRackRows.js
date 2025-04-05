// drawRackRows.js
import * as PIXI from "pixi.js";

export function drawRackRows(rack, texture, attrHandler, locationMap, labelMeta, onClick, layer1Container, layer2Container) {
  const startX = parseFloat(rack.location1coord);
  const endX = parseFloat(rack.locationncoord);
  const rowY = parseFloat(rack.rowcoord);
  const height = parseFloat(rack.locationheight);

  if ([startX, endX, rowY, height].some(isNaN)) {
    console.warn("Invalid rack data", rack);
    return;
  }

  const locCount = (rack.to_location - rack.from_location) + 1;
  const rackWidth = Math.abs(endX - startX);
  let locWidth;

  if (locCount <= 1) {
    locWidth = 1500; // fallback for single-location rows
  } else {
    locWidth = (Math.abs(endX - startX)) / (locCount - 1);
    if (locWidth < 500) locWidth = 1500;
  }
  let firstSprite = null;
  let lastSprite = null;
  const x0 = endX;
  
  for (let i = 0; i < locCount; i++) {
    const baseIndex = parseInt(rack.to_location) - i;
    const baseKey = `${rack.bay}-${rack.area}-${rack.rowname}-${baseIndex}`;
    const locKey = `${baseKey}-1`; // Layer 1
    const sprite = new PIXI.Sprite(texture);
    sprite.x = x0 + (i * locWidth) //+ 750;
    sprite.y = rowY;
    sprite.width = locWidth - 200;
    sprite.height = height;
    sprite.anchor.set(0.5, 0.5);

    const attrList = attrHandler.attributeMap.get(baseKey);
    sprite.attributes = attrList?.map(attr => {
      const meta = attrHandler.attributeMeta.get(attr.attributeId);
      return {
        id: attr.attributeId,
        name: meta?.name || `Attribute ${attr.attributeId}`,
        description: meta?.description || ""
      };
    }) || [];

    locationMap.set(locKey, sprite);
    sprite.locationKey = locKey;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.on("pointerdown", () => onClick(sprite));

    layer1Container.addChild(sprite);

    if (i === 0) firstSprite = sprite;
    if (i === locCount - 1) lastSprite = sprite;
  }


  // Layer 2 - skip first and last position
  // Layer 2 - skip first and last positions
for (let i = 1; i < locCount - 1; i++) {
  const index = parseInt(rack.to_location) - i;
  const baseKey = `${rack.bay}-${rack.area}-${rack.rowname}-${index}`;
  const locKey = `${baseKey}-2`;

  const sprite = new PIXI.Sprite(texture);

  // X: fall between Layer 1 locations
  const x = x0 + i * locWidth + locWidth / 2;
  sprite.x = x;

  // Y: match Layer 1 vertical placement
  sprite.y = rowY;
  sprite.width = locWidth - 300;
  sprite.height = height;
  sprite.anchor.set(0.5, 0.5);
  sprite.alpha = 0.7;

  const attrList = attrHandler.attributeMap.get(baseKey);
  sprite.attributes = attrList?.map(attr => {
    const meta = attrHandler.attributeMeta.get(attr.attributeId);
    return {
      id: attr.attributeId,
      name: meta?.name || `Attribute ${attr.attributeId}`,
      description: meta?.description || ""
    };
  }) || [];

  locationMap.set(locKey, sprite);
  sprite.locationKey = locKey;
  sprite.eventMode = "static";
  sprite.cursor = "pointer";
  sprite.on("pointerdown", () => onClick(sprite));

  layer2Container.addChild(sprite);
}

  const layer2Toggle = document.getElementById("layer2Toggle");
  const showLayer2 = layer2Toggle?.checked ?? true; // default to true if not found

  if(!showLayer2) {layer2Container.visible = false;}

  if (firstSprite && lastSprite) {
    let rowMidX = (startX + endX) / 2;

    let rowMidY = rowY - height;

    if (["SHO", "PR1", "PR2", "PR3", "SHI", "CPL", "PAC"].includes(rack.rowname)) {
      rowMidX = ((firstSprite.x + lastSprite.x) / 2) - 800;
      rowMidY = rowY + height / 2 - 200;
    }

    labelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY - 500, type: "mid" });
    labelMeta.push({ ...centerLabel(`${rack.to_location}`, firstSprite), type: "start" });
    labelMeta.push({ ...centerLabel(`${rack.from_location}`, lastSprite), type: "end" });
  }
}

function centerLabel(text, sprite, fontSize = 1000) {
  const dummy = new PIXI.BitmapText({
    text,
    style: { fontName: "DefaultFont", fontSize }
  });
  sprite.anchor.set(0.5, 0.5);
  // Center the label horizontally based on the sprite's actual center
  const spriteCenterX = sprite.x - dummy.width /2 //* sprite.anchor.x;
  const x = spriteCenterX + sprite.width / 2 + dummy.width / 2;
  const y = sprite.y + sprite.height / 2 - dummy.height / 2 - 300;

  return { text, x, y };
}

