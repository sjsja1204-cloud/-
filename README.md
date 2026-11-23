# 담아가넷 — 휴대폰·인터넷 개통 상담 DB 접수 사이트

| 경로 | 화면 |
|---|---|
| `/` | 메인: 슬라이드 배너 · 빠른 메뉴 · 실시간 상담 현황(롤링) · 통신사 요금 카드 · 진행 단계 · 후기 · 공지/FAQ · 상담 폼 · 이벤트 팝업 |
| `/internet`, `/internet/:id` | 인터넷·TV 전체 비교 / 통신사 페이지(sk·kt·lg·skylife·hellovision): 소개·대표 혜택 → 요금표 → 결합할인표 → 간편 견적(그 통신사 선택) → 상담 신청. 요금 데이터가 없으면 "요금 정보 준비중" |
| `/reviews` | 후기: 관리자가 등록한 실제 고객 후기 카드 (이름 가림 김*희, 통신사 필터, 최신순 10개씩 더보기, 없으면 "후기를 준비 중입니다") |
| `/support` | 고객센터: 대표번호·운영시간·카카오톡 채널(입력 시) · 상담 신청 · FAQ 아코디언(가입/설치/사은품/해지·변경/기타) · 이메일·약관 링크 |
| `/tips` | 꿀팁게시판: 지금은 "준비중" 안내 + 상담 신청 (메뉴 기본 꺼짐, 게시판은 2차) |
| `/mobile`, `/bundle` | 휴대폰 가입 안내 / 통신사별 결합할인 |
| `/event`, `/event/:id` | 이벤트 (관리자 게시판에서 작성) |
| `/support/notice` · `/apply` | 공지사항 · 상담 신청(`?product=인터넷&carrier=KT` 미리 선택). 옛 주소 `/support/reviews`·`/community/reviews` → `/reviews`, `/support/faq`·`/community/faq` → `/support#faq`, `/community` → `/support` 로 이동 |
| `/login` | 관리자/직원 로그인 (역할에 따라 `/admin` 또는 `/staff` 로 이동) |
| `/staff` | 직원: 오늘 내 DB, 전화걸기, 상태·메모, 직접 접수 (`/staff/new`) |
| `/admin` | 관리자: DB 목록·상세·배정·분배·엑셀 다운로드, 업로드(`/admin/upload`), 직원 관리(`/admin/users`), 통계(`/admin/stats`), 게시판 관리(`/admin/posts`, 공지·이벤트), **후기(`/admin/reviews`), 자주 묻는 질문(`/admin/faq`)**, **요금표(`/admin/plans`), 팝업(`/admin/popups`), 메인 화면(`/admin/site`), 사이트 설정(`/admin/settings`)** |
| `/privacy`, `/terms` | 개인정보처리방침, 이용약관 (초안, `[확인필요]` 표시 항목 보완 필요) |

```
client/   React + Vite (Cloudflare Pages)
  functions/api/[[path]].js   Pages Functions: /api → Render 프록시
  src/components/site/SiteHeader.jsx  상단 메뉴 (관리자 > 메인 화면 > 상단 메뉴 데이터, PC 드롭다운·모바일 전체 메뉴)
  src/lib/siteData.jsx        요금표·배너·사업자 정보 등 관리자 콘텐츠를 API 에서 받아 공급
  src/admin/content/          관리자 콘텐츠 편집기 (임시저장·미리보기·반영·이전 버전)
server/   Node + Express API (Render)
  migrations/*.sql            DB 스키마 (순서대로 1회 실행)
  scripts/migrate.js          npm run migrate
  scripts/seed-admin.js       npm run seed:admin
  scripts/seed-faq.js         npm run seed:faq — 자주 묻는 질문 예시 14개 (FAQ 가 비어 있을 때만)
  seed/defaults.js            요금표·배너·사업자 정보·팝업 초기값 (최초 migrate 때 DB 에 1회 입력)
  scripts/api-test.js         완료 기준 자동 점검 (테스트 데이터 생성 — 운영 DB 금지)
  scripts/content-test.js     관리자 콘텐츠 관리 기능 점검 (44개, 끝나면 원래대로 되돌림)
  scripts/quote-test.js       브랜드 컬러·간편 견적·빠른 상담 메뉴 점검 (40개)
  scripts/menu-test.js        상단 메뉴·통신사 페이지 점검 (27개)
  scripts/support-test.js     결합할인 스위치·결합 할인 반영 요금·2단계 상담 창(요금제 저장)·후기·FAQ·카카오 채널 점검 (50개, 끝나면 정리)
  uploads/                    R2 미설정 시 이미지 저장 위치 (로컬 개발용, git 제외)
docs/관리자_매뉴얼.md           운영자용 사용 설명서
docs/납품_체크리스트.md          계정 소유권·환경변수·백업 확인
_원본자료/                     전달받은 원본 파일 보관 (배포 대상 아님)
```

