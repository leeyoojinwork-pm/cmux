// ============================================================
// 토스 + 팀스파르타 JD x 프로젝트 매핑 페이지 생성
// Figma > Plugins > Development > Open Console 에서 실행
// 대상 파일: cJKsilxWyNbqYG8ETRBG9E (이유진_ProductManager_CV_Toss_Coffeechat)
// ============================================================

async function createJDMappingPage() {
  const FONTS = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
  ];
  await Promise.all(FONTS.map(f => figma.loadFontAsync(f)));

  const page = figma.createPage();
  page.name = "JD x 프로젝트 매핑";
  await figma.setCurrentPageAsync(page);

  // 전체 배경 3120x1080 (카드 6개)
  const bg = figma.createRectangle();
  bg.resize(3120, 1080);
  bg.x = 0; bg.y = 0;
  bg.fills = [{ type: 'SOLID', color: { r: 0.051, g: 0.067, b: 0.090 } }];
  page.appendChild(bg);

  // 헤더
  const title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.fontSize = 36;
  title.characters = "JD x 프로젝트 매핑  —  이유진";
  title.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  title.x = 80; title.y = 52;
  page.appendChild(title);

  const sub = figma.createText();
  sub.fontName = { family: "Inter", style: "Regular" };
  sub.fontSize = 16;
  sub.characters = "각 JD 핵심 키워드  →  이유진 경험 매핑 전략";
  sub.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.60, b: 0.70 } }];
  sub.x = 80; sub.y = 102;
  page.appendChild(sub);

  // 카드 데이터
  const cards = [
    {
      icon: "Coffee",
      title: "PO 커피챗",
      sub: "6/5 마감  Pay + 커머스",
      accent: { r: 0.996, g: 0.737, b: 0.184 },
      keywords: [
        "Pay / 커머스 도메인 경험",
        "오프라인 결제 BM 설계",
        "북극성 지표 설정 경험",
        "AI x 결제 융합 이해",
      ],
      projects: [
        "QR납부 BM   납부율 35%up   유저 53,252명",
        "결제시스템   대기 80%down   오류 1.2 to 0.3%",
        "cmux   Claude API 다중에이전트 직접 설계",
        "꼬꼬면   창업 0to1   회원 500명+",
      ],
    },
    {
      icon: "Bank",
      title: "Product Owner",
      sub: "토스  2~5년차",
      accent: { r: 0.212, g: 0.635, b: 0.996 },
      keywords: [
        "가설 → 실험 → 검증 사이클",
        "BM / 수익화 전략 수립",
        "반기별 OKR / 핵심 지표 정의",
        "창업 경험 (우대)",
      ],
      projects: [
        "QR납부   가설→실험→검증 3사이클   납부율 35%up",
        "AI TF   3파트너 PMF 탐색   노출수 500%up",
        "결제시스템   현장인터뷰→구조적원인→개선",
        "꼬꼬면   OKR 스프린트   MAU 37명",
      ],
    },
    {
      icon: "Gear",
      title: "Technical PO",
      sub: "토스  2~5년차",
      accent: { r: 0.408, g: 0.855, b: 0.682 },
      keywords: [
        "API / 기술 이해도",
        "엔지니어와 협업 · 설득",
        "기술 스펙 → 제품 연결",
        "복잡한 기술 제품 리딩",
      ],
      projects: [
        "cmux   Claude API + MCP 직접 설계·운영",
        "공공감면 API   문서분석→2주 연동 근거 제시",
        "AI TF   생성형 AI API 연동 + 사업화",
        "꼬꼬면   기술팀 리드 + 서비스 0to1",
      ],
    },
    {
      icon: "Robot",
      title: "Data PM (AI)",
      sub: "토스뱅크 ML Service Team",
      accent: { r: 0.737, g: 0.384, b: 0.996 },
      keywords: [
        "LLM / AI 제품 기획·운영",
        "불확실성 속 과제 리딩",
        "Metric 설계 · 데이터 의사결정",
        "AI End-to-End 검증",
      ],
      projects: [
        "cmux   LLM 직접 설계   포트폴리오 실물 존재",
        "AI TF   가설→AI실험→PMF   500%up  70%down",
        "AI/AX 강사   실무 LLM 교육 (멋사 2026~)",
        "QR납부   북극성 지표·이탈구간 데이터 분석",
      ],
    },
    {
      icon: "Spark",
      title: "AX 기업교육 PM",
      sub: "팀스파르타 · AX/교육설계/운영",
      accent: { r: 0.984, g: 0.408, b: 0.408 },
      keywords: [
        "AX 교육 기획 · 커리큘럼 설계",
        "교육 운영 · 피드백 기준화",
        "운영 자동화 (반복 업무 구조화)",
        "지표 관점 (리드타임 · 품질)",
      ],
      projects: [
        "KITECH AX교육   행정직 업무→실습 과제 커리큘럼 설계",
        "광화문라이언즈   운영 병목 제거·피드백 흐름 표준화",
        "AI 아바타 다국어   5언어 21강 품질기준 수립",
        "cmux   Claude+Slack 반복업무 자동화 80%",
      ],
    },
  ];

  const CARD_W = 450;
  const CARD_H = 470;
  const START_X = 80;
  const START_Y = 148;
  const GAP = 28;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const cx = START_X + i * (CARD_W + GAP);
    const cy = START_Y;

    // 카드 배경
    const cardBg = figma.createRectangle();
    cardBg.resize(CARD_W, CARD_H);
    cardBg.x = cx; cardBg.y = cy;
    cardBg.fills = [{ type: 'SOLID', color: { r: 0.094, g: 0.114, b: 0.145 } }];
    cardBg.cornerRadius = 14;
    page.appendChild(cardBg);

    // 상단 액센트 바
    const bar = figma.createRectangle();
    bar.resize(CARD_W, 4);
    bar.x = cx; bar.y = cy;
    bar.fills = [{ type: 'SOLID', color: c.accent }];
    bar.topLeftRadius = 14; bar.topRightRadius = 14;
    page.appendChild(bar);

    // 아이콘 (텍스트 대체)
    const icon = figma.createText();
    icon.fontName = { family: "Inter", style: "Bold" };
    icon.fontSize = 14;
    icon.characters = `[${c.icon}]`;
    icon.fills = [{ type: 'SOLID', color: c.accent }];
    icon.x = cx + 24; icon.y = cy + 28;
    page.appendChild(icon);

    // 직무명
    const ctitle = figma.createText();
    ctitle.fontName = { family: "Inter", style: "Bold" };
    ctitle.fontSize = 20;
    ctitle.characters = c.title;
    ctitle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    ctitle.x = cx + 90; ctitle.y = cy + 22;
    page.appendChild(ctitle);

    // 서브
    const csub = figma.createText();
    csub.fontName = { family: "Inter", style: "Regular" };
    csub.fontSize = 11;
    csub.characters = c.sub;
    csub.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.60, b: 0.70 } }];
    csub.x = cx + 90; csub.y = cy + 50;
    page.appendChild(csub);

    // 키워드 라벨
    const kwLabel = figma.createText();
    kwLabel.fontName = { family: "Inter", style: "Semi Bold" };
    kwLabel.fontSize = 10;
    kwLabel.characters = "JD 핵심 키워드";
    kwLabel.fills = [{ type: 'SOLID', color: c.accent }];
    kwLabel.x = cx + 24; kwLabel.y = cy + 86;
    page.appendChild(kwLabel);

    for (let j = 0; j < c.keywords.length; j++) {
      const kw = figma.createText();
      kw.fontName = { family: "Inter", style: "Medium" };
      kw.fontSize = 12;
      kw.characters = "• " + c.keywords[j];
      kw.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.90, b: 0.95 } }];
      kw.x = cx + 24; kw.y = cy + 104 + j * 22;
      page.appendChild(kw);
    }

    // 구분선
    const div = figma.createRectangle();
    div.resize(CARD_W - 48, 1);
    div.x = cx + 24; div.y = cy + 200;
    div.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.26, b: 0.32 } }];
    page.appendChild(div);

    // 프로젝트 라벨
    const pjLabel = figma.createText();
    pjLabel.fontName = { family: "Inter", style: "Semi Bold" };
    pjLabel.fontSize = 10;
    pjLabel.characters = "매핑 프로젝트";
    pjLabel.fills = [{ type: 'SOLID', color: c.accent }];
    pjLabel.x = cx + 24; pjLabel.y = cy + 216;
    page.appendChild(pjLabel);

    for (let j = 0; j < c.projects.length; j++) {
      const pj = figma.createText();
      pj.fontName = { family: "Inter", style: "Regular" };
      pj.fontSize = 11;
      pj.characters = c.projects[j];
      pj.fills = [{ type: 'SOLID', color: { r: 0.68, g: 0.72, b: 0.80 } }];
      pj.textAutoResize = "HEIGHT";
      pj.resize(CARD_W - 48, 36);
      pj.x = cx + 24; pj.y = cy + 234 + j * 52;
      page.appendChild(pj);
    }
  }

  // 토스플레이스 카드 (6번째)
  {
    const c = {
      icon: "Place",
      title: "토스플레이스 PO",
      sub: "오프라인 결제 혁신",
      accent: { r: 0.18, g: 0.80, b: 0.44 },
      keywords: [
        "오프라인 결제 BM 설계·수익 결정",
        "핵심 지표 정의 (가설→실험→검증)",
        "VAN/카드사 연동 경험 (우대)",
        "스타트업 창업 경험 (우대)",
      ],
      projects: [
        "결제시스템   VAN+공공감면 API 연동   대기 80%down",
        "QR납부 BM   납부율 35%up   유저 53,252명",
        "꼬꼬면   창업 0to1   회원 500명+   OKR 스프린트",
        "cmux   Claude API×결제흐름 AI접목 실험 중",
      ],
    };
    const i = 5;
    const cx = START_X + i * (CARD_W + GAP);
    const cy = START_Y;

    const cardBg = figma.createRectangle();
    cardBg.resize(CARD_W, CARD_H);
    cardBg.x = cx; cardBg.y = cy;
    cardBg.fills = [{ type: 'SOLID', color: { r: 0.094, g: 0.114, b: 0.145 } }];
    cardBg.cornerRadius = 14;
    page.appendChild(cardBg);

    const bar = figma.createRectangle();
    bar.resize(CARD_W, 4);
    bar.x = cx; bar.y = cy;
    bar.fills = [{ type: 'SOLID', color: c.accent }];
    bar.topLeftRadius = 14; bar.topRightRadius = 14;
    page.appendChild(bar);

    const icon = figma.createText();
    icon.fontName = { family: "Inter", style: "Bold" };
    icon.fontSize = 14;
    icon.characters = `[${c.icon}]`;
    icon.fills = [{ type: 'SOLID', color: c.accent }];
    icon.x = cx + 24; icon.y = cy + 28;
    page.appendChild(icon);

    const ctitle = figma.createText();
    ctitle.fontName = { family: "Inter", style: "Bold" };
    ctitle.fontSize = 20;
    ctitle.characters = c.title;
    ctitle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    ctitle.x = cx + 90; ctitle.y = cy + 22;
    page.appendChild(ctitle);

    const csub = figma.createText();
    csub.fontName = { family: "Inter", style: "Regular" };
    csub.fontSize = 11;
    csub.characters = c.sub;
    csub.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.60, b: 0.70 } }];
    csub.x = cx + 90; csub.y = cy + 50;
    page.appendChild(csub);

    const kwLabel = figma.createText();
    kwLabel.fontName = { family: "Inter", style: "Semi Bold" };
    kwLabel.fontSize = 10;
    kwLabel.characters = "JD 핵심 키워드";
    kwLabel.fills = [{ type: 'SOLID', color: c.accent }];
    kwLabel.x = cx + 24; kwLabel.y = cy + 86;
    page.appendChild(kwLabel);

    for (let j = 0; j < c.keywords.length; j++) {
      const kw = figma.createText();
      kw.fontName = { family: "Inter", style: "Medium" };
      kw.fontSize = 12;
      kw.characters = "• " + c.keywords[j];
      kw.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.90, b: 0.95 } }];
      kw.x = cx + 24; kw.y = cy + 104 + j * 22;
      page.appendChild(kw);
    }

    const div = figma.createRectangle();
    div.resize(CARD_W - 48, 1);
    div.x = cx + 24; div.y = cy + 200;
    div.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.26, b: 0.32 } }];
    page.appendChild(div);

    const pjLabel = figma.createText();
    pjLabel.fontName = { family: "Inter", style: "Semi Bold" };
    pjLabel.fontSize = 10;
    pjLabel.characters = "매핑 프로젝트";
    pjLabel.fills = [{ type: 'SOLID', color: c.accent }];
    pjLabel.x = cx + 24; pjLabel.y = cy + 216;
    page.appendChild(pjLabel);

    for (let j = 0; j < c.projects.length; j++) {
      const pj = figma.createText();
      pj.fontName = { family: "Inter", style: "Regular" };
      pj.fontSize = 11;
      pj.characters = c.projects[j];
      pj.fills = [{ type: 'SOLID', color: { r: 0.68, g: 0.72, b: 0.80 } }];
      pj.textAutoResize = "HEIGHT";
      pj.resize(CARD_W - 48, 36);
      pj.x = cx + 24; pj.y = cy + 234 + j * 52;
      page.appendChild(pj);
    }
  }

  // 하단 차별점 문구
  const brand = figma.createText();
  brand.fontName = { family: "Inter", style: "Semi Bold" };
  brand.fontSize = 15;
  brand.characters = "오프라인 결제 마찰  x  AI 직접 구현(cmux)  x  창업 4회  x  AX 교육 설계  —  이 조합을 가진 지원자는 드뭅니다.";
  brand.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.60, b: 0.70 } }];
  brand.x = 80; brand.y = 654;
  page.appendChild(brand);

  figma.closePlugin("JD x 프로젝트 매핑 페이지 생성 완료! (5개 JD)");
}

createJDMappingPage();
