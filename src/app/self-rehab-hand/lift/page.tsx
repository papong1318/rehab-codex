import Link from "next/link";

export default function LiftGamePage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fffaf1", color: "#171725", padding: 24 }}>
      <section style={{ width: "min(720px, 100%)", display: "grid", gap: 16 }}>
        <Link href="/self-rehab-hand">← 게임 선택</Link>
        <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1 }}>Finger Lift Score</h1>
        <p style={{ margin: 0, color: "#686d7d" }}>다음 단계에서 원형 finger lift 게임을 이 독립 화면에 복원합니다.</p>
        <button style={{ minHeight: 72, border: 0, borderRadius: 8, background: "linear-gradient(135deg, #ffcb5b, #41d6b6)", fontSize: 22, fontWeight: 850 }}>
          중앙 Start / Stop 예정
        </button>
      </section>
    </main>
  );
}
