import type { KnowledgeArticle, Report, Sample, StandardPoint, ToxinResultInput } from '../types'
import dayjs from 'dayjs'

const names = ['玉米', '小麦', '玉米粉', '稻谷', '饲料', '大豆', '麦麸', '玉米胚芽粕']
const units = [
  '某粮站',
  '黑龙江省粮食质量检测中心',
  '山东省饲料质量检验所',
  '河北省农业质量检测中心',
  '郑州国家粮食储备库',
  '豫北粮油集团有限公司',
]
const statuses: Sample['status'][] = ['检测中', '待复核', '待筛查', '已完成', '待判读', '待登记']
const risks: Sample['riskLevel'][] = ['中风险', '高风险', '低风险', '安全', '中风险', '低风险']

export const createMockSamples = (now = dayjs()): Sample[] => Array.from({ length: 32 }, (_, index) => {
  const number = 45 - index
  const day = now.subtract(Math.ceil(index / 6), 'day')
  const date = day.format('YYYY-MM-DD')
  const dateCode = day.format('YYYYMMDD')
  const collectedAt = `${date} ${index % 2 === 0 ? '09:15' : '14:32'}`
  const createdAt = `${date} ${index % 2 === 0 ? '10:05' : '15:10'}`
  const riskLevel = index === 0 ? '高风险' : risks[index % risks.length]
  return {
    id: `S${dateCode}${String(number).padStart(4, '0')}`,
    name: `${names[index % names.length]}-${dateCode}-${String(number).padStart(2, '0')}`,
    type: names[index % names.length],
    source: index % 3 === 0 ? '田间采样' : index % 3 === 1 ? '企业送检' : '粮库抽检',
    submitter: units[index % units.length],
    batchNo: `B${day.format('YYMMDD')}${String(index + 1).padStart(3, '0')}`,
    weight: Number((0.8 + (index % 5) * 0.25).toFixed(2)),
    collectedAt: dayjs(collectedAt).isAfter(now) ? now.format('YYYY-MM-DD HH:mm') : collectedAt,
    createdAt: dayjs(createdAt).isAfter(now) ? now.format('YYYY-MM-DD HH:mm') : createdAt,
    status: index === 0 ? '待判读' : statuses[index % statuses.length],
    riskLevel,
    testItems: index % 2 === 0 ? ['AFB₁', 'DON', 'ZEN', 'qPCR'] : ['AFB₁', 'DON', 'ZEN', 'OTA', 'FB', 'T-2'],
    note: index === 0 ? '竞赛演示重点样本，需关注 DON 与 ZEN 协同风险。' : undefined,
  }
})

export const mockSamples = createMockSamples()

export const standardPoints: StandardPoint[] = [
  { concentration: 0, od: 0.08 },
  { concentration: 5, od: 0.34 },
  { concentration: 10, od: 0.57 },
  { concentration: 20, od: 1.03 },
  { concentration: 40, od: 1.72 },
  { concentration: 80, od: 2.41 },
]

export const sampleOdValues = [1.243, 1.251, 1.236, 1.238, 1.227, 1.241]

export const toxinResults: ToxinResultInput[] = [
  { key: 'AFB1', name: '黄曲霉毒素 B₁', value: 5.8, limit: 20, unit: 'μg/kg' },
  { key: 'DON', name: '脱氧雪腐镰刀菌烯醇', value: 820, limit: 1000, unit: 'μg/kg' },
  { key: 'ZEN', name: '玉米赤霉烯酮', value: 180, limit: 350, unit: 'μg/kg' },
  { key: 'OTA', name: '赭曲霉毒素 A', value: 1.8, limit: 5, unit: 'μg/kg' },
  { key: 'FB', name: '伏马毒素', value: 320, limit: 2000, unit: 'μg/kg' },
  { key: 'T2', name: 'T-2 毒素', value: 22, limit: 100, unit: 'μg/kg' },
]

const initialReportDate = dayjs().format('YYYYMMDD')
export const mockReports: Report[] = mockSamples.slice(0, 9).map((sample, index) => ({
  id: `RPT-${initialReportDate}-${String(15 - index).padStart(3, '0')}`,
  sampleId: sample.id,
  reportNo: `LAZJ-${initialReportDate}-${String(15 - index).padStart(3, '0')}`,
  sampleName: sample.name,
  riskLevel: sample.riskLevel,
  status: index === 1 ? '待签字' : index % 3 === 0 ? '已签字' : '已生成',
  generatedAt: sample.createdAt,
  reviewer: index % 2 === 0 ? '检验员2' : '李审核',
}))

