import attributesRaw from "../jsonFiles/storage_location_attributes.json";
import availableAttributes from "../jsonFiles/available_attributes.json";
import attributeColors from "../jsonFiles/attribute_colors.json";

export default function attributeHandler(rackrow_subs) {
  const attributeRows = attributesRaw.results[0].items;
  this.attributeMap = new Map();
  this.attributeMeta = new Map();

  availableAttributes.results[0].items.forEach(attr => {
    //const storedColors = JSON.parse(localStorage.getItem("attributeColors") || "{}");

availableAttributes.results[0].items.forEach(attr => {
  //const color = storedColors[attr.id] || getRandomColor(); // fallback if not set
  const color = attributeColors[attr.id] || getRandomColor();
  this.attributeMeta.set(attr.id, {
    name: attr.attribute,
    description: attr.description,
    color: color
  });
});
  });

  attributeRows.forEach(row => {
    const parts = row.storage_location.split(":");
    const bay = parts[2];
    const area = parts[3];
    const rowName = parts[4];
    const locNumber = parts[5];
    const startIndex = parseInt(parts[5]);
    const layer = parts[6];
    const endIndex = parseInt(parts[9]);

    // Full-area attribute (no row specified, location 0:0)
    if (!rowName && startIndex === 0 && layer === "0" && isNaN(endIndex)) {
      rackrow_subs.filter(rack => rack.area === area && rack.bay === bay).forEach(rack => {
        for (let i = rack.from_location; i <= rack.to_location; i++) {
          const locKey = `${rack.bay}-${rack.area}-${rack.rowname}-${i}`;
          if (!this.attributeMap.has(locKey)) this.attributeMap.set(locKey, []);
          this.attributeMap.get(locKey).push({ attributeId: row.attribute_id, raw: row });
        }
      });
      return; // prevent fallthrough
    }

    if (!rowName || isNaN(startIndex)) return;

    // Whole-row attribute (location 0:0 and no endIndex)
    if (startIndex === 0 && layer === "0" && isNaN(endIndex)) {
      rackrow_subs.filter(rack => rack.rowname === rowName && rack.area === area && rack.bay === bay).forEach(rack => {
        for (let i = rack.from_location; i <= rack.to_location; i++) {
          const locKey = `${bay}-${area}-${rowName}-${i}`;
          if (!this.attributeMap.has(locKey)) this.attributeMap.set(locKey, []);
          this.attributeMap.get(locKey).push({ attributeId: row.attribute_id, raw: row });
        }
      });
    } else if (!isNaN(endIndex) && endIndex >= startIndex) {
      for (let i = startIndex; i <= endIndex; i++) {
        const locKey = `${bay}-${area}-${rowName}-${i}`;
        if (!this.attributeMap.has(locKey)) this.attributeMap.set(locKey, []);
        this.attributeMap.get(locKey).push({ attributeId: row.attribute_id, raw: row });
      }
    } else {
      const locKey = `${bay}-${area}-${rowName}-${startIndex}`;
      if (!this.attributeMap.has(locKey)) this.attributeMap.set(locKey, []);
      this.attributeMap.get(locKey).push({ attributeId: row.attribute_id, raw: row });
    }


      
  });
  function getRandomColor() {
    return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  }
  
  this.setAttributeColor = (attrId, color) => {
    const meta = this.attributeMeta.get(attrId);
    if (meta) {
      meta.color = color;
  
      // Save updated map to localStorage
      const colorMap = {};
      this.attributeMeta.forEach((value, id) => {
        colorMap[id] = value.color;
      });
      localStorage.setItem("attributeColors", JSON.stringify(colorMap));
    }
  };

  this.saveColorsToFile = () => {
    const colorMap = {};
    this.attributeMeta.forEach((meta, id) => {
      colorMap[id] = meta.color;
    });

    const blob = new Blob(
      [JSON.stringify(colorMap, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attribute_colors.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  
}