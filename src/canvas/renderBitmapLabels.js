import * as PIXI from "pixi.js";


export function renderBitmapLabels({ rowLabelMeta, locationMap, labelLayer, layer2Container, zoomScale }) {
    labelLayer.removeChildren();
  
    // 👇 Clear only BitmapText children from layer2Container (avoid removing sprites)
    for (let i = layer2Container.children.length - 1; i >= 0; i--) {
      const child = layer2Container.children[i];
      if (child instanceof PIXI.BitmapText) {
        layer2Container.removeChild(child);
      }
    }
  
    if (zoomScale > 0.0075) {
      rowLabelMeta.forEach(meta => {
        const label = new PIXI.BitmapText({
          text: meta.text,
          style: {
            fontName: "Roboto Mono SemiBold",
            fontSize: 600,
          }
        });
  
        label.x = meta.x;
        label.y = (zoomScale > 0.015 && (meta.type === "start" || meta.type === "end"))
          ? meta.y - 1000
          : meta.y;
  
        label.scale.x = -1;
        label.tint = 0x000000;
        labelLayer.addChild(label);
      });
    }
  
    if (zoomScale > 0.015) {
      locationMap.forEach((sprite, key) => {
        if (sprite.heatScore == null || isNaN(sprite.heatScore)) return;
  
        const heatLabel = new PIXI.BitmapText({
          text: Math.round(sprite.heatScore).toString(),
          style: {
            fontName: "Roboto Mono SemiBold",
            fontSize: 400,
          }
        });
  
        heatLabel.x = sprite.x //- sprite.width / 2;
        heatLabel.y = sprite.y //+ sprite.height / 2;
        heatLabel.anchor = { x: 0.5, y: 0.5 };
        heatLabel.scale.x = -1;
        heatLabel.tint = 0x000000;
  
        if (sprite.locationKey?.endsWith("-2")) {
          layer2Container.addChild(heatLabel);
        } else {
          labelLayer.addChild(heatLabel);
        }
      });
    }
  }
  