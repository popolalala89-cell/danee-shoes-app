import React from 'react';

/* ================================================================== */
/*  PageTransition — animasi slide-in setiap ganti halaman             */
/*  Usage: wrap your page content:                                     */
/*    <PageTransition><Orders /></PageTransition>                      */
/* ================================================================== */

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function PageTransition({ children, className = '', style }: PageTransitionProps) {
  return (
    <div className={`page-enter ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ================================================================== */
/*  MaterialIcon — helper untuk Material Symbols                      */
/*  Usage: <Icon name="home" /> or <Icon name="home" filled />        */
/* ================================================================== */

interface MaterialIconProps {
  name: string;
  filled?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function MaterialIcon({ name, filled, size = 'medium', className = '', style, onClick }: MaterialIconProps) {
  const classes = [
    'mat-icon',
    filled ? 'filled' : '',
    size !== 'medium' ? size : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style} onClick={onClick}>
      {name}
    </span>
  );
}

export default PageTransition;
