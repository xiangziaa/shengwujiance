import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import dayjs from 'dayjs'
let now = '2026-09-17 08:00'
const clock = value => dayjs(value ?? now)
function load(file, imports) {
 const exports = {}
 const code = ts.transpileModule(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code, {exports, require: key => imports[key]})
 return exports
}
const data = load('mock/data.ts', {dayjs:clock})
for (const date of ['2026-09-17','2027-01-01','2028-03-01']) {
 for (const days of [7,30]) {
  const rows=data.getRecentTrend(days,dayjs(date))
  assert.equal(rows.length,days)
  rows.forEach((row,i)=>assert.equal(row.date,dayjs(date).subtract(days-1-i,'day').format('MM-DD')))
 }
 const samples=data.createMockSamples(dayjs(date))
 assert.equal(new Set(samples.map(s=>s.id)).size,32)
 samples.forEach(s=>{
  assert.ok(s.id.startsWith('S'+s.createdAt.slice(0,10).replaceAll('-','')))
  assert.ok(!dayjs(s.createdAt).isAfter(dayjs(date)))
  assert.ok(dayjs(date).diff(dayjs(s.createdAt),'day')<=6)
 })
}
let state
const store=load('store/useAppStore.ts',{dayjs:clock,'../mock/data':data,zustand:{create:init=>{state=init(change=>{state={...state,...change(state)}},()=>state);return ()=>state}}})
const oldId=state.samples[0].id
state.saveReview(oldId,{comment:'preserved'})
state.addSample({...state.samples[0],id:'custom',name:'custom'})
now='2026-09-18 12:00'
state.refreshDemoDates()
const next=state.samples.find(s=>s.id!=='custom')
assert.equal(next.id,'S202609180045')
assert.equal(next.status,'待复核')
assert.equal(state.reviews[next.id].comment,'preserved')
assert.equal(state.reports[0].sampleId,next.id)
assert.equal(state.samples[0].id,'custom')
const snapshot=state
state.refreshDemoDates()
assert.equal(state,snapshot)
console.log('PASS: rolling 7/30 days, year/month/leap boundaries, matching sample IDs, no future dates, midnight migration preserving reviews/reports/custom samples')
