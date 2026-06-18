"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./self-rehab-hand-app.module.css";

type GameId = "rhythm" | "lift" | "pinch";
type CheckKey = "pain" | "fatigue" | "control" | "dizzy";

const games = {
  rhythm: {
    title: "Rhythm Tap Lab",
    subtitle: "96 BPM 실시간 합성 루프",
    mark: "♪",
    mode: "RAS 리듬 동조",
    bpm: 96,
    accent: "#38d9c0",
    alt: "#ffcb5b",
    description: "노트가 하단 hit line에 닿는 순간 네 손가락 패드를 탭합니다.",
  },
  lift: {
    title: "Finger Lift Score",
    subtitle: "ascending and descending scale control",
    mark: "↕",
    mode: "PSE 음고-움직임 매핑",
    bpm: 76,
    accent: "#41d6b6",
    alt: "#ff725e",
    description: "상행 음계에서 손가락을 떼고, 하행 마지막 C에서 다시 붙입니다.",
  },
  pinch: {
    title: "Pinch Crescendo",
    subtitle: "fixed thumb and one moving finger",
    mark: "⌁",
    mode: "TIMP 크레센도 조절",
    bpm: 68,
    accent: "#f3a0eb",
    alt: "#6f97ff",
    description: "소리가 커지면 손가락을 멀리, 작아지면 엄지 쪽으로 돌아옵니다.",
  },
} satisfies Record<GameId, {
  title: string;
  subtitle: string;
  mark: string;
  mode: string;
  bpm: number;
  accent: string;
  alt: string;
  description: string;
}>;

const laneColors = ["#38d9c0", "#ffcb5b", "#5f8dff", "#ff6f61"];
const laneLabels = ["검지", "중지", "약지", "소지"];
const rhythmChart = [0, 1, 2, 3, 1, 0, 2, 3, 0, 2, 1, 3, 0, 1, 2, 3];
const scale = [
  { name: "C", level: 0.08, freq: 261.63 },
  { name: "D", level: 0.24, freq: 293.66 },
  { name: "E", level: 0.4, freq: 329.63 },
  { name: "F", level: 0.55, freq: 349.23 },
  { name: "G", level: 0.72, freq: 392 },
  { name: "A", level: 0.88, freq: 440 },
  { name: "G", level: 0.72, freq: 392 },
  { name: "E", level: 0.4, freq: 329.63 },
  { name: "C", level: 0.08, freq: 261.63 },
];
const pinchMotion = [
  { mark: "p", level: 0.08, freq: 246.94, gain: 0.05 },
  { mark: "mp", level: 0.18, freq: 277.18, gain: 0.08 },
  { mark: "mf", level: 0.34, freq: 311.13, gain: 0.13 },
  { mark: "f", level: 0.58, freq: 369.99, gain: 0.22 },
  { mark: "ff", level: 0.86, freq: 440, gain: 0.36 },
  { mark: "f", level: 0.62, freq: 369.99, gain: 0.21 },
  { mark: "mp", level: 0.24, freq: 277.18, gain: 0.08 },
  { mark: "p", level: 0.08, freq: 246.94, gain: 0.045 },
];

const checks: Record<CheckKey, { label: string; options: string[] }> = {
  pain: { label: "통증", options: ["없음", "약간", "있음"] },
  fatigue: { label: "피로", options: ["낮음", "보통", "높음"] },
  control: { label: "손 조절감", options: ["좋음", "흔들림", "어려움"] },
  dizzy: { label: "어지러움", options: ["없음", "약간", "있음"] },
};

