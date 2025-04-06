// CoilUtils.js

/**
 * Returns a simple {x, y, z} position from a coil object.
 */
export function getPosition(coil) {
    return {
      x: coil.coord_x,
      y: coil.coord_y,
      z: coil.coord_z,
    };
  }
  
  /**
   * Returns true if the coil is flagged as stainless.
   */
  export function isStainless(coil) {
    return coil.flag_stainless === 'Y';
  }
  
  /**
   * Returns true if the coil is on hold.
   */
  export function isOnHold(coil) {
    return coil.on_hold === 'Y';
  }
  
  /**
   * Returns true if the coil is restricted for movement or use.
   */
  export function isLocked(coil) {
    return coil.locked_for_rules === 'Y' || coil.hard_restriction === 'Y';
  }
  
  /**
   * Returns a basic display name or label for UI/debugging.
   */
  export function getDisplayName(coil) {
    return `${coil.material_id} (${coil.width}mm × ${coil.thickness}mm)`;
  }
  
  /**
   * Returns the steel grade or fallback info.
   */
  export function getGrade(coil) {
    return coil.internal_steelgrade || coil.internal_order_grade || 'Unknown';
  }
  
  /**
   * Checks if coil is suitable for automatic handling.
   */
  export function isAutomatic(coil) {
    return coil.suitable_for_automatic === 'Y';
  }
  
  /**
   * Parses raw coil data and adds computed props if needed.
   */
  export function hydrateCoil(coil) {
    return {
      ...coil,
      position: getPosition(coil),
      isStainless: isStainless(coil),
      isLocked: isLocked(coil),
      isOnHold: isOnHold(coil),
      displayName: getDisplayName(coil),
      locationKey: `${coil.bay}-${coil.area}-${coil.rowname}-${coil.location}-${coil.layer}`,
    };
  }
  