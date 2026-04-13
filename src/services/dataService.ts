import { supabase } from '../lib/supabase'

export type CaseStatus = 'open' | 'in_review' | 'closed'

export interface Case {
  id: string
  plate: string
  status: CaseStatus
  location?: string
  notes?: string
  created_at?: string
}

export interface DataService {
  listCases(): Promise<Case[]>
  getCase(id: string): Promise<Case | null>
  createCase(input: Omit<Case, 'id' | 'created_at'>): Promise<Case>
}

const sampleCases: Case[] = [
  { id: '1', plate: 'ABC-1234', status: 'open', location: 'Lot A' },
  { id: '2', plate: 'XYZ-9876', status: 'in_review', location: 'Lot B' },
]

const localService: DataService = {
  async listCases() {
    return sampleCases
  },
  async getCase(id) {
    return sampleCases.find((c) => c.id === id) ?? null
  },
  async createCase(input) {
    const c: Case = { ...input, id: String(sampleCases.length + 1) }
    sampleCases.push(c)
    return c
  },
}

const supabaseService: DataService = {
  async listCases() {
    const { data, error } = await supabase!.from('cases').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Case[]
  },
  async getCase(id) {
    const { data, error } = await supabase!.from('cases').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as Case | null
  },
  async createCase(input) {
    const { data, error } = await supabase!.from('cases').insert(input).select().single()
    if (error) throw error
    return data as Case
  },
}

export const dataService: DataService = supabase ? supabaseService : localService
