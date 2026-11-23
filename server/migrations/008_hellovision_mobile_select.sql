-- LG헬로비전: 결합할인표는 끈 채로 '휴대폰 결합' 선택만 받기 (예상 요금 옆 '결합할인 문의'). 이미 정한 값은 그대로.
CREATE FUNCTION pg_temp.set_mobile(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN d IS NULL OR NOT (d ? 'carriers') THEN d ELSE
    jsonb_set(d, '{carriers}', COALESCE((
      SELECT jsonb_agg(
        CASE WHEN c->>'id' = 'hellovision' AND NOT c ? 'mobileSelect' THEN c || '{"mobileSelect": true}'::jsonb ELSE c END
        ORDER BY n)
      FROM jsonb_array_elements(d->'carriers') WITH ORDINALITY x(c, n)), '[]'::jsonb))
  END
$$;
UPDATE site_content SET draft = pg_temp.set_mobile(draft), published = pg_temp.set_mobile(published) WHERE key = 'plans';
