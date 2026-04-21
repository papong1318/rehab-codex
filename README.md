# Prototype App Starter

실험용 프로토타입 앱을 빠르게 시작하기 위한 `Next.js + Firebase + Vercel` 스타터입니다.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Firebase Web SDK
- Vercel CLI

## 프로젝트 구조

- `src/app/page.tsx`: 시작 화면
- `src/components/prototype-intake.tsx`: Firestore 저장 테스트 폼
- `src/lib/firebase.ts`: Firebase 앱/Firestore 초기화
- `public/prototype.html`: 정적 HTML 와이어프레임
- `.env.example`: Firebase 환경변수 예시

## 로컬 실행

```bash
cp .env.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

## Firebase 연결

1. Firebase 콘솔에서 프로젝트를 생성합니다.
2. 웹 앱을 등록합니다.
3. 발급된 웹 앱 설정값을 `.env.local`에 입력합니다.
4. 필요하면 `src/lib/firebase.ts`를 기준으로 Firestore 컬렉션 로직을 추가합니다.
5. 홈 화면 하단 테스트 폼으로 `prototypeEntries` 컬렉션 저장을 확인합니다.

예시:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Vercel 배포

처음 한 번은 로그인과 프로젝트 연결이 필요합니다.

```bash
npx vercel login
npx vercel
```

이후에는 아래 스크립트를 사용할 수 있습니다.

```bash
npm run deploy:preview
npm run deploy:prod
```

## 메모

- 배포 전 Vercel 대시보드에도 동일한 Firebase 환경변수를 등록해야 합니다.
- `public/prototype.html`로 화면 구조를 먼저 맞춘 뒤 React 컴포넌트로 옮기면 작업이 수월합니다.
