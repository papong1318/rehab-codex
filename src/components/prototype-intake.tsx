"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const categories = ["평가", "기록", "리마인드", "대시보드"];

const initialForm = {
  name: "",
  category: categories[0],
  note: "",
};

type PrototypeEntry = {
  id: string;
  name: string;
  category: string;
  note: string;
  createdAt?: { seconds?: number };
};

export function PrototypeIntake() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(
    firestore
      ? "Firebase 연결 후 테스트 데이터를 바로 저장할 수 있습니다."
      : "Firebase 환경변수가 아직 없어서 현재는 저장이 비활성화되어 있습니다.",
  );
  const [entries, setEntries] = useState<PrototypeEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(() => Boolean(firestore));
  const [isPending, startTransition] = useTransition();

  const isConfigured = Boolean(firestore);

  useEffect(() => {
    if (!firestore) {
      return;
    }

    const entriesQuery = query(
      collection(firestore, "prototypeEntries"),
      orderBy("createdAt", "desc"),
      limit(6),
    );

    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        setEntries(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<PrototypeEntry, "id">),
          })),
        );
        setIsLoadingEntries(false);
      },
      () => {
        setMessage("목록을 불러오지 못했습니다. Firestore 규칙을 확인해주세요.");
        setIsLoadingEntries(false);
      },
    );

    return unsubscribe;
  }, []);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function formatCreatedAt(entry: PrototypeEntry) {
    if (!entry.createdAt?.seconds) {
      return "방금 전";
    }

    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(entry.createdAt.seconds * 1000);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeFirestore = firestore;

    if (!isConfigured || !activeFirestore) {
      setMessage("`.env.local`에 Firebase 키를 넣은 뒤 다시 시도해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        await addDoc(collection(activeFirestore, "prototypeEntries"), {
          ...form,
          createdAt: serverTimestamp(),
        });

        setForm(initialForm);
        setMessage("`prototypeEntries` 컬렉션에 테스트 데이터가 저장되었습니다.");
      } catch {
        setMessage("저장 중 오류가 발생했습니다. Firebase 설정과 권한 규칙을 확인해주세요.");
      }
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-card fade-up-delay-2 rounded-[2rem] p-7 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">Firebase Test Form</p>
            <h2 className="mt-2 text-2xl font-semibold">Firestore 저장 테스트</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isConfigured
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isConfigured ? "configured" : "needs env"}
          </span>
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
            <button
              className="inline-flex items-center justify-center rounded-full bg-[#1f2a24] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3931] disabled:cursor-not-allowed disabled:bg-[#8d948f]"
              type="submit"
              disabled={isPending || !isConfigured}
            >
              {isPending ? "저장 중..." : "Firestore에 저장"}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card fade-up-delay-2 rounded-[2rem] p-7 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">Live Collection</p>
            <h2 className="mt-2 text-2xl font-semibold">
              최근 저장된 prototypeEntries
            </h2>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">
            {entries.length} items
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {isLoadingEntries ? (
            <div className="rounded-[1.5rem] border border-card-border bg-white/55 p-5 text-sm text-muted">
              Firestore 목록을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoadingEntries && entries.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-card-border p-5 text-sm leading-7 text-muted">
              아직 저장된 데이터가 없습니다. 왼쪽 폼으로 첫 테스트 항목을 추가해보세요.
            </div>
          ) : null}

          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.5rem] border border-card-border bg-white/60 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{entry.name || "이름 없음"}</p>
                  <p className="mt-1 text-sm text-muted">{entry.category}</p>
                </div>
                <span className="text-xs text-muted">
                  {formatCreatedAt(entry)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground/80">
                {entry.note || "메모 없음"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
