// heatmap.js
import chroma from "chroma-js";

export function runHeatmap({
  rules,
  ruleName = "Unknown",
  color = "#ff0000",
  locationMap,
  evaluateRule,
  colorScale,
  renderBitmapLabels
}) {
  let minScore = Infinity;
  let maxScore = -Infinity;

  locationMap.forEach(sprite => {
    const parts = sprite.locationKey.split("-");
    const [bay, area, row, locStr, layerStr] = parts;
    const loc = parseInt(locStr);
    const layer = parseInt(layerStr || "1");

    const context = {
      StorageLocation: sprite,
      Row: row,
      Location: loc,
      Layer: layer,
      Order: { Rulename: ruleName }
    };

    let score = 0;
    for (const rule of rules) {
      const result = evaluateRule(rule, context);
      if (typeof result === "number") {
        score += result;
      }
    }

    if (score !== 0) {
      sprite.heatScore = score;
      minScore = Math.min(minScore, score);
      maxScore = Math.max(maxScore, score);
    } else {
      sprite.heatScore = null;
    }
  });

  locationMap.forEach(sprite => {
    if (sprite.heatScore != null) {
      const t = (sprite.heatScore - minScore) / (maxScore - minScore + 0.0001);
      sprite.tint = parseInt(colorScale(sprite.heatScore).hex().substring(1), 16);
    } else {
      sprite.tint = 0xcccccc;
    }
  });

  // ✅ Trigger label rendering
  if (typeof renderBitmapLabels === 'function') {
    renderBitmapLabels();
  }
}
