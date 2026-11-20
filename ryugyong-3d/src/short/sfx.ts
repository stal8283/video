// Sound: one cue per on-screen action (the person asked for every movement to have a sound), each anchored to the
// word that triggers it, plus one ambience bed per shot. Files are peak-normalised to -6 dBFS; G sets the level so
// effects peak roughly 8-10 dB under the voice (the skill's SFX rule); beds sit ~14 dB under.
import { SHOTS } from "../plan.gen";
import { at, endOf } from "./words";

export type Cue = { at: number; file: string; vol: number; dur?: number; what: string };
export type Bed = { from: number; to: number; file: string; vol: number };
const G = 0.5;
const fr = (n: number) => n / 30;
const cues: Cue[] = [];
const c = (t: number, file: string, rel: number, what: string, dur?: number) => cues.push({ at: t, file, vol: G * rel, what, dur });
const shot = (id: string) => SHOTS.find((s) => s.id === id)!;
const whoosh = (id: string) => c(shot(id).t - 0.3, "pan_whoosh", 0.55, `push-through into ${id}`);

// S01 hook: the Guest walks in pulling the suitcase
c(0.0, "suitcase_roll", 0.8, "suitcase wheels", 2.4);
c(0.05, "footsteps", 0.8, "footsteps (1)"); c(0.9, "footsteps", 0.7, "footsteps (2)"); c(1.8, "footsteps", 0.6, "footsteps (3)");
c(at("korea") - 0.2, "pan_whoosh", 0.45, "crane up to the pyramid");
c(at("guest") - 0.05, "punch_whoosh", 0.6, "punch-in on 'guest'");
// S02 lobby: dial counts, ding, dolly to the keys, skit 1
whoosh("S02");
c(at("one"), "counter_ticks", 0.8, "floor dial counts 1 to 105", at("floors") - at("one"));
c(at("floors"), "elevator_ding", 0.9, "dial lands on 105");
c(at("zero") - fr(6), "pan_whoosh", 0.5, "dolly to the key rack");
c(at("zero") + 0.5, "ring_ping", 0.45, "lands on the full key rack");
c(at("do") - 0.15, "desk_bell", 0.8, "Guest rings the desk bell");
c(at("do") - fr(6), "pan_whoosh", 0.4, "pull out to the two-shot");
c(at("do"), "arm_swish", 0.6, "Guest gestures");
c(at("we"), "head_turn", 0.6, "Clerk turns");
c(at("we") + 0.1, "arm_swish", 0.6, "Clerk points at the keys");
c(at("so", 1), "arm_swish", 0.6, "Guest gestures");
c(at("so", 1) + 0.15, "sparkle", 0.7, "Guest lights up");
c(at("no") - 0.05, "head_turn", 0.55, "Clerk's deadpan tilt");
c(at("no") - 0.03, "punch_whoosh", 0.55, "punch-in on 'No.'");
c(endOf("no") + 0.05, "crickets", 0.55, "awkward silence", 0.9);
// S03 the twist: the lights switch on
whoosh("S03");
c(at("lights") - 0.1, "led_switch_on", 0.9, "LED rows sweep on");
c(at("lights") + fr(4), "surprise_boing", 0.6, "passer-by startled");
c(at("lights") - fr(6), "pan_whoosh", 0.45, "crane up");
c(at("show") - fr(6), "pan_whoosh", 0.35, "orbit");
// S04 the blueprint
whoosh("S04");
c(at("so", 2) - 0.1, "paper_unroll", 0.8, "blueprint unrolls");
c(at("build"), "pencil_circle", 0.8, "red pencil circles the inside");
c(at("why", 2) - fr(6), "pan_whoosh", 0.35, "orbit");
// S05 Singapore 1986
whoosh("S05");
c(at("singapore") + 0.1, "banner_flutter", 0.7, "TALLEST HOTEL banner drops in");
c(at("opens") - 0.1, "small_cheer", 0.6, "doorman cheers, confetti");
c(at("tallest", 2) - 0.15, "footsteps", 0.6, "doorman hops");
c(at("tallest", 2) - fr(6), "pan_whoosh", 0.45, "crane up the tower");
c(at("south") - fr(6), "pan_whoosh", 0.35, "pull out");
// S06 the models
whoosh("S06");
c(at("taller") - 0.12, "grow_rumble", 0.8, "pyramid model grows taller");
c(at("one", 2) - 0.03, "punch_whoosh", 0.5, "punch-in");
// S07 1987: floors stack up
whoosh("S07");
c(at("work"), "crane_hum", 0.6, "crane winches the floors");
[0, 10, 15, 18, 21, 24, 26, 28, 30, 32].forEach((g, i) => c(at("work") + fr(g), "slab_thud", i === 0 ? 0.85 : 0.55, `floor ${i + 1} lands`, 0.35));
c(at("starts"), "arm_swish", 0.5, "builder points up");
// S08 1992: work stops, the banner falls, the wind
whoosh("S08");
c(at("ninety-two") - 0.05, "punch_whoosh", 0.4, "push on 1992");
c(at("collapsed") - 0.2, "banner_flutter", 0.8, "USSR banner tears loose");
c(at("collapsed") + 0.2, "soft_thud", 0.9, "banner hits the ground");
c(at("collapsed") + 0.2, "dust_puff", 0.7, "dust puff");
c(at("sixteen") - 0.1, "paper_rustle", 0.6, "debris blows across");
c(at("bare") - fr(6), "pan_whoosh", 0.35, "orbit");
// S09 2011: the glass climbs
whoosh("S09");
{ const g0 = at("egyptian"), g1 = at("glass"); for (let k = 1; k <= 10; k++) c(g0 + Math.pow(k / 10, 1 / 0.7) * (g1 - g0), "glass_clink", k === 10 ? 0.85 : 0.5, `glass tier ${k} clicks in`); }
c(at("egyptian") - fr(6), "pan_whoosh", 0.4, "crane up with the glass");
c(at("glass") + 0.1, "ring_ping", 0.5, "glass complete, crane gone");
// S10 the present
whoosh("S10");
c(at("shiny"), "glint_chime", 0.8, "glint sweeps the paper");
c(at("empty", 1), "box_lid", 0.9, "lid lifts");
c(at("empty", 1) - 0.03, "punch_whoosh", 0.5, "punch-in on 'Empty'");
c(at("empty", 1) + fr(4), "dust_puff", 0.6, "dust puff from the box");
c(at("empty", 1) + 0.25, "moth_flutter", 0.7, "a moth flies out");
// S11 2012
whoosh("S11");
c(at("hotel", 3), "banner_flutter", 0.7, "OPENING 2013 banner slides in");
c(at("signs"), "pen_sign", 0.9, "contract signed");
c(at("signs") + 0.1, "clipboard_flip", 0.7, "paper flips");
c(at("signs") + 0.12, "sparkle", 0.6, "the Clerk smiles");
c(at("months"), "paper_rip", 0.9, "calendar page rips");
c(at("later"), "footsteps", 0.8, "Exec walks out (1)"); c(at("later") + 0.45, "footsteps", 0.7, "Exec walks out (2)");
c(at("out", 2) - 0.12, "banner_flutter", 0.7, "banner falls");
c(at("out", 2) + 0.3, "soft_thud", 0.8, "banner lands");
// S12 skit 2
c(at("opening") - 0.2, "desk_bell", 0.7, "desk bell again");
c(at("opening"), "arm_swish", 0.55, "Guest gestures");
c(at("soon", 1) - 0.05, "head_turn", 0.55, "Clerk tilts");
c(at("which"), "arm_swish", 0.55, "Guest gestures");
c(at("which") + 0.1, "sweat_bloop", 0.7, "sweat drop");
c(at("soon", 2) - 0.05, "head_turn", 0.55, "Clerk tilts");
c(at("soon", 2) - 0.03, "punch_whoosh", 0.5, "punch-in on '...Soon.'");
c(endOf("soon", 2) + 0.02, "crickets", 0.55, "awkward silence", 0.6);
// S13 payoff
whoosh("S13");
c(at("hundred", 3), "counter_ticks", 0.6, "LEDs counting on", 1.0);
c(at("switch") - 0.08, "led_switch_on", 0.95, "100,000 lights switch on");
c(at("switch") + 0.3, "twinkle_rise", 0.6, "green motes rise");
c(at("switch") - fr(6), "pan_whoosh", 0.45, "crane up");
c(at("flag"), "glint_chime", 0.7, "the flag glows");
c(at("every", 2) - fr(6), "pan_whoosh", 0.3, "orbit");
export const CUES = cues.sort((a, b) => a.at - b.at);

const bedFor: Record<string, [string, number][]> = {
  S01: [["amb_night_street", 0.22], ["led_buzz", 0.12]], S02: [["amb_lobby", 0.25]], S03: [["amb_night_street", 0.22]],
  S04: [["amb_room", 0.2]], S05: [["amb_singapore", 0.22]], S06: [["amb_room", 0.2]], S07: [["amb_construction", 0.22]],
  S08: [["amb_wind_city", 0.25]], S09: [["amb_day_city", 0.22]], S10: [["amb_room", 0.2]], S11: [["amb_lobby_day", 0.22]],
  S12: [["amb_lobby", 0.25]], S13: [["amb_night_street", 0.22]],
};
export const BEDS: Bed[] = SHOTS.flatMap((s) => (bedFor[s.id] ?? []).map(([file, vol]) => ({ from: Math.max(0, s.t - 2 / 30), to: s.end - 2 / 30, file, vol })));
// the LED hum once the lights are on
BEDS.push({ from: at("lights"), to: shot("S03").end, file: "led_buzz", vol: 0.14 }, { from: at("switch"), to: shot("S13").end, file: "led_buzz", vol: 0.14 });
