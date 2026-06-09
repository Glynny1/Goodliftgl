// IPF 2019 weight classes
export const WEIGHT_CLASSES = {
  M: ['59', '66', '74', '83', '93', '105', '120', '120+'],
  F: ['47', '52', '57', '63', '69', '76', '84', '84+'],
} as const

export type Sex = 'M' | 'F'
export type EntryType = 'gym' | 'competition'

export interface Submission {
  id: string
  opl_username: string
  first_name: string | null
  last_name: string | null
  date: string | null
  sex: Sex | null
  age: number | null
  weight_class: string | null
  bodyweight_kg: number | null
  squat_kg: number | null
  bench_kg: number | null
  deadlift_kg: number | null
  total_kg: number | null
  gl_points: number | null
  entry_type: EntryType | null
  meet_name: string | null
  federation: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
