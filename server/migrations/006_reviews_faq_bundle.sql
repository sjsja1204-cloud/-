-- 추가 지시서 3: 결합할인 사용 여부, 메뉴 순서(후기·고객센터), 후기·FAQ 전용 관리, 접수 창 요금제 선택

-- 1) 통신사별 '결합할인 사용' (스카이라이프·LG헬로비전은 끔, 그 외는 켬). 이미 값이 있으면 그대로 둔다.
CREATE FUNCTION pg_temp.set_bundle(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN d IS NULL OR NOT (d ? 'carriers') THEN d ELSE
    jsonb_set(d, '{carriers}', COALESCE((
      SELECT jsonb_agg(
        CASE WHEN c ? 'bundle' THEN c
             ELSE c || jsonb_build_object('bundle', c->>'id' NOT IN ('skylife', 'hellovision')) END
        ORDER BY n)
      FROM jsonb_array_elements(d->'carriers') WITH ORDINALITY x(c, n)), '[]'::jsonb))
  END
$$;
UPDATE site_content SET draft = pg_temp.set_bundle(draft), published = pg_temp.set_bundle(published) WHERE key = 'plans';

-- 2) 상단 메뉴: 아직 이전 기본 메뉴(커뮤니티 드롭다운)면 새 기본 순서로 교체. 관리자가 바꾼 메뉴는 건드리지 않음.
CREATE FUNCTION pg_temp.new_menu() RETURNS jsonb LANGUAGE sql AS $$
  SELECT '{"items":[
    {"label":"SK인터넷","to":"/internet/sk","enabled":true,"children":[]},
    {"label":"KT인터넷","to":"/internet/kt","enabled":true,"children":[]},
    {"label":"LG인터넷","to":"/internet/lg","enabled":true,"children":[]},
    {"label":"알뜰상품","to":"","enabled":true,"children":[
      {"label":"스카이라이프","to":"/internet/skylife","enabled":true},
      {"label":"LG헬로비전","to":"/internet/hellovision","enabled":true}]},
    {"label":"후기","to":"/reviews","enabled":true,"children":[]},
    {"label":"고객센터","to":"/support","enabled":true,"children":[]},
    {"label":"꿀팁게시판","to":"/tips","enabled":false,"children":[]}
  ]}'::jsonb
$$;
UPDATE site_content SET draft = pg_temp.new_menu() WHERE key = 'menu' AND draft::text LIKE '%/community/reviews%';
UPDATE site_content SET published = pg_temp.new_menu() WHERE key = 'menu' AND published::text LIKE '%/community/reviews%';

-- 3) 후기: 관리자가 실제 고객 후기를 등록 (고객 이름은 공개 화면에서 자동 가림)
CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  customer_name VARCHAR(30)  NOT NULL,
  carrier       VARCHAR(50)  NOT NULL DEFAULT '',
  product       VARCHAR(50)  NOT NULL DEFAULT '',
  rating        SMALLINT     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  content       TEXT         NOT NULL,
  review_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  image_url     TEXT,
  is_published  BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  author_id     INTEGER      REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_public_idx ON reviews (is_published, sort_order, review_date DESC, id DESC);

-- 4) 자주 묻는 질문 (기본 질문은 넣지 않음 — 관리자가 직접 입력)
CREATE TABLE IF NOT EXISTS faqs (
  id            SERIAL PRIMARY KEY,
  category      VARCHAR(20)  NOT NULL DEFAULT '기타' CHECK (category IN ('가입', '설치', '사은품', '해지·변경', '기타')),
  question      VARCHAR(300) NOT NULL,
  answer        TEXT         NOT NULL,
  is_published  BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 기존 게시판의 후기·FAQ 를 옮김 (처음 1번만). FAQ 는 초기 예시 5개를 빼고 관리자가 쓴 글만.
INSERT INTO reviews (customer_name, product, rating, content, review_date, image_url, is_published, sort_order, author_id, created_at)
SELECT COALESCE(NULLIF(review_name, ''), '고객'), COALESCE(review_tag, ''), COALESCE(review_rating, 5),
       CASE WHEN title <> '' THEN title || E'\n' || content ELSE content END,
       (created_at AT TIME ZONE 'Asia/Seoul')::date, image_url, is_published, 0, author_id, created_at
  FROM posts
 WHERE board = 'review' AND NOT EXISTS (SELECT 1 FROM reviews);

INSERT INTO faqs (question, answer, is_published, sort_order)
SELECT title, content, is_published, sort_order
  FROM posts
 WHERE board = 'faq'
   AND title NOT IN ('상담 신청하면 바로 가입되나요?', '상담 비용이 있나요?', '지금 쓰는 인터넷 약정이 남아 있어도 바꿀 수 있나요?',
                     '설치는 얼마나 걸리나요?', '휴대폰과 인터넷을 같은 통신사로 묶으면 무엇이 좋나요?')
   AND NOT EXISTS (SELECT 1 FROM faqs);

-- 5) 접수 창에서 고른 인터넷·TV 요금제 (접수 당시 이름 그대로 저장)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_internet_plan VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_tv_plan VARCHAR(100);

-- 6) 접수 창 신청 버튼 문구를 유형별로 (비어 있을 때만 기본값)
UPDATE site_settings SET value = jsonb_set(value, '{modals,subsidy,submitLabel}', '"지원금 확인하기"')
 WHERE key = 'consult' AND value #> '{modals,subsidy}' IS NOT NULL AND NOT (value #> '{modals,subsidy}' ? 'submitLabel');
UPDATE site_settings SET value = jsonb_set(value, '{modals,recommend,submitLabel}', '"추천받기"')
 WHERE key = 'consult' AND value #> '{modals,recommend}' IS NOT NULL AND NOT (value #> '{modals,recommend}' ? 'submitLabel');
