import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  const red = '#dc2626'
  return new ImageResponse(
    <div style={{ width: 32, height: 32, position: 'relative', display: 'flex' }}>
      {/* U / horseshoe body */}
      <div style={{
        position: 'absolute',
        left: 3, top: 10, right: 3, bottom: 2,
        borderLeft: `9px solid ${red}`,
        borderRight: `9px solid ${red}`,
        borderBottom: `9px solid ${red}`,
        borderRadius: '0 0 13px 13px',
      }} />
      {/* Left pole */}
      <div style={{ position: 'absolute', left: 3, top: 0, width: 9, height: 12, background: red, borderRadius: 2 }} />
      {/* Right pole */}
      <div style={{ position: 'absolute', right: 3, top: 0, width: 9, height: 12, background: red, borderRadius: 2 }} />
    </div>,
    { width: 32, height: 32 }
  )
}
