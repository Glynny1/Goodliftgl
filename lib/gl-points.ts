// IPF GL (Goodlift) points formula constants
const MEN   = { A: 1199.72839, B: 1025.18162, C: 0.00921 }
const WOMEN = { A: 610.32796,  B: 1045.59282, C: 0.03048 }

export function calcGLPoints(totalKg: number, bodweightKg: number, sex: 'M' | 'F'): number {
  const { A, B, C } = sex === 'M' ? MEN : WOMEN
  const denominator = A - B * Math.exp(-C * bodweightKg)
  if (denominator <= 0) return 0
  return Math.round((totalKg / denominator) * 100 * 10000) / 10000
}
