"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SsulPublic } from "@/lib/types";
import { baselinePrice, changeRate, type PricePoint } from "@/lib/price";
import { formatPoints } from "@/lib/format";
import { showGlobalToast } from "@/lib/toast";
import SsulCard from "@/components/SsulCard";
import Toast from "@/components/Toast";
import DelistButton from "@/components/DelistButton";

type Tab = "bought" | "listed";

interface ListedItem {
  ssul: SsulPublic;
  rate: number;
}

export default function MyPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [points, setPoints] = useState<number | null>(null);

  const [nickInput, setNickInput] = useState("");
  const [savingNick, setSavingNick] = useState(false);

  const [tab, setTab] = useState<Tab>("bought");
  const [bought, setBought] = useState<SsulPublic[]>([]);
  const [listed, setListed] = useState<ListedItem[]>([]);
  const [listsLoading, setListsLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadLists = useCallback(async (uid: string) => {
    const supabase = createClient();

    // 매수한 썰: purchases → ssuls_public
    const boughtTask = (async () => {
      const { data: purchaseRows } = await supabase
        .from("purchases")
        .select("ssul_id, created_at")
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false });
      const ids = (purchaseRows ?? []).map((p) => p.ssul_id);
      if (ids.length === 0) {
        setBought([]);
        return;
      }
      const { data: ssuls } = await supabase
        .from("ssuls_public")
        .select("*")
        .in("id", ids);
      const byId = new Map((ssuls ?? []).map((s) => [s.id, s as SsulPublic]));
      setBought(ids.map((id) => byId.get(id)).filter(Boolean) as SsulPublic[]);
    })();

    // 상장한 썰: 내가 쓴 썰 + 등락률
    const listedTask = (async () => {
      const { data: mine } = await supabase
        .from("ssuls_public")
        .select("*")
        .eq("author_id", uid)
        .order("created_at", { ascending: false });
      const myList = (mine as SsulPublic[]) ?? [];
      if (myList.length === 0) {
        setListed([]);
        return;
      }
      const { data: historyData } = await supabase
        .from("price_history")
        .select("ssul_id, price, created_at")
        .in(
          "ssul_id",
          myList.map((s) => s.id)
        )
        .order("created_at", { ascending: true });
      const historyMap = new Map<string, PricePoint[]>();
      (historyData ?? []).forEach((h) => {
        const arr = historyMap.get(h.ssul_id) ?? [];
        arr.push({ price: h.price, created_at: h.created_at });
        historyMap.set(h.ssul_id, arr);
      });
      setListed(
        myList.map((ssul) => ({
          ssul,
          rate: changeRate(
            ssul.current_price,
            baselinePrice(historyMap.get(ssul.id) ?? [])
          ),
        }))
      );
    })();

    await Promise.all([boughtTask, listedTask]);
    setListsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname, points")
        .eq("id", user.id)
        .single();
      if (profile) {
        setNickname(profile.nickname ?? "익명");
        setNickInput(profile.nickname ?? "");
        setPoints(profile.points);
      }
      setChecking(false);
      loadLists(user.id);
    });
  }, [router, loadLists]);

  async function saveNickname() {
    if (!userId) return;
    const next = nickInput.trim();
    if (next.length < 2 || next.length > 12) {
      showToast("닉네임은 2~12자로 입력해 주세요.");
      return;
    }
    if (next === nickname) return;

    setSavingNick(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: next })
      .eq("id", userId);

    if (error) {
      // P0001: 트리거 raise exception (예약어 등), 23514: check 제약 위반
      showToast(
        error.code === "P0001" || error.code === "23514"
          ? "사용할 수 없는 닉네임이에요"
          : "닉네임 변경에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
    } else {
      setNickname(next);
      showToast("닉네임이 변경됐어요.");
    }
    setSavingNick(false);
  }

  async function confirmDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_account");

    if (error) {
      showToast("탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setDeleting(false);
      return;
    }

    // 계정은 이미 삭제됨 — 로컬 세션만 정리하고 메인으로
    await supabase.auth.signOut({ scope: "local" });
    router.push("/");
    showGlobalToast("탈퇴가 완료되었어요");
  }

  if (checking) {
    return (
      <div className="py-24 text-center text-sm text-ink-muted">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      {/* 프로필 요약 */}
      <div className="rounded-2xl bg-card p-5">
        <p className="text-lg font-extrabold text-ink">{nickname}</p>
        <p className="mt-1 text-sm text-ink-muted">
          보유 포인트{" "}
          <span className="font-bold text-primary tabular-nums">
            {points === null ? "…" : formatPoints(points)}
          </span>
        </p>
      </div>

      {/* 닉네임 변경 */}
      <div className="mt-4">
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
          닉네임 변경 (2~12자)
        </label>
        <div className="flex gap-2">
          <input
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            maxLength={12}
            className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={saveNickname}
            disabled={
              savingNick ||
              nickInput.trim().length < 2 ||
              nickInput.trim() === nickname
            }
            className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            {savingNick ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="mt-7 flex border-b border-card">
        {(
          [
            ["bought", "매수한 썰"],
            ["listed", "상장한 썰"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 pb-2.5 text-sm font-bold transition-colors ${
              tab === t
                ? "border-primary text-ink"
                : "border-transparent text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 py-4">
        {listsLoading ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            불러오는 중…
          </p>
        ) : tab === "bought" ? (
          bought.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              아직 매수한 썰이 없어요.
            </p>
          ) : (
            bought.map((ssul) => (
              <Link key={ssul.id} href={`/ssul/${ssul.id}`}>
                <SsulCard ssul={ssul} />
              </Link>
            ))
          )
        ) : listed.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            아직 상장한 썰이 없어요.
          </p>
        ) : (
          listed.map(({ ssul, rate }) => (
            <div key={ssul.id}>
              <Link href={`/ssul/${ssul.id}`}>
                <SsulCard ssul={ssul} rate={rate} />
              </Link>
              <div className="mt-1.5 flex justify-end pr-1">
                <DelistButton ssulId={ssul.id} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 회원 탈퇴 */}
      <div className="mt-8 flex justify-center pb-4">
        <button
          onClick={() => setConfirmOpen(true)}
          className="text-xs text-ink-muted underline underline-offset-2"
        >
          회원 탈퇴
        </button>
      </div>

      {/* 탈퇴 확인 모달 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-[360px] rounded-2xl bg-background p-5">
            <p className="text-base font-extrabold text-ink">
              정말 탈퇴하시겠어요?
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-sm leading-relaxed text-ink-muted">
              <li>· 보유 포인트와 거래 내역이 모두 사라지며 복구할 수 없어요</li>
              <li>· 상장한 썰도 함께 사라져요</li>
              <li>
                · 탈퇴 후 같은 카카오 계정으로 재가입해도 신규 가입 보너스는
                다시 지급되지 않아요
              </li>
            </ul>
            <div className="mt-5 flex flex-col gap-1">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="h-12 rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-60"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-11 rounded-xl text-[13px] font-semibold text-rise disabled:opacity-60"
              >
                {deleting
                  ? "탈퇴 처리 중…"
                  : "모두 잃는 것을 이해했으며 탈퇴할게요"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
