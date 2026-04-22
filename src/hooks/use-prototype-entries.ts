"use client";

import { useEffect, useState, useTransition } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

export const categories = ["평가", "기록", "리마인드", "대시보드"] as const;

export type PrototypeEntry = {
  id: string;
  name: string;
  category: string;
  note: string;
  ownerId?: string;
  createdAt?: { seconds?: number };
};

type PrototypeForm = {
  name: string;
  category: string;
  note: string;
};

type AuthStatus = "idle" | "signing-in" | "authenticated" | "error";

const initialForm: PrototypeForm = {
  name: "",
  category: categories[0],
  note: "",
};

export function usePrototypeEntries() {
  const [form, setForm] = useState<PrototypeForm>(initialForm);
  const [message, setMessage] = useState(
    firestore
      ? "익명 로그인을 확인한 뒤 테스트 데이터를 저장할 수 있습니다."
      : "Firebase 환경변수가 아직 없어서 현재는 저장이 비활성화되어 있습니다.",
  );
  const [entries, setEntries] = useState<PrototypeEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(() => Boolean(firestore));
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    auth ? "signing-in" : "error",
  );
  const [isPending, startTransition] = useTransition();

  const isConfigured = Boolean(firestore);
  const isAuthenticated = authStatus === "authenticated" && Boolean(currentUser);

  useEffect(() => {
    const activeAuth = auth;

    if (!activeAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(activeAuth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthStatus("authenticated");
        setMessage("익명 로그인 완료. 내 테스트 데이터를 저장하고 관리할 수 있습니다.");
        return;
      }

      try {
        await signInAnonymously(activeAuth);
      } catch {
        setAuthStatus("error");
        setMessage(
          "익명 로그인에 실패했습니다. Firebase 콘솔에서 Anonymous 로그인 제공자를 활성화해주세요.",
        );
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firestore || !currentUser) {
      return;
    }

    const entriesQuery = query(
      collection(firestore, "prototypeEntries"),
      where("ownerId", "==", currentUser.uid),
      limit(20),
    );

    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((entryDoc) => ({
            id: entryDoc.id,
            ...(entryDoc.data() as Omit<PrototypeEntry, "id">),
          }))
          .sort((left, right) => {
            const rightSeconds = right.createdAt?.seconds ?? 0;
            const leftSeconds = left.createdAt?.seconds ?? 0;
            return rightSeconds - leftSeconds;
          });

        setEntries(nextEntries);
        setIsLoadingEntries(false);
      },
      () => {
        setMessage("목록을 불러오지 못했습니다. Firestore 규칙을 확인해주세요.");
        setIsLoadingEntries(false);
      },
    );

    return unsubscribe;
  }, [currentUser]);

  function updateField(field: keyof PrototypeForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(entry: PrototypeEntry) {
    setEditingId(entry.id);
    setForm({
      name: entry.name ?? "",
      category: entry.category ?? categories[0],
      note: entry.note ?? "",
    });
    setMessage("수정 모드입니다. 내용을 고친 뒤 업데이트를 눌러주세요.");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("수정 모드를 취소했습니다.");
  }

  function submitEntry() {
    const activeFirestore = firestore;

    if (!isConfigured || !activeFirestore || !currentUser) {
      setMessage("Firebase 환경변수와 익명 로그인 상태를 확인해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateDoc(doc(activeFirestore, "prototypeEntries", editingId), {
            ...form,
            updatedAt: serverTimestamp(),
          });
          setEditingId(null);
          setMessage("선택한 항목을 업데이트했습니다.");
        } else {
          await addDoc(collection(activeFirestore, "prototypeEntries"), {
            ...form,
            ownerId: currentUser.uid,
            createdAt: serverTimestamp(),
          });
          setMessage("`prototypeEntries` 컬렉션에 테스트 데이터가 저장되었습니다.");
        }

        setForm(initialForm);
      } catch {
        setMessage("저장 중 오류가 발생했습니다. Firebase 설정과 권한 규칙을 확인해주세요.");
      }
    });
  }

  async function deleteEntry(entryId: string) {
    if (!firestore) {
      setMessage("Firebase 설정을 먼저 확인해주세요.");
      return;
    }

    if (!currentUser) {
      setMessage("익명 로그인 확인 후 다시 시도해주세요.");
      return;
    }

    setDeletingId(entryId);

    try {
      await deleteDoc(doc(firestore, "prototypeEntries", entryId));
      if (editingId === entryId) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage("선택한 항목을 삭제했습니다.");
    } catch {
      setMessage("삭제 중 오류가 발생했습니다. Firestore 권한 규칙을 확인해주세요.");
    } finally {
      setDeletingId(null);
    }
  }

  return {
    authStatus,
    currentUser,
    deletingId,
    editingId,
    entries,
    form,
    isAuthenticated,
    isConfigured,
    isLoadingEntries,
    isPending,
    message,
    setMessage,
    updateField,
    startEditing,
    cancelEditing,
    submitEntry,
    deleteEntry,
  };
}
