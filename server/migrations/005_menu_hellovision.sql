-- 상단 메뉴 개편: LG헬로비전(알뜰상품) 요금 데이터 추가 (이미 있으면 건너뜀 — 이후 수정은 관리자 > 요금표)
-- 상단 메뉴(menu) 콘텐츠는 migrate.js 시드가 새 키로 채운다.
UPDATE site_content
   SET draft = jsonb_set(draft, '{carriers}', (draft->'carriers') || '[{"id":"hellovision","name":"LG헬로비전","hidden":false,"logo":"","tagline":"합리적인 요금의 알뜰 인터넷·TV","intro":"속도별 월 요금과 휴대폰 결합 시 요금을 한 번에 정리했어요.\n가입 조건과 사은품은 상담 시 자세히 안내해 드립니다.","highlights":[],"formCarrier":"LG헬로비전","priceTable":{"title":"LG헬로비전 인터넷 + TV 요금","desc":"휴대폰 결합 없이 가입할 때의 월 요금입니다. 휴대폰 결합 요금은 아래 표를 확인하세요.","tvPlans":["TV 포함"],"rows":[{"internet":"100메가","speed":"100M","internetOnly":20790,"prices":[24030]},{"internet":"500메가","speed":"500M","internetOnly":31460,"prices":[32890]},{"internet":"기가 1G","speed":"1G","internetOnly":33000,"prices":[34100]}],"notes":["요금은 약정·프로모션 조건에 따라 달라질 수 있으며, 상담 시 정확히 안내해 드립니다."]},"discountTables":[{"title":"휴대폰 결합 시 월 요금","desc":"휴대폰과 결합하면 500메가·기가 상품의 월 요금이 내려갑니다.","columns":["구성","속도","결합 안 함","휴대폰 결합","할인"],"rows":[["인터넷","100메가","20,790원","20,790원","-"],["인터넷","500메가","31,460원","25,388원","6,072원"],["인터넷","기가 1G","33,000원","26,620원","6,380원"],["인터넷+TV","100메가","24,030원","24,030원","-"],["인터넷+TV","500메가","32,890원","26,818원","6,072원"],["인터넷+TV","기가 1G","34,100원","27,720원","6,380원"]],"notes":["결합 가능 여부와 할인 금액은 휴대폰 요금제·결합 조건에 따라 달라질 수 있습니다."]}]}]'::jsonb)
 WHERE key = 'plans' AND NOT (draft->'carriers' @> '[{"id":"hellovision"}]'::jsonb);

UPDATE site_content
   SET published = jsonb_set(published, '{carriers}', (published->'carriers') || '[{"id":"hellovision","name":"LG헬로비전","hidden":false,"logo":"","tagline":"합리적인 요금의 알뜰 인터넷·TV","intro":"속도별 월 요금과 휴대폰 결합 시 요금을 한 번에 정리했어요.\n가입 조건과 사은품은 상담 시 자세히 안내해 드립니다.","highlights":[],"formCarrier":"LG헬로비전","priceTable":{"title":"LG헬로비전 인터넷 + TV 요금","desc":"휴대폰 결합 없이 가입할 때의 월 요금입니다. 휴대폰 결합 요금은 아래 표를 확인하세요.","tvPlans":["TV 포함"],"rows":[{"internet":"100메가","speed":"100M","internetOnly":20790,"prices":[24030]},{"internet":"500메가","speed":"500M","internetOnly":31460,"prices":[32890]},{"internet":"기가 1G","speed":"1G","internetOnly":33000,"prices":[34100]}],"notes":["요금은 약정·프로모션 조건에 따라 달라질 수 있으며, 상담 시 정확히 안내해 드립니다."]},"discountTables":[{"title":"휴대폰 결합 시 월 요금","desc":"휴대폰과 결합하면 500메가·기가 상품의 월 요금이 내려갑니다.","columns":["구성","속도","결합 안 함","휴대폰 결합","할인"],"rows":[["인터넷","100메가","20,790원","20,790원","-"],["인터넷","500메가","31,460원","25,388원","6,072원"],["인터넷","기가 1G","33,000원","26,620원","6,380원"],["인터넷+TV","100메가","24,030원","24,030원","-"],["인터넷+TV","500메가","32,890원","26,818원","6,072원"],["인터넷+TV","기가 1G","34,100원","27,720원","6,380원"]],"notes":["결합 가능 여부와 할인 금액은 휴대폰 요금제·결합 조건에 따라 달라질 수 있습니다."]}]}]'::jsonb)
 WHERE key = 'plans' AND NOT (published->'carriers' @> '[{"id":"hellovision"}]'::jsonb);

-- 상담 폼 희망통신사에 LG헬로비전 추가 ('상관없음' 앞, 이미 있으면 건너뜀)
UPDATE site_settings
   SET value = jsonb_set(value, '{carriers}',
         CASE WHEN value->'carriers' ? '상관없음'
              THEN (SELECT jsonb_agg(x ORDER BY i) FROM (
                      SELECT x, CASE WHEN x = '"상관없음"'::jsonb THEN 2 ELSE 1 END * 1000 + o AS i
                        FROM jsonb_array_elements(value->'carriers') WITH ORDINALITY t(x, o)
                      UNION ALL SELECT '"LG헬로비전"'::jsonb, 1999) s)
              ELSE (value->'carriers') || '["LG헬로비전"]'::jsonb END)
 WHERE key = 'form_options' AND NOT (value->'carriers' ? 'LG헬로비전');
