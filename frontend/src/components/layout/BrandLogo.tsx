import { Wheat } from 'lucide-react'

export function BrandLogo() {
  return (
    <div className="brand-logo">
      <div className="brand-mark"><Wheat size={25} strokeWidth={2.1} /></div>
      <div>
        <strong>粮安智检 <b>2.0</b></strong>
        <span>守护粮食安全 · 智检引领未来</span>
      </div>
    </div>
  )
}
