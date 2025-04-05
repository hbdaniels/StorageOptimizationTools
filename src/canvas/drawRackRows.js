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

  for (let i = 0; i < locCount; i++) {
    const baseIndex = parseInt(rack.to_location) - i;
    const baseKey = `${rack.bay}-${rack.area}-${rack.rowname}-${baseIndex}`;
    const locKey = `${baseKey}-1`; // Layer 1
    const sprite = new PIXI.Sprite(texture);
    sprite.x = x0 + (i * locWidth) + 750;
    sprite.y = rowY;
    sprite.width = locWidth - 200;
    sprite.height = height;
    sprite.anchor.set(0, 0.5);

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
  for (let i = 1; i < locCount - 2; i++) {
    const leftIndex = parseInt(rack.to_location) - i;
    const rightIndex = parseInt(rack.to_location) - (i + 1);
    const baseKey = `${rack.bay}-${rack.area}-${rack.rowname}-${rightIndex}`;
    const locKey = `${baseKey}-2`; // Layer 2 key
    const sprite = new PIXI.Sprite(texture);
    const xLeft = x0 + i * locWidth;
    const xRight = x0 + (i + 1) * locWidth;
    sprite.x = (xLeft + xRight) / 2;
    sprite.y = rowY;
    sprite.width = locWidth - 300;
    sprite.height = height;
    sprite.alpha = 0.7; // Visual distinction

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
    let rowMidX = (firstSprite.x + lastSprite.x + locWidth) / 2;
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

  return {
    text,
    x: sprite.x + (sprite.width / 2) - 500, //+ (dummy.width / 2),
    y: sprite.y + (sprite.height / 2) - (dummy.height / 2) - 300
  };
}
