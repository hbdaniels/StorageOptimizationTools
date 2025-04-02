export function renderAttributePanel({
    attrHandler,
    locationMap,
    attributeMeta,
    onToggleAttribute,
    onUpdateColor
  }) {

    function renderAttributList() {
        const attributeListEl = document.getElementById("attribute-panel");
        attributeListEl.innerHTML = "";
      
        const groupedAttrs = groupAttributesByBay(attrHandler.attributeMeta);
        Object.entries(groupedAttrs).forEach(([bay, attrs]) => {
          const sectionWrapper = document.createElement("div");
          sectionWrapper.classList.add("attribute-group");
      
          const header = document.createElement("div");
          header.classList.add("attribute-group-header");
          header.style.marginTop = "8px";
          
          // Use flex to lay things out: title left, checkbox+label right
          const headerWrapper = document.createElement("div");
          headerWrapper.style.display = "flex";
          headerWrapper.style.justifyContent = "space-between";
          headerWrapper.style.alignItems = "center";
          
          // 📌 Title: bay name, collapses group on click
          const titleWrapper = document.createElement("div");
          titleWrapper.style.flex = "1"; // take all available space
          titleWrapper.style.cursor = "pointer";
          titleWrapper.style.fontWeight = "bold";
          
          const titleSpan = document.createElement("span");
          titleSpan.textContent = `${bay} ▼`;
          
          titleWrapper.appendChild(titleSpan);
          titleSpan.style.cursor = "pointer";
          titleSpan.style.fontWeight = "bold";
          
        //   titleSpan.addEventListener("click", () => {
        //     const isVisible = body.style.display !== "none";
        //     body.style.display = isVisible ? "none" : "block";
        //     titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
        //   });
          titleWrapper.addEventListener("click", () => {
            const isVisible = body.style.display !== "none";
            body.style.display = isVisible ? "none" : "block";
            titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
          });
          
          // 📌 Right side: checkbox + label
          const checkAllContainer = document.createElement("div");
          checkAllContainer.style.display = "flex";
          checkAllContainer.style.alignItems = "center";
          checkAllContainer.style.gap = "6px";
          
          const checkAll = document.createElement("input");
          checkAll.type = "checkbox";
          checkAll.id = `check-all-${bay}`;
          
          const checkAllLabel = document.createElement("label");
          checkAllLabel.htmlFor = checkAll.id;
          checkAllLabel.textContent = "Check All";
          
          checkAll.addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            attrs.forEach(({ id }) => {
              const cb = document.getElementById(`attr-${id}`);
              if (cb) {
                cb.checked = isChecked;
                cb.dispatchEvent(new Event("change"));
              }
            });
          });
          
          checkAllContainer.appendChild(checkAll);
          checkAllContainer.appendChild(checkAllLabel);
          
          // Put title on left, checkbox group on right
          headerWrapper.appendChild(titleSpan);
          headerWrapper.appendChild(checkAllContainer);
          
          header.appendChild(headerWrapper);
      
          const body = document.createElement("div");
          body.classList.add("attribute-group-body");
      
          // Sort attributes alphabetically
          attrs.sort((a, b) => a.name.localeCompare(b.name));
      
          attrs.forEach(({ id, name, color }) => {
            const container = document.createElement("div");
            container.style.display = "flex";
            container.style.alignItems = "center";
            container.style.gap = "8px";
            container.style.marginBottom = "6px";
      
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `attr-${id}`;
            checkbox.dataset.attrId = id;
      
            checkbox.addEventListener("change", (e) => {
              const attrId = parseInt(e.target.dataset.attrId);
              onToggleAttribute(attrId, e.target.checked);
            });
      
            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.textContent = name;
            label.style.flex = "1";
      
            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = color;
      
            colorInput.addEventListener("input", (e) => {
              const newColor = e.target.value;
              if (color === newColor) return;
              attrHandler.setAttributeColor(`attr-color-${id}`, newColor);
              localStorage.setItem(`attr-color-${id}`, newColor);
              onUpdateColor(parseInt(e.target.dataset.attrId), newColor);
            });
      
            container.appendChild(colorInput);
            container.appendChild(checkbox);
            container.appendChild(label);
            body.appendChild(container);
          });
          titleSpan.addEventListener("click", () => {
            const isVisible = body.style.display !== "none";
            body.style.display = isVisible ? "none" : "block";
            titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
          });
        //   header.addEventListener("click", () => {
        //     const isVisible = body.style.display !== "none";
        //     body.style.display = isVisible ? "none" : "block";
        //     titleSpan.textContent = `${bay} ${isVisible ? '▶' : '▼'}`;
        //   });
      
          sectionWrapper.appendChild(header);
          sectionWrapper.appendChild(body);
          attributeListEl.appendChild(sectionWrapper);
        });
      }

      function groupAttributesByBay(attributeMetaMap) {
        const grouped = {};
        attributeMetaMap.forEach((meta, id) => {
          const bay = meta.name.includes("ST21") ? "ST21" : meta.name.includes("ST22") ? "ST22" : "Other";
          if (!grouped[bay]) grouped[bay] = [];
          grouped[bay].push({ id, ...meta });
        });
        return grouped;
      }

      
      

    //   function updateAttributeColor(attrId, color) {
    //     locationMap.forEach(sprite => {
    //       if (sprite.attributes && sprite.attributes.some(a => a.id === attrId)) {
    //         if (sprite.visible) sprite.tint = color;
    //         sprite.attributes.color = color;
    //       }
    //     });
    //   }

    //   function toggleAttributeVisibility(attrId, visible) {
    //     if (visible) {
    //       visibleAttributes.add(attrId);
    //     } else {
    //       visibleAttributes.delete(attrId);
    //     }
    //     locationMap.forEach(sprite => {
    //       if (!sprite.attributes || sprite.attributes.length === 0) return;
      
    //       const visibleAttrs = sprite.attributes.filter(a => visibleAttributes.has(a.id));
      
    //       if (visibleAttrs.length === 0) {
    //         sprite.tint = 0xFFFFFF;
    //       } else {
    //         const hexColors = visibleAttrs.map(a =>
    //           attrHandler.attributeMeta.get(a.id)?.color || "#00cc66"
    //         );
    //         sprite.tint = blendColors(hexColors);
    //       }
    //     });
    //   }

      renderAttributList();

  }

  export function renderLocationAttributeSummary({
    containerEl,
    attributes,
    attrHandler,
    onToggleAttribute
  }) {
    containerEl.innerHTML = "";
  
    attributes.forEach(attr => {
      const meta = attrHandler.attributeMeta.get(attr.id);
      if (!meta) return;
  
      const row = document.createElement("div");
      row.classList.add("location-attr-row");
  
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = document.getElementById(`attr-${attr.id}`)?.checked || false;
      checkbox.dataset.attrId = attr.id;
  
      // Sync toggle with global list
      checkbox.addEventListener("change", (e) => {
        const checked = e.target.checked;
        const attrId = parseInt(e.target.dataset.attrId);
  
        // Fire same handler
        onToggleAttribute(attrId, checked);
  
        // Sync other checkboxes
        document.querySelectorAll(`[data-attr-id="${attrId}"]`).forEach(cb => {
          if (cb !== checkbox) cb.checked = checked;
        });
      });
  
      const swatch = document.createElement("span");
      swatch.className = "color-swatch";
      swatch.style.backgroundColor = meta.color || "#ccc";
  
      const label = document.createElement("label");
      label.textContent = meta.name;
      label.style.flex = "1";
  
      row.appendChild(checkbox);
      row.appendChild(swatch);
      row.appendChild(label);
      containerEl.appendChild(row);
    });
  }