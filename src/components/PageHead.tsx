import type { ReactNode } from 'react'
import { EyebrowTag } from './EyebrowTag'
import '../pages/page.css'

export function PageHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head__eyebrow">
        <EyebrowTag>{eyebrow}</EyebrowTag>
      </div>
      <h1>{title}</h1>
      {lead && <p className="page-head__lead">{lead}</p>}
    </div>
  )
}
