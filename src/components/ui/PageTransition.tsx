import React from 'react';

/* ================================================================== */
/*  PageTransition — animasi slide horizontal antar halaman            */
/*  Usage:                                                             */
/*    <PageTransition direction="forward"><Orders /></PageTransition>  */
/* ================================================================== */

interface PageTransitionProps {
  children: React.ReactNode;
  direction?: 'forward' | 'backward';
  className?: string;
  style?: React.CSSProperties;
}

function PageTransition({ children, direction = 'forward', className = '', style }: PageTransitionProps) {
  const animClass = direction === 'forward' ? 'page-slide-forward' : 'page-slide-backward';

  return (
    <div className={`${animClass} ${className}`} style={style}>
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
