import Link from "next/link";
import styles from "./self-rehab-hand-app.module.css";

const games = [
  {
    id: "rhythm",
    title: "Rhythm Tap Lab",
    action: "리듬게임 열기",
    description: "96 BPM 실시간 합성 루프에 맞춰 탭 타이밍과 콤보를 확인합니다.",
    preview: "rhythm",
  },
  {
    id: "lift",
    title: "Finger Lift Score",
    action: "Finger Lift 열기",
    description: "상행과 하행 음계에 맞춰 손가락을 떼고 다시 붙이는 수행을 기록합니다.",
    preview: "lift",
  },
  {
    id: "pinch",
    title: "Pinch Crescendo",
    action: "핀치 게임 열기",
    description: "엄지 고정 상태에서 움직이는 손가락의 거리 조절을 크레센도 흐름과 연결합니다.",
    preview: "pinch",
  },
] as const;

export default function SelfRehabHandApp() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">♪</div>
          <div>
            <h1>RethmHands Games</h1>
            <span>home self-rehab playable samples</span>
          </div>
        </div>
      </header>

      <section className={styles.shell} aria-label="게임 선택">
        <div className={styles.intro}>
          <h2>세 가지 손 재활 게임</h2>
          <p>
            원형 게임의 구조를 유지하면서, 집에서 혼자 쓰는 자가재활 흐름에 맞춰
            단계적으로 개선할 React 버전입니다.
          </p>
        </div>

        <div className={styles.gameGrid}>
          {games.map((game) => (
            <Link className={styles.gameCard} href={`/self-rehab-hand/${game.id}`} key={game.id}>
              <div className={styles.preview} data-preview={game.preview} aria-hidden="true">
                {game.preview === "rhythm" && (
                  <div className={styles.beatRail}>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {game.preview === "lift" && (
                  <div className={styles.liftRail}>
                    <span className={styles.liftLine} />
                    <span className={styles.liftDot} />
                  </div>
                )}
                {game.preview === "pinch" && (
                  <div className={styles.pinchRail}>
                    <span className={styles.pinchThumb} />
                    <span className={styles.pinchFinger} />
                  </div>
                )}
              </div>
              <div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
              </div>
              <div className={styles.openRow}>
                <span>{game.action}</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
