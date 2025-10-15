import Link from 'next/link'

export default function Breadcrumb() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      padding: '14px 24px',
      zIndex: 1000,
      fontFamily: 'Poppins, sans-serif',
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    }}>
      <Link href="/" style={{ 
        color: '#000',
        textDecoration: 'none',
        fontWeight: 600,
        transition: 'color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>👋</span>
        <span>Damien Henry</span>
      </Link>
    </div>
  )
}

