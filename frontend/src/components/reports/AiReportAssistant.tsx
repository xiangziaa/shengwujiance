import { Button, Input, Spin } from 'antd'
import { Bot, Send, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { QpcrResult, Report, RiskAssessment } from '../../types'

interface ChatMessage {
  id: number
  role: 'assistant' | 'user'
  content: string
}

interface AiReportAssistantProps {
  report: Report
  assessment: RiskAssessment
  qpcr: QpcrResult
}

const presetQuestions = ['为什么建议复检？', '这批样本能否收储？', '为什么判断为预警级？', 'DON 和 ZEN 同时检出代表什么？', '请生成一段风险说明', '请解释 qPCR 曲线异常原因']

function buildAnswer(question: string, report: Report, assessment: RiskAssessment, qpcr: QpcrResult): string {
  const don = assessment.toxins.find((toxin) => toxin.key === 'DON')
  const zen = assessment.toxins.find((toxin) => toxin.key === 'ZEN')
  if (question.includes('复检')) return `建议复检的主要原因是：DON 为 ${don?.value} μg/kg，已达到限值的 ${don?.ratio.toFixed(1)}%；ZEN 为 ${zen?.value} μg/kg，达到限值的 ${zen?.ratio.toFixed(1)}%。两者同时检出并触发协同风险上调规则，建议优先复核这两个项目。`
  if (question.includes('收储')) return `当前六项结果均未超过页面所列限值，但内部综合风险为“${assessment.level}”。因此系统不能直接给出“可以收储”的法定结论；建议暂缓流转，待 DON、ZEN 复检及授权人员复核后决定。`
  if (question.includes('判断') || question.includes('预警级')) return `报告 ${report.reportNo} 的基础风险来自 DON 占限值 ${don?.ratio.toFixed(1)}%，再叠加 DON 与 ZEN 共存规则，综合得分为 ${assessment.score}/100，所以内部风险被提升到“${assessment.level}”。`
  if (question.includes('DON') || question.includes('ZEN')) return `DON 与 ZEN 均可能与镰刀菌污染相关。本样本中 DON 为 ${don?.value} μg/kg、ZEN 为 ${zen?.value} μg/kg；共存意味着应提高抽检与复检优先级，但“共存”本身不等同于法定不合格。`
  if (question.includes('qPCR') || question.includes('曲线')) return `当前 Tri5 结果为${qpcr.result}，Ct 值 ${qpcr.ctValue?.toFixed(2) ?? '未检出'}，基线噪声 ${qpcr.baselineNoise}，曲线质量为“${qpcr.curveQuality}”。若需排查，应先确认对照、气泡与封膜，再结合 ELISA 结果判断。`
  if (question.includes('风险说明')) return `该样本六项检测结果均未超过所列项目限值；其中 DON 和 ZEN 分别达到限值的 ${don?.ratio.toFixed(1)}% 与 ${zen?.ratio.toFixed(1)}%，触发内部协同风险提示。建议暂缓批次流转并优先复检，最终结论以现行标准和人工复核为准。`
  return `针对报告 ${report.reportNo}：当前内部风险等级为“${assessment.level}”，综合得分 ${assessment.score}/100。您可以继续询问某项毒素占限值比例、Ct 值或协同风险规则。`
}

export function AiReportAssistant({ report, assessment, qpcr }: AiReportAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, role: 'assistant', content: '您好，我是 AI 检测助手。我会结合当前报告的毒素值、限值比例和 qPCR 指标解释结果。' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{ id: Date.now(), role: 'assistant', content: `已切换至报告 ${report.reportNo}。当前风险等级为“${assessment.level}”，您想先了解哪项结果？` }])
  }, [assessment.level, report.reportNo])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, messages])

  const ask = (question: string) => {
    if (!question.trim() || loading) return
    setMessages((current) => [...current, { id: Date.now(), role: 'user', content: question }])
    setInput('')
    setLoading(true)
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', content: buildAnswer(question, report, assessment, qpcr) }])
      setLoading(false)
    }, 650 + Math.round(question.length * 8))
  }

  return (
    <aside className="ai-assistant">
      <div className="ai-assistant-head"><span><Bot size={21} /></span><div><strong>AI 检测助手</strong><small><i />当前报告上下文已就绪</small></div><Sparkles size={17} /></div>
      <div className="ai-messages">
        {messages.map((message) => (
          <div key={message.id} className={`ai-message ${message.role}`}>
            <span>{message.role === 'assistant' ? <Bot size={15} /> : <UserRound size={15} />}</span><p>{message.content}</p>
          </div>
        ))}
        {loading && <div className="ai-message assistant"><span><Bot size={15} /></span><p><Spin size="small" /> 正在结合当前报告分析…</p></div>}
        <div ref={endRef} />
      </div>
      <div className="preset-questions">
        <small>你可以问：</small>
        {presetQuestions.map((question) => <button key={question} onClick={() => ask(question)}>{question}<span>›</span></button>)}
      </div>
      <div className="ai-input-wrap">
        <Input.TextArea value={input} onChange={(event) => setInput(event.target.value)} onPressEnter={(event) => { if (!event.shiftKey) { event.preventDefault(); ask(input) } }} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="输入关于当前报告的问题…" />
        <Button type="primary" shape="circle" icon={<Send size={16} />} onClick={() => ask(input)} loading={loading} />
      </div>
      <footer>AI 内容仅用于辅助解释，不构成最终检测结论。</footer>
    </aside>
  )
}
