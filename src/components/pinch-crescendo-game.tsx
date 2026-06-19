"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./pinch-crescendo-game.module.css";

type MotionNote = { name: string; freq: number; level: number };
type JudgeKind = "perfect" | "great" | "good" | "miss" | "touch";
type Pop = { id: number; label: string; level: number; kind: JudgeKind };
type Stats = {
  score: number;
  combo: number;
  maxCombo: number;
  samples: number;
  totalError: number;
  perfect: number;
  great: number;
  good: number;
  misses: number;
  minLevel: number;
  maxLevel: number;
  roundScores: number[];
};

const REPEAT_COUNT = 4;
const STEP_TIME = 1.08;
const REST_TIME = 1.25;
const PREP_TIME = 1.1;
const SCORE_INTERVAL = 0.22;
const PEAK_INDEX = 6;
const MOTION: MotionNote[] = [
  { name: "C", freq: 261.63, level: 0 },
  { name: "D", freq: 293.66, level: 0.16 },
  { name: "E", freq: 329.63, level: 0.32 },
  { name: "F", freq: 349.23, level: 0.5 },
  { name: "G", freq: 392, level: 0.68 },
  { name: "A", freq: 440, level: 0.84 },
  { name: "C", freq: 523.25, level: 1 },
  { name: "A", freq: 440, level: 0.84 },
  { name: "G", freq: 392, level: 0.68 },
  { name: "F", freq: 349.23, level: 0.5 },
  { name: "E", freq: 329.63, level: 0.32 },
  { name: "D", freq: 293.66, level: 0.16 },
  { name: "C", freq: 261.63, level: 0 },
];
const PHRASE_TIME = (MOTION.length - 1) * STEP_TIME;
const ROUND_TIME = PHRASE_TIME + REST_TIME;
const TOTAL_TIME = PREP_TIME + ROUND_TIME * REPEAT_COUNT;

function makeStats(): Stats {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    samples: 0,
    totalError: 0,
    perfect: 0,
    great: 0,
    good: 0,
    misses: 0,
    minLevel: 1,
    maxLevel: 0,
    roundScores: Array(REPEAT_COUNT).fill(0),
  };
}

function targetAt(time: number) {
  if (time < PREP_TIME) return 0;
  const local = time - PREP_TIME;
  const round = Math.floor(local / ROUND_TIME);
  if (round >= REPEAT_COUNT) return 0;
  const within = local - round * ROUND_TIME;
  if (within >= PHRASE_TIME) return 0;
  const phase = within / PHRASE_TIME;
  return (1 - Math.cos(phase * Math.PI * 2)) / 2;
}

function phaseAt(time: number) {
  if (time < PREP_TIME) return "Ready";
  const local = time - PREP_TIME;
  const within = local - Math.floor(local / ROUND_TIME) * ROUND_TIME;
  if (within >= PHRASE_TIME) return "Reset";
  return within <= PEAK_INDEX * STEP_TIME ? "Crescendo" : "Decrescendo";
}

function gradeDistance(error: number): { label: string; points: number; bucket: "perfect" | "great" | "good" | "misses"; kind: JudgeKind } {
  if (error <= 0.055) return { label: "PERFECT", points: 90, bucket: "perfect", kind: "perfect" };
  if (error <= 0.13) return { label: "GREAT", points: 62, bucket: "great", kind: "great" };
  if (error <= 0.22) return { label: "GOOD", points: 34, bucket: "good", kind: "good" };
  return { label: "MISS", points: 0, bucket: "misses", kind: "miss" };
}

function createAudioContext() {
  const AudioClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioClass ? new AudioClass() : null;
}

function createMaster(ctx: AudioContext) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, ctx.currentTime);
  compressor.knee.setValueAtTime(22, ctx.currentTime);
  compressor.ratio.setValueAtTime(6, ctx.currentTime);
  compressor.attack.setValueAtTime(0.004, ctx.currentTime);
  compressor.release.setValueAtTime(0.2, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.88, ctx.currentTime);
  gain.connect(compressor);
  compressor.connect(ctx.destination);
  return gain;
}

