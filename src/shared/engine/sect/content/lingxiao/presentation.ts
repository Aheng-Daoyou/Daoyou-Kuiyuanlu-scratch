import type { SectPresentationTheme } from '../../core';
import { LINGXIAO_SECT_ID } from './ids';

export const LINGXIAO_SECT_PRESENTATION: SectPresentationTheme = {
  sectId: LINGXIAO_SECT_ID,
  announcement:
    '近日山下商路多有邪修出没，外出历练者须结伴而行；归宗后记得向司务堂补录见闻。',
  visual: {
    sigilLabel: '清都香火',
    sigilGlyph: '观',
    palette: ['#17161a', '#4a3a55', '#c9a86a'],
    motto: '点灯人间，香火照生。',
    motif: '清都山门朝开雾散，香火一线直上穹顶。',
  },
  onboarding: {
    summary:
      '从人间中点灯，以平生所见养成香火，在照影游尘与守拙藏锋之间走出自己的灯路。',
    traits: ['入世点灯', '快重由心', '照灯平生'],
    script: {
      id: 'lingxiao-onboarding',
      title: '人间点灯',
      theme: 'steel',
      backdrop: {
        src: '/assets/sect/onboarding/lingxiao.webp',
        alt: '太乙清都观山门朝向山下城郭，负灯弟子沿石阶往来于山门与人间',
      },
      acts: [
        {
          id: 'downhill-gate',
          title: '山下之门',
          scene: '太乙清都观 · 山门',
          body: '山门立在半山，门外石阶没有隐入云海，而是一路通向炊烟初起的城郭。有人衣衫整肃，正负灯下山；也有人带着满身风尘，从长路归来。',
          speaker:
            '守门弟子：“上山点灯，下山照人。太乙清都观的路，从来要走两遍。”',
          backgroundPosition: '58% 46%',
          tone: 'mist',
        },
        {
          id: 'ask-the-sword',
          title: '先问其灯',
          scene: '太乙清都观 · 清都殿',
          body: '传灯长老没有命你点亮殿前长明灯，只从旧架上取下一盏寻常油灯，横放在你面前。灯焰不见异光，灯盏上却留着许多经年磨痕。',
          speaker: '传灯长老：“灯能照多远，不难。难的是你要知道，什么不该照见。”',
          backgroundPosition: '30% 52%',
          tone: 'steel',
        },
        {
          id: 'sword-record',
          title: '守灯录',
          scene: '太乙清都观 · 典藏阁',
          body: '旧卷中既有灯诀，也夹着地名、人名、残缺书信与未能兑现的约定。许多段落只有寥寥数笔，却被后来者反复翻阅。',
          speaker:
            '守阁长老：“灯法可以传，平生不可照抄。前人的答案，只能替你问出自己的问题。”',
          backgroundPosition: '72% 38%',
          tone: 'stillness',
        },
        {
          id: 'two-sword-paths',
          title: '两道灯途',
          scene: '太乙清都观 · 守灯崖',
          body: '崖前灯影一快一重。快灯连绵，转瞬已在石壁留下数道照痕；重灯静立，直至来势逼近，才以后发一照震开尘土。',
          speaker:
            '传灯长老：“照影游尘，见招而变；守拙藏锋，承势而决。灯路不同，最后问的却是同一件事。”',
          backgroundPosition: '42% 44%',
          tone: 'mist',
        },
        {
          id: 'one-life-one-sword',
          title: '照灯平生',
          scene: '太乙清都观 · 弟子名册前',
          body: '你的名字被写入弟子名册，《守灯录》中属于你的那一页仍然空白。长老合上旧卷，将那盏灯连同灯盏一并交到你手中。',
          speaker:
            '传灯长老：“今日不必写。等你真正明白为何点灯，再回来落这一笔。”',
          backgroundPosition: '54% 35%',
          tone: 'steel',
        },
      ],
    },
  },
  map: {
    image: '/assets/sect/lingxiao-map.webp',
    alt: '太乙清都观殿阁、演法台、工坊、矿场与灯下草圃沿山路连接山下城郭的水墨鸟瞰图',
    hotspots: [
      {
        id: 'hall',
        label: '清都殿',
        route: '/game/sect/hall',
        permission: 'sect.hall.view',
        left: '46%',
        top: '25%',
        note: '身份 · 同门 · 周俸',
      },
      {
        id: 'archive',
        label: '典藏阁',
        route: '/game/sect/archive',
        facility: 'archive',
        permission: 'sect.archive.use',
        left: '15%',
        top: '31%',
        note: '心法研习',
      },
      {
        id: 'cliff',
        label: '守灯崖',
        route: '/game/sect/enlightenment-cliff',
        permission: 'sect.enlightenment.use',
        left: '88%',
        top: '19%',
        note: '流派 · 参悟',
      },
      {
        id: 'arena',
        label: '演法台',
        route: '/game/sect/arena',
        permission: 'sect.arena.use',
        left: '57%',
        top: '64%',
        note: '神通 · 战术 · 小比',
      },
      {
        id: 'affairs',
        label: '司务堂',
        route: '/game/sect/affairs',
        permission: 'sect.tasks.use',
        left: '42%',
        top: '48%',
        note: '日常 · 周常 · 晋升',
      },
      {
        id: 'treasury',
        label: '请物簿',
        route: '/game/sect/treasury',
        permission: 'sect.shop.use',
        left: '57%',
        top: '36%',
        note: '贡献兑换',
      },
      {
        id: 'industries',
        label: '营造院',
        route: '/game/sect/industries',
        permission: 'sect.construction.view',
        left: '55%',
        top: '53%',
        note: '设施建设 · 灯油券捐献',
      },
      {
        id: 'cultivation',
        label: '守灯静室',
        route: '/game/sect/cultivation-room',
        facility: 'cultivation_room',
        permission: 'sect.facility.cultivation.use',
        left: '17%',
        top: '72%',
        note: '闭关窥悟 · 设施灯效',
      },
      {
        id: 'alchemy',
        label: '闻香房',
        route: '/game/sect/alchemy',
        facility: 'workshop',
        permission: 'sect.facility.alchemy.use',
        left: '64%',
        top: '43%',
        note: '制香 · 设施灯效',
      },
      {
        id: 'refinery',
        label: '封灵坊',
        route: '/game/sect/refinery',
        facility: 'workshop',
        permission: 'sect.facility.refinery.use',
        left: '69%',
        top: '51%',
        note: '封灵 · 设施灯效',
      },
      {
        id: 'vein',
        label: '梦涎井',
        route: '/game/sect/spirit-vein',
        facility: 'spirit_vein',
        permission: 'sect.spirit_vein.view',
        left: '84%',
        top: '46%',
        note: '矿场巡视 · 灯油券收益 · 采矿',
      },
      {
        id: 'garden',
        label: '灯下草圃',
        route: '/game/sect/herb-garden',
        facility: 'herb_garden',
        permission: 'sect.herb_garden.view',
        left: '83%',
        top: '75%',
        note: '草木长势 · 产出待开放',
      },
      {
        id: 'gate',
        label: '山门',
        route: '/game/sect/gate',
        permission: 'sect.gate.view',
        left: '48%',
        top: '77%',
        note: '山门动态 · 清扫差事',
        visitor: {
          description: '山门外的石阶直通城郭，守门弟子会为外客登记来意与拜帖。',
        },
      },
      {
        id: 'cave',
        label: '守灯居所',
        route: '/game/sect/cave',
        permission: 'sect.cave.view',
        left: '26%',
        top: '66%',
        note: '弟子居所',
      },
      {
        id: 'formation',
        label: '护观灯阵',
        facility: 'formation',
        permission: 'sect.formation.view',
        left: '49%',
        top: '8%',
        note: '宗门战后续开放',
        locked: true,
        visitor: {
          description:
            '照痕沿群峰与山路首尾相接，外客只能在阵外看见偶尔掠过云层的灯辉。',
        },
      },
    ],
  },
  facilityLabels: {
    archive: '典藏阁',
    cultivation_room: '守灯静室',
    workshop: '封灵坊',
    spirit_vein: '灯脉',
    herb_garden: '灯下草圃',
    formation: '护观灯阵',
  },
  lockedFacilities: ['formation'],
  scenes: {
    map: {
      title: '太乙清都观舆图',
      description:
        '殿阁沿山势铺开，主路穿过山门直通城郭。择一处前往，继续今日的宗门事务。',
      loadingText: '山路与诸院渐次显现……',
    },
    hall: {
      title: '清都殿',
      description:
        '堂中不设燃灯台，只悬历代门人的旧灯与归宗名册；身份玉牒、俸禄名册皆由录事在此核验。',
    },
    affairs: {
      title: '司务堂',
      description:
        '木榜上新令墨迹未干，今日差事、周录与晋升试炼各有封签；诸令皆可逐一揭下，办妥后回堂交卷领赏。',
      loadingText: '执事正整理今日委托……',
    },
    archive: {
      title: '典藏阁',
      description:
        '檀木长架上既有六卷心法，也收着历代弟子的行灯手记；在此逐卷研习，不必再穿行别阁。',
      loadingText: '典藏阁卷帙正在归架……',
    },
    paths: {
      title: '守灯崖',
      description:
        '崖壁遍布历代门人留下的照痕，快重二道皆由此分流；择定道途后，沿灯脉继续参悟。',
      loadingText: '崖前灯影正在散开……',
    },
    arena: {
      title: '演法台',
      description:
        '演武场中央阵纹已启，宗门神通将在当前流派与参悟方案下显化威能。',
      loadingText: '演法台阵纹徐徐亮起……',
    },
    treasury: {
      title: '请物簿',
      description:
        '铜锁开启，木架深处的常备物资与本周珍材依次显露；持弟子令牌即可按贡献支取。',
      loadingText: '宝库执事正在清点本周库存……',
    },
    industries: {
      title: '营造院',
      description:
        '各处设施的等级与建设进度依次列于案台，弟子可择一处捐献灯油券。',
      loadingText: '营造院正在汇总设施进度……',
    },
    cultivation: {
      title: '守灯静室',
      description:
        '聚灯阵纹绕蒲团缓缓流转，静香已燃；定下闭关年数，宗门灯油会在结算时自然汇入。',
      loadingText: '聚灯阵正在汇拢灯油……',
    },
    alchemy: {
      title: '闻香房',
      description:
        '赤铜香炉吞吐灯焰，香柜沿墙依性归置；投下香材、定住香意，便可在此守候成香。',
      loadingText: '闻香房灵焰正在温炉……',
    },
    refinery: {
      title: '封灵坊',
      description:
        '地火自山腹引入锻台，冷铁与灯材依次落位；选定器型后即可在此开炉成器。',
      loadingText: '封灵坊地火正在升温……',
    },
    spiritVein: {
      title: '梦涎井',
      description:
        '矿壁间青光沿岩隙缓缓游走，执事循脉定井；每周俸禄中的灯油券加成皆从此处汇出。',
      loadingText: '矿道深处灯辉渐明……',
    },
    herbGarden: {
      title: '宗门灯下草圃',
      description:
        '层层药畦顺山势铺开，灯泉沿石渠润过根须；灯下草圃产出玩法后续开放。',
      loadingText: '灯下草圃晨雾正在散去……',
    },
    gate: {
      title: '山门',
      description:
        '石阶从门外一路通往山下城郭，守门弟子在晨钟后换过值守；今日宗门内外动静都写在门侧木牌上。',
      loadingText: '山门晨钟沿石阶传来……',
    },
    cave: {
      title: '守灯居所',
      description:
        '石门隔去峰间喧声，竹影从纸窗落入蒲团；这是内门弟子留在宗门中的一处清修居所。',
      loadingText: '灯宅石门映入云间……',
    },
  },
  rooms: {
    affairs: {
      description:
        '旧灯与功簿分列堂中，三席经办之人各守一案。寻到对应之人，便可当面接下或交回事务。',
      actors: {
        daily: {
          id: 'lingxiao-lin-yanqiu',
          name: '陆青崖',
          greeting: '今日事务已经理清，你先说想办哪一桩。',
        },
        weekly: {
          id: 'lingxiao-gu-wenfeng',
          name: '裴守拙',
          greeting: '本周功簿在此，小比与悬赏也都记着。',
        },
        promotion: {
          id: 'lingxiao-xie-tingyun',
          name: '掌灯老人',
          greeting: '晋升问的不是灯焰多少，而是这一灯为何而出。',
        },
      },
    },
    hall: {
      actors: {
        registry: {
          id: 'lingxiao-shen-chijian',
          name: '顾怀真',
          greeting: '玉牒和同门名录都已理好，你想查哪一项？',
        },
        stipend: {
          id: 'lingxiao-wen-fenglu',
          name: '柳七',
          greeting: '本周该发的都已算清，要核对还是领取，你直说便是。',
        },
      },
    },
    treasury: {
      actors: {
        keeper: {
          id: 'lingxiao-cangfeng-weng',
          name: '叶归鸿',
          greeting: '架上的东西各有标价，你看中哪件便报来。',
        },
      },
    },
    industries: {
      actors: {
        construction: {
          id: 'lingxiao-zhu-baigong',
          name: '杜长庚',
          greeting: '各处设施修到哪里、还差多少，我都能说给你听。',
        },
        donation: {
          id: 'lingxiao-shi-sanjin',
          name: '苗小满',
          greeting: '今日可择一处设施捐献灯油券，我替你登记。',
        },
      },
    },
    archive: {
      actors: {
        keeper: {
          id: 'lingxiao-xie-guanjian',
          name: '温不言',
          greeting: '六卷心法都在架上，先说你想读哪一卷。',
        },
      },
    },
    paths: {
      actors: {
        guide: {
          id: 'lingxiao-wenjian-sou',
          name: '祝平生',
          greeting: '路要自己走，眼下看不明白的地方可以先问。',
        },
      },
    },
    arena: {
      actors: {
        instructor: {
          id: 'lingxiao-fu-shifeng',
          name: '霍千钧',
          greeting: '招式合不合手，上场一试便知；先把你的神通排给我看。',
        },
        marshal: {
          id: 'lingxiao-chen-shoutai',
          name: '苏放鹤',
          greeting: '场中已经收拾妥当，有小比在身便可入场。',
        },
      },
    },
    cultivation: {
      actors: {
        keeper: {
          id: 'lingxiao-su-jing',
          name: '晏无声',
          greeting: '阵息正稳，想问此地灯效，还是现在入静？',
        },
      },
    },
    alchemy: {
      actors: {
        keeper: {
          id: 'lingxiao-yan-danshi',
          name: '程晚照',
          greeting: '火候正好，想先问闻香房灯效，还是直接开炉？',
        },
      },
    },
    refinery: {
      actors: {
        keeper: {
          id: 'lingxiao-ou-yeqing',
          name: '谭折柳',
          greeting: '地火还稳，想先问器坊灯效，还是就此动手？',
        },
      },
    },
    spiritVein: {
      actors: {
        keeper: {
          id: 'lingxiao-luo-tingmai',
          name: '邵沉川',
          greeting: '矿道巡视封签已经备好，有差事便在这里核对。',
        },
        facility: {
          id: 'lingxiao-lingmai-kuangchang',
          name: '梦涎井',
          greeting: '矿壁间青光沿岩隙缓缓游走，脉息沉稳如常。',
        },
      },
    },
    herbGarden: {
      actors: {
        keeper: {
          id: 'lingxiao-he-caowei',
          name: '秦晚晴',
          greeting: '晨露刚退，田里长势不错，草木值录已经写好了。',
        },
        facility: {
          id: 'lingxiao-zongmen-yaotian',
          name: '宗门灯下草圃',
          greeting: '层层药畦顺山势铺开，灯泉正沿石渠润过根须。',
        },
      },
    },
    gate: {
      actors: {
        keeper: {
          id: 'lingxiao-zhou-shanmen',
          name: '骆长亭',
          greeting: '山下已经有人来往，今日来客与山门动静都记在这里。',
        },
        facility: {
          id: 'lingxiao-shanmen',
          name: '山门',
          greeting: '门外石阶一路通向山下，晨风卷来几片新落的叶子。',
        },
      },
    },
  },
  terms: {
    pathChanges: '灯路变化',
    meridianPractice: '灯道参悟',
    meridianLoadout: '参悟方案',
    abilityChanges: '神通变化',
    returnToAffairs: '返回司务堂',
  },
};
