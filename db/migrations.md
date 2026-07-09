# Supabase 적용 SQL 이력

이 프로젝트의 DB 변경은 전부 Supabase SQL Editor에서 직접 실행한다.
**규칙: DB를 변경할 때마다 실행한 SQL을 이 파일에 날짜순으로 기록한다.**
(코드는 DB 함수를 호출만 하고, 포인트·시세 계산은 전부 DB가 담당한다)

각 항목 형식:

```
## YYYY-MM-DD 제목
설명 한 줄
​```sql
실행한 SQL
​```
```

---

## 2026-07-08 초기 스키마 (1단계)

profiles / point_transactions / ssuls 테이블, 가입 트리거(프로필 생성 + 1,000P 지급), RLS 정책.
- ssuls: `body`, `preview`, `current_price`(기본 100), `category` check 제약
- RLS: ssuls 누구나 조회 + 본인만 작성, profiles 누구나 조회 + 본인만 수정, point_transactions 본인만 조회

```sql
-- (SQL 붙여넣기)
```

## 2026-07-08 거래 기능 (2단계)

purchases / reviews 테이블, ssuls_public 뷰(body 제외), 본문 잠금 RLS(매수자/작성자만 ssuls 조회),
함수: `buy_ssul(p_ssul_id)`, `write_review(p_ssul_id, p_rating, p_comment)` (30% 환급), `claim_daily_bonus()` (+200P).

```sql
-- (SQL 붙여넣기)
```

## 2026-07-08 시세 (3단계)

price_history 테이블(누구나 조회), 상장/매수/리뷰 시 시세 기록 트리거.

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 계정 (4단계)

가입 트리거 수정: 랜덤 닉네임 자동 배정 (예: "용감한개미2847"),
`delete_account()` 함수 (SECURITY DEFINER, auth.users 본인 삭제 + CASCADE).

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 최소 분량 제한

ssuls에 공백 제외 300자 이상 check 제약.

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 상장폐지

`delist_ssul(p_ssul_id)` 함수: 매수자 전액 환불 + 판매 수익 회수 + 리뷰/시세 기록 삭제.
point_transactions reason 추가: `delist_refund`, `delist_clawback`.

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 시리즈 연재

ssuls에 `prev_ssul_id` 컬럼(이전 편 연결) + 검증 트리거, ssuls_public 뷰에 포함.

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 카테고리 정리

category check 제약 변경 이력: 3종(fun/scary/info) → 6종 → 8종 → **최종 6종 (fun/scary/angry/love/healing/info)**.
기존 surprise/amazing 데이터 정리 포함.

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 관리자 / 신고

profiles에 `is_admin` 컬럼, `admin_delist_ssul(p_ssul_id)` 함수(내부에서 is_admin 검증),
reports 테이블(1인 1신고 unique 제약).

```sql
-- (SQL 붙여넣기)
```

## 2026-07-09 배포 전 보안 조치

보안 점검 후속 조치:
- profiles.points 클라이언트 직접 수정 차단 (컬럼 보호)
- ssuls INSERT 시 current_price 클라이언트 지정 차단
- reports.reporter_id 위조 차단 (`WITH CHECK reporter_id = auth.uid()`)
- admin_delist_ssul 내부 is_admin 검증 / reports SELECT 정책 확인

```sql
-- (SQL 붙여넣기)
```