## 로컬 실행

필요: Node.js 20.6 이상, PostgreSQL (Neon 개발용 브랜치 추천)

```bash
# 1) 서버
cd server
npm install
cp ../.env.example .env        # DATABASE_URL, JWT_SECRET 수정
npm run migrate                # 테이블 + 기본 상태값 + 콘텐츠 초기값 생성
npm run seed:admin             # 최초 관리자 (아이디/비밀번호를 입력받음)
npm run dev                    # http://localhost:4000

# 2) 프론트 (새 터미널)
cd client
npm install
npm run dev                    # http://localhost:5173  (/api 는 4000 으로 프록시)
```

> OneDrive 폴더에서 `npm run dev`(watch 모드)가 계속 재시작되면 `npm start` 로 실행하세요.

### 자동 점검

```bash
cd server
API=http://localhost:4000 ADMIN_ID=<관리자아이디> ADMIN_PW=<비밀번호> node --env-file=.env scripts/api-test.js
```
접수·honeypot·IP 제한·로그인 잠금·권한(403)·마스킹·분배 할당량·엑셀 업로드/다운로드·통계 41개 항목을 확인합니다. **테스트 직원/DB 를 생성하므로 운영 DB 에서 실행하지 마세요.**

```bash
API=http://localhost:4000 ADMIN_ID=<관리자아이디> ADMIN_PW=<비밀번호> node --env-file=.env scripts/content-test.js
```
요금표 반영·검증·미리보기·버전 되돌리기·팝업·이미지 업로드·사업자 정보·폼 선택지·상태값·권한 43개 항목을 확인하고, 끝나면 내용을 원래대로 되돌립니다.

```bash
API=http://localhost:4000 ADMIN_ID=<관리자아이디> ADMIN_PW=<비밀번호> node --env-file=.env scripts/quote-test.js
API=http://localhost:4000 ADMIN_ID=<관리자아이디> ADMIN_PW=<비밀번호> node --env-file=.env scripts/menu-test.js
API=http://localhost:4000 ADMIN_ID=<관리자아이디> ADMIN_PW=<비밀번호> node --env-file=.env scripts/support-test.js
```
브랜드 컬러(소스 전체에서 빨강·주황·마젠타 계열 색 검사), 속도 분류·단독 요금, 간편 견적 접수·요금 재계산, 접수 유형 저장·필터·엑셀, 빠른 메뉴·창 문구·브랜드 색 변경, 권한 39개 항목. 테스트 접수(010-5550-xxxx)는 끝나면 지웁니다.

## 자주 바꾸는 내용 — 관리자 화면에서 (코드 수정 불필요)

자세한 사용법은 `docs/관리자_매뉴얼.md`.

