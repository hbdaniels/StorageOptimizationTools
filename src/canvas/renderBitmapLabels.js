import * as PIXI from "pixi.js";

export function renderBitmapLabels({ rowLabelMeta, locationMap, labelLayer, zoomScale })
 {
    
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