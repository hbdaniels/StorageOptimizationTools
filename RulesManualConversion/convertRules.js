import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch'; // ⚠️ npm install node-fetch@2 if needed

const outputPath = './parsed_storage_rules.json';
const nodeRedUrl = 'http://srcvsfdcap186:1880/getStorageRules';

function cleanXml(xml) {
    const start = xml.indexOf('<Rules>');
    if (start >= 0) {
      xml = xml.slice(start);
    }
  
    // Fix unescaped ampersands (&), but NOT already encoded ones
    xml = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
  
    // Fix unescaped < and > inside element content (but not actual tags)
    const tagNames = ['Condition', 'Comment', 'Action', 'Restriction'];
  
    for (const tag of tagNames) {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
      xml = xml.replace(regex, (_, content) => {
        const safeContent = content
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<${tag}>${safeContent}</${tag}>`;
      });
    }
  
    return xml.trim();
  }
  
async function convertFromJsonWithXml() {
    try {
      console.log(`📡 Fetching rule data from Node-RED at ${nodeRedUrl}...`);
      const response = await fetch(nodeRedUrl, { method: 'POST' });
      const full = await response.json();
      //console.log(full);
  
      let existing = [];
      if (fs.existsSync(outputPath)) {
        const rawExisting = fs.readFileSync(outputPath, 'utf-8');
        try {
          existing = JSON.parse(rawExisting);
        } catch (err) {
          console.warn("⚠️ Could not parse existing JSON, starting fresh.");
        }
      }
  
      for (const row of full.rows) {
        const rawXml = row.RULES;
        const xml = cleanXml(rawXml);
  
        let parsed;
        try {
          parsed = await parseStringPromise(xml, { explicitArray: false });
        } catch (xmlErr) {
          console.warn(`⚠️ Skipping rule "${row.NAME}" (ID ${row.RULEID}) due to XML error:`, xmlErr.message);
          continue;
        }
  
        const rules = parsed?.Rules?.Element
          ? Array.isArray(parsed.Rules.Element)
            ? parsed.Rules.Element
            : [parsed.Rules.Element]
          : [];
  
        const groupedRule = {
          name: row.NAME,
          ruleid: row.RULEID,
          bay: row.BAY,
          mainarea: row.MAINAREA,
          color: `rgb(${row.COLOR_R},${row.COLOR_G},${row.COLOR_B})`,
          enabled: 'true',
          rules: rules.map(flattenRule),
        };
  
        existing.push(groupedRule);
      }
  
      fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2));
      console.log(`✅ Appended ${full.rows.length} rule sets to ${outputPath}`);
    } catch (err) {
      console.error("❌ Error converting rules:", err);
    }
  }

function flattenRule(element, depth = 0) {
  const rule = {
    enabled: element.Enabled || 'true',
    condition: element.Condition || undefined,
    action: element.Action || undefined,
    restriction: element.Restriction || undefined,
    restrictiontype: element.RestrictionType || undefined,
    comment: element.Comment || undefined,
    then: element.Then && element.Then.Element
      ? flattenRule(element.Then.Element, depth + 1)
      : undefined,
    else: element.Else && element.Else.Element
      ? flattenRule(element.Else.Element, depth + 1)
      : undefined,
  };

  return rule;
}

convertFromJsonWithXml();
