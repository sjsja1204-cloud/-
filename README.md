# 담아가넷 — 휴대폰·인터넷 개통 상담 DB 접수 사이트

| 경로 | 화면 |
|---|---|
| `/` | 메인: 슬라이드 배너 · 빠른 메뉴 · 실시간 상담 현황(롤링) · 통신사 요금 카드 · 진행 단계 · 후기 · 공지/FAQ · 상담 폼 · 이벤트 팝업 |
| `/internet`, `/internet/:id` | 인터넷·TV 전체 비교 / 통신사별(kt·lg·sk·skylife) 요금·결합할인 |
| `/mobile`, `/bundle` | 휴대폰 가입 안내 / 통신사별 결합할인 |
| `/event`, `/event/:id` | 이벤트 (관리자 게시판에서 작성) |
| `/support/notice` · `/support/reviews` · `/support/faq` · `/apply` | 고객센터: 공지사항 · 상담후기 · FAQ · 상담 신청(`?product=인터넷&carrier=KT` 미리 선택) |
| `/login` | 관리자/직원 로그인 (역할에 따라 `/admin` 또는 `/staff` 로 이동) |
| `/staff` | 직원: 오늘 내 DB, 전화걸기, 상태·메모, 직접 접수 (`/staff/new`) |
| `/admin` | 관리자: DB 목록·상세·배정·분배·엑셀 다운로드, 업로드(`/admin/upload`), 직원 관리(`/admin/users`), 통계(`/admin/stats`), 게시판 관리(`/admin/posts`), **요금표(`/admin/plans`), 팝업(`/admin/popups`), 메인 화면(`/admin/site`), 사이트 설정(`/admin/settings`)** |
| `/privacy`, `/terms` | 개인정보처리방침, 이용약관 (초안, `[확인필요]` 표시 항목 보완 필요) |

```
client/   React + Vite (Cloudflare Pages)
  functions/api/[[path]].js   Pages Functions: /api → Render 프록시
  src/config/site.js          상단 메뉴 구조 (인터넷 하위 메뉴는 요금표 데이터로 자동 생성)
  src/lib/siteData.jsx        요금표·배너·사업자 정보 등 관리자 콘텐츠를 API 에서 받아 공급
  src/admin/content/          관리자 콘텐츠 편집기 (임시저장·미리보기·반영·이전 버전)
server/   Node + Express API (Render)
  migrations/*.sql            DB 스키마 (순서대로 1회 실행)
  scripts/migrate.js          npm run migrate
  scripts/seed-admin.js       npm run seed:admin
  seed/defaults.js            요금표·배너·사업자 정보·팝업 초기값 (최초 migrate 때 DB 에 1회 입력)
  scripts/api-test.js         완료 기준 자동 점검 (테스트 데이터 생성 — 운영 DB 금지)
  scripts/content-test.js     관리자 콘텐츠 관리 기능 점검 (43개, 끝나면 원래대로 되돌림)
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

## 자주 바꾸는 내용 — 관리자 화면에서 (코드 수정 불필요)

자세한 사용법은 `docs/관리자_매뉴얼.md`.

| 내용 | 관리자 메뉴 | 반영 |
|---|---|---|
| 통신사·요금표·결합할인표·혜택 박스 | 요금표 | 임시저장 → 미리보기 → 사이트에 반영하기 (버전 30개 보관, 되돌리기 가능) |
| 메인 배너, 혜택 강조, 안내 문구 | 메인 화면 | 위와 동일 |
| 이벤트 팝업 (여러 개, 기간·순서·켜기/끄기, 이미지 2MB jpg/png/webp → R2) | 팝업 | 저장 즉시 |
| 사업자 정보 (푸터·약관·전화 버튼), 상담 운영시간 | 사이트 설정 → 사업자 정보 | 저장 즉시, 빈 값은 표시 안 함 |
| 상담 폼 관심상품·희망통신사 | 사이트 설정 → 상담 폼 선택지 | 저장 즉시, 기존 DB 값은 유지 |
| 상담 상태값 (추가·이름·순서·숨기기) | 사이트 설정 → 상담 상태값 | 쓰인 상태는 삭제 불가, 숨기기만 |
| 텔레그램 Chat ID | 사이트 설정 → 알림 | 봇 토큰은 서버 환경변수 |
| 공지·이벤트·후기·FAQ | 게시판 관리 | 본문은 텍스트만, 후기는 실제 고객 후기만 |

- 콘텐츠는 DB(`site_content` draft/published jsonb, zod 검증)에 저장되고, 반영할 때마다 `content_versions` 에 스냅샷이 남습니다. 반영·되돌리기·설정 변경은 `access_logs` 에 기록됩니다.
- 공개 API(`/api/plans`, `/api/site`, `/api/popups`, `/api/settings/public`)는 서버 메모리 캐시 + `Cache-Control: no-cache`(ETag). 반영 즉시 캐시가 비워집니다.
- **실시간 상담 현황**: 최근 30일 홈페이지 접수(동의 완료) 중 이름 첫 글자·관심상품·상태만 표시. 5건 미만이면 '혜택 안내 문구'로 대체 — 가짜 접수는 만들지 않음.
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
