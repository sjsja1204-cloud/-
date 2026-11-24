-- 관리자 콘텐츠 관리: 요금표·메인 문구(임시저장/게시/버전), 사이트 설정, 팝업

-- 요금표(plans) · 메인 배너(hero) · 혜택 문구(benefits) 등 통째로 버전 관리하는 콘텐츠
CREATE TABLE IF NOT EXISTS site_content (
  key           TEXT PRIMARY KEY,
  draft         JSONB NOT NULL,
  published     JSONB NOT NULL,
  updated_by    INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 게시할 때마다 게시된 내용 스냅샷 (key 별 최근 30개 보관)
CREATE TABLE IF NOT EXISTS content_versions (
  id            SERIAL PRIMARY KEY,
  content_key   TEXT NOT NULL,
  data          JSONB NOT NULL,
  published_by  INT REFERENCES users(id) ON DELETE SET NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT
);
CREATE INDEX IF NOT EXISTS content_versions_key_idx ON content_versions (content_key, published_at DESC);

-- 바로 반영되는 설정 (사업자 정보, 접수 폼 선택지, 텔레그램 Chat ID)
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_by  INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 이벤트 팝업 (이미지가 없으면 제목/문구로 표시)
CREATE TABLE IF NOT EXISTS popups (
  id           SERIAL PRIMARY KEY,
  image_url    TEXT,
  alt          TEXT NOT NULL DEFAULT '',
  link         TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  button_text  TEXT NOT NULL DEFAULT '',
  start_at     DATE,
  end_at       DATE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 사용 중인 상태값은 삭제 대신 숨김
ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
