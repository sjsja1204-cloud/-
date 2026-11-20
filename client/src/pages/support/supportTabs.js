import { menu } from "../../config/site";

export const supportTabs = menu.find((m) => m.label === "고객센터").children.map((c) => ({ label: c.label, to: c.to }));
