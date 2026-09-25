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


const appPath = new URL('./App.tsx', import.meta.url);
let app = fs.readFileSync(appPath, 'utf8');

// Do not import the game stack while the intro is running.
// GameScreen pulls in Skia, fonts, haptics and gameplay audio; loading all of
// those native modules during the intro can crash some Android release builds
// before the first frame is stable. The game module is required only after the
// intro has finished.
app = app.replace(
  "import GameScreen from './src/GameScreen';\n",
  ''
);
app = app.replace(
  "export default function App() {\n",
  "let GameScreenModule: typeof import('./src/GameScreen') | null = null;\n\nconst getGameScreen = () => {\n  GameScreenModule ??= require('./src/GameScreen');\n  return GameScreenModule.default;\n};\n\nexport default function App() {\n"
);
app = app.replace(
  "        {/* oyun intro sırasında arkada yüklenir, geçişte bekleme olmaz */}\n        {phase !== 'loading' && <GameScreen visible={phase === 'game'} onReady={gameReady} />}\n",
  "        {phase === 'game' && (() => {\n          const GameScreen = getGameScreen();\n          return <GameScreen visible onReady={gameReady} />;\n        })()}\n"
);
fs.writeFileSync(appPath, app);

console.log('Runtime fix updated: game native stack is lazy-loaded after intro.');
