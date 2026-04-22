"use client";

import { useMemo, useState } from "react";
import { PrototypeNav } from "@/components/prototype-nav";
import { usePrototypeEntries } from "@/hooks/use-prototype-entries";

export function PatientTraining() {
  const { authStatus, currentUser, entries, isLoadingEntries } =
    usePrototypeEntries();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isSessionStarted, setIsSessionStarted] = useState(false);

  const trainingEntries = useMemo(
    () => entries.filter((entry) => entry.category !== "대시보드"),
    [entries],
  );

  const selectedEntry =
    trainingEntries.find((entry) => entry.id === selectedId) ??
    trainingEntries[0] ??
    null;

  const progress =
    trainingEntries.length === 0
      ? 0
      : Math.round((completedIds.length / trainingEntries.length) * 100);

  function startSession() {
    setIsSessionStarted(true);
    if (!selectedId && trainingEntries[0]) {
      setSelectedId(trainingEntries[0].id);
    }
  }

  function completeCurrentStep() {
    if (!selectedEntry) {
      return;
    }

    setCompletedIds((current) =>
      current.includes(selectedEntry.id) ? current : [...current, selectedEntry.id],
    );

    const currentIndex = trainingEntries.findIndex(
      (entry) => entry.id === selectedEntry.id,
    );
    const nextEntry = trainingEntries[currentIndex + 1];

    if (nextEntry) {
      setSelectedId(nextEntry.id);
    }
  }

  function resetSession() {
    setCompletedIds([]);
    setSelectedId(trainingEntries[0]?.id ?? null);
    setIsSessionStarted(false);
  }

  return (
    <main className="hero-grid flex flex-1 px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PrototypeNav />

        <section className="glass-card rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-medium text-muted">Patient Training</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            환자가 실제 훈련 순서를 따라가며 진행하는 전용 화면
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
            관리자가 준비한 항목을 환자 입장에서 순서대로 수행하도록 단순화한
            화면입니다. 관리 기능은 숨기고, 현재 단계와 진행률 중심으로 보여줍니다.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="glass-card rounded-[1.75rem] p-6">
            <p className="text-sm font-medium text-muted">로그인 상태</p>
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

          <article className="glass-card rounded-[1.75rem] p-6">
            <p className="text-sm font-medium text-muted">훈련 항목 수</p>
            <p className="mt-3 text-4xl font-semibold">{trainingEntries.length}</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              현재 세션에서 수행 가능한 훈련 카드 수입니다.
            </p>
          </article>

          <article className="glass-card rounded-[1.75rem] p-6">
            <p className="text-sm font-medium text-muted">진행률</p>
            <p className="mt-3 text-4xl font-semibold">{progress}%</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="glass-card rounded-[2rem] p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">훈련 목록</p>
                <h2 className="mt-2 text-2xl font-semibold">오늘의 단계</h2>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">
                patient mode
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {isLoadingEntries ? (
                <div className="rounded-[1.5rem] border border-card-border bg-white/55 p-5 text-sm text-muted">
                  훈련 항목을 준비하는 중입니다.
                </div>
              ) : null}

              {!isLoadingEntries && trainingEntries.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-card-border p-5 text-sm leading-7 text-muted">
                  아직 환자용 훈련 항목이 없습니다. 관리자 화면에서 먼저 항목을
                  만들어주세요.
                </div>
              ) : null}

              {trainingEntries.map((entry, index) => {
                const isCompleted = completedIds.includes(entry.id);
                const isSelected = selectedEntry?.id === entry.id;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`w-full rounded-[1.5rem] border p-5 text-left transition ${
                      isSelected
                        ? "border-accent bg-white"
                        : "border-card-border bg-white/60 hover:bg-white/80"
                    }`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted">STEP {index + 1}</p>
                        <p className="mt-1 text-lg font-semibold">{entry.name}</p>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {entry.note}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isCompleted ? "완료" : "대기"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">현재 훈련</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedEntry ? selectedEntry.name : "훈련을 선택해주세요"}
                </h2>
              </div>
              <span className="rounded-full bg-[#1f2a24] px-3 py-1 text-xs font-semibold text-white">
                simple flow
              </span>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-card-border bg-white/60 p-6">
              <p className="text-sm font-medium text-muted">안내</p>
              <p className="mt-3 text-base leading-8 text-foreground/85">
                {selectedEntry
                  ? selectedEntry.note
                  : "왼쪽에서 훈련 항목을 선택하면 상세 안내가 표시됩니다."}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-card-border bg-white/60 p-5">
                <p className="text-sm font-medium text-muted">세션 시작</p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  환자가 훈련을 시작할 준비가 되면 세션을 시작하세요.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-[#d0a287]"
                  onClick={startSession}
                  disabled={trainingEntries.length === 0}
                >
                  세션 시작
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-card-border bg-white/60 p-5">
                <p className="text-sm font-medium text-muted">현재 상태</p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {isSessionStarted
                    ? "세션이 시작되었습니다. 현재 단계를 완료하면 다음 단계로 넘어갑니다."
                    : "아직 세션이 시작되지 않았습니다."}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex rounded-full border border-card-border bg-white/80 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white"
                  onClick={resetSession}
                >
                  세션 초기화
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex justify-center rounded-full bg-[#1f2a24] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3931] disabled:cursor-not-allowed disabled:bg-[#8d948f]"
                onClick={completeCurrentStep}
                disabled={!selectedEntry || !isSessionStarted}
              >
                현재 단계 완료
              </button>
              <p className="text-sm leading-7 text-muted">
                환자용 화면은 복잡한 관리 버튼 없이, 수행과 진행 중심으로 유지합니다.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
