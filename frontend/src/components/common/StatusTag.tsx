import { Tag } from 'antd'
import type { SampleStatus } from '../../types'

const colors: Record<SampleStatus, string> = {
  待登记: 'default',
  待筛查: 'cyan',
  检测中: 'blue',
  待判读: 'geekblue',
  待复核: 'purple',
  待生成报告: 'gold',
  已完成: 'green',
}

export function StatusTag({ status }: { status: SampleStatus }) {
  return <Tag color={colors[status]} className="status-tag">{status}</Tag>
}
