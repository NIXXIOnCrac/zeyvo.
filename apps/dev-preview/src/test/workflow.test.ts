import { describe, it, expect } from 'vitest'
import { sampleWorkflow } from '../lib/mockAdapters'

describe('Workflow engine', () => {
  it('sample workflow has required nodes', () => {
    expect(sampleWorkflow.nodes.length).toBeGreaterThanOrEqual(10)
    expect(sampleWorkflow.nodes.find(n=>n.type==='start')).toBeDefined()
    expect(sampleWorkflow.nodes.find(n=>n.type==='completion')).toBeDefined()
  })
  it('workflow edges connect nodes', () => {
    expect(sampleWorkflow.edges.length).toBe(sampleWorkflow.nodes.length-1)
    const nodeIds = new Set(sampleWorkflow.nodes.map(n=>n.id))
    for (const e of sampleWorkflow.edges) {
      expect(nodeIds.has(e.source)).toBe(true)
      expect(nodeIds.has(e.target)).toBe(true)
    }
  })
  it('workflow has validated schema', () => {
    expect(sampleWorkflow.version).toBeGreaterThan(0)
    expect(sampleWorkflow.permissions.length).toBeGreaterThan(0)
    expect(sampleWorkflow.variables.find(v=>v.name==='inputVideo')).toBeDefined()
  })
  it('workflow types are valid', () => {
    const valid = new Set(['start','trigger','input','variable','action','apiCall','uiAction','condition','loop','wait','approval','verification','retry','errorHandler','subWorkflow','completion'])
    for (const n of sampleWorkflow.nodes) expect(valid.has(n.type)).toBe(true)
  })
  it('workflow is versioned JSON', () => {
    const json = JSON.stringify(sampleWorkflow)
    const parsed = JSON.parse(json)
    expect(parsed.id).toBe(sampleWorkflow.id)
  })
})
