-- 담아가넷 초기 스키마
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  login_id        VARCHAR(50)  NOT NULL UNIQUE,
  password_hash   TEXT         NOT NULL,
  name            VARCHAR(50)  NOT NULL,
  role            VARCHAR(10)  NOT NULL CHECK (role IN ('admin','staff')),
  daily_quota     INTEGER      NOT NULL DEFAULT 0 CHECK (daily_quota >= 0),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  failed_attempts INTEGER      NOT NULL DEFAULT 0,      -- 로그인 연속 실패 횟수 (보완 컬럼)
  locked_until    TIMESTAMPTZ,                          -- 5회 실패 시 10분 잠금 (보완 컬럼)
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_statuses (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(30) NOT NULL UNIQUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_final    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_default  BOOLEAN     NOT NULL DEFAULT FALSE      -- 신규 접수 시 기본 상태 (보완 컬럼)
);

CREATE TABLE IF NOT EXISTS upload_batches (
  id           SERIAL PRIMARY KEY,
  filename     TEXT        NOT NULL,
  total        INTEGER     NOT NULL DEFAULT 0,
  inserted     INTEGER     NOT NULL DEFAULT 0,
  duplicated   INTEGER     NOT NULL DEFAULT 0,
  errors       INTEGER     NOT NULL DEFAULT 0,
  state        VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','confirmed','cancelled')), -- 보완
  payload      JSONB,                                  -- 미리보기 단계의 검증된 행 (확정 후 비움) (보완)
  uploaded_by  INTEGER     REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(50)  NOT NULL,
  phone            VARCHAR(20)  NOT NULL,              -- 숫자만 저장
  products         TEXT[]       NOT NULL DEFAULT '{}',
  carrier          VARCHAR(30),
  call_time        VARCHAR(50),
  message          TEXT,
  source           VARCHAR(10)  NOT NULL CHECK (source IN ('web','staff','upload')),
  utm_source       VARCHAR(200),
  utm_medium       VARCHAR(200),
  utm_campaign     VARCHAR(200),
  referrer         TEXT,
  status_id        INTEGER      NOT NULL REFERENCES lead_statuses(id),
  assignee_id      INTEGER      REFERENCES users(id),
  assigned_at      TIMESTAMPTZ,
  created_by       INTEGER      REFERENCES users(id),
  upload_batch_id  INTEGER      REFERENCES upload_batches(id),
  consent_at       TIMESTAMPTZ,
  ip               VARCHAR(64),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_phone    ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_assignee ON leads(assignee_id, assigned_at);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads(created_at);

CREATE TABLE IF NOT EXISTS lead_notes (
  id          SERIAL PRIMARY KEY,
  lead_id     INTEGER     NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     INTEGER     REFERENCES users(id),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at);

CREATE TABLE IF NOT EXISTS lead_status_history (
  id           SERIAL PRIMARY KEY,
  lead_id      INTEGER     NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status  INTEGER     REFERENCES lead_statuses(id),
  to_status    INTEGER     NOT NULL REFERENCES lead_statuses(id),
  user_id      INTEGER     REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_history_lead ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_status_history_user ON lead_status_history(user_id, created_at);

CREATE TABLE IF NOT EXISTS access_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     REFERENCES users(id),
  action      VARCHAR(50) NOT NULL,
  target_id   TEXT,
  detail      JSONB,                                   -- 필터 조건 등 부가 정보 (보완 컬럼)
  ip          VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs(created_at);

-- 기본 상태값
INSERT INTO lead_statuses (name, sort_order, is_final, is_default) VALUES
  ('신규',     1, FALSE, TRUE),
  ('부재',     2, FALSE, FALSE),
  ('상담중',   3, FALSE, FALSE),
  ('개통완료', 4, TRUE,  FALSE),
  ('거절',     5, TRUE,  FALSE)
ON CONFLICT (name) DO NOTHING;
