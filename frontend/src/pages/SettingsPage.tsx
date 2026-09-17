import { Button, Divider, Form, Input, InputNumber, message, Select, Switch, Tabs } from 'antd'
import { PageHeading } from '../components/common/PageHeading'
import { SectionPanel } from '../components/common/SectionPanel'

export function SettingsPage() {
  return (
    <div className="page settings-page page-enter">
      <PageHeading title="系统设置" description="配置实验室信息、内部预警阈值与报告偏好" />
      <SectionPanel>
        <Tabs tabPosition="left" items={[
          { key: 'lab', label: '实验室信息', children: <Form layout="vertical" className="settings-form" initialValues={{ lab: '区域粮食检测实验室', code: 'LAB-HN-027', contact: '张检验', phone: '400-888-1661' }} onFinish={() => message.success('实验室信息已保存')}><Form.Item name="lab" label="实验室名称"><Input /></Form.Item><Form.Item name="code" label="机构代码"><Input /></Form.Item><Form.Item name="contact" label="联系人"><Input /></Form.Item><Form.Item name="phone" label="联系电话"><Input /></Form.Item><Button type="primary" htmlType="submit">保存设置</Button></Form> },
          { key: 'risk', label: '风险规则', children: <Form layout="vertical" className="settings-form" initialValues={{ near: 80, synergy: true, multi: 3 }} onFinish={() => message.success('内部风险规则已更新')}><Form.Item name="near" label="接近限值预警比例（%）"><InputNumber min={50} max={100} /></Form.Item><Form.Item name="synergy" label="启用 DON / ZEN 协同风险" valuePropName="checked"><Switch /></Form.Item><Form.Item name="multi" label="多毒素共存触发数量"><InputNumber min={2} max={6} /></Form.Item><Divider /><p className="settings-hint">修改仅影响内部风险预警，不更改法定合规限值。</p><Button type="primary" htmlType="submit">保存规则</Button></Form> },
          { key: 'report', label: '报告偏好', children: <Form layout="vertical" className="settings-form" initialValues={{ paper: 'A4', watermark: true, ai: true }} onFinish={() => message.success('报告偏好已保存')}><Form.Item name="paper" label="默认纸张"><Select options={['A4', 'A3'].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item name="watermark" label="演示报告水印" valuePropName="checked"><Switch /></Form.Item><Form.Item name="ai" label="附带 AI 风险说明" valuePropName="checked"><Switch /></Form.Item><Button type="primary" htmlType="submit">保存偏好</Button></Form> },
        ]} />
      </SectionPanel>
    </div>
  )
}