| 내용 | 관리자 메뉴 | 반영 |
|---|---|---|
| 통신사·요금표·결합할인표·혜택 박스 | 요금표 | 임시저장 → 미리보기 → 사이트에 반영하기 (버전 30개 보관, 되돌리기 가능) |
| **상단 메뉴** (이름·링크·순서·켜기/끄기, 드롭다운 하위 메뉴) | 메인 화면 → 상단 메뉴 | 위와 동일 |
| 통신사 페이지 소개 문구·대표 혜택 | 요금표 → 통신사 → 기본 정보 | 위와 동일 |
| 메인 배너, **간편 견적** 문구·켜기/끄기, 혜택 강조, 안내 문구 | 메인 화면 | 위와 동일 |
| 간편 견적 요금 (행별 속도 분류 100M/200M/500M/1G · 인터넷 단독 요금) | 요금표 | 위와 동일 |
| 빠른 상담 메뉴 (문구·순서·켜기/끄기), 상담 신청 창 제목·안내 | 사이트 설정 → 빠른 상담 메뉴 | 저장 즉시 |
| 브랜드 포인트 색 (빨강·주황·마젠타 계열이면 경고) | 사이트 설정 → 브랜드 색상 | 저장 즉시 |
| 이벤트 팝업 (여러 개, 기간·순서·켜기/끄기, 이미지 2MB jpg/png/webp → R2) | 팝업 | 저장 즉시 |
| 사업자 정보 (푸터·약관·전화 버튼), 상담 운영시간 | 사이트 설정 → 사업자 정보 | 저장 즉시, 빈 값은 표시 안 함 |
| 상담 폼 관심상품·희망통신사 | 사이트 설정 → 상담 폼 선택지 | 저장 즉시, 기존 DB 값은 유지 |
| 상담 상태값 (추가·이름·순서·숨기기) | 사이트 설정 → 상담 상태값 | 쓰인 상태는 삭제 불가, 숨기기만 |
| 텔레그램 Chat ID | 사이트 설정 → 알림 | 봇 토큰은 서버 환경변수 |
| 통신사별 **결합할인 사용** 켜기/끄기 (스카이라이프·LG헬로비전 기본 꺼짐) | 요금표 → 통신사 → 기본 정보 | 임시저장 → 반영 |
| 공지·이벤트 | 게시판 관리 | 본문은 텍스트만 |
| 후기 (추가·수정·삭제·숨김·순서, 사진 선택) | 후기 | 저장 즉시. **실제 고객 후기만** |
| 자주 묻는 질문 (카테고리·순서·숨김) | 자주 묻는 질문 | 저장 즉시. 기본 질문 없음 — 직접 입력 |
| 카카오톡 채널 주소, 상담 창 유형별 신청 버튼 문구 | 사이트 설정 → 사업자 정보 / 빠른 상담 메뉴 | 저장 즉시 |

- 콘텐츠는 DB(`site_content` draft/published jsonb, zod 검증)에 저장되고, 반영할 때마다 `content_versions` 에 스냅샷이 남습니다. 반영·되돌리기·설정 변경은 `access_logs` 에 기록됩니다.
- 공개 API(`/api/plans`, `/api/site`, `/api/popups`, `/api/settings/public`)는 서버 메모리 캐시 + `Cache-Control: no-cache`(ETag). 반영 즉시 캐시가 비워집니다.
- **실시간 상담 현황**: 최근 30일 홈페이지 접수(동의 완료) 중 이름 첫 글자·관심상품·상태만 표시. 5건 미만이면 '혜택 안내 문구'로 대체 — 가짜 접수는 만들지 않음.
- **브랜드 컬러**: 통신사 고유색(빨강·주황·마젠타)은 사이트 어디에도 쓰지 않음. 색은 `client/src/styles/global.css` 의 `--brand`·`--ink`·`--accent` 등 CSS 변수로만 지정. 통신사는 글자 칩(`CarrierChip`)으로 표시하고, 로고는 권한 있을 때만 관리자에서 등록.
- **간편 견적 · 접수 유형**: 메인 배너 아래 `QuoteWidget`. 접수 시 서버가 게시된 요금표로 예상 요금을 다시 계산해 `leads.quote_*`(통신사·서비스·속도·`quote_internet_plan`·`quote_tv_plan`·휴대폰 결합·예상요금) 에 글자 그대로 저장. 빠른 메뉴·견적·통신사 페이지는 공통 2단계 창(`ConsultModal`: 1단계 통신사·서비스·요금제 선택 + 월 요금, 2단계 이름·연락처·동의, 휴대폰은 하단 시트)을 쓰고 `leads.inquiry_type`(form/subsidy/consult/recommend/quote)으로 구분. 관리자 DB 목록 '접수 유형' 필터, 엑셀 '접수유형·견적조건' 열, 텔레그램 알림에 포함.
- **인터넷 단독 요금·결합 할인**(migration 007): 요금표 행마다 `internetOnly`(인터넷만 월 요금, 홈페이지에 '인터넷 요금' 표로 따로 표시)·`bundleDiscount`(휴대폰 결합 시 인터넷 월 할인액). 휴대폰 결합을 고르면 예상 요금 = 요금 − 할인액(서버도 같은 규칙으로 다시 계산해 저장). 통신사 `priceNote`는 예상 요금 옆 안내(LG헬로비전 "결합할인 문의"). `mobileSelect`(migration 008)는 휴대폰 결합 선택 받기 — 없으면 `bundle` 을 따르고, LG헬로비전은 결합할인 끈 채 선택만 받음.
- **결합할인 사용**(`plans.carriers[].bundle`): 끄면 그 통신사의 결합할인표·혜택 박스가 숨겨지고, 견적·상담 창에서 휴대폰 결합과 인터넷+TV+유심 선택이 빠집니다(서버도 거부).
- **후기·FAQ**: `reviews`·`faqs` 테이블(migration 006). 공개 API `/api/public/reviews`(이름은 서버에서 가려서 내보냄)·`/api/public/faqs`.
- **상단 메뉴**: `site_content` 키 `menu`. 기본: SK인터넷 / KT인터넷 / LG인터넷 / 알뜰상품(스카이라이프·LG헬로비전) / 후기 / 고객센터 (+꿀팁게시판 꺼짐). 숨김 통신사(`/api/plans` 에 없는 통신사)로 가는 `/internet/:id` 링크는 화면에서 자동으로 빠지고, 하위가 모두 빠진 드롭다운도 사라집니다. 같은 데이터로 푸터 링크도 만듭니다. PC 는 hover·클릭으로 드롭다운(ESC·↓ 키 지원), 모바일은 오른쪽 전체 메뉴 + 아코디언.
- **유입경로**: 광고 링크에 `?utm_source=naver&utm_medium=cpc&utm_campaign=11월` 처럼 붙이면 접수 시 저장됩니다.

