import { continueRender, delayRender, staticFile } from "remotion";

export const fontFamily = "Montserrat";
const handle = delayRender("fonts");
Promise.all(
  [700, 900].map((w) => {
    const face = new FontFace(fontFamily, `url(${staticFile(`fonts/montserrat-${w}.ttf`)}) format("truetype")`, { weight: String(w) });
    return face.load().then((f) => document.fonts.add(f));
  }),
)
  .then(() => continueRender(handle))
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
