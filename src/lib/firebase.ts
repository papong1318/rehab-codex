import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredKeys = Object.entries(firebaseConfig);
const hasFirebaseConfig = requiredKeys.every(([, value]) => Boolean(value));

export const firebaseApp = hasFirebaseConfig
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

export function getFirebaseStatus() {
  if (hasFirebaseConfig) {
    return {
      label: "연결 준비 완료",
      description:
        "환경변수가 채워져 있어서 Firebase 앱 초기화가 가능한 상태입니다. 이제 컬렉션과 실제 데이터 로직만 붙이면 됩니다.",
    };
  }

  return {
    label: "환경변수 필요",
    description:
      "`.env.local`에 Firebase 웹 앱 설정값을 넣으면 Firestore를 바로 사용할 수 있습니다.",
  };
}
