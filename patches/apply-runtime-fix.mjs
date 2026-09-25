import fs from 'node:fs';

const introPath = new URL('./src/intro/AslanIntro.tsx', import.meta.url);
let intro = fs.readFileSync(introPath, 'utf8');

// Keep the intro visual exactly as-is, but avoid loading the native audio asset
// during the first render. expo-audio supports a null initial source and a
// later player.replace(), allowing the intro to render before audio decoding.
intro = intro.replace(
  "import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';\n",
  "import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';\n"
);
intro = intro.replace(
  "  const player = useAudioPlayer(require('./aslan-intro.m4a'));\n  const status = useAudioPlayerStatus(player);\n",
  "  const player = useAudioPlayer(null);\n  const status = useAudioPlayerStatus(player);\n  const introAudio = require('./aslan-intro.m4a');\n"
);
intro = intro.replace(
  "  // ses hazır olunca animasyonla aynı anda başlat: senkron kaymaz\n  useEffect(() => { if (status.isLoaded) start(); }, [status.isLoaded, start]);\n\n",
  "  // Start the visual intro first, then load/play its sound shortly after.\n  useEffect(() => {\n    if (muted) return;\n    const timer = setTimeout(() => {\n      try { player.replace(introAudio); } catch {}\n    }, 120);\n    return () => clearTimeout(timer);\n  }, [muted, player]);\n\n  useEffect(() => {\n    if (status.isLoaded && !muted) {\n      try { player.play(); } catch {}\n    }\n  }, [status.isLoaded, muted, player]);\n\n"
);
fs.writeFileSync(introPath, intro);

const feedbackPath = new URL('./src/game/feedback.ts', import.meta.url);
let feedback = fs.readFileSync(feedbackPath, 'utf8');
feedback = feedback.replace(
  "  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});\n  [...MESH, ...Object.values(OTHER)].forEach(s => {\n    if (players.has(s)) return;\n    try { players.set(s, createAudioPlayer(s)); } catch {}\n  });",
  "  // Gameplay players are created lazily on first gameplay sound.\n  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});"
);
fs.writeFileSync(feedbackPath, feedback);

console.log('Runtime audio fix applied: intro visuals preserved and intro sound lazy-loaded.');
