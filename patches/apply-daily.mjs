import fs from 'node:fs';

const logicPath = new URL('./src/game/logic.ts', import.meta.url);
let logic = fs.readFileSync(logicPath, 'utf8');

if (!logic.includes("export type DailyDifficulty")) {
  const marker = "// ---------- oyun ----------";
  const insert = [
    "export type DailyDifficulty = 'Kolay' | 'Orta' | 'Zor' | 'Usta' | 'Manyak';",
    "export type GameMode = 'campaign' | 'daily';",
    "",
    "export const dailyDateKey = (now = new Date()) => now.toISOString().slice(0, 10);",
    "",
    "function hashText(value: string) {",
    "  let h = 2166136261 >>> 0;",
    "  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }",
    "  return h >>> 0;",
    "}",
    "",
    "export function dailyDifficulty(dateKey: string): DailyDifficulty {",
    "  return (['Kolay', 'Orta', 'Zor', 'Usta', 'Manyak'] as DailyDifficulty[])[hashText(dateKey) % 5];",
    "}",
    "",
    "export function cfgForDaily(dateKey: string): LevelCfg {",
    "  const rnd = rng(hashText('disli-daily:' + dateKey));",
    "  const difficulty = dailyDifficulty(dateKey);",
    "  const idx = difficulty === 'Kolay' ? 0 : difficulty === 'Orta' ? 1 : difficulty === 'Zor' ? 2 : difficulty === 'Usta' ? 3 : 4;",
    "  const tol = [0.30, 0.265, 0.225, 0.19, 0.155][idx];",
    "  const fBase = [0.78, 1.02, 1.28, 1.58, 1.92][idx];",
    "  const wobbleChance = [0, 0.18, 0.42, 0.62, 0.78][idx];",
    "  const spinChance = [0, 0.1, 0.38, 0.64, 0.82][idx];",
    "  const flipChance = [0, 0, 0.08, 0.28, 0.62][idx];",
    "  const K = 6, f = fBase + rnd() * 0.14;",
    "  const wobble = rnd() < wobbleChance ? 0.55 + rnd() * 0.7 : 0;",
    "  const flip = rnd() < flipChance ? Math.max(1.25, 3.0 - idx * 0.4) : 0;",
    "  const dir = rnd() < 0.5 ? 1 : -1;",
    "  const teeth: number[] = [], dirs: number[] = [], spin: number[] = [], phase: number[] = [];",
    "  let side = rnd() < 0.5 ? 1 : -1;",
    "  for (let i = 0; i < K; i++) {",
    "    teeth.push(Math.round(10 + rnd() * 2));",
    "    dirs.push(-Math.PI / 2 + side * (0.34 + rnd() * 0.38));",
    "    side = -side;",
    "    spin.push(rnd() < spinChance ? (rnd() < 0.5 ? -1 : 1) * (0.22 + rnd() * 0.26) * f : 0);",
    "    phase.push(rnd() * TAU);",
    "  }",
    "  return { K, f, tol, wobble, flip, dir, teeth, dirs, spin, phase };",
    "}",
    "",
    "export function dailyScoreFor(timeMs: number, perfects: number, K = 6) {",
    "  const speed = Math.max(0, 72000 - Math.round(timeMs) * 10);",
    "  const precision = Math.round((perfects / Math.max(1, K)) * 28000);",
    "  return Math.max(1000, speed + precision);",
    "}",
    ""
  ].join('\n');
  if (!logic.includes(marker)) throw new Error('logic game marker missing');
  logic = logic.replace(marker, insert + marker);
}

