"use client";

import { useState, useTransition } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const categories = ["평가", "기록", "리마인드", "대시보드"];

const initialForm = {
  name: "",
  category: categories[0],
  note: "",
};

export function PrototypeIntake() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(
    firestore
      ? "Firebase 연결 후 테스트 데이터를 바로 저장할 수 있습니다."
      : "Firebase 환경변수가 아직 없어서 현재는 저장이 비활성화되어 있습니다.",
  );
  const [isPending, startTransition] = useTransition();

  const isConfigured = Boolean(firestore);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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
    <section className="glass-card fade-up-delay-2 rounded-[2rem] p-7 sm:p-8">
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
    </section>
  );
}
