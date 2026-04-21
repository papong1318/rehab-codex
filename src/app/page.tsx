import { getFirebaseStatus } from "@/lib/firebase";
import { PrototypeIntake } from "@/components/prototype-intake";

export default function Home() {
  const firebaseStatus = getFirebaseStatus();

  return (
    <main className="hero-grid flex flex-1 items-center px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <section className="glass-card fade-up rounded-[2rem] p-8 sm:p-10 lg:p-14">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-card-border bg-white/65 px-4 py-2 text-sm text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            실험용 프로토타입 스타터
          </div>

          <div className="space-y-6">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              HTML 초안에서 시작해 React 앱으로 확장하고, Firebase와 Vercel까지 연결할 준비를 끝냈습니다.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted sm:text-lg">
              이 프로젝트는 빠르게 아이디어를 검증하기 위한 기본 구조입니다.
              화면 초안은 정적 HTML로 먼저 잡고, 실제 기능은 Next.js App Router와
              Firebase로 붙인 뒤, Vercel에 바로 배포할 수 있게 구성했습니다.
            </p>
          </div>

          <div className="fade-up-delay mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
              href="/prototype.html"
            >
              HTML 초안 보기
            </a>
            <a
              className="inline-flex items-center justify-center rounded-full border border-card-border px-6 py-3 text-sm font-semibold transition hover:bg-white/55"
              href="https://vercel.com/new"
              target="_blank"
              rel="noreferrer"
            >
              Vercel 프로젝트 생성
            </a>
          </div>

          <div className="fade-up-delay-2 mt-12 grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-card-border bg-white/55 p-5">
              <p className="text-sm font-medium text-muted">1. Prototype</p>
              <h2 className="mt-2 text-xl font-semibold">HTML Wireframe</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                정보 구조와 화면 흐름을 정적 문서로 먼저 확인합니다.
              </p>
            </article>

            <article className="rounded-[1.5rem] border border-card-border bg-white/55 p-5">
              <p className="text-sm font-medium text-muted">2. Build</p>
              <h2 className="mt-2 text-xl font-semibold">React + Next.js</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                App Router 기반으로 컴포넌트를 쌓고 이후 기능을 붙이기 쉽습니다.
              </p>
            </article>

            <article className="rounded-[1.5rem] border border-card-border bg-white/55 p-5">
              <p className="text-sm font-medium text-muted">3. Ship</p>
              <h2 className="mt-2 text-xl font-semibold">Firebase + Vercel</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Firestore 데이터 저장과 Vercel 배포 경로를 바로 이어갈 수 있습니다.
              </p>
            </article>
          </div>
        </section>

        <aside className="fade-up-delay glass-card rounded-[2rem] p-7 sm:p-8">
          <div className="rounded-[1.5rem] bg-[#1f2a24] p-6 text-[#f5f1e8]">
            <p className="text-sm uppercase tracking-[0.24em] text-[#d8c7b3]">
              Environment
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7">
              <li>Framework: Next.js 16 + React 19</li>
              <li>Styling: Tailwind CSS 4</li>
              <li>Database: Firebase Firestore</li>
              <li>Deploy: Vercel CLI ready</li>
            </ul>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-card-border bg-white/55 p-6">
            <p className="text-sm font-medium text-muted">Firebase 상태</p>
            <p className="mt-2 text-2xl font-semibold">{firebaseStatus.label}</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              {firebaseStatus.description}
            </p>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-dashed border-card-border p-6">
            <p className="text-sm font-medium text-muted">다음 할 일</p>
            <ol className="mt-3 space-y-3 text-sm leading-7 text-foreground/85">
              <li>1. `.env.local`에 Firebase 웹 앱 키 입력</li>
              <li>2. `npm run dev`로 로컬 실행</li>
              <li>3. `npm run deploy:preview`로 Vercel 미리보기 배포</li>
            </ol>
          </div>
        </aside>
        </div>

        <PrototypeIntake />
      </div>
    </main>
  );
}
