"use client";

import { PrototypeNav } from "@/components/prototype-nav";
import { categories, usePrototypeEntries } from "@/hooks/use-prototype-entries";

function formatTimestamp(seconds?: number) {
  if (!seconds) {
    return "방금 전";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(seconds * 1000);
}

export function PrototypeDashboard() {
  const { authStatus, currentUser, entries, isLoadingEntries, message } =
    usePrototypeEntries();

  const categorySummary = categories.map((category) => {
    const count = entries.filter((entry) => entry.category === category).length;
    return { category, count };
  });
  const maxCategoryCount = Math.max(1, ...categorySummary.map((item) => item.count));
  const latestEntry = entries[0] ?? null;
  const activityByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = entries.filter((entry) => {
      const seconds = entry.createdAt?.seconds;
      if (!seconds) {
        return false;
      }

      const createdAt = new Date(seconds * 1000);
      return createdAt >= date && createdAt < nextDate;
    }).length;

    return {
      label: new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
      }).format(date),
      count,
    };
  });
  const maxActivityCount = Math.max(1, ...activityByDay.map((item) => item.count));

  return (
    <main className="hero-grid flex flex-1 px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PrototypeNav />

        <section className="glass-card rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-medium text-muted">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            최근 활동과 카테고리 분포를 한 번에 보는 운영 화면
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
            익명 사용자 단위로 저장된 `prototypeEntries`를 요약합니다. 입력은
            워크스페이스에서, 분석은 이 화면에서 확인하도록 분리했습니다.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="glass-card rounded-[1.75rem] p-6">
            <p className="text-sm font-medium text-muted">총 항목 수</p>
            <p className="mt-3 text-4xl font-semibold">{entries.length}</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              현재 사용자 세션에 저장된 전체 항목 수입니다.
            </p>
          </article>

          <article className="glass-card rounded-[1.75rem] p-6">
            <p className="text-sm font-medium text-muted">최근 활동</p>
            <p className="mt-3 text-2xl font-semibold">
              {latestEntry ? latestEntry.name : "아직 없음"}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              {latestEntry
                ? `${latestEntry.category} · ${formatTimestamp(
                    latestEntry.createdAt?.seconds,
                  )}`
                : "워크스페이스에서 첫 데이터를 저장하면 여기 표시됩니다."}
            </p>
          </article>

          <article className="glass-card rounded-[1.75rem] p-6">
            <p className="text-sm font-medium text-muted">인증 상태</p>
            <p className="mt-3 text-2xl font-semibold">
              {authStatus === "authenticated"
                ? "익명 로그인 완료"
                : authStatus === "signing-in"
                  ? "로그인 시도 중"
                  : "설정 확인 필요"}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              사용자 ID: {currentUser?.uid ?? "없음"}
            </p>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-card rounded-[2rem] p-7 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">Activity</p>
                <h2 className="mt-2 text-2xl font-semibold">최근 7일 활동</h2>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">
                7-day
              </span>
            </div>

            <div className="grid h-52 grid-cols-7 items-end gap-3">
              {activityByDay.map((item) => (
                <div key={item.label} className="flex h-full flex-col justify-end gap-3">
                  <div className="text-center text-xs text-muted">{item.count}</div>
                  <div className="flex-1 rounded-[1.25rem] bg-white/60 p-1">
                    <div
                      className="w-full rounded-[1rem] bg-[#1f2a24] transition-[height]"
                      style={{
                        height: `${Math.max(10, (item.count / maxActivityCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-center text-xs text-muted">{item.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-7 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">Overview</p>
                <h2 className="mt-2 text-2xl font-semibold">카테고리 분포</h2>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">
                real-time
              </span>
            </div>

            <div className="space-y-4">
              {categorySummary.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted">{item.count}개</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/70">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{
                        width: `${(item.count / maxCategoryCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="glass-card rounded-[2rem] p-7 sm:p-8">
          <p className="text-sm font-medium text-muted">System Message</p>
          <p className="mt-3 text-sm leading-7 text-foreground/80">{message}</p>
          {isLoadingEntries ? (
            <p className="mt-2 text-sm leading-7 text-muted">
              Firestore 목록을 불러오는 중입니다.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
