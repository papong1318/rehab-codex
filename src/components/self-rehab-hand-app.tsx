"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./self-rehab-hand-app.module.css";

type GameId = "tap" | "lift" | "pinch";
type CheckKey = "pain" | "fatigue" | "difficulty" | "dizzy";

type GameSpec = {
  id: GameId;
  name: string;
  shortName: string;
  cue: string;
  bpm: number;
  color: string;
  description: string;
  phrase: string[];
};

const games: GameSpec[] = [
  {
    id: "tap",
    name: "리듬탭루프",
    shortName: "리듬탭",
    cue: "beat cue",
    bpm: 96,
    color: "#0f766e",
    description: "박자 루프에 맞춰 네 손가락 패드를 실제 손가락으로 누릅니다.",
    phrase: ["검", "중", "약", "소", "중", "약", "검", "소"],
  },
  {
    id: "lift",
    name: "핑거리프트스코어",
    shortName: "핑거리프트",
    cue: "scale cue",
    bpm: 72,
    color: "#d56a38",
    description: "상행 음계에서 손가락을 떼고, 하행 종지에서 다시 붙입니다.",
    phrase: ["준비", "상행", "떼기", "유지", "하행", "접촉", "확인", "휴식"],
  },
  {
    id: "pinch",
    name: "핀치크레센도",
    shortName: "핀치",
    cue: "crescendo cue",
    bpm: 64,
    color: "#46638f",
    description: "엄지 기준점과 손가락 사이 거리를 크레센도 흐름에 맞춰 조절합니다.",
    phrase: ["준비", "크레센도", "확장", "유지", "디크레센도", "복귀", "이완", "휴식"],
  },
];

const checkOptions: Record<CheckKey, string[]> = {
  pain: ["없음", "약간", "있음"],
  fatigue: ["낮음", "보통", "높음"],
  difficulty: ["쉬움", "적절", "어려움"],
  dizzy: ["없음", "약간", "있음"],
};

const checkLabels: Record<CheckKey, string> = {
  pain: "통증",
  fatigue: "피로",
  difficulty: "난이도",
  dizzy: "어지러움",
};

const initialCheck: Record<CheckKey, string> = {
  pain: "없음",
  fatigue: "낮음",
  difficulty: "적절",
  dizzy: "없음",
};

