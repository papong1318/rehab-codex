import Link from "next/link";
import { PrototypeNav } from "@/components/prototype-nav";

const adminSections = [
  {
    href: "/dashboard",
    title: "관리 대시보드",
    description: "최근 활동, 카테고리 분포, 요약 수치를 확인합니다.",
  },
  {
    href: "/workspace",
    title: "관리 작업실",
    description: "훈련 항목 생성, 수정, 검색, 삭제를 수행합니다.",
  },
];

export default function AdminPage() {
  return (
    <main className="hero-grid flex flex-1 px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PrototypeNav />

        <section className="glass-card rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-medium text-muted">Admin Area</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            연구자와 치료사가 실험 흐름을 관리하는 관리자 영역
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
            항목 생성과 분석은 이 영역에서 수행하고, 환자는 별도의 훈련 화면만
            사용하도록 구조를 나눴습니다.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="glass-card rounded-[1.75rem] p-6 transition hover:-translate-y-0.5"
            >
              <p className="text-sm font-medium text-muted">Admin</p>
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