function playTone(ctx: AudioContext, out: AudioNode, time: number, freq: number, duration: number, level: number) {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const bright = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const volume = 0.055 + level * 0.42;
  osc.type = "triangle";
  overtone.type = "sine";
  bright.type = "lowpass";
  osc.frequency.setValueAtTime(freq, time);
  overtone.frequency.setValueAtTime(freq * 2, time);
  bright.frequency.setValueAtTime(650 + level * 4400, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain);
  overtone.connect(gain);
  gain.connect(bright);
  bright.connect(out);
  osc.start(time);
  overtone.start(time);
  osc.stop(time + duration + 0.05);
  overtone.stop(time + duration + 0.05);
}

function playPulse(ctx: AudioContext, out: AudioNode, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130.81, time);
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  osc.connect(gain);
  gain.connect(out);
  osc.start(time);
  osc.stop(time + 0.2);
}

function getPoint(level: number) {
  const curve = Math.sin(level * Math.PI);
  return {
    x: 27 + level * 48 + curve * 4,
    y: 69 - level * 43 - curve * 6,
  };
}

function getPath() {
  const start = getPoint(0);
  const mid = getPoint(0.5);
  const end = getPoint(1);
  return `M ${start.x} ${start.y} Q ${mid.x} ${mid.y - 7} ${end.x} ${end.y}`;
}

