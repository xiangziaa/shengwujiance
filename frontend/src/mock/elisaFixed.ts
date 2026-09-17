// Fixed reference dataset, transcribed from the supplied worksheets.
export const elisaStandardHeaders = ['编号', '浓度', 'OD值-1', 'OD值-2', '平均OD值', 'Log(Conc.)', 'Logit B/Bo']
export const elisaStandardRows = [
  ['标准1', '0', '2.2431', '1.8129', '2.028', '—', '—'],
  ['标准2', '2', '1.8465', '1.8429', '1.845', '0.301', '1.00'],
  ['标准3', '4', '1.6257', '1.6699', '1.648', '0.602', '0.64'],
  ['标准4', '12.5', '1.0363', '1.1132', '1.075', '1.097', '0.05'],
  ['标准5', '50', '0.3397', '0.3201', '0.330', '1.699', '-0.71'],
]
export const elisaSampleHeaders = ['编号', 'OD值-1', 'OD值-2', '平均OD值', 'Logit B/Bo', '计算浓度', '稀释倍数', '最终浓度']
export const elisaSampleRows = [
  ['样品1', '0.137', '0.1219', '0.129', '-1.166', '119.781', '1.00', '119.781'],
  ['样品2', '1.7538', '1.9914', '1.873', '1.081', '1.744', '1.00', '1.744'],
  ['样品3', '1.9141', '1.7843', '1.849', '1.015', '1.976', '1.00', '1.976'],
  ['样品4', '2.2412', '1.7875', '2.014', '2.169', '0.225', '1.00', '0.225'],
]
// Fixed full-precision points from the reference OD pairs; table cells remain rounded.
export const elisaCurvePoints = [
  [0.3010299956639812, 1.002763282802094],
  [0.6020599913279624, 0.6368923859922483],
  [1.0969100130080565, 0.05210063984333621],
  [1.6989700043360187, -0.7115809464340855],
]
// Reference worksheet regression, drawn independently from the measured markers.
export const elisaFit = { slope: -1.2233932, intercept: 1.3764 }
export const elisaFitPoints = [elisaCurvePoints[0][0], elisaCurvePoints[3][0]].map(x => [x, elisaFit.slope * x + elisaFit.intercept])

export function elisaCurveSvg() {
  const x = (n: number) => 62 + n / 2.1 * 420
  const y = (n: number) => 250 - (n + 1.3) / 2.5 * 220
  const xTicks = Array.from({length: 8}, (_, i) => i * .3).map(n => `<line x1="${x(n)}" y1="250" x2="${x(n)}" y2="255"/><text x="${x(n)}" y="273" text-anchor="middle">${n.toFixed(3)}</text>`).join('')
  const yTicks = [-1.3, -.9, -.5, -.1, .3, .7, 1.1].map(n => `<line x1="57" y1="${y(n)}" x2="62" y2="${y(n)}"/><text x="51" y="${y(n)+4}" text-anchor="end">${n.toFixed(2)}</text>`).join('')
  const markers = elisaCurvePoints.map(([a,b]) => `<path d="M ${x(a)} ${y(b)-4} l 4 4 l -4 4 l -4 -4 Z" fill="#ff0000"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 530 310" role="img" aria-label="ELISA标准曲线，Log(Conc.)与Logit B/Bo，四个固定标准点" style="display:block;width:100%;max-width:620px;margin:16px auto;background:white"><rect x="1" y="1" width="528" height="308" fill="white" stroke="black"/><g font-family="Arial,sans-serif" font-size="11" fill="black" stroke="black" stroke-width=".7"><rect x="62" y="30" width="420" height="220" fill="none"/>${xTicks}${yTicks}</g><polyline points="${elisaFitPoints.map(([a,b]) => `${x(a)},${y(b)}`).join(' ')}" fill="none" stroke="#ff0000" stroke-width="2"/>${markers}<g font-family="Arial,sans-serif" font-size="12" fill="black"><text x="272" y="298" text-anchor="middle">Log(Conc.)</text><text transform="translate(17 140) rotate(-90)" text-anchor="middle">Logit B/Bo</text></g></svg>`
}
export function elisaFixedHtml() {
  const table = (headers: string[], rows: string[][]) => `<div class="elisa-fixed-table-wrap"><table class="elisa-fixed-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  return `<section class="elisa-fixed-results"><h3>二、实验数据及计算结果</h3>${table(elisaStandardHeaders,elisaStandardRows)}<p class="elisa-fixed-note">标准一为零浓度对照，对数及 Logit 值不适用，以“—”表示，不参与标准曲线绘制。</p><h4>标准曲线</h4>${elisaCurveSvg()}<h3>三、参数</h3>${table(elisaParameterHeaders,elisaParameterRows)}<h3>四、判断结果</h3>${table(elisaSampleHeaders,elisaSampleRows)}</section>`
}

// Sheet1!A19:I22 in 0.9999(2).xlsx: fixed values, not runtime calculations.
export const elisaParameterHeaders = ['斜率', '截距', '相关系数', '检出下限', '单位']
export const elisaParameterRows = [
  ['-1.2233932', '1.3764', '-0.9999', '2.0', 'ng/mL'],
]
