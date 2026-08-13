import { CareerMatchDemo } from "@/components/demo/CareerMatchDemo";

export default function MatchCardPreviewPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 dark:bg-neutral-950">
      <div className="mx-auto mb-6 w-full max-w-[480px]">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">UI PREVIEW</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
          울산 채용 매칭 서비스
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">프로필 입력부터 추천 이유 확인까지 이어지는 UX 데모입니다.</p>
      </div>
      <div className="mx-auto w-full max-w-[480px]">
        <CareerMatchDemo />
      </div>
    </main>
  );
}
