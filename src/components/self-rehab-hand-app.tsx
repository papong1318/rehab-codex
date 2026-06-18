"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./self-rehab-hand-app.module.css";

type GameId = "tap" | "lift" | "pinch";
type CheckKey = "pain" | "fatigue" | "control" | "dizzy";

type GameSpec = {
  id: GameId;
  name: string;
  short: string;
  technique: string;
  bpm: number;
  accent: string;
  cue: string;
  pattern: string[];
  notes: number[];
};

const games: GameSpec[] = [
  {
    id: "tap",
    name: "리듬탭루프",
    short: "Rhythm Tap Loop",
    technique: "RAS 기반 리듬 동조",
    bpm: 96,
    accent: "#18b7a4",
    cue: "비트가 손가락 패드에 닿는 순간 누르기",
    pattern: ["검", "중", "약", "소", "중", "약", "검", "소"],
    notes: [392, 440, 494, 587, 440, 494, 392, 587],
  },
  {
    id: "lift",
    name: "핑거리프트스코어",
    short: "Finger Lift Score",
    technique: "PSE 기반 음고-움직임 매핑",
    bpm: 76,
    accent: "#ff8a5c",
    cue: "상행 음계에서 손가락을 들고 하행 종지에서 내려놓기",
    pattern: ["도", "레", "미", "파", "솔", "파", "미", "도"],
    notes: [262, 294, 330, 349, 392, 349, 330, 262],
  },
  {
    id: "pinch",
    name: "핀치크레센도",
    short: "Pinch Crescendo",
    technique: "TIMP 기반 힘/거리 조절",
    bpm: 68,
    accent: "#7aa7ff",
    cue: "커지는 소리에 맞춰 벌리고 작아지는 소리에 맞춰 모으기",
    pattern: ["p", "mp", "mf", "f", "ff", "f", "mp", "p"],
    notes: [247, 277, 311, 370, 415, 370, 277, 247],
  },
];

const fingerPads = [
  { label: "검지", key: "1", color: "#18b7a4" },
  { label: "중지", key: "2", color: "#ff8a5c" },
  { label: "약지", key: "3", color: "#e7bd46" },
  { label: "소지", key: "4", color: "#6f9dff" },
];

const tapOrder = [0, 1, 2, 3, 1, 2, 0, 3];

const checkLabels: Record<CheckKey, string> = {
  pain: "통증",
  fatigue: "피로",
  control: "손 조절감",
  dizzy: "어지러움",
};

