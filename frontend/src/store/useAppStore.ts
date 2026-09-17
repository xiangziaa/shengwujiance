import { create } from 'zustand'
import { createMockSamples, mockReports, mockSamples } from '../mock/data'
import dayjs from 'dayjs'
import type { Report, ReviewRecord, Sample, SampleStatus } from '../types'

export const formatTimestamp = (date = new Date()) =>
  date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

let reportClock = formatTimestamp()
let demoSamples = mockSamples
let demoDate = dayjs().format('YYYY-MM-DD')

interface AppState {
  samples: Sample[]
  reports: Report[]
  reviews: Record<string, ReviewRecord>
  /**
   * "Now" for the report centre. Deliberately not a ticking clock: it only moves
   * when an action refreshes it (entering the page, switching report, signing…).
   */
  reportNow: string
  refreshReportClock: () => void
  refreshDemoDates: () => void
  addSample: (sample: Sample) => void
  updateSample: (sample: Sample) => void
  deleteSamples: (ids: string[]) => void
  updateSampleStatus: (ids: string[], status: SampleStatus) => void
  saveReview: (sampleId: string, review: ReviewRecord) => void
  ensureReport: (sampleId: string) => Report | undefined
  signReport: (reportId: string) => void
  deleteReport: (reportId: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  samples: mockSamples,
  reports: mockReports,
  reviews: {},
  reportNow: reportClock,
  refreshReportClock: () => { reportClock = formatTimestamp(); set({ reportNow: reportClock }) },
  refreshDemoDates: () => {
    const now = dayjs()
    if (demoDate === now.format('YYYY-MM-DD')) return
    const next = createMockSamples(now)
    const replacements = new Map(demoSamples.map((sample, index) => [sample.id, next[index]]))
    set(state => ({
      samples: state.samples.map(sample => {
        const replacement = replacements.get(sample.id)
        if (!replacement) return sample
        const original = demoSamples.find(item => item.id === sample.id)!
        return { ...sample, id: replacement.id,
          name: sample.name === original.name ? replacement.name : sample.name,
          batchNo: sample.batchNo === original.batchNo ? replacement.batchNo : sample.batchNo,
          collectedAt: sample.collectedAt === original.collectedAt ? replacement.collectedAt : sample.collectedAt,
          createdAt: replacement.createdAt }
      }),
      reports: state.reports.map(report => {
        const replacement = replacements.get(report.sampleId)
        const original = demoSamples.find(item => item.id === report.sampleId)
        return replacement ? { ...report, sampleId: replacement.id, sampleName: report.sampleName === original?.name ? replacement.name : report.sampleName } : report
      }),
      reviews: Object.fromEntries(Object.entries(state.reviews).map(([id, review]) => [replacements.get(id)?.id ?? id, review])),
    }))
    demoSamples = next
    demoDate = now.format('YYYY-MM-DD')
  },
  addSample: (sample) => set((state) => ({ samples: [sample, ...state.samples] })),
  updateSample: (sample) => set((state) => ({
    samples: state.samples.map((item) => item.id === sample.id ? sample : item),
  })),
  deleteSamples: (ids) => set((state) => ({
    samples: state.samples.filter((sample) => !ids.includes(sample.id)),
  })),
  updateSampleStatus: (ids, status) => set((state) => ({
    samples: state.samples.map((sample) => ids.includes(sample.id) ? { ...sample, status } : sample),
  })),
  saveReview: (sampleId, review) => set((state) => ({
    reviews: { ...state.reviews, [sampleId]: review },
    samples: state.samples.map((sample) => sample.id === sampleId ? { ...sample, status: '待复核' } : sample),
  })),
  ensureReport: (sampleId) => {
    const existing = get().reports.find((report) => report.sampleId === sampleId)
    if (existing) return existing
    const sample = get().samples.find((item) => item.id === sampleId)
    if (!sample) return undefined
    const report: Report = {
      id: `RPT-${Date.now()}`,
      sampleId,
      reportNo: `LAZJ-2026-${String(Date.now()).slice(-5)}`,
      sampleName: sample.name,
      riskLevel: sample.riskLevel,
      status: '已生成',
      generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      reviewer: '张检验',
    }
    set((state) => ({ reports: [report, ...state.reports] }))
    return report
  },
  signReport: (reportId) => set((state) => ({
    reports: state.reports.map((report) => report.id === reportId ? { ...report, status: '已签字' } : report),
  })),
  deleteReport: (reportId) => set((state) => ({
    reports: state.reports.filter((report) => report.id !== reportId),
  })),
}))
