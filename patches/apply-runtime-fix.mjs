import fs from 'node:fs';

const introPath = new URL('./src/intro/AslanIntro.tsx', import.meta.url);
let intro = fs.readFileSync(introPath, 'utf8');

intro = intro.replace(
  "import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';\n",
  ''
);
intro = intro.replace(
  "  const player = useAudioPlayer(require('./aslan-intro.m4a'));\n  const status = useAudioPlayerStatus(player);\n",
  ''
);
intro = intro.replace(
  "  const cur = useRef({ muted, onDone, player });\n  useEffect(() => { cur.current = { muted, onDone, player }; });",
  "  const cur = useRef({ muted, onDone });\n  useEffect(() => { cur.current = { muted, onDone }; });"
);
intro = intro.replace(
  "    if (!cur.current.muted) cur.current.player.play();\n    anim.current?.play();",
  "    anim.current?.play();"
);
intro = intro.replace(
  "    // sessiz moddaysa ses çalmaz, kullanıcının müziğini de kesmez\n    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});\n",
  ''
);
intro = intro.replace(
  "  // ses hazır olunca animasyonla aynı anda başlat: senkron kaymaz\n  useEffect(() => { if (status.isLoaded) start(); }, [status.isLoaded, start]);\n\n",
  ''
);
intro = intro.replace("    player.pause();\n", '');
fs.writeFileSync(introPath, intro);

const feedbackPath = new URL('./src/game/feedback.ts', import.meta.url);
let feedback = fs.readFileSync(feedbackPath, 'utf8');
feedback = feedback.replace(
  "  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});\n  [...MESH, ...Object.values(OTHER)].forEach(s => {\n    if (players.has(s)) return;\n    try { players.set(s, createAudioPlayer(s)); } catch {}\n  });",
  "  // Native audio players are created lazily on first gameplay sound.\n  // This avoids Android release startup crashes on some devices.\n  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});"
);
fs.writeFileSync(feedbackPath, feedback);

console.log('Runtime startup audio fix applied.');
