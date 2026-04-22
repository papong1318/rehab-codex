import Link from "next/link";
import { PrototypeNav } from "@/components/prototype-nav";

const sections = [
  {
    href: "/admin",
    label: "Admin",
    title: "관리자 영역",
    description: "연구자와 치료사가 항목을 설계하고 결과를 확인하는 공간입니다.",
  },
  {
    href: "/patient",
    label: "Patient",
    title: "환자 훈련 화면",
    description: "환자가 실제 훈련 단계를 수행하는 단순화된 전용 화면입니다.",
  },
  {
    href: "/prototype.html",
    label: "Wireframe",
    title: "정적 초안 문서",
    description: "초기 정보 구조를 확인했던 HTML 프로토타입으로 이동합니다.",
  },
];

export default function Home() {
  return (
    <main className="hero-grid flex flex-1 px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PrototypeNav />

        <section className="glass-card rounded-[2rem] p-8 sm:p-10 lg:p-14">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-card-border bg-white/65 px-4 py-2 text-sm text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            Rehab Codex Hub
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            관리자 영역과 환자 훈련 영역을 분리한 실험용 앱 허브
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-muted sm:text-lg">
            이제 루트 화면은 진입점 역할만 하고, 관리자는 설계와 분석을 담당하고
            환자는 실제 훈련 플로우만 보게끔 구조를 나눴습니다.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="glass-card rounded-[1.75rem] p-6 transition hover:-translate-y-0.5"
            >
              <p className="text-sm font-medium text-muted">{section.label}</p>
              <h2 className="mt-3 text-2xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {section.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
