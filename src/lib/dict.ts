/**
 * 英文枚举 → 中文标签。
 *
 * 这些映射不能从数据集里拿到（上游只有英文），也不能靠机器翻译，
 * 因此作为显式词典维护在代码里，改一个词全站生效。
 */

export const PART_ZH: Record<string, string> = {
  back: '背部',
  cardio: '有氧',
  chest: '胸部',
  'lower arms': '前臂',
  'lower legs': '小腿',
  neck: '颈部',
  shoulders: '肩部',
  'upper arms': '上臂',
  'upper legs': '腿部',
  waist: '腰腹'
};

export const EQUIP_ZH: Record<string, string> = {
  'body weight': '自重',
  dumbbell: '哑铃',
  cable: '绳索',
  barbell: '杠铃',
  'leverage machine': '固定器械',
  band: '弹力带',
  'smith machine': '史密斯机',
  kettlebell: '壶铃',
  weighted: '负重',
  'stability ball': '瑞士球',
  'ez barbell': '曲杆',
  assisted: '辅助',
  'sled machine': '雪橇机',
  'medicine ball': '药球',
  rope: '绳索',
  roller: '滚轮',
  'bosu ball': '波速球',
  'wheel roller': '健腹轮',
  'upper body ergometer': '上肢功率车',
  'skierg machine': '滑雪机',
  hammer: '锤式',
  'stationary bike': '固定单车',
  tire: '轮胎',
  'trap bar': '六角杠',
  'elliptical machine': '椭圆机',
  'stepmill machine': '爬楼机'
};

export const TARGET_ZH: Record<string, string> = {
  abductors: '外展肌',
  abs: '腹直肌',
  adductors: '内收肌',
  biceps: '肱二头肌',
  calves: '小腿三头肌',
  'cardiovascular system': '心血管系统',
  delts: '三角肌',
  forearms: '前臂',
  glutes: '臀大肌',
  hamstrings: '腘绳肌',
  lats: '背阔肌',
  'levator scapulae': '肩胛提肌',
  pectorals: '胸大肌',
  quads: '股四头肌',
  'serratus anterior': '前锯肌',
  spine: '竖脊肌',
  traps: '斜方肌',
  triceps: '肱三头肌',
  'upper back': '上背'
};

export const MUSCLE_ZH: Record<string, string> = {
  abdominals: '腹肌',
  'ankle stabilizers': '踝稳定肌',
  ankles: '踝关节',
  back: '背部',
  biceps: '肱二头肌',
  brachialis: '肱肌',
  calves: '小腿三头肌',
  chest: '胸大肌',
  core: '核心',
  deltoids: '三角肌',
  feet: '足部',
  forearms: '前臂',
  glutes: '臀大肌',
  'grip muscles': '握力肌群',
  groin: '腹股沟',
  hamstrings: '腘绳肌',
  hands: '手部',
  'hip flexors': '髂腰肌',
  'inner thighs': '大腿内侧',
  'latissimus dorsi': '背阔肌',
  lats: '背阔肌',
  'levator scapulae': '肩胛提肌',
  'lower abs': '下腹',
  'lower back': '下背',
  obliques: '腹斜肌',
  quadriceps: '股四头肌',
  quads: '股四头肌',
  'rear deltoids': '三角肌后束',
  rhomboids: '菱形肌',
  'rotator cuff': '肩袖',
  'serratus anterior': '前锯肌',
  shins: '小腿前侧',
  shoulders: '三角肌',
  soleus: '比目鱼肌',
  spine: '竖脊肌',
  sternocleidomastoid: '胸锁乳突肌',
  trapezius: '斜方肌',
  traps: '斜方肌',
  triceps: '肱三头肌',
  'upper back': '上背',
  'upper chest': '上胸',
  'wrist extensors': '腕伸肌',
  'wrist flexors': '腕屈肌',
  wrists: '腕关节'
};

/** 查不到就原样返回英文，不隐藏未知项 */
const make = (dict: Record<string, string>, fallback: string) => (key: string): string =>
  dict[key] ?? fallback;

export const zhPart = (k: string) => PART_ZH[k] ?? k;
export const zhEquip = (k: string) => EQUIP_ZH[k] ?? k;
export const zhTarget = (k: string) => TARGET_ZH[k] ?? k;
export const zhMuscle = (k: string) => MUSCLE_ZH[k] ?? k;

/** 授权要求：媒体每次使用都必须带此署名，且只能以 180×180 使用 */
export const GYM_VISUAL_CREDIT = '© Gym visual — https://gymvisual.com/';

void make;
