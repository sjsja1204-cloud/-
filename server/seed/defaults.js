// 최초 시드 데이터 — npm run migrate 시 비어 있는 항목만 채운다.
// 이후 내용 변경은 관리자 페이지에서 한다 (이 파일을 고쳐도 이미 들어간 DB 값은 바뀌지 않음).
// 원래 client/src/components/plans/telecomPlans.js, config/business.js, config/popup.js, config/site.js 에 있던 값.

export const content = {
  "plans": {
    "carriers": [
      {
        "id": "kt",
        "name": "KT",
        "hidden": false,
        "logo": "",
        "tagline": "기가인터넷 대표 사업자, 안정적인 속도",
        "intro": "",
        "highlights": [],
        "priceTable": {
          "title": "KT 인터넷 + TV 요금",
          "desc": "와이파이 공유기(AP) 포함 월 요금입니다.",
          "tvPlans": [
            "라이트",
            "에센스",
            "모든G"
          ],
          "rows": [
            {
              "internet": "슬림 100M",
              "speed": "100M",
              "internetOnly": 23100,
              "bundleDiscount": 3300,
              "prices": [
                42900,
                46200,
                49500
              ]
            },
            {
              "internet": "베이직 500M",
              "speed": "500M",
              "internetOnly": 34100,
              "bundleDiscount": 5500,
              "prices": [
                48400,
                51700,
                55000
              ]
            },
            {
              "internet": "1G",
              "speed": "1G",
              "internetOnly": 38500,
              "bundleDiscount": 5500,
              "prices": [
                52800,
                56100,
                59400
              ]
            }
          ],
          "notes": []
        },
        "discountTables": [
          {
            "title": "KT 총액 결합할인",
            "desc": "모바일 요금 총액에 따라 인터넷과 모바일 요금에서 할인을 받으실 수 있습니다.",
            "columns": [
              "모바일 요금 총액",
              "기가 1G/500M 인터넷 할인",
              "기가 1G/500M 모바일 할인",
              "광랜 100M 인터넷 할인",
              "광랜 100M 모바일 할인"
            ],
            "rows": [
              [
                "22,000원 미만",
                "2,200원",
                "-",
                "1,650원",
                "-"
              ],
              [
                "22,000원 이상",
                "5,500원",
                "-",
                "3,300원",
                "-"
              ],
              [
                "64,900원 이상",
                "5,500원",
                "5,500원",
                "3,300원",
                "3,300원"
              ],
              [
                "108,900원 이상",
                "5,500원",
                "16,610원",
                "3,300원",
                "14,300원"
              ],
              [
                "141,900원 이상",
                "5,500원",
                "22,110원",
                "3,300원",
                "18,700원"
              ],
              [
                "174,900원 이상",
                "5,500원",
                "27,610원",
                "5,500원",
                "23,100원"
              ]
            ],
            "boxes": [
              {
                "title": "TV 2대 이상 가입 시 추가 혜택",
                "items": [
                  [
                    "베이직",
                    "7,370원"
                  ],
                  [
                    "라이트",
                    "7,920원"
                  ],
                  [
                    "에센스",
                    "8,800원"
                  ]
                ],
                "note": "월 사용료 (셋탑박스 별도)"
              },
              {
                "title": "KT 결합 특징",
                "bullets": [
                  "LTE/5G 구분 없이 최대 5대 결합 가능",
                  "가족 간 모바일 요금 합산 금액에 따라 할인 차등 적용",
                  "약정 기간 내 해지 시 할인반환금 발생"
                ]
              }
            ]
          }
        ],
        "formCarrier": "KT",
        "bundle": true
      },
      {
        "id": "lg",
        "name": "LG U+",
        "hidden": false,
        "logo": "",
        "tagline": "U+tv 콘텐츠와 휴대폰 결합 혜택",
        "intro": "",
        "highlights": [],
        "priceTable": {
          "title": "LG U+ 인터넷 + TV 요금",
          "desc": "와이파이 공유기(AP) 포함 월 요금입니다.",
          "tvPlans": [
            "실속형",
            "프리미엄"
          ],
          "rows": [
            {
              "internet": "광랜 100M",
              "speed": "100M",
              "internetOnly": 22000,
              "bundleDiscount": 5500,
              "prices": [
                39600,
                42900
              ]
            },
            {
              "internet": "슬림 500M",
              "speed": "500M",
              "internetOnly": 33000,
              "bundleDiscount": 9900,
              "prices": [
                45100,
                48400
              ]
            },
            {
              "internet": "기가 1G",
              "speed": "1G",
              "internetOnly": 38500,
              "bundleDiscount": 13200,
              "prices": [
                50600,
                53900
              ]
            }
          ],
          "notes": []
        },
        "discountTables": [
          {
            "title": "참 쉬운 가족결합",
            "desc": "알뜰폰 및 인터넷끼리도 결합 가능! (유무선/무선간 결합할인)",
            "boxesTop": [
              {
                "title": "인터넷 속도에 따른 요금 할인 (가족결합 시)",
                "items": [
                  [
                    "100M (광랜안심)",
                    "5,500원 할인"
                  ],
                  [
                    "500M (기가슬림)",
                    "9,900원 할인"
                  ],
                  [
                    "1GIGA (기가안심)",
                    "13,200원 할인"
                  ]
                ]
              }
            ],
            "columns": [
              "결합 회선 수",
              "6.9만 미만",
              "8.8만 미만",
              "8.8만 이상"
            ],
            "rows": [
              [
                "1명",
                "0",
                "0",
                "0"
              ],
              [
                "2명",
                "2,200원",
                "3,300원",
                "4,400원"
              ],
              [
                "3명",
                "3,300원",
                "5,500원",
                "6,600원"
              ],
              [
                "4명~10명",
                "4,400원",
                "6,600원",
                "8,800원"
              ]
            ],
            "notes": [
              "금액은 모바일 요금제별 할인금액입니다.",
              "가족 데이터 제공: 결합 모바일 1명당 1,000MB 제공"
            ]
          }
        ],
        "formCarrier": "LG U+",
        "bundle": true
      },
      {
        "id": "sk",
        "name": "SK브로드밴드",
        "hidden": false,
        "logo": "",
        "tagline": "B tv와 SKT 가족결합 할인",
        "intro": "",
        "highlights": [],
        "priceTable": {
          "title": "SK 인터넷 + TV 요금",
          "desc": "와이파이 공유기(AP) 포함 월 요금입니다.",
          "tvPlans": [
            "이코노미",
            "스탠다드",
            "ALL"
          ],
          "rows": [
            {
              "internet": "광랜 100M",
              "speed": "100M",
              "internetOnly": 23100,
              "bundleDiscount": null,
              "prices": [
                36300,
                39600,
                42900
              ]
            },
            {
              "internet": "기가 500M",
              "speed": "500M",
              "internetOnly": 34100,
              "bundleDiscount": 11000,
              "prices": [
                42900,
                46200,
                49500
              ]
            },
            {
              "internet": "기가 1G",
              "speed": "1G",
              "internetOnly": 39600,
              "bundleDiscount": 13200,
              "prices": [
                48400,
                51700,
                55000
              ]
            }
          ],
          "notes": []
        },
        "discountTables": [
          {
            "title": "SK 결합정보",
            "desc": "기가 계열 인터넷(500M / 1G) 사용 시 적용되는 가족 결합 할인표입니다.",
            "columns": [
              "이동전화 회선수",
              "이동전화 할인액",
              "500M 인터넷 할인",
              "1G 인터넷 할인"
            ],
            "rows": [
              [
                "1회선",
                "3,500원 (3,500원)",
                "11,000원",
                "13,200원"
              ],
              [
                "2회선",
                "7,000원 (3,500원)",
                "11,000원",
                "13,200원"
              ],
              [
                "3회선",
                "18,000원 (6,000원)",
                "11,000원",
                "13,200원"
              ],
              [
                "4회선",
                "24,000원 (6,000원)",
                "11,000원",
                "13,200원"
              ]
            ],
            "boxes": [
              {
                "title": "요즘가족결합 : IPTV 추가혜택",
                "items": [
                  [
                    "TV 요금 할인",
                    "-1,150원"
                  ],
                  [
                    "이동전화 데이터",
                    "데이터팩 무료"
                  ]
                ]
              },
              {
                "title": "요즘우리집결합 : IPTV 추가혜택",
                "items": [
                  [
                    "대상",
                    "All 요금제 이상"
                  ],
                  [
                    "VOD 쿠폰",
                    "월 3,300원 (36개월)"
                  ]
                ]
              },
              {
                "title": "NewTV 플러스 / 기타 할인",
                "items": [
                  [
                    "NewTV 플러스",
                    "-1,100원"
                  ],
                  [
                    "인터넷+전화 결합",
                    "-1,100원 ~ -2,200원"
                  ]
                ]
              }
            ]
          }
        ],
        "formCarrier": "SK",
        "bundle": true
      },
      {
        "id": "skylife",
        "name": "KT스카이라이프",
        "hidden": false,
        "logo": "",
        "tagline": "합리적인 요금의 인터넷+TV",
        "intro": "",
        "highlights": [],
        "priceTable": {
          "title": "KT스카이라이프 인터넷 + TV 요금",
          "desc": "월 요금입니다.",
          "tvPlans": [
            "IPTV 베이직",
            "IPTV 플러스"
          ],
          "rows": [
            {
              "internet": "스카이안심 200M",
              "speed": "200M",
              "internetOnly": null,
              "bundleDiscount": null,
              "prices": [
                36300,
                37400
              ]
            },
            {
              "internet": "스카이안심 500M",
              "speed": "500M",
              "internetOnly": null,
              "bundleDiscount": null,
              "prices": [
                41800,
                42900
              ]
            }
          ],
          "notes": [
            "요금할인형 홈번들 30%는 별도 문의 바랍니다."
          ]
        },
        "discountTables": [],
        "formCarrier": "KT스카이라이프",
        "bundle": false
      },
      {
        "id": "hellovision",
        "name": "LG헬로비전",
        "hidden": false,
        "logo": "",
        "tagline": "합리적인 요금의 알뜰 인터넷·TV",
        "intro": "속도별 인터넷·TV 월 요금을 한 번에 정리했어요.\n휴대폰 결합 할인과 가입 조건·사은품은 상담 시 자세히 안내해 드립니다.",
        "highlights": [],
        "priceTable": {
          "title": "LG헬로비전 인터넷 + TV 요금",
          "desc": "와이파이 포함 월 요금입니다. 휴대폰 결합 요금은 자주 바뀌어 상담 시 안내해 드립니다.",
          "tvPlans": [
            "TV 포함"
          ],
          "rows": [
            {
              "internet": "100메가",
              "speed": "100M",
              "internetOnly": 20790,
              "bundleDiscount": null,
              "prices": [
                24030
              ]
            },
            {
              "internet": "160메가",
              "speed": null,
              "internetOnly": 27610,
              "bundleDiscount": null,
              "prices": [
                null
              ]
            },
            {
              "internet": "500메가",
              "speed": "500M",
              "internetOnly": 31460,
              "bundleDiscount": null,
              "prices": [
                32890
              ]
            },
            {
              "internet": "기가 1G",
              "speed": "1G",
              "internetOnly": 33000,
              "bundleDiscount": null,
              "prices": [
                34100
              ]
            }
          ],
          "notes": [
            "요금은 약정·프로모션 조건에 따라 달라질 수 있으며, 상담 시 정확히 안내해 드립니다."
          ]
        },
        "discountTables": [
          {
            "title": "휴대폰 결합 시 월 요금",
            "desc": "휴대폰과 결합하면 500메가·기가 상품의 월 요금이 내려갑니다.",
            "columns": [
              "구성",
              "속도",
              "결합 안 함",
              "휴대폰 결합",
              "할인"
            ],
            "rows": [
              [
                "인터넷",
                "100메가",
                "20,790원",
                "20,790원",
                "-"
              ],
              [
                "인터넷",
                "500메가",
                "31,460원",
                "25,388원",
                "6,072원"
              ],
              [
                "인터넷",
                "기가 1G",
                "33,000원",
                "26,620원",
                "6,380원"
              ],
              [
                "인터넷+TV",
                "100메가",
                "24,030원",
                "24,030원",
                "-"
              ],
              [
                "인터넷+TV",
                "500메가",
                "32,890원",
                "26,818원",
                "6,072원"
              ],
              [
                "인터넷+TV",
                "기가 1G",
                "34,100원",
                "27,720원",
                "6,380원"
              ]
            ],
            "notes": [
              "결합 가능 여부와 할인 금액은 휴대폰 요금제·결합 조건에 따라 달라질 수 있습니다."
            ]
          }
        ],
        "formCarrier": "LG헬로비전",
        "priceNote": "결합할인 문의",
        "bundle": false
      }
    ]
  },
  "hero": {
    "banners": [
      {
        "kicker": "인터넷 · TV 신규 가입",
        "title": "통신사 4곳 요금,\n한 번에 비교하고 가입하세요",
        "desc": "KT · LG U+ · SK · 스카이라이프 최신 요금과 결합할인을 비교해 드려요.",
        "cta": {
          "label": "요금 비교하기",
          "to": "/internet"
        },
        "theme": "teal"
      },
      {
        "kicker": "휴대폰 + 인터넷 결합",
        "title": "가족 휴대폰과 묶으면\n매달 요금이 더 내려가요",
        "desc": "가족 수·요금제에 맞는 결합 조합을 상담사가 직접 계산해 드립니다.",
        "cta": {
          "label": "결합할인 보기",
          "to": "/bundle"
        },
        "theme": "navy"
      },
      {
        "kicker": "무료 상담",
        "title": "약정 만료가 다가온다면\n지금 상담받아 보세요",
        "desc": "위약금·잔여 약정까지 확인해서 손해 없는 방법으로 안내해 드려요.",
        "cta": {
          "label": "상담 신청",
          "to": "/apply"
        },
        "theme": "sand"
      }
    ]
  },
  "benefits": {
    "kicker": "WHY 담아가넷",
    "title": "복잡한 통신 가입,\n담아가넷이 대신 비교해 드려요",
    "items": [
      {
        "icon": "shield",
        "title": "투명한 비교",
        "desc": "통신사 4곳 요금을 같은 기준으로 비교해 드려요."
      },
      {
        "icon": "calc",
        "title": "숨은 비용까지",
        "desc": "위약금·설치비·약정 조건을 미리 계산해 드려요."
      },
      {
        "icon": "headset",
        "title": "끝까지 책임 상담",
        "desc": "설치·개통 완료까지 담당 상담사가 챙겨드려요."
      }
    ],
    "promos": [
      {
        "tag": "인터넷",
        "text": "인터넷 신규 가입 시 사은품 혜택 안내"
      },
      {
        "tag": "결합",
        "text": "휴대폰 + 인터넷 결합 시 매달 요금 할인"
      },
      {
        "tag": "TV",
        "text": "인터넷 + TV 함께 가입하면 더 저렴하게"
      },
      {
        "tag": "이사",
        "text": "이사 예정이라면 이전 설치·신규 가입 비교 상담"
      },
      {
        "tag": "약정",
        "text": "약정 만료 고객 재약정 vs 신규 가입 비교"
      }
    ]
  },
  "quote": {
    "enabled": true,
    "kicker": "3초 견적",
    "title": "내 조건으로 월 요금 바로 확인",
    "desc": "통신사와 속도만 고르면 예상 월 요금을 바로 보여드려요.",
    "liveBadge": "실시간 상담중",
    "services": {
      "internet": "인터넷",
      "internet_tv": "인터넷+TV",
      "internet_tv_usim": "인터넷+TV+유심"
    },
    "usimNotice": "유심 요금제·회선 수·유지 조건은 상담 시 확인합니다. 표시 월요금은 인터넷·TV 요금이며 유심 통신요금은 별도입니다.",
    "speeds": {
      "100M": {
        "short": "검색·기본 사용",
        "detail": "웹 검색, 메신저, SNS 위주로 1~2명이 쓰기에 알맞아요."
      },
      "200M": {
        "short": "영상 시청 무난",
        "detail": "HD 영상 시청과 일반 사용을 2~3명이 함께 쓰기 좋아요."
      },
      "500M": {
        "short": "동영상·게임 원활",
        "detail": "4K 영상, 온라인 게임, 여러 기기를 동시에 써도 여유 있어요."
      },
      "1G": {
        "short": "대용량·여러 기기",
        "detail": "대용량 다운로드, 재택근무, 가족 여럿이 동시에 쓰기 좋아요."
      }
    },
    "mobileNo": "선택 안 함",
    "mobileYes": "휴대폰 결합",
    "mobileNote": "인터넷 결합 할인을 반영한 금액이에요. 휴대폰 요금 할인은 요금제·회선 수에 따라 추가로 적용됩니다.",
    "resultNote": "요금표 기준 예상 금액이며, 실제 요금은 약정·할인 조건에 따라 달라질 수 있어요.",
    "ctaLabel": "이 조건으로 상담 신청"
  },
  "menu": {
    "items": [
      {
        "label": "SK인터넷",
        "to": "/internet/sk",
        "enabled": true,
        "children": []
      },
      {
        "label": "KT인터넷",
        "to": "/internet/kt",
        "enabled": true,
        "children": []
      },
      {
        "label": "LG인터넷",
        "to": "/internet/lg",
        "enabled": true,
        "children": []
      },
      {
        "label": "알뜰상품",
        "to": "",
        "enabled": true,
        "children": [
          {
            "label": "스카이라이프",
            "to": "/internet/skylife",
            "enabled": true
          },
          {
            "label": "LG헬로비전",
            "to": "/internet/hellovision",
            "enabled": true
          }
        ]
      },
      {
        "label": "후기",
        "to": "/reviews",
        "enabled": true,
        "children": []
      },
      {
        "label": "고객센터",
        "to": "/support",
        "enabled": true,
        "children": []
      },
      {
        "label": "꿀팁게시판",
        "to": "/tips",
        "enabled": false,
        "children": []
      }
    ]
  }
};