## 동작 규칙 요약

- 홈페이지 접수 → `source=web`, 미배정, 텔레그램 알림(연락처 일부 가림).
- 스팸: 숨김 필드(honeypot) 채워지면 저장 안 함(성공 응답 위장), 같은 IP 1분 3회 제한.
- 로그인 5회 실패 → 10분 잠금 (관리자가 직원 관리에서 즉시 해제 가능).
- 직원 API 는 본인 배정 DB 만 접근 (남의 DB → 403), 연락처는 서버에서 `010-****-1234` 로 마스킹. [전화걸기]를 누를 때만 원본 1건을 받아오고 `access_logs` 에 기록.
- `access_logs` 기록: 로그인, 목록/상세 조회, 원본 번호 조회, 상태 변경, 배정/분배, 엑셀 다운로드/업로드, 직원 계정 변경.
- 분배 실행: 미배정 DB 를 오래된 순으로, 활성 직원(`staff`, 할당량>0)의 **오늘(한국시간) 남은 할당량**만큼 돌아가며 배정. 직원 직접 접수 건은 할당량에 포함하지 않음.
- 엑셀 업로드: 미리보기 단계에서는 저장하지 않음(`upload_batches.state=pending`). 확정 시 신규만 저장(선택 시 중복 포함), 오류 행은 제외. 업로드 DB 는 미배정으로 들어옴.

## 배포

### 1. Neon (DB)
1. 프로젝트 생성 (리전: Singapore 권장) → Connection string 복사 (`?sslmode=require` 포함).
2. 로컬에서 `DATABASE_URL=<운영 주소>` 로 `npm run migrate`, `npm run seed:admin` 실행 (또는 Render 배포 후 Shell 에서).

### 2. Render (API)
1. GitHub 저장소 연결 → **New → Blueprint** 로 루트의 `render.yaml` 사용 (또는 Web Service 수동 생성: Root Directory `server`, Build `npm install --omit=dev`, Start `npm start`).
2. 환경변수: `DATABASE_URL`, `JWT_SECRET`(자동 생성), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `R2_ACCOUNT_ID`·`R2_ACCESS_KEY_ID`·`R2_SECRET_ACCESS_KEY`·`R2_BUCKET`·`R2_PUBLIC_URL`(팝업·배너 이미지), `CLIENT_ORIGIN`(Pages 도메인), `TRUST_PROXY=2`, `COOKIE_SAMESITE=lax`, `NODE_ENV=production`. 뜻은 `docs/납품_체크리스트.md` 참고.
   - R2 미설정 시 이미지가 서버 디스크에 저장되어 재배포 때 사라집니다 (로그에 경고).
3. 배포 후 `https://<서비스>.onrender.com/api/health` → `{"ok":true}` 확인.

