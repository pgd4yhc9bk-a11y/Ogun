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


/* ---------- full gameplay layer ---------- */
{
  const p = new URL('./src/game/logic.ts', import.meta.url);
  let x = fs.readFileSync(p, 'utf8');
  x = x.replace(
    "export type Progress = { level: number; unlocked: number; stars: number[]; sound: boolean };\nexport const PROGRESS_KEYS = ['level', 'unlocked', 'stars', 'sound'] as const;",
    "export type ErrorKind = 'early' | 'late' | 'misalign';\nexport type Progress = { level: number; unlocked: number; stars: number[]; sound: boolean; attempts: number; failures: number; early: number; late: number; misalign: number; bestMs: number[] };\nexport const PROGRESS_KEYS = ['level', 'unlocked', 'stars', 'sound', 'attempts', 'failures', 'early', 'late', 'misalign', 'bestMs'] as const;"
  );
  x = x.replace(
    "  return { level, unlocked, stars, sound: raw.sound !== false };\n}",
    "  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;\n  const bestMs = Array.from({ length: MAX_LEVEL }, (_, i) => { const v = Array.isArray(raw.bestMs) ? raw.bestMs[i] : undefined; return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0; });\n  return { level, unlocked, stars, sound: raw.sound !== false, attempts: num(raw.attempts), failures: num(raw.failures), early: num(raw.early), late: num(raw.late), misalign: num(raw.misalign), bestMs };\n}"
  );
  x = x.replace("  nearT = 0; nearMsg = ''; flash = 0; shake = 0; winT = 0; failTimer = -1;\n  reduceMotion = false;", "  nearT = 0; nearMsg = ''; flash = 0; shake = 0; winT = 0; failTimer = -1;\n  levelMs = 0; levelAttempts = 0; levelMistakes = 0; failStreak = 0; failKind: ErrorKind | null = null;\n  reduceMotion = false;");
  x = x.replace("  get totalStars() { return this.p.stars.reduce((a, b) => a + b, 0); }\n  get paused() { return this.state === 'paused'; }", "  get totalStars() { return this.p.stars.reduce((a, b) => a + b, 0); }\n  get paused() { return this.state === 'paused'; }\n  get assistActive() { return this.failStreak >= 3; }\n  get effectiveTol() { return this.cfg.tol * (this.assistActive ? 1.08 : 1); }\n  get bestTimeMs() { return this.p.bestMs[this.level - 1] || 0; }\n  get phaseTitle() { return this.level <= 3 ? 'Mekaniği öğren' : this.level <= 7 ? 'Hizayı yakala' : this.level <= 12 ? 'Zamanlamayı öğren' : this.level <= 16 ? 'Boşluğu oku' : this.level <= 20 ? 'Artık mekanik sende' : this.level === 21 ? 'Ustalık başlıyor' : 'Ustalık'; }\n  get failTitle() { return this.failKind === 'early' ? 'ERKEN' : this.failKind === 'late' ? 'GEÇ KALDIN' : 'HİZAYI KAÇIRDIN'; }\n  get failHint() { return this.failKind === 'early' ? 'Biraz daha bekle.' : this.failKind === 'late' ? 'Biraz daha erken dokun.' : 'Dişliyi hedef boşluğa daha iyi hizala.'; }");
  x = x.replace("    this.placed = 0; this.perfects = 0; this.earned = 0;\n    this.nearT = 0;", "    this.placed = 0; this.perfects = 0; this.earned = 0;\n    this.levelMs = 0; this.levelAttempts = 0; this.levelMistakes = 0; this.failStreak = 0; this.failKind = null;\n    this.nearT = 0;");
  x = x.replace("    inc.err = this.alignErr(LAG);\n    inc.ok = Math.abs(inc.err) <= this.cfg.tol;\n    if (inc.ok) {", "    inc.err = this.alignErr(LAG);\n    inc.ok = Math.abs(inc.err) <= this.effectiveTol;\n    this.levelAttempts++; this.p.attempts++; this.hooks.save('attempts', this.p.attempts);\n    if (!inc.ok) { this.levelMistakes++; const signed = inc.err * (this.om || this.dirNow); this.failKind = Math.abs(inc.err) > this.effectiveTol * 1.55 ? 'misalign' : signed > 0 ? 'late' : 'early'; }\n    if (inc.ok) {");
  x = x.replace("    if (!inc.ok) {\n      this.state = 'fail'; this.failTimer = 0.85;", "    if (!inc.ok) {\n      this.p.failures++; if (this.failKind === 'early') this.p.early++; else if (this.failKind === 'late') this.p.late++; else this.p.misalign++;\n      this.failStreak++;\n      this.hooks.save('failures', this.p.failures); this.hooks.save('early', this.p.early); this.hooks.save('late', this.p.late); this.hooks.save('misalign', this.p.misalign);\n      this.state = 'fail'; this.failTimer = 0.85;");
  x = x.replace("    this.gears.push({ N: inc.N", "    this.failStreak = 0;\n    this.gears.push({ N: inc.N");
  x = x.replace("    this.earned = starsFor(this.perfects, this.cfg.K);\n    const i = this.level - 1;", "    const timeMs = Math.round(this.levelMs * 1000);\n    const targetMs = Math.max(4500, 4200 + this.cfg.K * 1700 + this.level * 55);\n    this.earned = starsFor(this.perfects, this.cfg.K, timeMs, targetMs);\n    const i = this.level - 1;\n    const oldBest = this.p.bestMs[i] || 0;\n    if (!oldBest || timeMs < oldBest) { this.p.bestMs[i] = timeMs; this.hooks.save('bestMs', this.p.bestMs); }");
  x = x.replace("export const starsFor = (perfects: number, K: number) => {\n  const q = perfects / K;\n  return q >= 0.75 ? 3 : q >= 0.4 ? 2 : 1;\n};", "export const starsFor = (perfects: number, K: number, timeMs = 0, targetMs = Infinity) => {\n  const q = perfects / K;\n  if (q >= 0.75 && (!timeMs || timeMs <= targetMs)) return 3;\n  return q >= 0.4 ? 2 : 1;\n};");
  x = x.replace("    this.t += dt;\n    const { cfg } = this;", "    this.t += dt;\n    if (this.state === 'hover' || this.state === 'drop') this.levelMs += dt;\n    const { cfg } = this;");
  x = x.replace("    this.p.level = 1; this.p.unlocked = 1; this.p.stars = this.p.stars.map(() => 0);\n    this.hooks.save('level', 1); this.hooks.save('unlocked', 1); this.hooks.save('stars', this.p.stars);", "    this.p.level = 1; this.p.unlocked = 1; this.p.stars = this.p.stars.map(() => 0);\n    this.p.attempts = 0; this.p.failures = 0; this.p.early = 0; this.p.late = 0; this.p.misalign = 0; this.p.bestMs = this.p.bestMs.map(() => 0);\n    this.hooks.save('level', 1); this.hooks.save('unlocked', 1); this.hooks.save('stars', this.p.stars); this.hooks.save('attempts', 0); this.hooks.save('failures', 0); this.hooks.save('early', 0); this.hooks.save('late', 0); this.hooks.save('misalign', 0); this.hooks.save('bestMs', this.p.bestMs);");
  fs.writeFileSync(p, x);
}
{
  const p = new URL('./src/game/draw.ts', import.meta.url);
  let x = fs.readFileSync(p, 'utf8');
  x = x.replace("const hint = level <= 3 ? 'İşaretler yeşillenince dokun'", "const hint = game.assistActive ? 'Yardım açık · hedef biraz daha geniş' : level <= 3 ? 'İşaretler yeşillenince dokun'");
  x = x.replace("text(c, 'Zincir tamam!', W / 2, y, P.font(26), fill(C.near, a));", "text(c, 'Zincir tamam!', W / 2, y, P.font(26), fill(C.near, a));\n    text(c, (game.levelMs / 1000).toFixed(2) + ' sn', W / 2, y + 68, P.font(15), fill(C.muted, a));\n    if (game.bestTimeMs > 0) text(c, 'En iyi ' + (game.bestTimeMs / 1000).toFixed(2) + ' sn', W / 2, y + 88, P.font(13), fill(C.muted, a * 0.9));");
  fs.writeFileSync(p, x);
}
{
  const p = new URL('./src/GameScreen.tsx', import.meta.url);
  let x = fs.readFileSync(p, 'utf8');
  x = x.replace("<Txt style={[styles.best, { color: colors.muted }]}>{'En iyi: ' + game.best}</Txt>", "<Txt style={[styles.best, { color: colors.muted }]}>{game.phaseTitle + ' · ⭐ ' + game.totalStars}</Txt>");
  fs.writeFileSync(p, x);
}
{
  const p = new URL('./src/game/ui/Menus.tsx', import.meta.url);
  let x = fs.readFileSync(p, 'utf8');
  const start = x.indexOf('export default function Menus');
  const stylesAt = x.indexOf('const styles', start);
  if (start < 0 || stylesAt < 0) throw new Error('Menus boundaries missing');
  const header = x.slice(0, start);
  const styles = x.slice(stylesAt).replace('const styles = StyleSheet.create({', 'const styles = StyleSheet.create({ stats:{marginTop:18,gap:4}, errors:{flexDirection:\'row\',justifyContent:\'space-around\',marginTop:10}, small:{fontFamily:FONT.medium,fontSize:12}, group:{width:\'100%\',maxWidth:420,marginBottom:18}, groupTitle:{fontFamily:FONT.bold,fontSize:13,letterSpacing:1,textAlign:\'center\',marginBottom:8}, ');
  const body = `export default function Menus({ game, C, act }: Props) {
  const total = MAX_LEVEL * 3;
  switch (game.overlay) {
    case 'home': {
      const label = game.paused ? 'Devam et' : game.p.unlocked > 1 ? 'Oyna (Bölüm ' + game.p.level + ')' : 'Oyna';
      return <Overlay C={C}><CenterScroll><Card>
        <H1 C={C}>Dişli</H1>
        <P C={C}>{game.paused ? 'Kaldığın yerden devam et.' : game.level === 21 ? 'Ustalık başlıyor.' : game.level <= 20 ? 'Öğren, alış, ustalaş.' : 'Artık hız ve ustalık zamanı.'}</P>
        <Menu><Btn C={C} label={label} onPress={act.play}/><Btn C={C} kind="ghost" label="Bölümler" onPress={act.levels}/></Menu>
        <View style={styles.stats}><Txt style={[styles.stat,{color:C.muted}]}>Yıldız {game.totalStars} / {total}</Txt><Txt style={[styles.stat,{color:C.muted}]}>Başarısız deneme {game.p.failures}</Txt></View>
        <View style={styles.errors}><Txt style={[styles.small,{color:C.muted}]}>Erken {game.p.early}</Txt><Txt style={[styles.small,{color:C.muted}]}>Geç {game.p.late}</Txt><Txt style={[styles.small,{color:C.muted}]}>Hizasız {game.p.misalign}</Txt></View>
      </Card></CenterScroll></Overlay>;
    }
    case 'fail': return <Overlay C={C}><CenterScroll><Card>
      <H2 C={C}>{game.failTitle}</H2><P C={C}>{game.failHint}</P>
      <P C={C} style={{fontSize:14,marginBottom:8}}>{'Bölüm ' + game.level + ' · ' + game.placed + ' / ' + game.cfg.K}</P>
      <Menu><Btn C={C} label="Tekrar dene" onPress={act.retry}/><Btn C={C} kind="ghost" label="Ana menü" onPress={act.failHome}/></Menu>
    </Card></CenterScroll></Overlay>;
    case 'done': return <Overlay C={C}><CenterScroll><Card>
      <H2 C={C}>Hepsi tamam!</H2><P C={C}>{MAX_LEVEL + ' bölüm tamamlandı. Eksik yıldızlar için geri dön.'}</P>
      <Menu><Btn C={C} label="Bölümler" onPress={act.levels}/><Btn C={C} kind="ghost" label="Ana menü" onPress={act.back}/></Menu>
    </Card></CenterScroll></Overlay>;
    case 'reset': return <Overlay C={C} solid><CenterScroll><Card><H2 C={C}>Sıfırlansın mı?</H2><P C={C}>Bütün bölümler, yıldızlar ve istatistikler silinir.</P><Menu><Btn C={C} kind="danger" label="Sıfırla" onPress={act.resetYes}/><Btn C={C} kind="ghost" label="Vazgeç" onPress={act.resetNo}/></Menu></Card></CenterScroll></Overlay>;
    case 'levels': return <Overlay C={C} solid><ScrollView contentContainerStyle={styles.levels} showsVerticalScrollIndicator={false}>
      <H2 C={C}>Bölümler</H2><Txt style={[styles.stat,{color:C.muted,marginTop:0,marginBottom:18}]}>Yıldız: {game.totalStars} / {total}</Txt>
      {[['ÖĞRENME',1,7],['ALIŞMA',8,12],['USTALIK ÖNCESİ',13,20],['USTALIK',21,30],['USTA',31,45],['MASTER',46,60]].map(([title,from,to]) => <View key={String(title)} style={styles.group}>
        <Txt style={[styles.groupTitle,{color:C.muted}]}>{title}</Txt><View style={styles.grid}>{Array.from({length:Number(to)-Number(from)+1},(_,i)=>{const l=Number(from)+i,open=l<=game.p.unlocked,s=game.p.stars[l-1];return <Pressable key={l} onPress={()=>act.pickLevel(l)} disabled={!open} accessibilityRole="button" accessibilityLabel={open?'Bölüm '+l+', '+s+' yıldız':'Bölüm '+l+', kilitli'} style={({pressed})=>[styles.cell,{backgroundColor:open?alpha(C.gearA,l===game.p.level ? .22 : .1):'transparent',borderColor:alpha(C.muted,open?.35:.2)},pressed&&{transform:[{scale:.95}]}]}><Txt style={{fontFamily:FONT.bold,fontSize:17,color:open?C.ink:alpha(C.muted,.6)}}>{l}</Txt><Txt style={styles.stars}>{[0,1,2].map(k=><Txt key={k} style={{color:k<s?C.gearB:alpha(C.muted,open?.45:.2)}}>★</Txt>)}</Txt></Pressable>})}</View></View>)}
      <Btn C={C} kind="ghost" label="Geri" onPress={act.back} style={{minWidth:160,marginTop:8}}/><Link C={C} label="İlerlemeyi sıfırla" onPress={act.askReset}/>
    </ScrollView></Overlay>;
    default:return null;
  }
}
`;
  fs.writeFileSync(p, header + body + styles);
}