export default function PinchCrescendoGame() {
  const [running, setRunning] = useState(false);
  const [songTime, setSongTime] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [touching, setTouching] = useState(false);
  const [stats, setStats] = useState<Stats>(() => makeStats());
  const [judge, setJudge] = useState("READY");
  const [detail, setDetail] = useState("thumb fixed, follow the yellow ring");
  const [pops, setPops] = useState<Pop[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const outputRef = useRef<AudioNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const nextScoreAtRef = useRef(PREP_TIME);
  const pointerIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const touchingRef = useRef(false);
  const userLevelRef = useRef(0);
  const popIdRef = useRef(0);

  const targetLevel = targetAt(songTime);
  const phase = phaseAt(songTime);
  const targetPoint = getPoint(targetLevel);
  const fingerPoint = getPoint(userLevel);
  const thumbPoint = getPoint(0);
  const meanError = stats.samples ? stats.totalError / stats.samples : 0;
  const match = stats.samples ? Math.max(0, Math.round(100 - meanError * 135)) : 0;
  const progress = Math.min(100, (songTime / TOTAL_TIME) * 100);
  const currentRound = Math.max(0, Math.min(REPEAT_COUNT - 1, Math.floor(Math.max(0, songTime - PREP_TIME) / ROUND_TIME)));
  const rangeMin = stats.samples ? Math.round(stats.minLevel * 100) : 0;
  const rangeMax = stats.samples ? Math.round(stats.maxLevel * 100) : 0;
  const guidePath = useMemo(getPath, []);
  const scoreLocalTime = songTime < PREP_TIME ? 0 : (songTime - PREP_TIME) % ROUND_TIME;
  const scoreProgress = Math.min(1, Math.max(0, scoreLocalTime / PHRASE_TIME));

  function cleanupAudio() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioRef.current?.close();
    audioRef.current = null;
    outputRef.current = null;
  }

  async function ensureAudio() {
    if (!audioRef.current || audioRef.current.state === "closed") {
      const ctx = createAudioContext();
      if (!ctx) throw new Error("이 브라우저는 Web Audio를 지원하지 않습니다.");
      audioRef.current = ctx;
      outputRef.current = createMaster(ctx);
    }
    if (audioRef.current.state === "suspended") await audioRef.current.resume();
    return audioRef.current;
  }

  function scheduleSong(ctx: AudioContext, out: AudioNode, baseTime: number) {
    for (let round = 0; round < REPEAT_COUNT; round += 1) {
      MOTION.forEach((note, index) => {
        const t = baseTime + PREP_TIME + round * ROUND_TIME + index * STEP_TIME;
        playTone(ctx, out, t, note.freq, STEP_TIME * 0.96, note.level);
        if (index === 0) playPulse(ctx, out, t);
        if (index === PEAK_INDEX) playTone(ctx, out, t + 0.02, 1046.5, 0.14, 0.95);
      });
    }
  }

  function playJudgeTone(label: string) {
    const ctx = audioRef.current;
    const out = outputRef.current;
    if (!ctx || !out || ctx.state === "closed") return;
    const now = ctx.currentTime;
    const freq = label === "PERFECT" ? 1174.66 : label === "GREAT" ? 880 : label === "GOOD" ? 659.25 : 146.83;
    playTone(ctx, out, now, freq, 0.1, label === "MISS" ? 0.12 : 0.45);
  }

  async function startGame() {
    cleanupAudio();
    let ctx: AudioContext;
    try {
      ctx = await ensureAudio();
    } catch (error) {
      setJudge("Audio Error");
      setDetail(error instanceof Error ? error.message : "audio unavailable");
      return;
    }
    const out = outputRef.current ?? createMaster(ctx);
    outputRef.current = out;
    startedAtRef.current = ctx.currentTime + 0.22;
    nextScoreAtRef.current = PREP_TIME + 0.12;
    userLevelRef.current = 0;
    touchingRef.current = false;
    runningRef.current = true;
    setRunning(true);
    setSongTime(0);
    setUserLevel(0);
    setTouching(false);
    setStats(makeStats());
    setPops([]);
    setJudge("READY");
    setDetail("follow the yellow ring");
    scheduleSong(ctx, out, startedAtRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function testSound() {
    try {
      const ctx = await ensureAudio();
      const out = outputRef.current ?? createMaster(ctx);
      outputRef.current = out;
      const now = ctx.currentTime + 0.03;
      MOTION.forEach((note, index) => playTone(ctx, out, now + index * 0.105, note.freq, 0.12, note.level));
      setJudge("SOUND");
      setDetail("crescendo to decrescendo");
    } catch (error) {
      setJudge("Audio Error");
      setDetail(error instanceof Error ? error.message : "audio unavailable");
    }
  }

  function stopGame() {
    runningRef.current = false;
    setRunning(false);
    cleanupAudio();
  }

  function pushPop(label: string, level: number, kind: JudgeKind) {
    const id = popIdRef.current + 1;
    popIdRef.current = id;
    setPops((current) => [...current.slice(-4), { id, label, level, kind }]);
    window.setTimeout(() => setPops((current) => current.filter((pop) => pop.id !== id)), 640);
  }

  function judgeTracking(sampleTime: number) {
    const round = Math.max(0, Math.min(REPEAT_COUNT - 1, Math.floor(Math.max(0, sampleTime - PREP_TIME) / ROUND_TIME)));
    const expected = targetAt(sampleTime);
    const error = Math.abs(userLevelRef.current - expected);
    setStats((current) => {
      const next = { ...current, roundScores: [...current.roundScores] };
      next.samples += 1;
      next.totalError += error;
      next.minLevel = Math.min(next.minLevel, userLevelRef.current);
      next.maxLevel = Math.max(next.maxLevel, userLevelRef.current);
      if (!touchingRef.current) {
        next.combo = 0;
        next.misses += 1;
        if (next.samples % 4 === 0) {
          setJudge("TOUCH");
          setDetail("keep your finger on the moving point");
          pushPop("TOUCH", expected, "touch");
        }
        return next;
      }
      const grade = gradeDistance(error);
      if (grade.label === "MISS") {
        next.combo = 0;
        next.misses += 1;
      } else {
        const bonus = Math.min(80, next.combo * 3);
        next.score += grade.points + bonus;
        next.roundScores[round] += grade.points + bonus;
        next.combo += 1;
        next.maxCombo = Math.max(next.maxCombo, next.combo);
        next[grade.bucket] += 1;
      }
      if (next.samples % 3 === 0 || grade.label === "MISS") {
        setJudge(grade.label);
        setDetail(`distance error ${Math.round(error * 100)}%`);
        playJudgeTone(grade.label);
        pushPop(grade.label, userLevelRef.current, grade.kind);
      }
      return next;
    });
  }

  function tick() {
    const ctx = audioRef.current;
    if (!ctx || !runningRef.current) return;
    const time = Math.max(0, ctx.currentTime - startedAtRef.current);
    setSongTime(time);
    while (time >= nextScoreAtRef.current && nextScoreAtRef.current <= TOTAL_TIME) {
      judgeTracking(nextScoreAtRef.current);
      nextScoreAtRef.current += SCORE_INTERVAL;
    }
    if (time >= TOTAL_TIME + 0.3) {
      runningRef.current = false;
      setRunning(false);
      setJudge("Session Clear");
      setDetail("session recorded");
      window.setTimeout(cleanupAudio, 360);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => cleanupAudio, []);

  function setFingerFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    const thumb = getPoint(0);
    const end = getPoint(1);
    const vx = end.x - thumb.x;
    const vy = end.y - thumb.y;
    const projected = ((xPct - thumb.x) * vx + (yPct - thumb.y) * vy) / (vx * vx + vy * vy);
    const nextLevel = Math.max(0, Math.min(1, projected));
    userLevelRef.current = nextLevel;
    setUserLevel(nextLevel);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerIdRef.current = event.pointerId;
    touchingRef.current = true;
    setTouching(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setFingerFromPointer(event);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId || !touchingRef.current) return;
    setFingerFromPointer(event);
  }

  function endTouch(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== null && pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    touchingRef.current = false;
    setTouching(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>⌁</div>
          <div>
            <h1>Pinch Crescendo</h1>
            <span>RethmHands playable sample</span>
          </div>
        </div>
        <Link className={styles.homeButton} href="/self-rehab-hand">← 게임 선택</Link>
      </header>

      <section className={styles.shell}>
        <aside className={`${styles.panel} ${styles.dashboard}`}>
          <section className={styles.songCard}>
            <h2>Pinch Distance Phrase</h2>
            <p>엄지는 고정하고 손가락을 노란 목표 링에 맞춰 벌렸다가 다시 오므립니다. 소리는 거리와 함께 커졌다가 작아집니다.</p>
            <div className={styles.metaList}>
              <div><small>Repeats</small><strong>{REPEAT_COUNT}</strong></div>
              <div><small>Length</small><strong>{Math.round(TOTAL_TIME)}s</strong></div>
              <div><small>Motion</small><strong>0-100%</strong></div>
              <div><small>Music</small><strong>cresc.</strong></div>
            </div>
            <div className={styles.meter}><div style={{ width: `${progress}%` }} /></div>
          </section>

          <section className={styles.stats}>
            <div><span>Score</span><strong>{stats.score.toLocaleString("ko-KR")}</strong></div>
            <div><span>Combo</span><strong>{stats.combo}</strong></div>
            <div><span>Match</span><strong>{match}%</strong></div>
            <div><span>Round</span><strong>{running ? currentRound + 1 : 0} / {REPEAT_COUNT}</strong></div>
          </section>

          <section className={styles.judgeCard}>
            <strong>{judge}</strong>
            <span>{detail}</span>
          </section>

          <section className={styles.trackingGrid}>
            <div><span>Target</span><strong>{Math.round(targetLevel * 100)}%</strong></div>
            <div><span>Finger</span><strong>{Math.round(userLevel * 100)}%</strong></div>
            <div><span>Range</span><strong>{rangeMin}-{rangeMax}%</strong></div>
            <div><span>Mean error</span><strong>{Math.round(meanError * 100)}%</strong></div>
          </section>

          <section className={styles.rounds}>
            {Array.from({ length: REPEAT_COUNT }).map((_, index) => (
              <div className={`${styles.roundRow} ${running && index === currentRound ? styles.activeRound : ""}`} key={index}>
                <b>{index + 1}</b>
                <span>Phrase {index + 1}</span>
                <strong>{stats.roundScores[index].toLocaleString("ko-KR")}</strong>
              </div>
            ))}
          </section>
        </aside>

        <section className={`${styles.panel} ${styles.gameCard}`}>
          <div className={styles.hud}>
            <span>Track <strong>{running ? "Playing" : "Ready"}</strong></span>
            <span>Touch <strong>{touching ? "On" : "Off"}</strong></span>
            <span>Phase <strong>{phase}</strong></span>
            <button type="button" onClick={() => void testSound()}>♪</button>
          </div>

          <section className={styles.scorePanel} aria-label="pinch crescendo score">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M 5 84 C 22 84, 28 16, 50 16 C 72 16, 78 84, 95 84" />
              <line x1={`${5 + scoreProgress * 90}`} x2={`${5 + scoreProgress * 90}`} y1="12" y2="88" />
              {MOTION.map((note, index) => (
                <circle key={`${note.name}-${index}`} cx={5 + index * 7.5} cy={84 - note.level * 68} r={index === PEAK_INDEX ? 3 : 2.2} />
              ))}
            </svg>
          </section>

          <section
            className={styles.stage}
            onPointerCancel={endTouch}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endTouch}
            ref={stageRef}
          >
            <div className={styles.phaseCard}>
              <strong>{phase}</strong>
              <span>
                {phase === "Crescendo" ? "음량이 커질수록 엄지에서 멀어집니다." : phase === "Decrescendo" ? "음량이 작아질수록 엄지 쪽으로 돌아옵니다." : "Start 후 파란 점을 잡고 노란 링을 따라갑니다."}
              </span>
              <em>{Math.round(Math.abs(userLevel - targetLevel) * 100)}%</em>
            </div>

            <svg className={styles.motionGuide} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.guidePath} d={guidePath} />
              <path className={styles.guideFill} d={guidePath} style={{ strokeDashoffset: `${(1 - targetLevel) * 136}` }} />
            </svg>

            <div className={styles.handFigure} aria-hidden="true">
              <div className={styles.wrist} />
              <div className={styles.palm} />
              <div className={styles.middleFinger} />
              <div className={styles.ringFinger} />
              <div className={styles.thumbSegment} style={{ "--tx": `${thumbPoint.x}%`, "--ty": `${thumbPoint.y}%` } as React.CSSProperties} />
              <div className={styles.indexSegment} style={{ "--fx": `${fingerPoint.x}%`, "--fy": `${fingerPoint.y}%` } as React.CSSProperties} />
            </div>

            <div className={styles.targetDot} style={{ left: `${targetPoint.x}%`, top: `${targetPoint.y}%`, scale: `${1 + targetLevel * 0.18}` }}>
              ♪
            </div>
            <div className={styles.thumbDot} style={{ left: `${thumbPoint.x}%`, top: `${thumbPoint.y}%` }}>엄지</div>
            <div className={`${styles.fingerDot} ${touching ? "" : styles.off}`} style={{ left: `${fingerPoint.x}%`, top: `${fingerPoint.y}%` }}>
              손가락
            </div>

            <div className={styles.volumeBeam} style={{ opacity: 0.2 + targetLevel * 0.72, scale: `${0.72 + targetLevel * 0.52}` }} />

            {pops.map((pop) => {
              const point = getPoint(pop.level);
              return (
                <div className={`${styles.pop} ${styles[pop.kind]}`} key={pop.id} style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                  {pop.label}
                </div>
              );
            })}

            {!running && (
              <div
                className={styles.stageMessage}
                onPointerCancel={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <div className={styles.messageCard}>
                  <h2>{judge === "Session Clear" ? "Session Clear" : "Ready"}</h2>
                  <p>엄지는 분홍 원에 고정하고, 파란 손가락 점을 잡아 노란 링을 따라 움직입니다.</p>
                  <button type="button" onClick={() => void startGame()}>Start</button>
                </div>
              </div>
            )}
            {running && <button className={styles.stopButton} type="button" onClick={stopGame}>Stop</button>}
          </section>
        </section>
      </section>
    </main>
  );
}