const tapLaneOrder = [0, 1, 2, 3, 1, 2, 0, 3];
const tapPads = [
  { label: "검지", short: "1", color: "#0f766e" },
  { label: "중지", short: "2", color: "#d56a38" },
  { label: "약지", short: "3", color: "#d9a316" },
  { label: "소지", short: "4", color: "#2d7cc9" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function playTone(frequency: number, duration = 0.08) {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
}

export default function SelfRehabHandApp() {
  const [gameId, setGameId] = useState<GameId>("tap");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [combo, setCombo] = useState(0);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [checks, setChecks] = useState(initialCheck);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liftDown, setLiftDown] = useState(true);
  const [pinchDistance, setPinchDistance] = useState(34);
  const [sparkLane, setSparkLane] = useState<number | null>(null);
  const beatRef = useRef(0);
  const pointerMap = useRef(new Map<number, { x: number; y: number }>());

  const game = games.find((item) => item.id === gameId) ?? games[0];
  const beatMs = Math.round(60000 / game.bpm);
  const accuracy = attempts ? Math.round((hits / attempts) * 100) : 0;
  const avgOffset = offsets.length
    ? Math.round(offsets.reduce((sum, value) => sum + value, 0) / offsets.length)
    : 0;

  const restScore = useMemo(() => {
    let risk = 0;
    if (checks.pain === "약간") risk += 1;
    if (checks.pain === "있음") risk += 2;
    if (checks.fatigue === "보통") risk += 1;
    if (checks.fatigue === "높음") risk += 2;
    if (checks.difficulty === "어려움") risk += 1;
    if (checks.dizzy === "약간") risk += 1;
    if (checks.dizzy === "있음") risk += 2;
    if (attempts >= 8 && accuracy < 55) risk += 1;
    return risk;
  }, [accuracy, attempts, checks]);

  const restState =
    restScore >= 3 ? "휴식 필요" : restScore >= 2 ? "휴식 권장" : "진행 가능";

  useEffect(() => {
    if (!running) return;
    beatRef.current = window.performance.now();
    const beatTimer = window.setInterval(() => {
      setStep((current) => (current + 1) % game.phrase.length);
      beatRef.current = window.performance.now();
      const lane = gameId === "tap" ? tapLaneOrder[(step + 1) % tapLaneOrder.length] : null;
      setSparkLane(lane);
      window.setTimeout(() => setSparkLane(null), 280);
      playTone(gameId === "pinch" ? 260 + step * 26 : 380 + step * 22, 0.055);
    }, beatMs);
    const clock = window.setInterval(() => {
      setSessionSeconds((value) => value + 1);
    }, 1000);
    return () => {
      window.clearInterval(beatTimer);
      window.clearInterval(clock);
    };
  }, [beatMs, game.phrase.length, gameId, running, step]);

  function resetGame(nextGame = gameId) {
    setGameId(nextGame);
    setRunning(false);
    setStep(0);
    setScore(0);
    setHits(0);
    setAttempts(0);
    setCombo(0);
    setOffsets([]);
    setLiftDown(true);
    setPinchDistance(34);
    pointerMap.current.clear();
  }

  function toggleRunning() {
    if (!running && restScore >= 3) {
      setDrawerOpen(true);
      playTone(180, 0.12);
      return;
    }
    setRunning((value) => !value);
    beatRef.current = window.performance.now();
  }

  function recordSuccess(offset: number, points = 120) {
    setHits((value) => value + 1);
    setAttempts((value) => value + 1);
    setCombo((value) => value + 1);
    setScore((value) => value + points + Math.min(combo * 8, 160));
    setOffsets((value) => [...value.slice(-14), Math.round(offset)]);
    setStep((value) => (value + 1) % game.phrase.length);
    beatRef.current = window.performance.now();
    playTone(540, 0.08);
  }

  function recordMiss() {
    setAttempts((value) => value + 1);
    setCombo(0);
    playTone(190, 0.1);
  }

  function handleTap(lane: number) {
    if (!running || gameId !== "tap") return;
    const expected = tapLaneOrder[step % tapLaneOrder.length];
    const rawOffset = window.performance.now() - beatRef.current;
    const foldedOffset = Math.min(rawOffset, Math.abs(beatMs - rawOffset));
    setSparkLane(lane);
    window.setTimeout(() => setSparkLane(null), 260);
    if (lane === expected && foldedOffset < Math.min(260, beatMs * 0.42)) {
      recordSuccess(foldedOffset, 140);
    } else {
      recordMiss();
    }
  }

  function handleLiftDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setLiftDown(true);
    if (!running || gameId !== "lift") return;
    const shouldTouch = step === 0 || step === 5 || step === 6;
    if (shouldTouch) recordSuccess(window.performance.now() - beatRef.current, 120);
    else recordMiss();
  }

  function handleLiftUp() {
    setLiftDown(false);
    if (!running || gameId !== "lift") return;
    const shouldLift = step >= 1 && step <= 4;
    if (shouldLift) recordSuccess(window.performance.now() - beatRef.current, 125);
    else recordMiss();
  }

  function handlePinchMove(event: React.PointerEvent<HTMLDivElement>) {
    if (gameId !== "pinch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerMap.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointerMap.current.values());
    let distance = pinchDistance;
    if (points.length >= 2) {
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      distance = clamp((Math.sqrt(dx * dx + dy * dy) / rect.width) * 100, 18, 88);
    } else {
      distance = clamp(((event.clientX - rect.left) / rect.width) * 100, 18, 88);
    }
    setPinchDistance(distance);
    if (!running) return;
    const target = pinchTarget();
    const diff = Math.abs(distance - target);
    if (diff < 7.5) recordSuccess(diff * 12, 110);
  }

  function pinchTarget() {
    if (step <= 1) return 34;
    if (step <= 3) return 52 + step * 8;
    if (step <= 5) return 82 - step * 8;
    return 36;
  }

  function updateCheck(key: CheckKey, value: string) {
    setChecks((current) => ({ ...current, [key]: value }));
  }

  const activeLane = tapLaneOrder[step % tapLaneOrder.length];
  const targetDistance = pinchTarget();

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <button className={styles.menuButton} aria-label="메뉴" type="button">
          <span />
          <span />
          <span />
        </button>
        <div>
          <p>RethmHands</p>
          <h1>{game.name}</h1>
        </div>
        <button className={styles.soundButton} aria-label="소리 테스트" type="button" onClick={() => playTone(440)}>
          ♪
        </button>
      </header>

      <nav className={styles.tabs} aria-label="게임 선택">
        {games.map((item) => (
          <button
            className={item.id === gameId ? styles.activeTab : ""}
            key={item.id}
            type="button"
            onClick={() => resetGame(item.id)}
          >
            <span>{item.shortName}</span>
          </button>
        ))}
      </nav>

      <section className={styles.metrics} aria-label="세션 지표">
        <div><span>점수</span><strong>{score.toLocaleString("ko-KR")}</strong></div>
        <div><span>정확도</span><strong>{accuracy}%</strong></div>
        <div><span>상태</span><strong className={restScore >= 2 ? styles.warnText : ""}>{restState}</strong></div>
        <div><span>콤보</span><strong>{combo}</strong></div>
      </section>

      <section className={styles.instruction}>
        <strong>{game.cue}</strong>
        <span>{game.description}</span>
      </section>

      <section className={styles.playfield} aria-label={`${game.name} 플레이 영역`}>
        <div className={styles.phraseRail}>
          {game.phrase.map((label, index) => (
            <span
              className={[
                index < step ? styles.donePhrase : "",
                index === step ? styles.activePhrase : "",
              ].join(" ")}
              key={`${label}-${index}`}
            >
              {label}
            </span>
          ))}
        </div>

        {gameId === "tap" && (
          <div className={styles.tapGame}>
            {tapPads.map((pad, index) => (
              <div className={styles.tapLane} key={pad.label} style={{ "--lane": pad.color } as React.CSSProperties}>
                <div className={styles.noteTrack}>
                  <div
                    className={[
                      styles.fallingNote,
                      activeLane === index ? styles.fallingNoteActive : "",
                    ].join(" ")}
                  >
                    {pad.short}
                  </div>
                  <div className={[styles.hitSpark, sparkLane === index ? styles.hitSparkOn : ""].join(" ")} />
                </div>
                <button className={styles.touchPad} type="button" onPointerDown={() => handleTap(index)}>
                  <strong>{pad.short}</strong>
                  <span>{pad.label}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {gameId === "lift" && (
          <div className={styles.liftGame}>
            <svg className={styles.scoreBoard} viewBox="0 0 720 120" aria-label="상행 하행 음계">
              {[0, 1, 2, 3, 4].map((line) => (
                <line key={line} x1="24" x2="696" y1={28 + line * 14} y2={28 + line * 14} />
              ))}
              {[82, 70, 58, 46, 34, 46, 58, 82].map((y, index) => (
                <circle
                  className={index === step ? styles.scoreNoteActive : ""}
                  cx={60 + index * 86}
                  cy={y}
                  key={`${y}-${index}`}
                  r={index === step ? 12 : 9}
                />
              ))}
              <line className={styles.playHead} x1={60 + step * 86} x2={60 + step * 86} y1="18" y2="104" />
            </svg>
            <div className={styles.liftBody}>
              <div className={styles.liftMeter}><span style={{ height: `${step <= 4 ? 22 + step * 14 : 16}%` }} /></div>
              <button
                className={[styles.liftPad, liftDown ? styles.liftPadDown : styles.liftPadUp].join(" ")}
                type="button"
                onPointerDown={handleLiftDown}
                onPointerCancel={handleLiftUp}
                onPointerUp={handleLiftUp}
              >
                <strong>{liftDown ? "누름" : "들기"}</strong>
                <span>{step >= 1 && step <= 4 ? "상행 음계에 맞춰 떼기" : "하행 끝에서 다시 붙이기"}</span>
              </button>
            </div>
          </div>
        )}

        {gameId === "pinch" && (
          <div
            className={styles.pinchGame}
            onPointerCancel={(event) => pointerMap.current.delete(event.pointerId)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              handlePinchMove(event);
            }}
            onPointerMove={handlePinchMove}
            onPointerUp={(event) => pointerMap.current.delete(event.pointerId)}
          >
            <div className={styles.handGhost}>
              <span className={styles.ghostPalm} />
              <span className={styles.ghostThumb} />
              <span className={styles.ghostFingerOne} />
              <span className={styles.ghostFingerTwo} />
              <span className={styles.ghostFingerThree} />
            </div>
            <div className={styles.thumbAnchor}>엄지</div>
            <div className={styles.targetRing} style={{ left: `${targetDistance}%` }}>목표</div>
            <div className={styles.pinchLine} style={{ width: `${pinchDistance - 24}%` }} />
            <div className={styles.fingerDot} style={{ left: `${pinchDistance}%` }}>손가락</div>
            <div className={styles.pinchHint}>
              <strong>{step >= 2 && step <= 3 ? "Crescendo" : step >= 4 && step <= 5 ? "Decrescendo" : "Ready"}</strong>
              <span>{Math.round(pinchDistance)}%</span>
            </div>
          </div>
        )}
      </section>

      <section className={styles.controls}>
        <button className={styles.secondaryButton} type="button" onClick={() => resetGame()}>
          다시하기
        </button>
        <button className={styles.primaryButton} type="button" onClick={toggleRunning}>
          {running ? "일시정지" : restScore >= 3 ? "휴식 필요" : "시작"}
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => setDrawerOpen((value) => !value)}>
          셀프 체크
        </button>
      </section>

      <section className={[styles.selfCheck, drawerOpen ? styles.selfCheckOpen : ""].join(" ")}>
        <button className={styles.drawerHandle} type="button" onClick={() => setDrawerOpen((value) => !value)}>
          오늘 몸 상태는 어떤가요?
        </button>
        <div className={styles.checkGrid}>
          {(Object.keys(checkOptions) as CheckKey[]).map((key) => (
            <div className={styles.checkGroup} key={key}>
              <span>{checkLabels[key]}</span>
              <div>
                {checkOptions[key].map((option) => (
                  <button
                    className={checks[key] === option ? styles.selectedCheck : ""}
                    key={option}
                    type="button"
                    onClick={() => updateCheck(key, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={[styles.restAdvice, restScore >= 2 ? styles.restAdviceWarn : ""].join(" ")}>
          <strong>{restState}</strong>
          <span>
            {restScore >= 3
              ? "지금은 다음 세션보다 10분 이상 휴식을 먼저 권장합니다."
              : restScore >= 2
                ? "다음 라운드는 템포를 낮추거나 한 게임만 짧게 진행하세요."
                : "현재 상태에서는 짧은 세션 진행이 가능합니다."}
          </span>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>{Math.floor(sessionSeconds / 60)}분 {sessionSeconds % 60}초</span>
        <span>평균 오차 {avgOffset}ms</span>
      </footer>
    </main>
  );
}
