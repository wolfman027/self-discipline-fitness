/**
 * 站点数据契约。
 *
 * 字段来源说明：数据集（exercises-dataset-main）是只读的上游，
 * 它的字段与本契约的对应关系由 scripts/build-data.mjs 负责转换，
 * 应用层只认这里的类型，不直接接触上游结构。
 */
export type Move = {
  /** 数字 ID，零填充四位，如 "0001"。注意上游 ID 不连续，不能当数组下标 */
  id: string;
  /** 路由键，由 id 与 media_id 组成，如 "0001-2gPfomN"。name 有重名，不能用 name 做路由 */
  slug: string;
  /** 合成中文名。可能含未译词，需结合 zhOk 判断能否当主标题 */
  name: string;
  /** 合成中文名是否完整（不含未译词） */
  zhOk: boolean;
  /** 英文原名，来自数据集，是权威标识 */
  nameEn: string;
  /** 身体部位，上游 body_part 的 10 个枚举值之一 */
  part: string;
  /** 器械，已归一化（如 resistance band 与 band 合并） */
  equip: string;
  /** 目标肌 */
  target: string;
  /** 主要肌群 */
  muscle: string;
  /** 协同肌，已去重且剔除与主要肌群重复的项 */
  second: string[];
  /** 分步要点（中文），已剔除上游模板化的「重复所需的重复次数」 */
  steps: string[];
  /** 完整说明（中文整段） */
  overview: string;
  /** 媒体标识，用于拼图片路径 */
  mediaId: string;
};

/** 列表查询条件，与 URL query 一一对应 */
export type MoveQuery = {
  q?: string;
  part?: string;
  equip?: string;
  target?: string;
  page?: number;
};

export type MovePage = {
  items: Move[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** 筛选器选项，带真实条数，让用户知道点下去会剩多少 */
export type FilterOption = {
  value: string;
  label: string;
  count: number;
};
