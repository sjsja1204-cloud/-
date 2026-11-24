-- 고객센터 질문/답변 게시판 · 차단 IP · 접수 출처 qna · 고객센터 드롭다운 메뉴

CREATE TABLE IF NOT EXISTS qna_posts (
  id             SERIAL PRIMARY KEY,
  author_name    VARCHAR(30)  NOT NULL,
  password_hash  TEXT,                                  -- 공지글(관리자 작성)은 NULL
  phone          VARCHAR(20),                           -- 관리자 전용 (공개 API 에서 절대 SELECT 하지 않음)
  title          VARCHAR(100) NOT NULL,
  content        TEXT         NOT NULL,
  is_secret      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_notice      BOOLEAN      NOT NULL DEFAULT FALSE,
  status         VARCHAR(10)  NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','answered','review','hidden')),
  view_count     INTEGER      NOT NULL DEFAULT 0,
  ip             VARCHAR(64),
  consent_at     TIMESTAMPTZ,
  lead_id        INTEGER      REFERENCES leads(id) ON DELETE SET NULL, -- [접수 DB로 등록] 결과
  author_id      INTEGER      REFERENCES users(id),     -- 공지글 작성 관리자
  pw_fails       INTEGER      NOT NULL DEFAULT 0,       -- 비밀번호 연속 실패 (5회 → 10분 잠금)
  pw_locked_until TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qna_posts_list_idx ON qna_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS qna_posts_ip_idx ON qna_posts (ip, created_at);

CREATE TABLE IF NOT EXISTS qna_answers (
  id          SERIAL PRIMARY KEY,
  post_id     INTEGER     NOT NULL REFERENCES qna_posts(id) ON DELETE CASCADE,
  user_id     INTEGER     REFERENCES users(id),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qna_answers_post_idx ON qna_answers (post_id, created_at);

-- 조회수: 같은 브라우저(익명 쿠키) 하루 1회
CREATE TABLE IF NOT EXISTS qna_views (
  post_id  INTEGER     NOT NULL REFERENCES qna_posts(id) ON DELETE CASCADE,
  viewer   VARCHAR(64) NOT NULL,
  day      DATE        NOT NULL,
  PRIMARY KEY (post_id, viewer, day)
);

CREATE TABLE IF NOT EXISTS blocked_ips (
  id          SERIAL PRIMARY KEY,
  ip          VARCHAR(64) NOT NULL UNIQUE,
  reason      VARCHAR(200) NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 질문/답변에서 [접수 DB로 등록] → 출처 qna
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check CHECK (source IN ('web','staff','upload','qna'));

-- 상단 메뉴: 고객센터가 아직 하위 없는 단일 링크(/support)면 드롭다운으로. 관리자가 바꾼 메뉴는 그대로.
DROP FUNCTION IF EXISTS pg_temp.cs_menu;
CREATE OR REPLACE FUNCTION pg_temp.cs_menu(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN d IS NULL OR jsonb_typeof(d->'items') <> 'array' THEN d ELSE
    jsonb_set(d, '{items}', COALESCE((
      SELECT jsonb_agg(
        CASE WHEN m->>'label' = '고객센터' AND m->>'to' = '/support' AND COALESCE(jsonb_array_length(m->'children'), 0) = 0 THEN
          m || '{"to":"","children":[
            {"label":"고객센터 안내","to":"/support","enabled":true},
            {"label":"자주 묻는 질문","to":"/support/faq","enabled":true},
            {"label":"질문/답변","to":"/support/qna","enabled":true}]}'::jsonb
        ELSE m END
        ORDER BY n)
      FROM jsonb_array_elements(d->'items') WITH ORDINALITY x(m, n)), '[]'::jsonb))
  END
$$;
UPDATE site_content SET draft = pg_temp.cs_menu(draft), published = pg_temp.cs_menu(published) WHERE key = 'menu';
