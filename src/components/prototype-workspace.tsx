"use client";

import {
  useDeferredValue,
  type FormEvent,
  useMemo,
  useState,
} from "react";
import { PrototypeNav } from "@/components/prototype-nav";
import {
  categories,
  usePrototypeEntries,
} from "@/hooks/use-prototype-entries";

function formatTimestamp(seconds?: number) {
  if (!seconds) {
    return "방금 전";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(seconds * 1000);
}

export function PrototypeWorkspace() {
  const {
    authStatus,
    cancelEditing,
    currentUser,
    deleteEntry,
    deletingId,
    editingId,
    entries,
    form,
    isAuthenticated,
    isConfigured,
    isLoadingEntries,
    isPending,
    message,
    startEditing,
    submitEntry,
    updateField,
  } = usePrototypeEntries();
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const deferredSearchText = useDeferredValue(searchText);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory =
        activeCategory === "전체" || entry.category === activeCategory;
      const normalizedQuery = deferredSearchText.trim().toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        entry.name.toLowerCase().includes(normalizedQuery) ||
        entry.note.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, deferredSearchText, entries]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitEntry();
  }

  return (
    <main className="hero-grid flex flex-1 px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PrototypeNav />

        <section className="glass-card rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-medium text-muted">Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            입력, 검색, 수정, 삭제를 한 화면에서 관리하는 작업 공간
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
            실제 데이터 입력과 정리는 이 페이지에서 수행합니다. 대시보드는
            읽기 중심, 워크스페이스는 작업 중심으로 역할을 나눴습니다.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card rounded-[2rem] p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">Firebase Test Form</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {editingId ? "Firestore 항목 수정" : "Firestore 저장 테스트"}
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isConfigured && isAuthenticated
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isConfigured && isAuthenticated ? "ready" : "setup needed"}
              </span>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-card-border bg-white/55 p-4 text-sm leading-7 text-muted">
              <p>
                인증 상태:{" "}
                <strong className="text-foreground">
                  {authStatus === "authenticated"
                    ? "익명 로그인 완료"
                    : authStatus === "signing-in"
                      ? "익명 로그인 시도 중"
                      : "설정 필요"}
                </strong>
              </p>
              <p>
                사용자 ID:{" "}
                <span className="font-mono text-xs">
                  {currentUser?.uid ?? "없음"}
                </span>
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">이름</span>
                  <input
                    className="w-full rounded-2xl border border-card-border bg-white/70 px-4 py-3 outline-none transition focus:border-accent"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="예: 사용자 A"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">카테고리</span>
                  <select
                    className="w-full rounded-2xl border border-card-border bg-white/70 px-4 py-3 outline-none transition focus:border-accent"
                    value={form.category}
                    onChange={(event) => updateField("category", event.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">메모</span>
                <textarea
                  className="min-h-32 w-full rounded-[1.5rem] border border-card-border bg-white/70 px-4 py-3 outline-none transition focus:border-accent"
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  placeholder="실험에서 저장해보고 싶은 짧은 테스트 메모"
                  required
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-7 text-muted">{message}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {editingId ? (
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-card-border bg-white/70 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white"
                      type="button"
                      onClick={cancelEditing}
                      disabled={isPending}
                    >
                      취소
                    </button>
                  ) : null}
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-[#1f2a24] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3931] disabled:cursor-not-allowed disabled:bg-[#8d948f]"
                    type="submit"
                    disabled={isPending || !isConfigured || !isAuthenticated}
                  >
                    {isPending
                      ? editingId
                        ? "업데이트 중..."
                        : "저장 중..."
                      : editingId
                        ? "업데이트"
                        : "Firestore에 저장"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="glass-card rounded-[2rem] p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">Live Collection</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  최근 저장된 prototypeEntries
                </h2>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">
                {filteredEntries.length} items
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">검색</span>
                <input
                  className="w-full rounded-2xl border border-card-border bg-white/70 px-4 py-3 outline-none transition focus:border-accent"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="이름 또는 메모로 검색"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {["전체", ...categories].map((category) => {
                  const isActive = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-[#1f2a24] text-white"
                          : "border border-card-border bg-white/65 text-foreground hover:bg-white"
                      }`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {isLoadingEntries ? (
                <div className="rounded-[1.5rem] border border-card-border bg-white/55 p-5 text-sm text-muted">
                  Firestore 목록을 불러오는 중입니다.
                </div>
              ) : null}

              {!isLoadingEntries && !isAuthenticated ? (
                <div className="rounded-[1.5rem] border border-dashed border-card-border p-5 text-sm leading-7 text-muted">
                  익명 로그인 완료 후 내 데이터 목록이 표시됩니다.
                </div>
              ) : null}

              {!isLoadingEntries && entries.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-card-border p-5 text-sm leading-7 text-muted">
                  아직 저장된 데이터가 없습니다. 왼쪽 폼으로 첫 테스트 항목을 추가해보세요.
                </div>
              ) : null}

              {!isLoadingEntries && entries.length > 0 && filteredEntries.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-card-border p-5 text-sm leading-7 text-muted">
                  현재 검색어나 필터에 맞는 항목이 없습니다.
                </div>
              ) : null}

              {filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-[1.5rem] border border-card-border bg-white/60 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">
                        {entry.name || "이름 없음"}
                      </p>
                      <p className="mt-1 text-sm text-muted">{entry.category}</p>
                    </div>
                    <span className="text-xs text-muted">
                      {formatTimestamp(entry.createdAt?.seconds)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-foreground/80">
                    {entry.note || "메모 없음"}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-card-border bg-white/75 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white"
                      onClick={() => startEditing(entry)}
                      disabled={isPending}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void deleteEntry(entry.id)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
