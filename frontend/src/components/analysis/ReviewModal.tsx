import { DatePicker, Form, Input, Modal, Radio, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect } from 'react'
import type { ReviewRecord } from '../../types'

interface ReviewFormValues {
  conclusion: string
  agreed: boolean
  comment: string
  reviewer: string
  reviewedAt: Dayjs
}

interface ReviewModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (review: ReviewRecord) => void
  existing?: ReviewRecord
}

export function ReviewModal({ open, onClose, onSubmit, existing }: ReviewModalProps) {
  const [form] = Form.useForm<ReviewFormValues>()
  useEffect(() => {
    if (!open) return
    form.setFieldsValue(existing ? { ...existing, reviewedAt: dayjs(existing.reviewedAt) } : {
      conclusion: '建议复检后收储', agreed: true, reviewer: '张检验', reviewedAt: dayjs(), comment: '同意系统协同风险提示，建议优先复检 DON 与 ZEN。',
    })
  }, [existing, form, open])

  const handleOk = async () => {
    const values = await form.validateFields()
    onSubmit({ ...values, reviewedAt: values.reviewedAt.format('YYYY-MM-DD HH:mm:ss') })
  }

  return (
    <Modal title="人工复核" open={open} onCancel={onClose} onOk={handleOk} okText="提交复核" width={620}>
      <Form<ReviewFormValues> form={form} layout="vertical">
        <Form.Item name="conclusion" label="复核结论" rules={[{ required: true }]}><Select options={['同意收储', '建议复检后收储', '暂缓流转', '不予通过'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="agreed" label="是否同意算法结果" rules={[{ required: true }]}><Radio.Group options={[{ label: '同意', value: true }, { label: '不同意', value: false }]} /></Form.Item>
        <Form.Item name="comment" label="复核说明" rules={[{ required: true, message: '请填写复核说明' }]}><Input.TextArea rows={4} maxLength={300} showCount /></Form.Item>
        <div className="modal-form-grid">
          <Form.Item name="reviewer" label="复核人" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="reviewedAt" label="复核时间" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
