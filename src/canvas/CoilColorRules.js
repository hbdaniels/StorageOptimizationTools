export const coilColorRules = [
    {
      name: "Stainless Steel",
      condition: coil => coil.flag_stainless === "Y",
      color: "#d4d4d4",
      enabled: true
    },
    // {
    //   name: "Hot Rolled HRP",
    //   condition: coil => coil.prod_group === "HRP",
    //   color: "#ff7f50",
    //   enabled: true
    // },
    {
      name: "Oiled Material",
      condition: coil => coil.oiled === "Y",
      color: "#3fb950",
      enabled: true
    },
    {
        name: "Succesive Plant Code",
        condition: coil => coil.succesive_plant_code === "SLH",
        color: "#ff7f50",
        enabled: true
    },
    {
        name: "Succesive Plant Code",
        condition: coil => coil.succesive_plant_code === "PACK",
        color: "#d4d4d4",
        enabled: true
    }
  ];
  