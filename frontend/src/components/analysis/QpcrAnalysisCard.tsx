import { Alert, Descriptions, Segmented, Space, Tag } from 'antd'
import { useMemo, useState } from 'react'
import qpcrReference from '../../assets/qpcr-reference.png'
import { SectionPanel } from '../common/SectionPanel'
import { getQpcrResult } from '../../utils/qpcr'

const groups = ['A组', 'B组', 'C组', 'D组']
const ctValues = ['15.238', '15.223', '15.223']

export function QpcrAnalysisCard() {
  const [group, setGroup] = useState('A组')
  // All groups use the requested fixed reference presentation.
  const result = useMemo(() => getQpcrResult('A1'), [])

  const qualityColor = result.curveQuality === '正常' ? 'green' : result.curveQuality === '可疑' ? 'orange' : 'red'

  return (
    <SectionPanel className="analysis-module qpcr-module" title="qPCR 分析" subtitle="扩增曲线 · Ct 值 · 曲线质量" extra={<Space><Tag color={qualityColor}>曲线{result.curveQuality}</Tag></Space>}>
      <div className="well-switch"><span>分组</span><Segmented block value={group} options={groups} onChange={(value) => setGroup(String(value))} /></div>
      <figure className="qpcr-reference-chart"><img src={qpcrReference} width={898} height={392} alt={`${group} qPCR 扩增曲线：白色背景、浅灰色水平分带和网格及蓝色扩增曲线和阈值线，纵轴范围 -200 至 1200。`} /></figure>
      <Descriptions className="qpcr-metrics" size="small" column={4} bordered items={[
        { key: 'gene', label: '目标基因', children: result.targetGene },
        { key: 'ct', label: 'Ct 值', children: <div className="qpcr-ct-values">{ctValues.map((value, index) => <span key={index}>{value}</span>)}</div> },
        { key: 'result', label: '判读', children: <Tag color={result.result === '阳性' ? 'red' : result.result === '可疑' ? 'orange' : 'green'}>{result.result}</Tag> },
        { key: 'efficiency', label: '扩增效率', children: `${result.efficiency}%` },
        { key: 'noise', label: '基线噪声', children: result.baselineNoise },
        { key: 'slope', label: '最大斜率', children: result.maxSlope },
        { key: 'plateau', label: '平台期', children: result.hasPlateau ? '明显' : '不明显' },
        { key: 'quality', label: '曲线质量', children: result.curveQuality },
      ]} />
      <Alert
        type={result.curveQuality === '正常' ? 'success' : result.curveQuality === '可疑' ? 'warning' : 'error'} showIcon
        message={result.curveQuality === '正常' ? '当前组扩增曲线质量合格。' : '当前组存在晚 Ct、基线噪声或平台期异常，建议结合 ELISA 结果复核。'}
      />
    </SectionPanel>
  )
}
