import { Button, Drawer, Empty, Input, Segmented, Tag } from 'antd'
import { ArrowRight, BookOpen, Clock3, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeading } from '../components/common/PageHeading'
import { getKnowledgeArticles } from '../mock/data'
import type { KnowledgeArticle } from '../types'

const categories = ['全部', '国家标准', '检测方法', '毒素知识', '仪器操作', '异常案例', '处置建议'] as const

export function KnowledgePage() {
  const [knowledgeArticles] = useState(getKnowledgeArticles)
  const [category, setCategory] = useState<(typeof categories)[number]>('全部')
  const [keyword, setKeyword] = useState('')
  const [article, setArticle] = useState<KnowledgeArticle | null>(null)
  const articles = useMemo(() => knowledgeArticles.filter((item) => {
    const categoryMatch = category === '全部' || item.category === category
    const keywordMatch = !keyword || `${item.title}${item.summary}${item.content.join('')}`.toLowerCase().includes(keyword.toLowerCase())
    return categoryMatch && keywordMatch
  }), [category, keyword, knowledgeArticles])

  return (
    <div className="page knowledge-page page-enter">
      <PageHeading title="知识库" description="检索检测标准、方法说明、异常案例与处置建议" />
      <div className="knowledge-search">
        <BookOpen size={27} /><div><strong>检测知识一站式检索</strong><span>当前收录 186 条标准与操作知识（演示）</span></div>
        <Input size="large" prefix={<Search size={18} />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标准编号、毒素名称或异常现象" allowClear />
      </div>
      <div className="knowledge-filters"><Segmented value={category} onChange={(value) => setCategory(value as typeof category)} options={[...categories]} /></div>
      <div className="article-list">
        {articles.map((item) => (
          <button key={item.id} className="article-item" onClick={() => setArticle(item)}>
            <span className={`article-index category-${item.category}`}>{item.id.slice(-2)}</span>
            <span className="article-copy"><span><Tag>{item.category}</Tag><small>更新于 {item.updatedAt}</small></span><strong>{item.title}</strong><p>{item.summary}</p></span>
            <span className="article-meta"><Clock3 size={14} />{item.readMinutes} 分钟<ArrowRight size={18} /></span>
          </button>
        ))}
        {!articles.length && <Empty description="没有找到相关知识条目" />}
      </div>
      <Drawer title={article?.title} open={Boolean(article)} onClose={() => setArticle(null)} width={560}>
        {article && <article className="knowledge-drawer"><div><Tag color="blue">{article.category}</Tag><span>更新于 {article.updatedAt} · 阅读约 {article.readMinutes} 分钟</span></div><p className="lead">{article.summary}</p>{article.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="knowledge-note">提示：知识库内容用于工作辅助，标准条款请以正式发布的现行文件为准。</div><Button type="primary" onClick={() => setArticle(null)}>已了解</Button></article>}
      </Drawer>
    </div>
  )
}
