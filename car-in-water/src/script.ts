// The full voiceover. Scenes are anchored to words in this text, so the
// visuals re-sync automatically whenever the voiceover is regenerated.
export const SCRIPT = `If your car goes off a bridge into a river, do not call 911.
Picture this. You're driving home over the river, rain on the windshield, coffee in the cup holder.
Then a truck clips your back bumper, and suddenly, you're flying.
The car slams into the water... and floats. You're fine. You're actually fine.
So you do what any responsible person would do. You grab your phone, and dial 911.
The dispatcher asks where you are. And while you're trying to remember the name of the bridge, the water quietly climbs past your door handle.
Now you push the door. It won't move. Not even an inch.
Wait, what?
You see, a sinking car only floats for about one minute. Once water climbs the outside of the door, it pushes harder than you could ever push back.
And the nearest ambulance? Usually more than eight minutes away.
That's why rescue experts teach one rule. Seatbelt off. Window open. Kids out first. Then you.
And if the window is stuck, smash the side glass. Never the windshield. It's built not to break.
Because 911 can't reach you in one minute. But you can reach the window.`;

export const WORDS = SCRIPT.split(/\s+/).filter(Boolean);

// Each scene starts on the first word of its anchor phrase (searched in order).
export const SCENES = [
  { id: "hook", anchor: "If your car" },
  { id: "driving", anchor: "Picture this." },
  { id: "truck", anchor: "Then a truck" },
  { id: "float", anchor: "The car slams" },
  { id: "phone", anchor: "So you do" },
  { id: "rising", anchor: "The dispatcher asks" },
  { id: "door", anchor: "Now you push" },
  { id: "wait", anchor: "Wait, what?" },
  { id: "minute", anchor: "You see," },
  { id: "ambulance", anchor: "And the nearest" },
  { id: "rule", anchor: "That's why rescue" },
  { id: "glass", anchor: "And if the window" },
  { id: "escape", anchor: "Because 911" },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

export const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

export function findAnchor(words: string[], anchor: string, from = 0) {
  const a = anchor.split(/\s+/).map(norm);
  for (let i = from; i < words.length; i++) {
    if (a.every((t, k) => norm(words[i + k] ?? "") === t)) return i;
  }
  throw new Error(`Anchor not found: ${anchor}`);
}
