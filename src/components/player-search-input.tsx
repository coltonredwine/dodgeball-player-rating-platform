type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
};

export function PlayerSearchInput({
  value,
  onChange,
  className = "w-full rounded border border-zinc-300 px-3 py-1.5 text-sm",
  placeholder = "Search players…",
}: Props) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
      aria-label={placeholder}
    />
  );
}
