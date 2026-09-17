import { SectionPanel } from '../common/SectionPanel'
import { ElisaFixedResults } from './ElisaFixedResults'

export function ElisaAnalysisCard() {
  return <SectionPanel className="analysis-module elisa-module" title="ELISA 分析" subtitle="实验数据 · 标准曲线 · 参数 · 判断结果">
    <ElisaFixedResults />
  </SectionPanel>
}
