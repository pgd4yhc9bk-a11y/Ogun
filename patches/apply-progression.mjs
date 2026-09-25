import fs from 'node:fs';

const logicPath = new URL('./src/game/logic.ts', import.meta.url);
let s = fs.readFileSync(logicPath, 'utf8');
const start = s.indexOf('export function cfgFor(l: number): LevelCfg {');
const end = s.indexOf('\n}\n\n// Yıldız:', start);
if (start < 0 || end < 0) throw new Error('cfgFor block not found');

const block = `export function cfgFor(l: number): LevelCfg {
  const rnd = rng(l * 6151 + 7);
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.round(l)));
  const phaseT = (from: number, to: number) => Math.max(0, Math.min(1, (level - from) / Math.max(1, to - from)));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Öğren → alış → ustalaş. İlk 20 bölüm yeni mekanikleri sırayla öğretir.
  let tol: number, baseF: number, wobbleChance: number, spinChance: number, flipChance: number;
  if (level <= 3) {
    const t = phaseT(1, 3); tol = lerp(0.30, 0.29, t); baseF = lerp(0.72, 0.80, t);
    wobbleChance = spinChance = flipChance = 0;
  } else if (level <= 7) {
    const t = phaseT(4, 7); tol = lerp(0.28, 0.255, t); baseF = lerp(0.84, 1.00, t);
    wobbleChance = spinChance = flipChance = 0;
  } else if (level <= 12) {
    const t = phaseT(8, 12); tol = lerp(0.25, 0.225, t); baseF = lerp(1.03, 1.18, t);
    wobbleChance = lerp(0, 0.35, t); spinChance = flipChance = 0;
  } else if (level <= 16) {
    const t = phaseT(13, 16); tol = lerp(0.22, 0.205, t); baseF = lerp(1.20, 1.35, t);
    wobbleChance = lerp(0.30, 0.55, t); spinChance = lerp(0.15, 0.40, t); flipChance = 0;
  } else if (level <= 20) {
    const t = phaseT(17, 20); tol = lerp(0.20, 0.19, t); baseF = lerp(1.38, 1.50, t);
    wobbleChance = lerp(0.50, 0.75, t); spinChance = lerp(0.45, 0.70, t); flipChance = lerp(0, 0.20, t);
  } else {
    const t = phaseT(21, 60); tol = lerp(0.185, 0.15, t); baseF = lerp(1.52, 2.20, t);
    wobbleChance = lerp(0.70, 0.80, t); spinChance = lerp(0.70, 0.82, t); flipChance = lerp(0.25, 0.75, t);
  }

  const K = Math.min(8, 4 + Math.floor(level / 6));
  const f = baseF + rnd() * 0.12;
  const wobble = rnd() < wobbleChance ? 0.55 + rnd() * 0.75 : 0;
  const flip = rnd() < flipChance ? Math.max(1.35, 3.2 - phaseT(21, 60) * 1.4) : 0;
  const dir = rnd() < 0.5 ? 1 : -1;
  const teeth: number[] = [], dirs: number[] = [], spin: number[] = [], phase: number[] = [];
  let side = rnd() < 0.5 ? 1 : -1;
  for (let i = 0; i < K; i++) {
    const toothT = phaseT(1, 60);
    teeth.push(Math.round(9 + rnd() * (11 - toothT * 3)));
    dirs.push(-Math.PI / 2 + side * (0.35 + rnd() * 0.35)); side = -side;
    spin.push(rnd() < spinChance ? (rnd() < 0.5 ? -1 : 1) * (0.22 + rnd() * 0.28) * f : 0);
    phase.push(rnd() * TAU);
  }
  return { K, f, tol, wobble, flip, dir, teeth, dirs, spin, phase };
}`;

s = s.slice(0, start) + block + s.slice(end + 2);
fs.writeFileSync(logicPath, s);

const drawPath = new URL('./src/game/draw.ts', import.meta.url);
let d = fs.readFileSync(drawPath, 'utf8');
const oldHint = `  if (state === 'hover' && level === 1 && placed === 0) {
    text(c, 'İşaretler yeşillenince dokun', W / 2, hintY, P.font(17), fill(C.muted, 0.55 + 0.45 * Math.sin(nowMs / 300)));
  }`;
const newHint = `  if (state === 'hover' && placed === 0 && level <= 20) {
    const hint = level <= 3
      ? 'İşaretler yeşillenince dokun'
      : level <= 7
        ? 'Hizayı yakala'
        : level <= 12
          ? 'Dönüşü takip et'
          : level <= 16
            ? 'Boşluğu dikkatle oku'
            : 'Artık mekanik sende';
    text(c, hint, W / 2, hintY, P.font(17), fill(C.muted, 0.55 + 0.45 * Math.sin(nowMs / 300)));
  }`;
if (!d.includes(oldHint)) throw new Error('draw hint block not found');
d = d.replace(oldHint, newHint);
fs.writeFileSync(drawPath, d);

const testPath = new URL('./src/game/__tests__/logic.test.ts', import.meta.url);
let t = fs.readFileSync(testPath, 'utf8');
const oldPrototype = `  test('prototiple birebir aynı değerler', () => {
    const c5 = cfgFor(5);
    expect(c5.K).toBe(4);
    expect(c5.teeth).toEqual([18, 12, 20, 16]);
    expect(c5.f).toBeCloseTo(1.261321, 5);
    expect(c5.tol).toBeCloseTo(0.233, 6);
    expect(cfgFor(60).K).toBe(8);
  });`;
const newPrototype = `  test('öğretici progression fazları doğru sırada zorlaşır', () => {
    const c1 = cfgFor(1), c3 = cfgFor(3), c7 = cfgFor(7), c12 = cfgFor(12);
    const c16 = cfgFor(16), c20 = cfgFor(20), c60 = cfgFor(60);
    expect(c1.tol).toBeCloseTo(0.30, 6);
    expect(c1.f).toBeLessThan(c3.f);
    expect(c3.tol).toBeGreaterThan(c7.tol);
    expect(c7.tol).toBeGreaterThan(c12.tol);
    expect(c12.f).toBeLessThan(c16.f);
    expect(c16.tol).toBeGreaterThan(c20.tol);
    expect(c20.tol).toBeGreaterThan(c60.tol);
    expect(c20.f).toBeLessThan(c60.f);
    expect(c1.wobble).toBe(0);
    expect(c1.spin.every(s => s === 0)).toBe(true);
    expect(c1.flip).toBe(0);
    expect(cfgFor(60).K).toBe(8);
  });`;
if (!t.includes(oldPrototype)) throw new Error('old progression test not found');
t = t.replace(oldPrototype, newPrototype);
t = t.replace('expect(c.tol).toBeGreaterThanOrEqual(0.17 - 1e-9);', 'expect(c.tol).toBeGreaterThanOrEqual(0.15 - 1e-9);');
t = t.replace('expect(c.f).toBeLessThanOrEqual(2.41);', 'expect(c.f).toBeLessThanOrEqual(2.32);');
t = t.replace('if (l < 14) expect(c.spin.every(s => s === 0)).toBe(true);', 'if (l <= 7) expect(c.spin.every(s => s === 0)).toBe(true);');
t = t.replace('if (l < 10) expect(c.wobble).toBe(0);', 'if (l <= 7) expect(c.wobble).toBe(0);');
t = t.replace('if (l < 20) expect(c.flip).toBe(0);', 'if (l <= 16) expect(c.flip).toBe(0);');
fs.writeFileSync(testPath, t);
