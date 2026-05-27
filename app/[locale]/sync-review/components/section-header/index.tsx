interface SectionHeaderProps {
  title: string;
  count: number;
  action?: React.ReactNode;
}

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-[10px] mt-5">
      <span className="text-[11px] font-bold text-[var(--fg-3)] uppercase tracking-[0.08em]">
        {title} ({count})
      </span>
      {action}
    </div>
  );
}
