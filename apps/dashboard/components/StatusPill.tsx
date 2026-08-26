type StatusTone = 'attention' | 'neutral' | 'success' | 'warning';

export function StatusPill({
  children,
  tone = 'neutral',
}: Readonly<{ children: string; tone?: StatusTone }>) {
  return <span className={`statusPill ${tone}`}>{children}</span>;
}
