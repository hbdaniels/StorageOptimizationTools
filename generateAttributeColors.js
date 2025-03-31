import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chroma from "chroma-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Load JSON manually using fs.readFileSync
const available = JSON.parse(fs.readFileSync(path.join(__dirname, "/jsonFiles/available_attributes.json"), "utf-8"));
const existingColors = JSON.parse(fs.readFileSync(path.join(__dirname, "/jsonFiles/attribute_colors.json"), "utf-8"));

const colorMap = { ...existingColors };

function generateRandomPastelHex() {
  const r = Math.floor(Math.random() * 127 + 127);
  const g = Math.floor(Math.random() * 127 + 127);
  const b = Math.floor(Math.random() * 127 + 127);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function generateSaturatedColor(index) {
    const hue = (index * 137.508) % 360; // Golden angle in degrees
    const saturation = 85; // High saturation
    const lightness = 50;  // Medium lightness for good contrast
    return `hsl(${Math.floor(hue)}, ${saturation}%, ${lightness}%)`;
  }

  function generateSaturatedColorHEX(index) {
    const hue = (index * 137.508) % 360;
    return chroma.hsl(hue, 0.85, 0.5).hex();
  }
  
let added = 0;

let index = Object.keys(colorMap).length;

available.results[0].items.forEach(attr => {
  const id = attr.id.toString();
  if (!colorMap[id]) {
    colorMap[id] = generateSaturatedColorHEX(index++);
    added++;
  }
});

const outPath = path.join(__dirname, "/jsonFiles/attribute_colors.json");
fs.writeFileSync(outPath, JSON.stringify(colorMap, null, 2));

if (added > 0) {
  console.log(`✅ Added ${added} new hex color(s) to attribute_colors.json`);
} else {
  console.log("✅ attribute_colors.json is already up to date");
}