export const trend7 = [
  { total: 72, positive: 8 },
  { total: 88, positive: 10 },
  { total: 96, positive: 12 },
  { total: 110, positive: 15 },
  { total: 101, positive: 13 },
  { total: 108, positive: 14 },
  { total: 128, positive: 17 },
]

export const trend30 = Array.from({ length: 30 }, (_, index) => ({
  total: 68 + ((index * 17) % 58),
  positive: 5 + ((index * 7) % 15),
}))

export function getRecentTrend(days: 7 | 30, now = dayjs()) {
  const values = days === 7 ? trend7 : trend30
  return values.map((item, index) => ({ ...item, date: now.subtract(days - 1 - index, 'day').format('MM-DD') }))
}

export const getKnowledgeArticles = (now = dayjs()): KnowledgeArticle[] => [
  {
    id: 'K001', title: 'GB 2761—2017 食品中真菌毒素限量', category: '国家标准',
    summary: '梳理玉米及其制品中六种重点真菌毒素的限量口径与适用范围。', updatedAt: now.subtract(0, 'day').format('YYYY-MM-DD'), readMinutes: 8,
    content: ['本条目用于演示标准条款的结构化检索。', '法定合规判定必须以现行有效标准、样本类别和检测方法为准。', '平台内部预警阈值用于抽检与复检决策，不替代法定结论。'],
  },
  {
    id: 'K002', title: '竞争性 ELISA 标准曲线与质量控制', category: '检测方法',
    summary: '从 OD 原始值、标准曲线拟合到 R² 质量门槛的完整操作说明。', updatedAt: now.subtract(1, 'day').format('YYYY-MM-DD'), readMinutes: 6,
    content: ['检查空白孔、标准品梯度和重复孔一致性。', '标准曲线不合格时，应优先排查移液、孵育时间和洗板步骤。', '图像识别仅作为辅助录入入口，精确定量以酶标仪输出为准。'],
  },
  {
    id: 'K003', title: 'DON 与 ZEN 共存风险解读', category: '毒素知识',
    summary: '解释镰刀菌来源毒素共存时为何需要提高监测与复检优先级。', updatedAt: now.subtract(3, 'day').format('YYYY-MM-DD'), readMinutes: 5,
    content: ['DON 与 ZEN 可在同批玉米样本中共同检出。', '平台在任一项目超过限值 50% 时上调内部综合风险一级。', '该规则属于内部风险预警，不等同于法定不合格。'],
  },
  {
    id: 'K004', title: 'qPCR 扩增曲线异常排查手册', category: '异常案例',
    summary: '按基线噪声、阈值跨越、平台期和对照表现定位异常来源。', updatedAt: now.subtract(4, 'day').format('YYYY-MM-DD'), readMinutes: 7,
    content: ['先确认阳性对照正常扩增、阴性对照未越过阈值。', '基线噪声偏高可能与气泡、封膜或仪器光路有关。', '无明显平台期时建议结合扩增效率与熔解曲线复核。'],
  },
  {
    id: 'K005', title: '微孔板洗板机日常维护清单', category: '仪器操作',
    summary: '开机、管路冲洗、针位检查和关机维护的标准步骤。', updatedAt: now.subtract(6, 'day').format('YYYY-MM-DD'), readMinutes: 4,
    content: ['每日首次使用前执行纯水冲洗。', '检查吸液针高度，避免刮擦孔底。', '结束后按试剂说明完成管路清洁并记录维护日志。'],
  },
  {
    id: 'K006', title: '高风险批次的隔离与复检建议', category: '处置建议',
    summary: '从批次暂存、加密取样到复检报告归档的处置闭环。', updatedAt: now.subtract(7, 'day').format('YYYY-MM-DD'), readMinutes: 6,
    content: ['将内部预警批次与普通批次分区暂存并保留追溯信息。', '按抽样规范增加复检样本量。', '复检完成后由授权人员给出最终处置结论。'],
  },
]