logic = logic.replace(
  "export type Progress = { level: number; unlocked: number; stars: number[]; sound: boolean; attempts: number; failures: number; early: number; late: number; misalign: number; bestMs: number[] };",
  "export type Progress = { level: number; unlocked: number; stars: number[]; sound: boolean; attempts: number; failures: number; early: number; late: number; misalign: number; bestMs: number[]; dailyDate: string; dailyBestScore: number; dailyBestTimeMs: number; dailyStars: number };"
);
logic = logic.replace(
  "export const PROGRESS_KEYS = ['level', 'unlocked', 'stars', 'sound', 'attempts', 'failures', 'early', 'late', 'misalign', 'bestMs'] as const;",
  "export const PROGRESS_KEYS = ['level', 'unlocked', 'stars', 'sound', 'attempts', 'failures', 'early', 'late', 'misalign', 'bestMs', 'dailyDate', 'dailyBestScore', 'dailyBestTimeMs', 'dailyStars'] as const;"
);
logic = logic.replace(
  "  return { level, unlocked, stars, sound: raw.sound !== false, attempts: num(raw.attempts), failures: num(raw.failures), early: num(raw.early), late: num(raw.late), misalign: num(raw.misalign), bestMs };",
  "  return { level, unlocked, stars, sound: raw.sound !== false, attempts: num(raw.attempts), failures: num(raw.failures), early: num(raw.early), late: num(raw.late), misalign: num(raw.misalign), bestMs, dailyDate: typeof raw.dailyDate === 'string' ? raw.dailyDate : '', dailyBestScore: num(raw.dailyBestScore), dailyBestTimeMs: num(raw.dailyBestTimeMs), dailyStars: clampInt(raw.dailyStars, 0, 3, 0) };"
);
logic = logic.replace(
  "export type Overlay = 'home' | 'levels' | 'fail' | 'reset' | 'done' | null;",
  "export type Overlay = 'home' | 'levels' | 'fail' | 'reset' | 'done' | 'dailyDone' | null;"
);
logic = logic.replace(
  "  cfg: LevelCfg;\n  level: number;",
  "  cfg: LevelCfg;\n  level: number;\n  mode: GameMode = 'campaign';\n  dailyKey = '';\n  dailyRunScore = 0;\n  dailyRunTimeMs = 0;"
);
logic = logic.replace(
  "  get bestTimeMs() { return this.p.bestMs[this.level - 1] || 0; }",
  "  get bestTimeMs() { return this.mode === 'daily' ? this.p.dailyBestTimeMs : (this.p.bestMs[this.level - 1] || 0); }"
);
logic = logic.replace(
  "  get phaseTitle() { return this.level <= 3 ? 'Mekaniği öğren' : this.level <= 7 ? 'Hizayı yakala' : this.level <= 12 ? 'Zamanlamayı öğren' : this.level <= 16 ? 'Boşluğu oku' : this.level <= 20 ? 'Artık mekanik sende' : this.level === 21 ? 'Ustalık başlıyor' : 'Ustalık'; }",
  "  get phaseTitle() { return this.mode === 'daily' ? 'Günün bulmacası · ' + dailyDifficulty(this.dailyKey) : this.level <= 3 ? 'Mekaniği öğren' : this.level <= 7 ? 'Hizayı yakala' : this.level <= 12 ? 'Zamanlamayı öğren' : this.level <= 16 ? 'Boşluğu oku' : this.level <= 20 ? 'Artık mekanik sende' : this.level === 21 ? 'Ustalık başlıyor' : 'Ustalık'; }"
);
logic = logic.replace(
  "  startLevel(l: number) {\n    this.level =",
  "  startDaily(dateKey = dailyDateKey()) {\n    this.mode = 'daily'; this.dailyKey = dateKey;\n    if (this.p.dailyDate !== dateKey) { this.p.dailyDate = dateKey; this.p.dailyBestScore = 0; this.p.dailyBestTimeMs = 0; this.p.dailyStars = 0; this.hooks.save('dailyDate', dateKey); this.hooks.save('dailyBestScore', 0); this.hooks.save('dailyBestTimeMs', 0); this.hooks.save('dailyStars', 0); }\n    this.cfg = cfgForDaily(dateKey); this.resetChain(); this.dirNow = this.cfg.dir; this.flipT = this.cfg.flip;\n    this.flipRnd = rng(hashText(this.dailyKey)); this.placed = 0; this.perfects = 0; this.earned = 0;\n    this.levelMs = 0; this.levelAttempts = 0; this.levelMistakes = 0; this.failStreak = 0; this.failKind = null;\n    this.dailyRunScore = 0; this.dailyRunTimeMs = 0; this.nearT = 0; this.flash = 0; this.shake = 0; this.winT = 0; this.failTimer = -1;\n    this.camY = -this.H * 0.78; this.overlay = null; this.spawn(); this.hooks.change();\n  }\n\n  startLevel(l: number) {\n    this.mode = 'campaign';\n    this.level ="
);
logic = logic.replace(
  "    const timeMs = Math.round(this.levelMs * 1000);\n    const targetMs = Math.max(4500, 4200 + this.cfg.K * 1700 + this.level * 55);\n    this.earned = starsFor(this.perfects, this.cfg.K, timeMs, targetMs);\n    const i = this.level - 1;",
  "    const timeMs = Math.round(this.levelMs * 1000);\n    const targetMs = Math.max(4500, 4200 + this.cfg.K * 1700 + this.level * 55);\n    this.earned = starsFor(this.perfects, this.cfg.K, timeMs, targetMs);\n    if (this.mode === 'daily') {\n      this.dailyRunTimeMs = timeMs; this.dailyRunScore = dailyScoreFor(timeMs, this.perfects, this.cfg.K);\n      if (this.dailyRunScore > this.p.dailyBestScore) { this.p.dailyBestScore = this.dailyRunScore; this.p.dailyBestTimeMs = timeMs; this.p.dailyStars = Math.max(this.p.dailyStars, this.earned); this.hooks.save('dailyBestScore', this.p.dailyBestScore); this.hooks.save('dailyBestTimeMs', timeMs); this.hooks.save('dailyStars', this.p.dailyStars); }\n      this.hooks.fx({ type: 'win' }); this.hooks.change(); return;\n    }\n    const i = this.level - 1;"
);
logic = logic.replace(
  "      if (this.winT > 1.8) {\n        if (this.level >= MAX_LEVEL) {",
  "      if (this.winT > 1.8) {\n        if (this.mode === 'daily') { this.state = 'menu'; this.overlay = 'dailyDone'; this.hooks.change(); return; }\n        if (this.level >= MAX_LEVEL) {"
);
logic = logic.replace(
  "  backToHome() { this.overlay = 'home'; this.hooks.change(); }\n\n  retry() { this.startLevel(this.level); }",
  "  backToHome() { this.mode = 'campaign'; this.overlay = 'home'; this.hooks.change(); }\n\n  retry() { this.mode === 'daily' ? this.startDaily(this.dailyKey || dailyDateKey()) : this.startLevel(this.level); }"
);
logic = logic.replace(
  "  failHome() {\n    this.state = 'menu'; this.overlay = 'home';",
  "  failHome() {\n    this.mode = 'campaign';\n    this.state = 'menu'; this.overlay = 'home';"
);
logic = logic.replace(
  "    this.p.attempts = 0; this.p.failures = 0; this.p.early = 0; this.p.late = 0; this.p.misalign = 0; this.p.bestMs = this.p.bestMs.map(() => 0);",
  "    this.p.attempts = 0; this.p.failures = 0; this.p.early = 0; this.p.late = 0; this.p.misalign = 0; this.p.bestMs = this.p.bestMs.map(() => 0); this.p.dailyDate = ''; this.p.dailyBestScore = 0; this.p.dailyBestTimeMs = 0; this.p.dailyStars = 0;"
);
logic = logic.replace(
  "    this.hooks.save('level', 1); this.hooks.save('unlocked', 1); this.hooks.save('stars', this.p.stars); this.hooks.save('attempts', 0); this.hooks.save('failures', 0); this.hooks.save('early', 0); this.hooks.save('late', 0); this.hooks.save('misalign', 0); this.hooks.save('bestMs', this.p.bestMs);",
  "    this.hooks.save('level', 1); this.hooks.save('unlocked', 1); this.hooks.save('stars', this.p.stars); this.hooks.save('attempts', 0); this.hooks.save('failures', 0); this.hooks.save('early', 0); this.hooks.save('late', 0); this.hooks.save('misalign', 0); this.hooks.save('bestMs', this.p.bestMs); this.hooks.save('dailyDate', ''); this.hooks.save('dailyBestScore', 0); this.hooks.save('dailyBestTimeMs', 0); this.hooks.save('dailyStars', 0);"
);
fs.writeFileSync(logicPath, logic);

