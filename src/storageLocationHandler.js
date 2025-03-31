import rackrow_sub from "../jsonFiles/storagelocation_rackrow_sub.json"
import * as PIXI from "pixi.js";

export default function storageLocationHandler(){
    const storageLocations = [];
   
    this.init = function(){
        const g = new PIXI.Graphics();
        g.beginFill(0xFFFFFF);
        g.lineStyle(1, 0x000000);
        g.drawRect(0, 0, 1230, 600);
        g.endFill();
        let locationTexture = app.renderer.generateTexture(g);

        const rackrow_subs = rackrow_sub.results[0].items
        console.log(rackrow_subs);

        rackrow_subs.forEach(rack => {
            const maxLocations = 200;
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
                viewport.addChild(sprite);
            
                if (i === 0) firstSprite = sprite;
                if (i === locCount - 1) lastSprite = sprite;
                sprite.eventMode = "static";
                sprite.cursor = "pointer";
                sprite.on("pointerdown", () => {

                    spriteOnClick(sprite);
                  });
              }
        });
          

    }
    this.getLocationData = function(locationKey){
        return locationMap.get(locationKey);
    }
    
}