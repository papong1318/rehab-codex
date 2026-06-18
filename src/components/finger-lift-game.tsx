"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./finger-lift-game.module.css";

type ScaleNote = { name: string; freq: number; level: number };
type TargetEvent = {
  id: number;
  round: number;
  type: "lift" | "down";
  label: string;
  noteName: string;
  level: number;
  time: number;
  judged: boolean;
  actionTime: number | null;
};
type Feedback = { id: number; label: string; detail: string; level: number; kind: "perfect" | "great" | "good" | "miss" | "hold" };
type Stats = {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  perfect: number;
  great: number;
  good: number;
  roundScores: number[];
};

const REPEAT_COUNT = 5;
const STEP_TIME = 0.56;
const REST_TIME = 0.78;
const PREP_TIME = 0.7;
const HIT_WINDOW = 0.45;
const SCALE: ScaleNote[] = [
  { name: "C", freq: 261.63, level: 0 },
  { name: "D", freq: 293.66, level: 0.2 },
  { name: "E", freq: 329.63, level: 0.4 },
  { name: "F", freq: 349.23, level: 0.6 },
  { name: "G", freq: 392, level: 0.8 },
  { name: "A", freq: 440, level: 1 },
  { name: "G", freq: 392, level: 0.8 },
  { name: "F", freq: 349.23, level: 0.6 },
  { name: "E", freq: 329.63, level: 0.4 },
  { name: "D", freq: 293.66, level: 0.2 },
  { name: "C", freq: 261.63, level: 0 },
];
const PHRASE_TIME = (SCALE.length - 1) * STEP_TIME;
const ROUND_TIME = PHRASE_TIME + REST_TIME;
const TOTAL_TIME = PREP_TIME + ROUND_TIME * REPEAT_COUNT;

function makeStats(): Stats {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    perfect: 0,
    great: 0,
    good: 0,
    roundScores: Array(REPEAT_COUNT).fill(0),
  };
}

function buildTargets(): TargetEvent[] {
  const events: TargetEvent[] = [];
  for (let round = 0; round < REPEAT_COUNT; round += 1) {
    events.push({
      id: events.length,
      round,
      type: "lift",
      label: "LIFT",
      noteName: "C to A",
      level: 1,
      time: PREP_TIME + round * ROUND_TIME,
      judged: false,
      actionTime: null,
    });
    events.push({
      id: events.length,
      round,
      type: "down",
      label: "DOWN",
      noteName: "final C",
      level: 0,
      time: PREP_TIME + round * ROUND_TIME + 10 * STEP_TIME,
      judged: false,
      actionTime: null,
    });
  }
  return events;
}

function targetAt(time: number) {
  if (time < PREP_TIME) return 0;
  const local = time - PREP_TIME;
  const round = Math.floor(local / ROUND_TIME);
  if (round >= REPEAT_COUNT) return 0;
  const within = local - round * ROUND_TIME;
  if (within >= PHRASE_TIME) return 0;
  const index = Math.floor(within / STEP_TIME);
  const frac = (within - index * STEP_TIME) / STEP_TIME;
  const start = SCALE[Math.min(index, SCALE.length - 1)].level;
  const end = SCALE[Math.min(index + 1, SCALE.length - 1)].level;
  return start + (end - start) * frac;
}

function createAudioContext() {
  const AudioClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioClass ? new AudioClass() : null;
}

function createMaster(ctx: AudioContext) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-20, ctx.currentTime);
  compressor.knee.setValueAtTime(20, ctx.currentTime);
  compressor.ratio.setValueAtTime(7, ctx.currentTime);
  compressor.attack.setValueAtTime(0.004, ctx.currentTime);
  compressor.release.setValueAtTime(0.18, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.9, ctx.currentTime);
  gain.connect(compressor);
  compressor.connect(ctx.destination);
  return gain;
}

function playTone(ctx: AudioContext, out: AudioNode, time: number, freq: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  overtone.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  overtone.frequency.setValueAtTime(freq * 2, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain);
  overtone.connect(gain);
  gain.connect(out);
  osc.start(time);
  overtone.start(time);
  osc.stop(time + duration + 0.05);
  overtone.stop(time + duration + 0.05);
}

function grade(error: number) {
  if (error <= 0.06) return { label: "PERFECT", points: 1000, bucket: "perfect" as const, kind: "perfect" as const };
  if (error <= 0.13) return { label: "GREAT", points: 650, bucket: "great" as const, kind: "great" as const };
  if (error <= 0.22) return { label: "GOOD", points: 350, bucket: "good" as const, kind: "good" as const };
  return { label: "MISS", points: 0, bucket: "miss" as const, kind: "miss" as const };
}

