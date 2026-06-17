import React from 'react';

interface FABProps {
  icon?: string;
  label?: string;
  extended?: boolean;
  onClick: () => void;
  color?: string;
  style?: React.CSSProperties;
}

export default function FAB({
  icon = 'add',
  label,
  extended = false,
  onClick,
  color,
  style,
}: FABProps) {
  return (
    <button
      className={`fab${extended ? ' fab-extended' : ''}`}
      onClick={onClick}
      style={{
        ...(color ? { '--fab-color': color } as React.CSSProperties : {}),
        ...style,
      }}
    >
      <span className="mat-icon filled">{icon}</span>
      {extended && label && <span className="fab-label">{label}</span>}
    </button>
  );
}

/* Small FAB — untuk layar kecil atau aksi sekunder */
export function SmallFAB({ icon = 'add', onClick }: { icon?: string; onClick: () => void }) {
  return (
    <button className="fab fab-small" onClick={onClick}>
      <span className="mat-icon filled" style={{ fontSize: 20 }}>{icon}</span>
    </button>
  );
}
