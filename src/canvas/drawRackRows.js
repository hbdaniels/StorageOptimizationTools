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

  const rackWidth = Math.abs(endX - startX);
  const locCount = (rack.to_location - rack.from_location) + 1;
  let locWidth = rackWidth / locCount;
  if (locWidth < 500) locWidth = 1500;

  let firstSprite = null;
  let lastSprite = null;
  const x0 = endX;

  // Layer 1 locations
  for (let i = 0; i < locCount; i++) {
    const layer = 1;
    const locKey = `${rack.bay}-${rack.area}-${rack.rowname}-${parseInt(rack.to_location) - i}-${layer}`;
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
      } else {
        sprite.attributes = []; // ✅ ensure every sprite has this
      }

    locationMap.set(locKey, sprite);
    sprite.locationKey = locKey;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.on("pointerdown", () => onClick(sprite));

    layer1Container.addChild(sprite);

    if (i === 0) firstSprite = sprite;
    if (i === locCount - 1) lastSprite = sprite;
  }

  // Layer 2 locations (between layer 1, same Y position)
  for (let i = 1; i < locCount - 1; i++) {
    const leftIndex = parseInt(rack.to_location) - i + 1;
    const rightIndex = parseInt(rack.to_location) - i;
    const leftKey = `${rack.bay}-${rack.area}-${rack.rowname}-${leftIndex}-1`;
    const rightKey = `${rack.bay}-${rack.area}-${rack.rowname}-${rightIndex}-1`;
    const left = locationMap.get(leftKey);
    const right = locationMap.get(rightKey);

    if (!left || !right) continue;

    const centerX = (left.x + left.width + right.x) / 2;
    const layer1Key = `${rack.bay}-${rack.area}-${rack.rowname}-${rightIndex}-1`;
    const locKey = `${rack.bay}-${rack.area}-${rack.rowname}-${rightIndex}-2`;

    const attrList = attrHandler.attributeMap.get(layer1Key);
    const sprite = new PIXI.Sprite(texture);
    sprite.x = centerX - (left.width * 0.9) / 2;
    sprite.y = left.y; // same Y as layer 1
    sprite.width = left.width * 0.9;
    sprite.height = left.height * 0.9;
    sprite.tint = 0xffffff; // temporary white tint for visibility
    sprite.alpha = 0.6; // semi-transparent for layer 2

    if (attrList && attrList.length > 0) {
        sprite.attributes = attrList.map(attr => {
          const meta = attrHandler.attributeMeta.get(attr.attributeId);
          return {
            id: attr.attributeId,
            name: meta?.name || `Attribute ${attr.attributeId}`,
            description: meta?.description || ""
          };
        });
      } else {
        sprite.attributes = []; // ✅ always assign
    }

    locationMap.set(locKey, sprite);
    sprite.locationKey = locKey;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.on("pointerdown", () => onClick(sprite));

    layer2Container.addChild(sprite);
  }

  if (firstSprite && lastSprite) {
    let rowMidX = (firstSprite.x + lastSprite.x + locWidth) / 2;
    let rowMidY = rowY - height;

    if (["SHO", "PR1", "PR2", "PR3", "SHI", "CPL", "PAC"].includes(rack.rowname)) {
      rowMidX = (firstSprite.x + lastSprite.x) / 2;
      rowMidY = rowY + height / 2 - 200;
    }

    labelMeta.push({ text: rack.rowname, x: rowMidX, y: rowMidY, type: "mid" });
    labelMeta.push({ ...centerLabel(`${rack.to_location}`, firstSprite), type: "start" });
    labelMeta.push({ ...centerLabel(`${rack.from_location}`, lastSprite), type: "end" });
  }
}

function centerLabel(text, sprite, fontSize = 1000) {
  const dummy = new PIXI.BitmapText({
    text,
    style: { fontName: "DefaultFont", fontSize }
  });

  return {
    text,
    x: sprite.x + (sprite.width / 2) + (dummy.width / 2) - 300,
    y: sprite.y + (sprite.height / 2) - (dummy.height / 2) + 200
  };
}