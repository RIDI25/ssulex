"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showGlobalToast } from "@/lib/toast";

export default function DelistButton({ ssulId }: { ssulId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function delist() {
    setWorking(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("delist_ssul", {
      p_ssul_id: ssulId,
    });

    if (error || data?.ok === false) {
      showGlobalToast(
        data?.error ?? "상장폐지에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      setWorking(false);
      setOpen(false);
      return;
    }

    router.push("/");
    showGlobalToast("상장폐지가 완료되었어요");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-ink-muted underline underline-offset-2"
      >
        상장폐지
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => !working && setOpen(false)}
          />
          <div className="relative w-full max-w-[360px] rounded-2xl bg-background p-5">
            <p className="text-base font-extrabold text-ink">
              이 썰을 상장폐지할까요?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              매수자 전원에게 전액 환불되며, 이 썰의 판매 수익은 회수돼요.
              리뷰와 시세 기록도 모두 사라지고 복구할 수 없어요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={working}
                className="h-11 flex-1 rounded-xl bg-card text-sm font-bold text-ink disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={delist}
                disabled={working}
                className="h-11 flex-1 rounded-xl bg-rise text-sm font-bold text-white disabled:opacity-60"
              >
                {working ? "처리 중…" : "상장폐지"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