const initialCheck: Record<CheckKey, string> = {
  pain: "없음",
  fatigue: "낮음",
  control: "좋음",
  dizzy: "없음",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function format(value: number) {
  return value.toLocaleString("ko-KR");
}

function createContext() {
  if (typeof window === "undefined") return null;
  const AudioClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return AudioClass ? new AudioClass() : null;
}

function playTone(ctx: AudioContext, time: number, freq: number, duration: number, gainValue: number, type: OscillatorType = "triangle") {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = type;
  overtone.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  overtone.frequency.setValueAtTime(freq * 2, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800 + gainValue * 2600, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(filter);
  overtone.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  overtone.start(time);
  osc.stop(time + duration + 0.04);
  overtone.stop(time + duration + 0.04);
}

function playNoise(ctx: AudioContext, time: number, duration: number, gainValue: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, 2);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(5200, time);
  gain.gain.setValueAtTime(gainValue, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(time);
  source.stop(time + duration);
}

export default function SelfRehabHandApp() {
  const [gameId, setGameId] = useState<GameId>("rhythm");
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [judgement, setJudgement] = useState("READY");
  const [detail, setDetail] = useState("start the musical cue");
  const [pressedLane, setPressedLane] = useState<number | null>(null);
  const [fingerDown, setFingerDown] = useState(false);
  const [pinchLevel, setPinchLevel] = useState(0.08);
  const [selfCheck, setSelfCheck] = useState(initialCheck);
  const [checkOpen, setCheckOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const startedAt = useRef(0);
  const pointerId = useRef<number | null>(null);

  const game = games[gameId];
  const accuracy = attempts ? Math.round((hits / attempts) * 100) : 0;
  const stepMs = 60000 / game.bpm;
  const currentScale = scale[beat % scale.length];
  const currentPinch = pinchMotion[beat % pinchMotion.length];
  const expectedLane = rhythmChart[beat % rhythmChart.length];

  const restScore = useMemo(() => {
    let risk = 0;
    if (selfCheck.pain === "약간") risk += 1;
    if (selfCheck.pain === "있음") risk += 2;
    if (selfCheck.fatigue === "보통") risk += 1;
    if (selfCheck.fatigue === "높음") risk += 2;
    if (selfCheck.control === "흔들림") risk += 1;
    if (selfCheck.control === "어려움") risk += 2;
    if (selfCheck.dizzy === "약간") risk += 1;
    if (selfCheck.dizzy === "있음") risk += 3;
    if (attempts >= 12 && accuracy < 55) risk += 1;
    return risk;
  }, [accuracy, attempts, selfCheck]);

  const restText = restScore >= 4 ? "휴식 필요" : restScore >= 2 ? "휴식 권장" : "진행 가능";

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setBeat((value) => {
        const next = value + 1;
        cueBeat(next);
        if (gameId === "pinch") judgePinchSample(next);
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [gameId, running, stepMs, pinchLevel]);

  function ensureAudio() {
    if (!audioRef.current || audioRef.current.state === "closed") {
      audioRef.current = createContext();
    }
    if (audioRef.current?.state === "suspended") {
      void audioRef.current.resume();
    }
    return audioRef.current;
  }

  function cueBeat(nextBeat = beat) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;
    if (gameId === "rhythm") {
      const lane = rhythmChart[nextBeat % rhythmChart.length];
      playTone(ctx, now, [392, 494, 587, 659][lane], 0.11, 0.12, "square");
      if (nextBeat % 2 === 0) playNoise(ctx, now + 0.02, 0.04, 0.045);
      return;
    }
    if (gameId === "lift") {
      const note = scale[nextBeat % scale.length];
      playTone(ctx, now, note.freq, 0.2, note.level > 0.7 ? 0.24 : 0.16);
      return;
    }
    const motion = pinchMotion[nextBeat % pinchMotion.length];
    playCrescendoTone(ctx, now, motion.freq, motion.gain, motion.level);
  }

  function playCrescendoTone(ctx: AudioContext, time: number, freq: number, gainValue: number, level: number) {
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    osc.type = "triangle";
    sub.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    sub.frequency.setValueAtTime(freq / 2, time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650 + level * 3900, time);
    delay.delayTime.setValueAtTime(0.085, time);
    feedback.gain.setValueAtTime(0.08 + level * 0.08, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.045);
    gain.gain.linearRampToValueAtTime(gainValue * 0.72, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(ctx.destination);
    osc.start(time);
    sub.start(time);
    osc.stop(time + 0.43);
    sub.stop(time + 0.43);
  }

  function testSound() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime + 0.03;
    if (gameId === "pinch") {
      pinchMotion.forEach((note, index) => {
        playCrescendoTone(ctx, now + index * 0.16, note.freq, note.gain, note.level);
      });
      setJudgement("SOUND");
      setDetail("p → ff → p 강약 테스트");
      return;
    }
    if (gameId === "lift") {
      scale.forEach((note, index) => playTone(ctx, now + index * 0.11, note.freq, 0.14, 0.16));
    } else {
      rhythmChart.slice(0, 8).forEach((lane, index) => playTone(ctx, now + index * 0.1, [392, 494, 587, 659][lane], 0.08, 0.11, "square"));
    }
    setJudgement("SOUND");
    setDetail("musical cue test");
  }

  function startGame() {
    if (restScore >= 4) {
      setCheckOpen(true);
      setJudgement("REST");
      setDetail("오늘은 휴식 후 다시 시도하세요.");
      return;
    }
    const ctx = ensureAudio();
    if (!ctx) return;
    startedAt.current = ctx.currentTime;
    setRunning(true);
    setBeat(0);
    setScore(0);
    setCombo(0);
    setHits(0);
    setAttempts(0);
    setJudgement("READY");
    setDetail(game.description);
    cueBeat(0);
  }

  function stopGame() {
    setRunning(false);
    audioRef.current?.close();
    audioRef.current = null;
  }

  function switchGame(next: GameId) {
    stopGame();
    setGameId(next);
    setBeat(0);
    setScore(0);
    setCombo(0);
    setHits(0);
    setAttempts(0);
    setJudgement("READY");
    setDetail(games[next].description);
    setFingerDown(false);
    setPinchLevel(0.08);
  }

  function award(points: number, label = "GREAT") {
    setScore((value) => value + points + Math.min(combo * 7, 180));
    setCombo((value) => value + 1);
    setHits((value) => value + 1);
    setAttempts((value) => value + 1);
    setJudgement(label);
    setDetail(`+${points}`);
  }

  function miss(copy = "try again") {
    setCombo(0);
    setAttempts((value) => value + 1);
    setJudgement("MISS");
    setDetail(copy);
    const ctx = ensureAudio();
    if (ctx) playTone(ctx, ctx.currentTime, 92, 0.1, 0.1, "sawtooth");
  }

  function tapLane(lane: number) {
    setPressedLane(lane);
    window.setTimeout(() => setPressedLane(null), 120);
    if (!running || gameId !== "rhythm") return;
    if (lane === expectedLane) {
      award(650, lane === rhythmChart[(beat + 1) % rhythmChart.length] ? "PERFECT" : "GREAT");
      cueHit(lane);
    } else {
      miss("wrong lane");
    }
  }

  function cueHit(lane: number) {
    const ctx = ensureAudio();
    if (!ctx) return;
    playTone(ctx, ctx.currentTime, [784, 880, 988, 1175][lane], 0.1, 0.16);
  }

  function handleLiftDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFingerDown(true);
    if (!running || gameId !== "lift") return;
    const shouldTouch = beat % scale.length >= 6 || beat % scale.length === 0;
    shouldTouch ? award(720, "DOWN") : miss("release on ascent");
  }

  function handleLiftUp() {
    setFingerDown(false);
    if (!running || gameId !== "lift") return;
    const shouldLift = beat % scale.length >= 1 && beat % scale.length <= 5;
    shouldLift ? award(820, "LIFT") : miss("touch at final C");
  }

  function setPinchFromPointer(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = clamp((event.clientX - rect.left) / rect.width, 0.06, 0.92);
    setPinchLevel(next);
  }

  function judgePinchSample(nextBeat: number) {
    const target = pinchMotion[nextBeat % pinchMotion.length].level;
    const diff = Math.abs(pinchLevel - target);
    if (diff < 0.08) award(92, "PERFECT");
    else if (diff < 0.18) award(58, "GOOD");
    else miss(`distance error ${Math.round(diff * 100)}%`);
  }

  function renderStage() {
    if (gameId === "lift") {
      return (
        <section className={styles.liftArea}>
          <div className={styles.liftMeter}>
            <span className={styles.targetLine} style={{ "--level": currentScale.level } as React.CSSProperties} />
            <span className={styles.fingerLine} style={{ "--level": fingerDown ? 0.08 : 0.88 } as React.CSSProperties} />
            <em className={styles.meterTop}>Lift</em>
            <em className={styles.meterBottom}>Touch</em>
          </div>
          <div
            className={styles.fingerPad}
            onPointerDown={handleLiftDown}
            onPointerUp={handleLiftUp}
            onPointerCancel={handleLiftUp}
          >
            <svg className={styles.tracePath} viewBox="0 0 600 390" aria-hidden="true">
              <polyline points={scale.map((note, index) => `${34 + index * 64},${360 - note.level * 320}`).join(" ")} />
            </svg>
            <span className={styles.targetDot} style={{ "--target": currentScale.level } as React.CSSProperties}>{currentScale.name}</span>
            <span className={`${styles.fingerDot} ${fingerDown ? "" : styles.off}`} style={{ "--finger": fingerDown ? 0.08 : 0.88 } as React.CSSProperties}>
              {fingerDown ? "Touch" : "Lift"}
            </span>
          </div>
        </section>
      );
    }

    if (gameId === "pinch") {
      const target = currentPinch.level;
      return (
        <section
          className={styles.pinchStage}
          onPointerDown={(event) => {
            pointerId.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            setPinchFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (pointerId.current === event.pointerId) setPinchFromPointer(event);
          }}
          onPointerUp={() => { pointerId.current = null; }}
          onPointerCancel={() => { pointerId.current = null; }}
        >
          <div className={styles.phaseCard}>
            <div>
              <strong>{beat % pinchMotion.length <= 4 ? "Crescendo" : "Decrescendo"}</strong>
              <span>{currentPinch.mark} · 음량 {Math.round(currentPinch.gain * 100)}%</span>
            </div>
            <b>{Math.round(Math.abs(pinchLevel - target) * 100)}%</b>
          </div>
          <svg className={styles.motionGuide} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.guidePath} d="M 12 76 Q 48 12 88 26" />
            <path className={styles.guideFill} d="M 12 76 Q 48 12 88 26" style={{ strokeDashoffset: `${100 - target * 100}` }} />
          </svg>
          <div className={styles.handFigure}>
            <span className={styles.wrist} />
            <span className={styles.palm} />
            <span className={styles.middleFinger} />
            <span className={styles.ringFinger} />
            <span className={styles.indexFinger} style={{ "--level": pinchLevel } as React.CSSProperties} />
            <span className={styles.thumbShape} />
          </div>
          <span className={styles.thumbDot}>엄지</span>
          <span className={styles.targetPinchDot} style={{ "--level": target } as React.CSSProperties}>목표</span>
          <span className={styles.touchDot} style={{ "--level": pinchLevel } as React.CSSProperties}>손가락</span>
        </section>
      );
    }

    return (
      <section className={styles.rhythmStage}>
        <div className={styles.lanes}>
          {laneLabels.map((label, index) => (
            <span
              key={label}
              className={`${styles.lane} ${expectedLane === index ? styles.activeLane : ""}`}
              style={{ "--lane-color": laneColors[index] } as React.CSSProperties}
            />
          ))}
        </div>
        <span className={styles.hitZone} />
        <span className={styles.hitLine} />
        {rhythmChart.slice(0, 10).map((lane, index) => (
          <span
            key={`${lane}-${index}`}
            className={`${styles.note} ${index === beat % rhythmChart.length ? styles.currentNote : ""}`}
            style={{
              "--lane": lane,
              "--note-color": laneColors[lane],
              "--delay": index,
            } as React.CSSProperties}
          />
        ))}
        <div className={styles.padRow}>
          {laneLabels.map((label, index) => (
            <button
              key={label}
              className={`${styles.pad} ${pressedLane === index ? styles.pressed : ""}`}
              style={{ "--pad-color": laneColors[index] } as React.CSSProperties}
              type="button"
              onPointerDown={() => tapLane(index)}
            >
              <strong>{index + 1}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className={styles.page} style={{ "--accent": game.accent, "--alt": game.alt } as React.CSSProperties}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>{game.mark}</span>
          <div>
            <h1>{game.title}</h1>
            <span>{game.subtitle}</span>
          </div>
        </div>
        <div className={styles.transport}>
          <button className={styles.primaryButton} type="button" onClick={startGame}>Start</button>
          <button type="button" onClick={testSound}>♪</button>
          <button type="button" onClick={stopGame}>Ⅱ</button>
          <button type="button" onClick={startGame}>↺</button>
        </div>
      </header>

      <section className={styles.shell}>
        <aside className={styles.dashboard}>
          <section className={styles.songCard}>
            <h2>{game.mode}</h2>
            <p>{game.description}</p>
            <div className={styles.gameTabs}>
              {(Object.keys(games) as GameId[]).map((id) => (
                <button
                  key={id}
                  className={id === gameId ? styles.activeTab : ""}
                  type="button"
                  onClick={() => switchGame(id)}
                >
                  {games[id].title}
                </button>
              ))}
            </div>
            <div className={styles.metaList}>
              <div><small>BPM</small><strong>{game.bpm}</strong></div>
              <div><small>Mode</small><strong>{gameId === "rhythm" ? "4 Lane" : gameId === "lift" ? "Release" : "Cresc."}</strong></div>
              <div><small>Score</small><strong>{format(score)}</strong></div>
              <div><small>Rest</small><strong>{restText}</strong></div>
            </div>
            <div className={styles.progress}><span style={{ width: `${Math.min(100, (beat % 16) * 6.25)}%` }} /></div>
          </section>

          <section className={styles.stats}>
            <div><span>Score</span><strong>{format(score)}</strong></div>
            <div><span>Combo</span><strong>{combo}</strong></div>
            <div><span>Accuracy</span><strong>{accuracy}%</strong></div>
            <div><span>Hits</span><strong>{hits}/{attempts}</strong></div>
          </section>

          <section className={styles.judgeCard}>
            <strong>{judgement}</strong>
            <span>{detail}</span>
          </section>

          <section className={`${styles.checkPanel} ${checkOpen ? styles.openCheck : ""}`}>
            <button type="button" onClick={() => setCheckOpen((value) => !value)}>세션 후 상태 기록</button>
            <div>
              {(Object.keys(checks) as CheckKey[]).map((key) => (
                <label key={key}>
                  <span>{checks[key].label}</span>
                  <select value={selfCheck[key]} onChange={(event) => setSelfCheck((value) => ({ ...value, [key]: event.target.value }))}>
                    {checks[key].options.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>
        </aside>

        <section className={styles.gameCard}>
          <div className={styles.hud}>
            <span>Track <strong>{running ? "Playing" : "Ready"}</strong></span>
            <span>Audio <strong>{audioRef.current ? "On" : "Ready"}</strong></span>
            <span>Phrase <strong>{(beat % 8) + 1}/8</strong></span>
            <span>Best <strong>{format(score)}</strong></span>
          </div>
          <section className={styles.scorePanel}>
            <svg className={styles.scoreBoard} viewBox="0 0 720 160" aria-label="악보">
              {[0, 1, 2, 3, 4].map((line) => (
                <line className={styles.staffLine} key={line} x1="24" x2="696" y1={42 + line * 16} y2={42 + line * 16} />
              ))}
              <polyline
                className={styles.phrasePath}
                points={(gameId === "pinch" ? pinchMotion : scale).map((note, index) => `${44 + index * 84},${128 - note.level * 86}`).join(" ")}
              />
              {(gameId === "pinch" ? pinchMotion : scale).map((note, index) => (
                <ellipse
                  className={`${styles.noteHead} ${index === beat % (gameId === "pinch" ? pinchMotion.length : scale.length) ? styles.playNote : ""}`}
                  key={index}
                  cx={44 + index * 84}
                  cy={128 - note.level * 86}
                  rx="10"
                  ry="7"
                />
              ))}
              {gameId === "pinch" && (
                <>
                  <path className={styles.hairpin} d="M 52 136 L 360 96 L 668 136" />
                  <text className={styles.hairpinLabel} x="52" y="150">p</text>
                  <text className={styles.hairpinLabel} x="342" y="88">ff</text>
                  <text className={styles.hairpinLabel} x="652" y="150">p</text>
                </>
              )}
            </svg>
          </section>
          <section className={styles.gameStage}>{renderStage()}</section>
        </section>
      </section>
    </main>
  );
}