const checkOptions: Record<CheckKey, string[]> = {
  pain: ["없음", "약간", "있음"],
  fatigue: ["낮음", "보통", "높음"],
  control: ["좋음", "흔들림", "어려움"],
  dizzy: ["없음", "약간", "있음"],
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

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function playInstrument(frequency: number, duration = 0.12, gainValue = 0.11) {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const overtone = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "triangle";
  overtone.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  overtone.frequency.setValueAtTime(frequency * 2, now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(filter);
  overtone.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  overtone.start(now);
  oscillator.stop(now + duration + 0.03);
  overtone.stop(now + duration + 0.03);
}

export default function SelfRehabHandApp() {
  const [gameId, setGameId] = useState<GameId>("tap");
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [pressedPad, setPressedPad] = useState<number | null>(null);
  const [liftPressed, setLiftPressed] = useState(true);
  const [pinchValue, setPinchValue] = useState(30);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checks, setChecks] = useState(initialCheck);
  const beatStartedAt = useRef(0);
  const pointerMap = useRef(new Map<number, { x: number; y: number }>());

  const game = games.find((item) => item.id === gameId) ?? games[0];
  const beatMs = Math.round(60000 / game.bpm);
  const accuracy = attempts ? Math.round((hits / attempts) * 100) : 0;
  const avgOffset = offsets.length
    ? Math.round(offsets.reduce((sum, value) => sum + value, 0) / offsets.length)
    : 0;
  const currentNote = game.notes[beat % game.notes.length];
  const expectedTap = tapOrder[beat % tapOrder.length];
  const pinchTarget = gameId === "pinch" ? 26 + Math.sin((beat / 8) * Math.PI) * 46 : 30;

  const restScore = useMemo(() => {
    let risk = 0;
    if (checks.pain === "약간") risk += 1;
    if (checks.pain === "있음") risk += 2;
    if (checks.fatigue === "보통") risk += 1;
    if (checks.fatigue === "높음") risk += 2;
    if (checks.control === "흔들림") risk += 1;
    if (checks.control === "어려움") risk += 2;
    if (checks.dizzy === "약간") risk += 1;
    if (checks.dizzy === "있음") risk += 3;
    if (attempts >= 10 && accuracy < 55) risk += 1;
    return risk;
  }, [accuracy, attempts, checks]);

  const restState =
    restScore >= 4 ? "휴식 필요" : restScore >= 2 ? "휴식 권장" : "진행 가능";

  useEffect(() => {
    if (!running) return;
    beatStartedAt.current = window.performance.now();
    const beatTimer = window.setInterval(() => {
      setBeat((value) => {
        const next = (value + 1) % game.pattern.length;
        playInstrument(game.notes[next], gameId === "pinch" ? 0.18 : 0.1, gameId === "pinch" ? 0.08 + next * 0.009 : 0.1);
        return next;
      });
      beatStartedAt.current = window.performance.now();
    }, beatMs);
    const clockTimer = window.setInterval(() => {
      setSessionSeconds((value) => value + 1);
    }, 1000);
    return () => {
      window.clearInterval(beatTimer);
      window.clearInterval(clockTimer);
    };
  }, [beatMs, game.notes, game.pattern.length, gameId, running]);

  function switchGame(nextGame: GameId) {
    setGameId(nextGame);
    setRunning(false);
    setBeat(0);
    setScore(0);
    setHits(0);
    setAttempts(0);
    setCombo(0);
    setOffsets([]);
    setPressedPad(null);
    setLiftPressed(true);
    setPinchValue(30);
    pointerMap.current.clear();
  }

  function resetSession() {
    switchGame(gameId);
    setSessionSeconds(0);
  }

  function toggleRunning() {
    if (!running && restScore >= 4) {
      setDrawerOpen(true);
      playInstrument(146, 0.18, 0.07);
      return;
    }
    beatStartedAt.current = window.performance.now();
    setRunning((value) => !value);
    playInstrument(currentNote, 0.12, 0.1);
  }

  function success(points: number, offset: number) {
    setHits((value) => value + 1);
    setAttempts((value) => value + 1);
    setCombo((value) => value + 1);
    setScore((value) => value + points + Math.min(combo * 12, 240));
    setOffsets((value) => [...value.slice(-16), Math.round(Math.abs(offset))]);
    playInstrument(currentNote * 1.5, 0.1, 0.12);
  }

  function miss() {
    setAttempts((value) => value + 1);
    setCombo(0);
    playInstrument(130, 0.14, 0.08);
  }

  function beatOffset() {
    const raw = window.performance.now() - beatStartedAt.current;
    return Math.min(raw, Math.abs(beatMs - raw));
  }

  function handleTap(lane: number) {
    if (!running || gameId !== "tap") return;
    setPressedPad(lane);
    window.setTimeout(() => setPressedPad(null), 180);
    const offset = beatOffset();
    if (lane === expectedTap && offset < Math.min(240, beatMs * 0.42)) {
      success(150, offset);
    } else {
      miss();
    }
  }

  function handleLiftDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setLiftPressed(true);
    if (!running || gameId !== "lift") return;
    const shouldPress = beat === 0 || beat >= 5;
    shouldPress ? success(125, beatOffset()) : miss();
  }

  function handleLiftUp() {
    setLiftPressed(false);
    if (!running || gameId !== "lift") return;
    const shouldLift = beat >= 1 && beat <= 4;
    shouldLift ? success(135, beatOffset()) : miss();
  }

  function updatePinch(event: React.PointerEvent<HTMLDivElement>) {
    if (gameId !== "pinch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerMap.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointerMap.current.values());
    let nextValue = pinchValue;
    if (points.length >= 2) {
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      nextValue = clamp((Math.sqrt(dx * dx + dy * dy) / rect.width) * 100, 12, 88);
    } else {
      nextValue = clamp(((event.clientX - rect.left) / rect.width) * 100, 12, 88);
    }
    setPinchValue(nextValue);
    if (!running) return;
    const diff = Math.abs(nextValue - pinchTarget);
    if (diff < 7) success(115, diff * 18);
  }

  function clearPointer(event: React.PointerEvent<HTMLDivElement>) {
    pointerMap.current.delete(event.pointerId);
  }

  function renderGameSurface() {
    if (gameId === "lift") {
      return (
        <div className={styles.liftStage}>
          <div className={styles.scaleArc}>
            {game.pattern.map((note, index) => (
              <span
                key={`${note}-${index}`}
                className={index === beat ? styles.activeScaleNote : ""}
                style={{ "--rise": `${index <= 4 ? index * 12 : (8 - index) * 12}px` } as React.CSSProperties}
              >
                {note}
              </span>
            ))}
          </div>
          <button
            className={`${styles.liftPad} ${liftPressed ? styles.liftPadPressed : ""}`}
            type="button"
            onPointerDown={handleLiftDown}
            onPointerUp={handleLiftUp}
            onPointerCancel={handleLiftUp}
          >
            <span>{liftPressed ? "누름" : "들기"}</span>
            <strong>{beat >= 1 && beat <= 4 ? "Lift" : "Touch"}</strong>
          </button>
        </div>
      );
    }

    if (gameId === "pinch") {
      return (
        <div
          className={styles.pinchStage}
          onPointerDown={updatePinch}
          onPointerMove={updatePinch}
          onPointerUp={clearPointer}
          onPointerCancel={clearPointer}
        >
          <div className={styles.crescendoBeam}>
            {game.pattern.map((mark, index) => (
              <span
                key={`${mark}-${index}`}
                className={index === beat ? styles.activeDynamic : ""}
                style={{ "--index": index } as React.CSSProperties}
              >
                {mark}
              </span>
            ))}
          </div>
          <div className={styles.pinchRail}>
            <span className={styles.thumbAnchor}>엄지</span>
            <span
              className={styles.targetRing}
              style={{ left: `${pinchTarget}%` }}
            />
            <span
              className={styles.fingerDot}
              style={{ left: `${pinchValue}%` }}
            >
              손가락
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tapStage}>
        {fingerPads.map((pad, index) => (
          <button
            key={pad.label}
            className={`${styles.fingerPad} ${expectedTap === index ? styles.expectedPad : ""} ${
              pressedPad === index ? styles.pressedPad : ""
            }`}
            style={{ "--pad": pad.color } as React.CSSProperties}
            type="button"
            onPointerDown={() => handleTap(index)}
          >
            <span className={styles.padKey}>{pad.key}</span>
            <strong>{pad.label}</strong>
            <i>{game.pattern[index]}</i>
          </button>
        ))}
      </div>
    );
  }

  return (
    <main className={styles.app} style={{ "--accent": game.accent } as React.CSSProperties}>
      <section className={styles.shell}>
        <aside className={styles.leftPanel}>
          <div className={styles.brand}>
            <span className={styles.logoMark}>♪</span>
            <div>
              <p>RethmHands</p>
              <h1>{game.name}</h1>
            </div>
          </div>

          <div className={styles.gameSwitch} aria-label="게임 선택">
            {games.map((item) => (
              <button
                key={item.id}
                className={item.id === gameId ? styles.activeGame : ""}
                type="button"
                onClick={() => switchGame(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.technique}</span>
              </button>
            ))}
          </div>

          <div className={styles.sessionCard}>
            <span>세션</span>
            <strong>{formatTime(sessionSeconds)}</strong>
            <p>{game.cue}</p>
          </div>
        </aside>

        <section className={styles.stagePanel} aria-label={`${game.name} 가로형 훈련 화면`}>
          <div className={styles.stageHeader}>
            <div>
              <span>{game.short}</span>
              <h2>{game.technique}</h2>
            </div>
            <div className={styles.metronome}>
              <span className={running ? styles.metronomePulse : ""}>{game.bpm}</span>
              <small>BPM</small>
            </div>
          </div>

          <div className={styles.musicStaff} aria-hidden="true">
            <div className={styles.staffLines}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className={styles.beatSequence}>
              {game.pattern.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className={index === beat ? styles.activeBeat : ""}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.waveform}>
              {Array.from({ length: 34 }).map((_, index) => (
                <i
                  key={index}
                  style={{ "--h": `${18 + Math.abs(Math.sin((index + beat) * 0.68)) * 54}px` } as React.CSSProperties}
                />
              ))}
            </div>
          </div>

          <div className={styles.playSurface}>{renderGameSurface()}</div>

          <div className={styles.transport}>
            <button type="button" onClick={resetSession}>
              다시하기
            </button>
            <button className={styles.playButton} type="button" onClick={toggleRunning}>
              {running ? "일시정지" : restScore >= 4 ? "휴식 필요" : "시작"}
            </button>
            <button type="button" onClick={() => setDrawerOpen((value) => !value)}>
              휴식 체크
            </button>
          </div>
        </section>

        <aside className={styles.rightPanel}>
          <div className={styles.scoreGrid}>
            <div>
              <span>점수</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>정확도</span>
              <strong>{accuracy}%</strong>
            </div>
            <div>
              <span>콤보</span>
              <strong>{combo}</strong>
            </div>
            <div>
              <span>오차</span>
              <strong>{avgOffset}ms</strong>
            </div>
          </div>

          <div className={`${styles.restCard} ${restScore >= 4 ? styles.restDanger : restScore >= 2 ? styles.restWarn : ""}`}>
            <span>현재 상태</span>
            <strong>{restState}</strong>
            <p>
              {restScore >= 4
                ? "오늘은 손 사용 부담이 큽니다. 짧게 쉬고 다시 기록하세요."
                : restScore >= 2
                  ? "다음 세션 전에 1분 휴식을 권합니다."
                  : "현재 상태에서는 짧은 음악 훈련을 진행할 수 있습니다."}
            </p>
          </div>

          <div className={`${styles.checkPanel} ${drawerOpen ? styles.checkPanelOpen : ""}`}>
            <button type="button" onClick={() => setDrawerOpen((value) => !value)}>
              세션 후 상태 기록
            </button>
            <div className={styles.checkGroups}>
              {(Object.keys(checkLabels) as CheckKey[]).map((key) => (
                <div key={key} className={styles.checkGroup}>
                  <span>{checkLabels[key]}</span>
                  <div>
                    {checkOptions[key].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={checks[key] === option ? styles.selectedCheck : ""}
                        onClick={() => setChecks((value) => ({ ...value, [key]: option }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
