import Icon from "./Icon";

const STEPS = [
  { icon: "clipboard", title: "상담 신청", desc: "이름·연락처만 남기면 끝" },
  { icon: "headset", title: "전문 상담", desc: "요금·결합할인 비교 안내" },
  { icon: "calc", title: "맞춤 견적", desc: "위약금까지 계산한 최적 조합" },
  { icon: "wrench", title: "설치·개통", desc: "원하는 날짜에 방문 설치" },
];

export default function ProcessSteps() {
  return (
    <ol className="steps">
      {STEPS.map((s, k) => (
        <li key={s.title}>
          <span className="steps-no">STEP {k + 1}</span>
          <span className="steps-ic"><Icon name={s.icon} size={28} /></span>
          <b>{s.title}</b>
          <span>{s.desc}</span>
        </li>
      ))}
    </ol>
  );
}
