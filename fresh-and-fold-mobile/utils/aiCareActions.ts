export const AI_CARE_ACTIONS = [
  { key: "smart_scan", title: "Smart Scan", copy: "Use a photo to identify garments for your review.", icon: "document-scanner", route: "/smart-scan", primary: true },
  { key: "stain_detection", title: "Stain Detection", copy: "Use a photo for cautious stain and cleaning guidance.", icon: "search", route: "/stain-scan", primary: false },
  { key: "fabric_identification", title: "Fabric Identification", copy: "Use a photo for cautious fabric and care guidance.", icon: "texture", route: "/fabric-scan", primary: false },
  { key: "care_label_reader", title: "Care Label Reader", copy: "Read visible care-label text and symbols for your review.", icon: "local-laundry-service", route: "/care-label-scan", primary: false },
] as const;
