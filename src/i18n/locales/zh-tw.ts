import type { Messages } from '../types';

export const zhTw = {
  seo: {
    title: 'Ofek｜前沿運算製造的可信洞見',
    description:
      'Ofek 與頂尖 S&P 100 企業合作，憑藉對台灣供應鏈的深入了解，以及即時製造智慧平台 HeatVision，優化以科技為核心的製造營運。',
  },
  language: {
    select: '選擇語言',
    current: '語言：繁體中文',
    switchTo: '切換語言至',
  },
  menu: { open: '開啟選單', close: '關閉選單' },
  nav: {
    about: '關於我們',
    consulting: '顧問服務',
    heatVision: 'HeatVision®',
    partners: '合作夥伴',
    contact: '聯絡我們',
  },
  hero: {
    headline: '前沿運算製造的可信洞見',
    lines: ['前沿運算製造的', '可信洞見'],
    strongLine: 1,
    cta: '與我們聯絡',
    scrollLabel: '前往關於我們',
  },
  about: {
    titleLight: 'OFEK，',
    titleBold: '簡介',
    description:
      'Ofek 成立於 2020 年，透過量身打造的顧問服務，協助頂尖 S&P 100 企業優化其在台灣以科技為核心的製造營運。憑藉對台灣供應鏈的深入了解與工程專業，我們與在地製造商建立穩固關係，協助合作夥伴克服技術、文化與區域挑戰，讓營運更加順暢。',
    features: [
      '為持續深化專業能力，我們運用大數據與機器學習——亦即 HeatVision® 的核心引擎——不斷精進精準生產控制的每一個環節。',
      '我們的多語團隊精通中文、英文及多種語言，讓全球客戶與製造端夥伴之間的合作更加順暢。',
      '我們始終以合作夥伴的最佳利益為優先，創造長期價值。',
    ],
  },
  expertise: {
    titleLight: '我們的',
    titleBold: '專業與智慧',
    consultingTitleLight: '顧問',
    consultingTitleBold: '服務',
    consultingBody:
      '我們結合技術知識與在地產業生態洞察，推動製造改善，並以信任與透明為基礎建立長期合作關係，持續創造價值。',
    heatVisionBody:
      '我們的軟體透過大數據分析與機器學習，提供從製造現場到資料中心的即時洞察，預測故障並消除根本原因。',
  },
  partners: {
    titleLight: '值得信賴的',
    titleBold: '合作夥伴',
    ariaLabel: '值得信賴的合作夥伴。將焦點移至標誌即可暫停輪播。',
  },
  footer: {
    offices: [
      {
        office: '美國',
        address: '112 Capitol Trail, Newark, Delaware 19711, USA',
        addressDirection: 'ltr',
      },
      { office: '台灣', address: '台灣台北市松山區敦化南路一段 2 號，105408' },
    ],
    kicker: '聯絡 Ofek',
    headingLight: '開啟一場',
    headingBold: '對話',
    emailPrefix: '電子郵件：',
    contactButton: '聯絡我們',
    linkedInLabel: 'LinkedIn 上的 Ofek',
    copyright: '© 2026 Ofek。保留所有權利。',
  },
} satisfies Messages;