const drawPath = new URL('./src/game/draw.ts', import.meta.url);
let draw = fs.readFileSync(drawPath, 'utf8');
draw = draw.replace(
  "text(c, placed + ' / ' + cfg.K, 34, 22, P.font(15), fill(C.muted));\n    text(c, 'Bölüm ' + level, W - 44, 22, P.font(15), fill(C.muted));",
  "text(c, placed + ' / ' + cfg.K, 34, 22, P.font(15), fill(C.muted));\n    text(c, game.mode === 'daily' ? 'GÜNLÜK' : 'Bölüm ' + level, W - 44, 22, P.font(15), fill(C.muted));"
);
const marker = "    for (let i = 0; i < 3; i++) {";
if (!draw.includes(marker)) throw new Error('draw stars block missing');
draw = draw.replace(
  marker,
  "    for (let i = 0; i < 10; i++) { const ang = i * TAU / 10; const dist = 18 + game.winT * 48; const px = W / 2 + Math.cos(ang) * dist; const py = y + Math.sin(ang) * dist; c.drawCircle(px, py, Math.max(2, mm * 0.22 * (1 - game.winT / 2)), fill(C.gearB, a * Math.max(0, 1 - game.winT / 1.8))); }\n    for (let i = 0; i < 3; i++) {",
  1
);
fs.writeFileSync(drawPath, draw);