export default function FingerLiftGame() {
  const [running, setRunning] = useState(false);
  const [songTime, setSongTime] = useState(0);
  const [holding, setHolding] = useState(false);
  const [events, setEvents] = useState<TargetEvent[]>(() => buildTargets());
  const [stats, setStats] = useState<Stats>(() => makeStats());
  const [judge, setJudge] = useState("READY");
  const [detail, setDetail] = useState("hold the pad");
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const outputRef = useRef<AudioNode | null>(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const feedbackIdRef = useRef(0);
  const holdingRef = useRef(false);

  const targetLevel = targetAt(songTime);
  const userLevel = holding ? 0 : 1;
  const currentRound = Math.max(0, Math.min(REPEAT_COUNT - 1, Math.floor(Math.max(0, songTime - PREP_TIME) / ROUND_TIME)));
  const progress = Math.min(100, (songTime / TOTAL_TIME) * 100);
  const judged = stats.hits + stats.misses;
  const accuracy = judged ? Math.round(((stats.perfect + stats.great * 0.74 + stats.good * 0.48) / judged) * 100) : 0;
  const nextEvent = events.find((event) => !event.judged);
  const cueText = targetLevel > 0.72 ? "화면에서 멀리 떼기" : targetLevel > 0.32 ? "수직으로 조금 더 떼기" : "화면 가까이";
  const actionText = nextEvent?.type === "down" ? "마지막 C에서 화면을 다시 누르기" : "올라가는 소리에 맞춰 화면에서 떼기";

  const scalePoints = useMemo(() => {
    return SCALE.map((note, index) => {
      const x = 7 + index * 8.6;
      const y = 86 - note.level * 72;
      return `${x},${y}`;
    }).join(" ");
  }, []);

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

  function scheduleScale(ctx: AudioContext, out: AudioNode, baseTime: number) {
    for (let round = 0; round < REPEAT_COUNT; round += 1) {
      SCALE.forEach((note, index) => {
        const t = baseTime + PREP_TIME + round * ROUND_TIME + index * STEP_TIME;
        playTone(ctx, out, t, note.freq, STEP_TIME * 0.64, index === 0 || index === 5 ? 0.28 : 0.22);
        if (index === 0) playTone(ctx, out, t, 146.83, 0.16, 0.18);
      });
    }
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
    startedAtRef.current = ctx.currentTime + 0.26;
    holdingRef.current = false;
    setHolding(false);
    setSongTime(0);
    setEvents(buildTargets());
    setStats(makeStats());
    setFeedbacks([]);
    setJudge("READY");
    setDetail("press and hold the pad");
    setRunning(true);
    scheduleScale(ctx, out, startedAtRef.current);
  }

  function stopGame() {
    setRunning(false);
    cleanupAudio();
  }

  function pushFeedback(label: string, nextDetail: string, level: number, kind: Feedback["kind"]) {
    const id = feedbackIdRef.current + 1;
    feedbackIdRef.current = id;
    setFeedbacks((current) => [...current.slice(-4), { id, label, detail: nextDetail, level, kind }]);
    window.setTimeout(() => setFeedbacks((current) => current.filter((feedback) => feedback.id !== id)), 720);
  }

  function playJudgeTone(label: string) {
    const ctx = audioRef.current;
    const out = outputRef.current;
    if (!ctx || !out || ctx.state === "closed") return;
    const now = ctx.currentTime;
    const freq = label === "PERFECT" ? 1046.5 : label === "GREAT" ? 783.99 : label === "GOOD" ? 659.25 : 130.81;
    playTone(ctx, out, now, freq, label === "MISS" ? 0.14 : 0.11, label === "MISS" ? 0.13 : 0.17);
  }

  function recordAction(type: "lift" | "down") {
    if (!running) return;
    const time = Math.max(0, (audioRef.current?.currentTime ?? 0) - startedAtRef.current);
    setEvents((current) => {
      const index = current.findIndex((event) => event.type === type && !event.judged && event.actionTime === null);
      if (index < 0) return current;
      if (type === "down") {
        const target = current[index];
        const liftEvent = current.find((event) => event.round === target.round && event.type === "lift");
        if (!liftEvent || (!liftEvent.judged && liftEvent.actionTime === null)) {
          setJudge("HOLD");
          setDetail("release first");
          pushFeedback("HOLD", "release first", 0.2, "hold");
          return current;
        }
      }
      const next = current.map((event, eventIndex) => (eventIndex === index ? { ...event, actionTime: time } : event));
      setJudge(type === "lift" ? "LIFT" : "DOWN");
      setDetail(type === "lift" ? "release noted" : "touch noted");
      return next;
    });
  }

  function tick() {
    const ctx = audioRef.current;
    if (!ctx || !running) return;
    const time = Math.max(0, ctx.currentTime - startedAtRef.current);
    setSongTime(time);
    setEvents((current) => {
      let changed = false;
      let nextStats: Stats | null = null;
      const next = current.map((event) => {
        if (event.judged || time - event.time <= HIT_WINDOW) return event;
        changed = true;
        if (event.actionTime === null || (event.type === "lift" && holdingRef.current) || (event.type === "down" && !holdingRef.current)) {
          nextStats = nextStats ?? { ...stats, roundScores: [...stats.roundScores] };
          nextStats.combo = 0;
          nextStats.misses += 1;
          setJudge("MISS");
          setDetail(event.actionTime === null ? `${event.label} missed` : event.type === "lift" ? "not lifted" : "not touching");
          pushFeedback("MISS", event.label, event.level, "miss");
          playJudgeTone("MISS");
          return { ...event, judged: true };
        }
        const offset = event.actionTime - event.time;
        const result = grade(Math.abs(offset));
        nextStats = nextStats ?? { ...stats, roundScores: [...stats.roundScores] };
        if (result.label === "MISS") {
          nextStats.combo = 0;
          nextStats.misses += 1;
        } else {
          const bonus = Math.min(220, nextStats.combo * 7);
          nextStats.score += result.points + bonus;
          nextStats.roundScores[event.round] += result.points + bonus;
          nextStats.combo += 1;
          nextStats.maxCombo = Math.max(nextStats.maxCombo, nextStats.combo);
          nextStats.hits += 1;
          if (result.bucket === "perfect") nextStats.perfect += 1;
          if (result.bucket === "great") nextStats.great += 1;
          if (result.bucket === "good") nextStats.good += 1;
        }
        const direction = offset < 0 ? "early" : "late";
        setJudge(result.label);
        setDetail(`${event.label} ${event.noteName} · ${Math.round(Math.abs(offset) * 1000)}ms ${direction}`);
        pushFeedback(result.label, event.label, event.level, result.kind);
        playJudgeTone(result.label);
        return { ...event, judged: true };
      });
      if (nextStats) setStats(nextStats);
      return changed ? next : current;
    });
    if (time >= TOTAL_TIME + 0.55 || events.every((event) => event.judged)) {
      setRunning(false);
      setJudge("Session Clear");
      setDetail(`Score ${stats.score.toLocaleString("ko-KR")}`);
      window.setTimeout(cleanupAudio, 360);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (!running) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, events, stats]);

  useEffect(() => cleanupAudio, []);

  function handleDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    holdingRef.current = true;
    setHolding(true);
    recordAction("down");
  }

  function handleUp() {
    holdingRef.current = false;
    setHolding(false);
    recordAction("lift");
  }

  function releasePointer(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>↥</div>
          <div>
            <h1>Finger Lift Score</h1>
            <span>RethmHands playable sample</span>
          </div>
        </div>
        <Link className={styles.homeButton} href="/self-rehab-hand">← 게임 선택</Link>
      </header>

      <section className={styles.shell}>
        <aside className={`${styles.panel} ${styles.dashboard}`}>
          <section className={styles.songCard}>
            <h2>Ascending Lift Cue</h2>
            <p>패드를 누른 상태에서 시작하고, 음계가 올라가면 손가락을 떼었다가 마지막 C에서 다시 누릅니다.</p>
            <div className={styles.metaList}>
              <div><small>Repeats</small><strong>{REPEAT_COUNT}</strong></div>
              <div><small>Length</small><strong>{Math.round(TOTAL_TIME)}s</strong></div>
              <div><small>Targets</small><strong>{REPEAT_COUNT * 2}</strong></div>
              <div><small>Mode</small><strong>Lift / Down</strong></div>
            </div>
            <div className={styles.meter}><div style={{ width: `${progress}%` }} /></div>
          </section>

          <section className={styles.stats}>
            <div><span>Score</span><strong>{stats.score.toLocaleString("ko-KR")}</strong></div>
            <div><span>Combo</span><strong>{stats.combo}</strong></div>
            <div><span>Accuracy</span><strong>{accuracy}%</strong></div>
            <div><span>Round</span><strong>{running ? currentRound + 1 : 0} / {REPEAT_COUNT}</strong></div>
          </section>

          <section className={styles.judgeCard}>
            <strong>{judge}</strong>
            <span>{detail}</span>
          </section>

          <section className={styles.rounds}>
            {Array.from({ length: REPEAT_COUNT }).map((_, index) => (
              <div className={`${styles.roundRow} ${running && index === currentRound ? styles.activeRound : ""}`} key={index}>
                <b>{index + 1}</b>
                <span>Repeat {index + 1}</span>
                <strong>{stats.roundScores[index].toLocaleString("ko-KR")}</strong>
              </div>
            ))}
          </section>
        </aside>

        <section className={`${styles.panel} ${styles.gameCard}`}>
          <div className={styles.hud}>
            <span>Track <strong>{running ? "Playing" : "Ready"}</strong></span>
            <span>Hold <strong>{holding ? "On" : "Off"}</strong></span>
            <span>Next <strong>{nextEvent ? nextEvent.label : "Clear"}</strong></span>
          </div>

          <section className={styles.stage}>
            <svg className={styles.scoreLine} viewBox="0 0 100 100" aria-hidden="true">
              <polyline points={scalePoints} />
              {SCALE.map((note, index) => (
                <circle key={`${note.name}-${index}`} cx={7 + index * 8.6} cy={86 - note.level * 72} r="1.8" />
              ))}
            </svg>

            <div className={styles.liftArea}>
              <div className={styles.heightLabels} aria-hidden="true">
                <span>높게</span>
                <span>중간</span>
                <span>패드</span>
              </div>
              <div className={styles.cueText}>
                <strong>{cueText}</strong>
                <span>{actionText}</span>
              </div>
              <div className={styles.handGuide} aria-hidden="true">
                <div className={styles.screenPlane}>
                  <span>태블릿 화면</span>
                </div>
                <div className={styles.liftRail} />
                <div className={styles.handGhost} style={{ "--level": targetLevel } as React.CSSProperties}>
                  <div className={styles.sideFinger} />
                  <div className={styles.fingertip} />
                </div>
                <div className={`${styles.handLive} ${holding ? styles.touchingHand : styles.liftedHand}`} style={{ "--level": userLevel } as React.CSSProperties}>
                  <div className={styles.sideFinger} />
                  <div className={styles.fingertip} />
                </div>
                <div className={styles.contactGlow} />
              </div>
              <div className={styles.targetLine} style={{ "--level": targetLevel } as React.CSSProperties} />
              <div className={styles.fingerLine} style={{ "--level": userLevel } as React.CSSProperties} />
              <div className={styles.targetDot} style={{ "--level": targetLevel } as React.CSSProperties}>Cue</div>
              <div className={`${styles.fingerDot} ${holding ? "" : styles.lifted}`} style={{ "--level": userLevel } as React.CSSProperties}>
                {holding ? "Touch" : "Lift"}
              </div>
              {feedbacks.map((feedback) => (
                <div
                  className={`${styles.feedback} ${styles[feedback.kind]}`}
                  key={feedback.id}
                  style={{ "--level": feedback.level } as React.CSSProperties}
                >
                  <strong>{feedback.label}</strong>
                  <span>{feedback.detail}</span>
                </div>
              ))}
            </div>

            <button
              className={`${styles.fingerPad} ${holding ? styles.holding : ""}`}
              onPointerCancel={handleUp}
              onPointerDown={handleDown}
              onPointerLeave={(event) => {
                if (holding) handleUp();
                releasePointer(event);
              }}
              onPointerUp={(event) => {
                handleUp();
                releasePointer(event);
              }}
              type="button"
            >
              <strong>{holding ? "누르는 중" : "손가락 패드"}</strong>
              <span>{running ? "올라가는 음에 맞춰 화면에서 떼고, 마지막 C에서 다시 누르기" : "Start 후 누른 상태로 준비"}</span>
            </button>

            {!running && (
              <div className={styles.stageMessage}>
                <div className={styles.messageCard}>
                  <h2>{judge === "Session Clear" ? "Session Clear" : "Ready"}</h2>
                  <p>Start를 누른 뒤 패드를 누른 상태로 시작합니다. 음이 올라가면 손끝을 화면에서 수직으로 떼고 마지막 C에서 다시 누릅니다.</p>
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