### 3. Cloudflare Pages (프론트)
1. Pages → 저장소 연결. **Root directory `client`**, Build command `npm run build`, Output `dist`.
2. 환경변수: `API_ORIGIN=https://<서비스>.onrender.com` (Functions 프록시용), `NODE_VERSION=22`.
3. `client/functions/api/[[path]].js` 가 `/api/*` 를 Render 로 전달 → 프론트와 API 가 같은 도메인이 되어 로그인 쿠키가 Safari 에서도 동작합니다.
4. SPA 라우팅은 Pages 기본 동작(404.html 없으면 index.html)으로 처리됩니다.

### 4. Cloudflare R2 (이미지)
1. R2 → 버킷 생성 → Settings 에서 Public access(r2.dev) 켜기 또는 커스텀 도메인 연결 → 그 주소가 `R2_PUBLIC_URL`.
2. R2 → Manage API Tokens → Object Read & Write 토큰 생성 → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. 계정 ID 는 `R2_ACCOUNT_ID`.

### 텔레그램 봇
1. @BotFather → `/newbot` → 토큰 발급 → `TELEGRAM_BOT_TOKEN`.
2. 알림 받을 방(개인/그룹)에 봇을 추가하고 메시지 1개 전송 → `https://api.telegram.org/bot<토큰>/getUpdates` 에서 `chat.id` 확인 → `TELEGRAM_CHAT_ID`.

### 배포 체크리스트
- [ ] Neon 운영 DB 에 `npm run migrate` 완료, `npm run seed:admin` 으로 관리자 생성
- [ ] Render 환경변수 전부 입력, `JWT_SECRET` 32자 이상, `NODE_ENV=production`
- [ ] `CLIENT_ORIGIN` 에 Pages 도메인(및 커스텀 도메인) 정확히 입력 (끝 `/` 없이)
- [ ] Pages `API_ORIGIN` 입력 후 재배포
- [ ] `/api/health` 정상, 홈에서 테스트 접수 → 텔레그램 알림 수신 → 관리자 목록에서 확인 후 삭제/거절 처리
- [ ] 관리자 로그인 → 직원 계정 생성 → 할당량 설정 → 분배 실행 → 직원 로그인 확인
- [ ] 휴대폰(375px)에서 홈·직원 화면 확인, [전화걸기] 동작 확인
- [ ] 관리자 **사이트 설정**에 사업자 정보 입력, **팝업** 이벤트 내용 확인, 약관의 `[확인필요]` 항목 확정
- [ ] 계정 소유권·결제수단·비밀값 교체: `docs/납품_체크리스트.md`
- [ ] Render free 플랜이면 잠들기 방지 또는 starter 플랜 사용 (첫 접수 지연 방지)

## 확인 필요 (TODO)

| 항목 | 위치 |
|---|---|
| 요금표 초기값은 미리보기 HTML 번들에서 추출함 → 실제 요금은 관리자 **요금표**에서 확인·수정 | 관리자 > 요금표 |
| 주소·사업자번호·통신판매업번호·대표번호, 개인정보 보호책임자 | 관리자 > 사이트 설정 |
| 이벤트 팝업 이미지/문구 | 관리자 > 팝업 |
| 개인정보 보관 기간, 제3자 제공처, 시행일 등 | `/privacy`, `/terms` |
| 직원 화면 구성 (참고 영상 분석 결과 반영) | `client/src/staff/*` (작게 분리해 둠) |
| 엑셀 업로드 중복 행 기본 처리 (현재: 기본 제외, 체크 시 저장) | `server/src/routes/admin/upload.js` |
| 직원 직접 접수 건을 할당량에 포함할지 (현재: 제외) | `server/src/lib/distribute.js` |
| 전화 접수 고객 개인정보 동의 절차 (현재: 직원이 '동의 받음' 체크) | `client/src/staff/StaffCreatePage.jsx` |
| IP 제한이 메모리 기반 (서버 재시작 시 초기화, 단일 인스턴스 기준) | `server/src/routes/public.js` |

## 2차 범위 확장 포인트 (미구현)
- 자동 분배 cron: `server/src/lib/distribute.js` 의 `distributeUnassigned()` 를 스케줄러에서 호출
- 미처리 DB 회수: `leads.assigned_at` + `lead_statuses.is_final` 기준으로 조회해 `assignee_id` 해제
- 카카오 알림톡: `server/src/lib/telegram.js` 옆에 알림 모듈 추가 후 `public.js` 에서 호출
