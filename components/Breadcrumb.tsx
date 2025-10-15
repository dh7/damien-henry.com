import Link from 'next/link'

interface BreadcrumbProps {
  breadcrumbs?: Array<{ title: string; href: string }>
}

export default function Breadcrumb({ breadcrumbs = [] }: BreadcrumbProps) {
  const isHome = breadcrumbs.length === 0

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
      gap: '10px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    }}>
      <Link href="/" style={{ 
        color: isHome ? '#000' : '#666',
        textDecoration: 'none',
        fontWeight: isHome ? 600 : 500,
        transition: 'color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>👋</span>
        <span>Damien Henry</span>
      </Link>
      
      {breadcrumbs.map((crumb, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#ccc', fontSize: '12px' }}>/</span>
          {index === breadcrumbs.length - 1 ? (
            <span style={{ color: '#000', fontWeight: 500 }}>
              {crumb.title}
            </span>
          ) : (
            <Link href={crumb.href} style={{ 
              color: '#666',
              textDecoration: 'none',
              fontWeight: 400,
              transition: 'color 0.2s'
            }}>
              {crumb.title}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

