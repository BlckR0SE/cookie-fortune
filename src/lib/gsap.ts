// GSAP core + ScrollTrigger + useGSAP, registered once. ~40KB gzip — the only
// animation lib; everything else is CSS/SVG/Canvas. SplitText/MorphSVG are club
// plugins — not used; text reveals are manual char/word splitting.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Awwwards-standard defaults
gsap.defaults({ ease: "power3.out" });
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, useGSAP };
