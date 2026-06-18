"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./rhythm-tap-game.module.css";

type Note = {
  id: number;
  time: number;
  lane: number;
  hit: boolean;
  missed: boolean;
};

type Stats = {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  perfect: number;
  great: number;
  good: number;
};

const BPM = 96;
const BEAT = 60 / BPM;
const TRAVEL_TIME = 1.85;
const HIT_WINDOW = 0.2;
const SONG_BEATS = 64;
const SONG_LENGTH = SONG_BEATS * BEAT;
const LANE_COLORS = ["#38d9c0", "#ffcb5b", "#ff6f61", "#5f8dff"];
const LANE_KEYS = ["d", "f", "j", "k"];
const LANE_NOTES = [523.25, 659.25, 783.99, 987.77];
const LANE_LABELS = ["검지", "중지", "약지", "소지"];

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
  };
}

function buildChart(): Note[] {
  const notes: Note[] = [];
  const barPatterns = [
    [[0, 0], [1, 1], [2, 2], [3, 3]],
    [[0, 0], [0.5, 1], [1.5, 2], [2, 1], [3, 3]],
    [[0, 2], [0.75, 2], [1.5, 0], [2.25, 1], [3, 3], [3.5, 0]],
    [[0, 3], [0.5, 1], [1, 2], [2, 0], [2.5, 2], [3, 1]],
  ];

  for (let bar = 0; bar < 16; bar += 1) {
    const pattern = barPatterns[bar % barPatterns.length];
    pattern.forEach(([offset, lane]) => {
      notes.push({
        id: notes.length,
        time: (bar * 4 + offset) * BEAT,
        lane,
        hit: false,
        missed: false,
      });
    });

    if (bar === 7 || bar === 15) {
      [0, 1, 2, 3].forEach((lane, index) => {
        notes.push({
          id: notes.length,
          time: (bar * 4 + 3.75 + index * 0.03) * BEAT,
          lane,
          hit: false,
          missed: false,
        });
      });
    }
  }

  return notes.sort((a, b) => a.time - b.time);
}

function createAudioContext() {
  const AudioClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioClass ? new AudioClass() : null;
}

function envelopeGain(ctx: AudioContext, time: number, peak: number, attack: number, decay: number, duration: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay + duration);
  return gain;
}

function playTone(ctx: AudioContext, out: AudioNode, time: number, frequency: number, duration: number, type: OscillatorType, peak: number) {
  const osc = ctx.createOscillator();
  const gain = envelopeGain(ctx, time, peak, 0.008, duration, 0.018);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, time);
  osc.connect(gain);
  gain.connect(out);
  osc.start(time);
  osc.stop(time + duration + 0.08);
}

function playNoise(ctx: AudioContext, out: AudioNode, time: number, duration: number, volume: number, filterType: BiquadFilterType, frequency: number) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  noise.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  noise.start(time);
  noise.stop(time + duration);
}

function createMaster(ctx: AudioContext) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-20, ctx.currentTime);
  compressor.knee.setValueAtTime(22, ctx.currentTime);
  compressor.ratio.setValueAtTime(7, ctx.currentTime);
  compressor.attack.setValueAtTime(0.004, ctx.currentTime);
  compressor.release.setValueAtTime(0.18, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.92, ctx.currentTime);
  gain.connect(compressor);
  compressor.connect(ctx.destination);
  return gain;
}

function scheduleSong(ctx: AudioContext, out: AudioNode, chart: Note[], baseTime: number) {
  const chordPlan = [
    [261.63, 329.63, 392],
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [196, 246.94, 293.66],
  ];
  const bassPlan = [130.81, 110, 87.31, 98];

  for (let beat = 0; beat < SONG_BEATS; beat += 0.5) {
    playNoise(ctx, out, baseTime + beat * BEAT, 0.045, beat % 1 === 0 ? 0.15 : 0.08, "highpass", 6200);
  }

  for (let beat = 0; beat < SONG_BEATS; beat += 1) {
    const t = baseTime + beat * BEAT;
    if (beat % 4 === 0 || beat % 4 === 2) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      gain.gain.setValueAtTime(0.66, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.2);
    }
    if (beat % 4 === 1 || beat % 4 === 3) {
      playNoise(ctx, out, t, 0.12, 0.26, "bandpass", 1700);
    }
    playTone(ctx, out, t, bassPlan[Math.floor(beat / 4) % bassPlan.length], BEAT * 0.42, "triangle", 0.18);
  }

  for (let bar = 0; bar < 16; bar += 1) {
    const t = baseTime + bar * 4 * BEAT;
    chordPlan[bar % chordPlan.length].forEach((freq, index) => {
      playTone(ctx, out, t + index * 0.012, freq, BEAT * 3.8, "sine", 0.16);
    });
  }

  chart.forEach((note) => {
    playTone(ctx, out, baseTime + note.time, LANE_NOTES[note.lane] / 2, 0.09, "square", 0.12);
  });
}

