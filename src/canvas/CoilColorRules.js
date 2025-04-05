export const coilColorRules = [
    // {
    //   name: "Stainless Steel",
    //   condition: coil => coil.flag_stainless === "Y",
    //   color: "#d4d4d4",
    //   enabled: true
    // },
    // {
    //   name: "Hot Rolled HRP",
    //   condition: coil => coil.prod_group === "HRP",
    //   color: "#ff7f50",
    //   enabled: true
    // },
    // {
    //   name: "Oiled Material",
    //   condition: coil => coil.oiled === "Y",
    //   color: "#3fb950",
    //   enabled: true
    // },
    {
        name: "Coil On Hold",
        condition: coil => coil.on_hold === "Y",
        color: "#feff00",
        enabled: true,
        priority: 1
    },
    {
        name: "Succesive Plant Code",
        condition: coil => coil.succesive_plant_code === "SLH",
        color: "#ff80bf",
        enabled: true,
        priority: 2
    },
    {
        name: "Succesive Plant Code",
        condition: coil => coil.succesive_plant_code === "PACK",
        color: "#d4d4d4",
        enabled: true,
        priority: 3
    },
    {
        name: "Coil Is Scrap",
        condition: coil => coil.scrap_index === "Y",
        color: "#400001",
        enabled: true,
        priority: 4
    },
    {
        name: "Is Secondary",
        condition: coil => coil.material_type === "2",
        color: "#3f0101",
        enabled: true,
        priority: 5
    },
    {
        name: "Batch Anneal",
        condition: coil => coil.succesive_plant_code === "ANBA",
        color: "#45008b",
        enabled: true,
        priority: 6
    },
    {
        name: "CPL",
        condition: coil => coil.succesive_plant_code === "CPL",
        color: "#962fff",
        enabled: true,
        priority: 7
    }
    ,
    {
        name: "PLTCM",
        condition: coil => coil.succesive_plant_code === "PLTCM",
        color: "#00feff",
        enabled: true,
        priority: 8
    },
    {
        name: "Truck External",
        condition: coil => coil.transport_mode === "TRUCK_EXTERNAL",
        color: "#ff8a16",
        enabled: true,
        priority: 9
    },
    {
        name: "Rail Planned",
        condition: coil => coil.transport_mode_order === "RAILCAR",
        color: "#005927",
        enabled: true,
        priority: 10
    },
    {
        name: "Barge Planned",
        condition: coil => coil.transport_mode_order === "BARGE_INCOMING",
        color: "#0052a6",
        enabled: true,
        priority: 11
    },
    {
        name: "Barge",
        condition: coil => coil.packaging_type === "NL" || coil.packaging_type === "NV",
        color: "#3f9fff",
        enabled: true,
        priority: 12
    }
    
    

  ];
  