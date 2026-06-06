// IPF 2019 weight classes
export const WEIGHT_CLASSES = {
  M: ['59', '66', '74', '83', '93', '105', '120', '120+'],
  F: ['47', '52', '57', '63', '69', '76', '84', '84+'],
} as const

export type Sex = 'M' | 'F'
export type EntryType = 'gym' | 'competition'

export interface Submission {
  id: string
  first_name: string
  last_name: string
  date: string
  sex: Sex
  age: number
  weight_class: string
  bodyweight_kg: number
  squat_kg: number | null
  bench_kg: number | null
  deadlift_kg: number | null
  total_kg: number | null
  gl_points: number | null
  entry_type: EntryType
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