export const settings = {
  "business": {
    "name": "담아가넷",
    "ceo": "김동희",
    "email": "iopui501@naver.com",
    "address": "",
    "bizNumber": "",
    "ecommerceNumber": "",
    "phone": "",
    "privacyOfficerName": "김동희",
    "privacyOfficerEmail": "iopui501@naver.com",
    "hours": "",
    "kakaoUrl": ""
  },
  "form_options": {
    "products": [
      "휴대폰",
      "인터넷",
      "인터넷+TV",
      "결합상품"
    ],
    "carriers": [
      "KT",
      "LG U+",
      "SK",
      "KT스카이라이프",
      "LG헬로비전",
      "상관없음"
    ]
  },
  "telegram": {
    "chatId": ""
  },
  "brand": {
    "color": "#0E8F7E"
  },
  "consult": {
    "menu": [
      {
        "type": "subsidy",
        "label": "비밀지원금 안내",
        "enabled": true
      },
      {
        "type": "consult",
        "label": "맞춤 상담 신청",
        "enabled": true
      },
      {
        "type": "recommend",
        "label": "나에게 맞는 상품 찾기",
        "enabled": true
      },
      {
        "type": "call",
        "label": "전화 상담",
        "enabled": true
      }
    ],
    "modals": {
      "subsidy": {
        "title": "지원금 안내를 문자로 받아보세요",
        "desc": "이름과 연락처를 남겨 주시면 받을 수 있는 지원 내용을 안내해 드려요.",
        "submitLabel": "지원금 확인하기"
      },
      "consult": {
        "title": "상담사가 조건에 맞는 요금제를 안내해 드려요",
        "desc": "사용 중인 통신사와 요금을 여쭤보고 더 나은 조건을 찾아 드려요.",
        "submitLabel": "상담 신청하기"
      },
      "recommend": {
        "title": "나에게 맞는 상품을 찾아 드려요",
        "desc": "사용 환경을 여쭤보고 알맞은 인터넷·TV 상품을 추천해 드려요.",
        "submitLabel": "추천받기"
      },
      "quote": {
        "title": "이 조건으로 상담을 신청할까요?",
        "desc": "선택하신 조건을 바탕으로 상담사가 연락드려요.",
        "submitLabel": "상담 신청하기"
      }
    },
    "submitLabel": "상담 신청하기",
    "doneTitle": "신청이 접수되었습니다",
    "doneDesc": "상담 운영시간에 순서대로 연락드릴게요."
  }
};

export const popups = [
  {
    "image_url": null,
    "alt": "담아가넷 이벤트",
    "link": "#apply",
    "title": "인터넷 + TV 가입 이벤트",
    "body": "신규 가입 시 최대 혜택 안내\n휴대폰 결합 할인까지 한 번에 상담",
    "button_text": "지금 상담 신청하기",
    "start_at": "2026-11-01",
    "end_at": "2026-12-31",
    "is_active": true,
    "sort_order": 0
  }
];
