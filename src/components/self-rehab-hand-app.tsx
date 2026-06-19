import Link from "next/link";
import styles from "./self-rehab-hand-app.module.css";

const games = [
  {
    id: "rhythm",
    title: "Rhythm Tap Lab",
    action: "리듬게임 열기",
    description: "리듬 동조화에서 시작해 메트로놈과 음악 루프로 확장하며 탭 타이밍을 훈련합니다.",
    therapy: "RAS / PSE",
    preview: "rhythm",
  },
  {
    id: "lift",
    title: "Finger Lift Score",
    action: "Finger Lift 열기",
    description: "화면에서 수직으로 손가락을 들었다 놓는 높이와 타이밍을 음계 큐에 맞춰 기록합니다.",
    therapy: "PSE",
    preview: "lift",
  },
  {
    id: "pinch",
    title: "Pinch Crescendo",
    action: "핀치 게임 열기",
    description: "검지, 중지, 약지, 소지를 선택해 엄지와의 거리를 크레센도/디크레센도에 맞춰 조절합니다.",
    therapy: "PSE / TIMP",
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
            집에서 혼자 쓰는 자가재활 흐름에 맞춰 리듬 동조, 손가락 들어올림,
            핀치 거리 조절을 각각 독립 게임으로 실행합니다.
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
                <span className={styles.therapyTag}>{game.therapy}</span>
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
