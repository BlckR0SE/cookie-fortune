// Desktop pointer? (hover + fine pointer = cursor/magnetic devices; coarse = touch)
export const finePointer = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Split text into word>char spans for kinetic reveals. Returns char elements.
// ponytail: no SplitText (club plugin) — this 15-line splitter covers word-wrap-correct char reveals.
// Upgrade path: swap to SplitText if GSAP club ever lands in budget.
export function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? "";
  el.textContent = "";
  el.setAttribute("aria-label", text);
  const chars: HTMLElement[] = [];
  for (const word of text.split(" ")) {
    const w = document.createElement("span");
    w.className = "kw";
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) {
      const c = document.createElement("span");
      c.className = "kc";
      c.textContent = ch;
      w.appendChild(c);
      chars.push(c);
    }
    el.appendChild(w);
    el.appendChild(document.createTextNode(" "));
  }
  return chars;
}