const menuPath = new URL('./src/game/ui/Menus.tsx', import.meta.url);
let menu = fs.readFileSync(menuPath, 'utf8');
menu = menu.replace("  play: () => void;\n  levels:", "  play: () => void;\n  daily: () => void;\n  levels:");
menu = menu.replace(
  "<Menu><Btn C={C} label={label} onPress={act.play}/><Btn C={C} kind=\"ghost\" label=\"Bölümler\" onPress={act.levels}/></Menu>",
  "<Menu><Btn C={C} label={label} onPress={act.play}/><Btn C={C} kind=\"ghost\" label=\"Bugünün Bulmacası\" onPress={act.daily}/><Btn C={C} kind=\"ghost\" label=\"Bölümler\" onPress={act.levels}/></Menu>"
);
menu = menu.replace(
  "<View style={styles.errors}><Txt style={[styles.small,{color:C.muted}]}>Erken {game.p.early}</Txt><Txt style={[styles.small,{color:C.muted}]}>Geç {game.p.late}</Txt><Txt style={[styles.small,{color:C.muted}]}>Hizasız {game.p.misalign}</Txt></View>",
  "<View style={styles.errors}><Txt style={[styles.small,{color:C.muted}]}>Erken {game.p.early}</Txt><Txt style={[styles.small,{color:C.muted}]}>Geç {game.p.late}</Txt><Txt style={[styles.small,{color:C.muted}]}>Hizasız {game.p.misalign}</Txt></View><Txt style={[styles.stat,{color:C.muted}]}>Günlük: {game.p.dailyBestScore > 0 ? game.p.dailyBestScore.toLocaleString('tr-TR') : 'Henüz skor yok'}</Txt>"
);
menu = menu.replace(
  "export default function Menus({ game, C, act }: Props) {",
  "const dailyText = (game: DisliGame) => 'Bugün · ' + game.dailyKey + ' · ' + dailyDifficultyName(game);\nfunction dailyDifficultyName(game: DisliGame) { return game.phaseTitle.replace('Günün bulmacası · ', ''); }\n\nexport default function Menus({ game, C, act }: Props) {"
);
menu = menu.replace(
  "    case 'done': return",
  "    case 'dailyDone': return <Overlay C={C}><CenterScroll><Card><H2 C={C}>Günlük tamamlandı!</H2><P C={C}>{dailyText(game)}</P><Txt style={[styles.dailyScore,{color:C.ink}]}>{game.dailyRunScore.toLocaleString('tr-TR')}</Txt><Txt style={[styles.small,{color:C.muted}]}>Skor · {(game.dailyRunTimeMs / 1000).toFixed(2)} sn · En iyi {game.p.dailyBestScore.toLocaleString('tr-TR')}</Txt><Menu><Btn C={C} label=\"Tekrar oyna\" onPress={act.daily}/><Btn C={C} kind=\"ghost\" label=\"Ana menü\" onPress={act.back}/></Menu></Card></CenterScroll></Overlay>;\n    case 'done': return"
);
menu = menu.replace(
  "stats:{marginTop:18,gap:4}, errors:",
  "stats:{marginTop:18,gap:4}, dailyScore:{fontFamily:FONT.heavy,fontSize:34,textAlign:'center',marginTop:12,marginBottom:4}, errors:"
);
fs.writeFileSync(menuPath, menu);

const screenPath = new URL('./src/GameScreen.tsx', import.meta.url);
let screen = fs.readFileSync(screenPath, 'utf8');
screen = screen.replace("      play: () => game.pressPlay(),\n      levels:", "      play: () => game.pressPlay(),\n      daily: () => game.startDaily(),\n      levels:");
fs.writeFileSync(screenPath, screen);

const testPath = new URL('./src/game/__tests__/daily.test.ts', import.meta.url);
fs.writeFileSync(testPath, "import { cfgForDaily, dailyDateKey, dailyDifficulty, dailyScoreFor } from '../logic';\n\ndescribe('daily puzzle', () => {\n  test('same date produces same puzzle', () => expect(cfgForDaily('2026-09-25')).toEqual(cfgForDaily('2026-09-25')));\n  test('difficulty is valid', () => expect(['Kolay','Orta','Zor','Usta','Manyak']).toContain(dailyDifficulty('2026-09-25')));\n  test('score rewards speed and precision', () => expect(dailyScoreFor(5000, 6)).toBeGreaterThan(dailyScoreFor(20000, 0)));\n  test('date key is ISO', () => expect(dailyDateKey(new Date('2026-09-25T21:00:00+03:00'))).toBe('2026-09-25'));\n});\n");

console.log('Daily puzzle + ASMR completion layer applied.');