export default function RhythmTapGame() {
  const [chart, setChart] = useState<Note[]>(() => buildChart());
  const [stats, setStats] = useState<Stats>(() => makeStats());
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [songTime, setSongTime] = useState(0);
  const [judgement, setJudgement] = useState("READY");
  const [timing, setTiming] = useState("tap on the beat");
  const [pressedLane, setPressedLane] = useState<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const outputRef = useRef<AudioNode | null>(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const totalPlayed = stats.hits + stats.misses;
  const accuracy = totalPlayed
    ? Math.round(((stats.perfect + stats.great * 0.74 + stats.good * 0.48) / totalPlayed) * 100)
    : 0;
  const progress = Math.min(100, (songTime / SONG_LENGTH) * 100);

  const visibleNotes = useMemo(() => {
    return chart
      .filter((note) => !note.hit && songTime >= note.time - TRAVEL_TIME - 0.1 && songTime <= note.time + 0.4)
      .map((note) => {
        const travel = (songTime - (note.time - TRAVEL_TIME)) / TRAVEL_TIME;
        const top = -8 + travel * 90;
        return { ...note, top };
      });
  }, [chart, songTime]);

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

  async function startGame() {
    cleanupAudio();
    const nextChart = buildChart();
    const ctx = await ensureAudio();
    const output = outputRef.current ?? createMaster(ctx);
    outputRef.current = output;
    const startAt = ctx.currentTime + 0.42;
    startedAtRef.current = startAt;
    setChart(nextChart);
    setStats(makeStats());
    setSongTime(0);
    setRunning(true);
    setPaused(false);
    setJudgement("READY");
    setTiming("tap on the beat");
    [659.25, 783.99, 1046.5].forEach((freq, index) => {
      playTone(ctx, output, ctx.currentTime + 0.02 + index * 0.075, freq, 0.075, "sine", 0.22);
    });
    scheduleSong(ctx, output, nextChart, startAt);
  }

  function stopGame() {
    setRunning(false);
    setPaused(false);
    cleanupAudio();
  }

  function tick() {
    const ctx = audioRef.current;
    if (!ctx || !running) return;
    const time = Math.max(0, ctx.currentTime - startedAtRef.current);
    setSongTime(time);
    setChart((current) => {
      let changed = false;
      const next = current.map((note) => {
        if (!note.hit && !note.missed && time - note.time > HIT_WINDOW) {
          changed = true;
          return { ...note, missed: true };
        }
        return note;
      });
      if (changed) {
        setStats((value) => ({ ...value, combo: 0, misses: value.misses + 1 }));
        setJudgement("MISS");
        setTiming("late");
        playTone(ctx, outputRef.current ?? ctx.destination, ctx.currentTime, 92, 0.08, "sawtooth", 0.16);
      }
      return changed ? next : current;
    });
    if (time > SONG_LENGTH + 1.4) {
      setRunning(false);
      setJudgement("Session Clear");
      setTiming(`Score ${stats.score.toLocaleString("ko-KR")}`);
      window.setTimeout(cleanupAudio, 360);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (!running || paused) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, paused]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const lane = LANE_KEYS.indexOf(event.key.toLowerCase());
      if (lane >= 0) {
        event.preventDefault();
        hitLane(lane);
      }
      if (event.key === " " && !running) {
        event.preventDefault();
        void startGame();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => cleanupAudio, []);

  function hitLane(lane: number) {
    setPressedLane(lane);
    window.setTimeout(() => setPressedLane(null), 100);
    if (!running) return;

    const candidates = chart
      .filter((note) => note.lane === lane && !note.hit && !note.missed)
      .map((note) => ({ note, offset: songTime - note.time, abs: Math.abs(songTime - note.time) }))
      .filter((item) => item.abs <= HIT_WINDOW)
      .sort((a, b) => a.abs - b.abs);

    if (!candidates.length) {
      setStats((value) => ({ ...value, combo: 0 }));
      setJudgement("BAD");
      setTiming("no note");
      if (audioRef.current) playTone(audioRef.current, outputRef.current ?? audioRef.current.destination, audioRef.current.currentTime, 92, 0.08, "sawtooth", 0.16);
      return;
    }

    const { note, offset, abs } = candidates[0];
    const result = judge(abs);
    setChart((current) => current.map((item) => item.id === note.id ? { ...item, hit: true } : item));
    setStats((value) => {
      const comboBonus = Math.min(240, value.combo * 8);
      return {
        ...value,
        score: value.score + result.points + comboBonus,
        combo: value.combo + 1,
        maxCombo: Math.max(value.maxCombo, value.combo + 1),
        hits: value.hits + 1,
        [result.bucket]: value[result.bucket] + 1,
      };
    });
    setJudgement(result.label);
    setTiming(`${offset >= 0 ? "+" : "-"}${Math.round(abs * 1000)}ms`);
    if (audioRef.current) {
      const volume = result.label === "PERFECT" ? 0.42 : result.label === "GREAT" ? 0.34 : 0.25;
      playTone(audioRef.current, outputRef.current ?? audioRef.current.destination, audioRef.current.currentTime, LANE_NOTES[lane], 0.12, "triangle", volume);
      playTone(audioRef.current, outputRef.current ?? audioRef.current.destination, audioRef.current.currentTime + 0.012, LANE_NOTES[lane] * 2, 0.08, "sine", volume * 0.42);
    }
  }

  function judge(abs: number) {
    if (abs <= 0.045) return { label: "PERFECT", points: 1000, bucket: "perfect" as const };
    if (abs <= 0.09) return { label: "GREAT", points: 650, bucket: "great" as const };
    if (abs <= 0.145) return { label: "GOOD", points: 350, bucket: "good" as const };
    return { label: "OK", points: 120, bucket: "good" as const };
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">♪</div>
          <div>
            <h1>Rhythm Tap Lab</h1>
            <span>RethmHands playable sample</span>
          </div>
        </div>
        <Link className={styles.homeButton} href="/self-rehab-hand">← 게임 선택</Link>
      </header>

      <section className={styles.shell} aria-label="리듬게임 샘플">
        <aside className={`${styles.panel} ${styles.dashboard}`}>
          <section className={styles.songCard}>
            <div>
              <h2>Original Synth Cue No. 1</h2>
              <p>브라우저에서 실시간 합성되는 96 BPM 루프입니다. 외부 음원이나 샘플 파일을 사용하지 않습니다.</p>
            </div>
            <div className={styles.metaList}>
              <div><small>BPM</small><strong>96</strong></div>
              <div><small>Length</small><strong>{Math.round(SONG_LENGTH)}s</strong></div>
              <div><small>Notes</small><strong>{chart.length}</strong></div>
              <div><small>Mode</small><strong>4 Lane</strong></div>
            </div>
            <div className={styles.meter}><div style={{ width: `${progress}%` }} /></div>
          </section>

          <section className={styles.stats} aria-label="점수판">
            <div><span>Score</span><strong>{stats.score.toLocaleString("ko-KR")}</strong></div>
            <div><span>Combo</span><strong>{stats.combo}</strong></div>
            <div><span>Accuracy</span><strong>{accuracy}%</strong></div>
            <div><span>Max Combo</span><strong>{stats.maxCombo}</strong></div>
          </section>

          <section className={styles.judgementCard} aria-live="polite">
            <div>
              <strong>{judgement}</strong>
              <span>{timing}</span>
            </div>
          </section>

          <section className={styles.laneGuide} aria-label="레인">
            {LANE_LABELS.map((label, index) => (
              <div className={styles.guideRow} key={label}>
                <div className={styles.guideKey} style={{ background: LANE_COLORS[index] }}>{LANE_KEYS[index].toUpperCase()}</div>
                <strong>{label}</strong>
                <span>Lane {index + 1}</span>
              </div>
            ))}
          </section>
        </aside>

        <section className={`${styles.panel} ${styles.gameCard}`}>
          <div className={styles.hud}>
            <span>Track <strong>{running ? "Playing" : "Ready"}</strong></span>
            <span>Audio <strong>{audioRef.current ? "On" : "Ready"}</strong></span>
            <span>Best <strong>{stats.score.toLocaleString("ko-KR")}</strong></span>
          </div>
          <section className={styles.stageWrap}>
            <div className={styles.stage}>
              <div className={styles.lanes}>
                {LANE_LABELS.map((label, index) => (
                  <div className={styles.lane} key={label} style={{ "--lane-color": LANE_COLORS[index] } as React.CSSProperties} />
                ))}
              </div>
              <div className={styles.beatRuler}>
                {Array.from({ length: 9 }).map((_, index) => <i key={index} style={{ top: `${index * 10 + 5}%` }} />)}
              </div>
              <div className={styles.hitZone} />
              <div className={styles.hitLine} />
              <div className={styles.noteLayer}>
                {visibleNotes.map((note) => (
                  <span
                    className={styles.note}
                    key={note.id}
                    style={{
                      "--lane": note.lane,
                      "--note-color": LANE_COLORS[note.lane],
                      transform: `translateY(${note.top}%)`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
              <div className={styles.padRow}>
                {LANE_LABELS.map((label, index) => (
                  <button
                    className={`${styles.pad} ${pressedLane === index ? styles.pressed : ""}`}
                    data-lane={index}
                    key={label}
                    onPointerDown={() => hitLane(index)}
                    style={{ "--pad-color": LANE_COLORS[index] } as React.CSSProperties}
                    type="button"
                  >
                    <strong>{LANE_KEYS[index].toUpperCase()}</strong>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {!running && (
                <div className={styles.stageMessage}>
                  <div className={styles.messageCard}>
                    <h2>{paused ? "Paused" : "Ready"}</h2>
                    <p>Start를 누르면 합성 음악과 노트가 함께 시작됩니다. 버튼은 게임 화면 중앙에 배치했습니다.</p>
                    <button type="button" onClick={() => void startGame()}>Start</button>
                  </div>
                </div>
              )}
              {running && (
                <button className={styles.centerStop} type="button" onClick={stopGame}>Stop</button>
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
