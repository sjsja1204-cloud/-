import { Link } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import ApplySection from "../components/site/ApplySection";
import Icon from "../components/site/Icon";

const TYPES = [
  { title: "번호이동", desc: "쓰던 번호 그대로 통신사만 바꾸기. 통신사 이동 혜택을 비교해 드려요.", icon: "link" },
  { title: "기기변경", desc: "지금 통신사 그대로 새 휴대폰으로. 약정·요금제 조건을 함께 따져봐요.", icon: "phone" },
  { title: "신규가입", desc: "새 번호 개통. 자녀·부모님 회선 추가 시 가족결합까지 안내해 드려요.", icon: "gift" },
];
const CHECKS = [
  "약정이 끝났는데 요금이 그대로인 분",
  "가족 휴대폰 통신사가 제각각인 분",
  "인터넷과 같은 통신사로 묶어 할인받고 싶은 분",
  "요금제가 내 사용량에 맞는지 궁금한 분",
];

export default function MobilePage() {
  return (
    <SiteLayout title="휴대폰 가입 상담">
      <PageHero title="휴대폰" desc="번호이동 · 기기변경 · 신규가입, 내 상황에 맞는 조건으로 상담받으세요." crumbs={[["휴대폰"]]} />

      <section className="sec">
        <div className="site-inner">
          <h2 className="sec-title">가입 유형</h2>
          <div className="type-grid">
            {TYPES.map((t) => (
              <div key={t.title} className="type-card">
                <span className="quick-ic"><Icon name={t.icon} size={26} /></span>
                <b>{t.title}</b>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-soft">
        <div className="site-inner two-col">
          <div>
            <p className="sec-kicker">CHECK</p>
            <h2 className="sec-title">이런 분께 추천해요</h2>
            <ul className="check-list">
              {CHECKS.map((c) => <li key={c}><Icon name="check" size={18} /> {c}</li>)}
            </ul>
          </div>
          <div className="info-box">
            <h3><Icon name="link" size={20} /> 인터넷과 묶으면 더 저렴해요</h3>
            <p>휴대폰과 인터넷을 같은 통신사로 결합하면 매달 휴대폰 요금 또는 인터넷 요금이 할인됩니다. 가족 회선 수가 많을수록 할인 폭이 커져요.</p>
            <Link to="/bundle" className="btn btn-dark" style={{ marginTop: 12 }}>통신사별 결합할인 보기</Link>
          </div>
        </div>
      </section>

      <ApplySection title="휴대폰 가입 상담" initial={{ products: ["휴대폰"] }} />
    </SiteLayout>
  );
}
