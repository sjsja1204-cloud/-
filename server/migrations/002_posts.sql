-- 게시판: 공지사항(notice) / 이벤트(event) / 상담후기(review) / 자주묻는질문(faq)
-- 본문은 일반 텍스트로 저장하고 화면에서도 텍스트로만 표시한다 (HTML 미사용 → XSS 방지)
CREATE TABLE IF NOT EXISTS posts (
  id            SERIAL PRIMARY KEY,
  board         VARCHAR(10)  NOT NULL CHECK (board IN ('notice','event','review','faq')),
  title         VARCHAR(200) NOT NULL,
  content       TEXT         NOT NULL DEFAULT '',
  image_url     TEXT,                                  -- 대표 이미지 (선택)
  link_url      TEXT,                                  -- 이벤트 이동 링크 (선택)
  is_pinned     BOOLEAN      NOT NULL DEFAULT FALSE,   -- 상단 고정
  is_published  BOOLEAN      NOT NULL DEFAULT TRUE,    -- 공개 여부
  starts_on     DATE,                                  -- 이벤트 기간 (선택)
  ends_on       DATE,
  -- 후기 전용
  review_name   VARCHAR(20),                           -- 표시용 이름 (예: 김**)
  review_rating SMALLINT     CHECK (review_rating BETWEEN 1 AND 5),
  review_tag    VARCHAR(50),                           -- 예: KT 인터넷+TV
  sort_order    INTEGER      NOT NULL DEFAULT 0,       -- FAQ 정렬
  view_count    INTEGER      NOT NULL DEFAULT 0,
  author_id     INTEGER      REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board, is_published, is_pinned DESC, created_at DESC);

-- 기본 FAQ / 오픈 공지 (관리자 페이지에서 수정·삭제 가능)
INSERT INTO posts (board, title, content, sort_order) VALUES
  ('faq', '상담 신청하면 바로 가입되나요?', '아니요. 상담 신청은 가입이 아니라 안내 요청입니다. 상담사가 연락드려 요금과 혜택을 설명드리고, 고객님이 원하실 때만 가입이 진행됩니다.', 1),
  ('faq', '상담 비용이 있나요?', '상담은 무료입니다. 비교 안내만 받으셔도 괜찮습니다.', 2),
  ('faq', '지금 쓰는 인터넷 약정이 남아 있어도 바꿀 수 있나요?', '가능합니다. 약정 해지 시 위약금이 발생할 수 있어, 남은 약정 기간과 위약금을 함께 확인해 유리한 방법을 안내해 드립니다.', 3),
  ('faq', '설치는 얼마나 걸리나요?', '지역과 통신사 일정에 따라 다르며, 보통 신청 후 1~3일 이내 설치 기사님이 방문합니다.', 4),
  ('faq', '휴대폰과 인터넷을 같은 통신사로 묶으면 무엇이 좋나요?', '통신사별 결합할인으로 인터넷 요금이나 휴대폰 요금이 매달 할인됩니다. 가족 구성원 수와 요금제에 따라 할인액이 달라지니 상담 시 정확히 계산해 드립니다.', 5),
  ('notice', '담아가넷 홈페이지를 오픈했습니다', '담아가넷은 휴대폰·인터넷·TV 가입을 비교하고 최대 혜택으로 상담해 드리는 통신 상담 서비스입니다.' || E'\n' || '궁금한 점은 상담 신청을 남겨주시면 빠르게 연락드리겠습니다.', 0);
