// GSAP core + ScrollTrigger + useGSAP, registered once. The only animation lib;
// everything else is CSS/SVG/Canvas. Lenis dropped per design_v2 §10 (native
// scroll + sticky mouth = the extrusion effect, no momentum fighting).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
gsap.defaults({ ease: "power3.out" });

export { gsap, ScrollTrigger, useGSAP };
