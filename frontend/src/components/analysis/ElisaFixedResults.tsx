import { elisaFixedHtml } from '../../mock/elisaFixed'

/** The same fixed tables and vector chart are used in analysis and reports. */
export function ElisaFixedResults() {
  return <div dangerouslySetInnerHTML={{ __html: elisaFixedHtml() }} />
}
