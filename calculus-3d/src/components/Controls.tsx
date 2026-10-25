import { useId, type ReactNode } from 'react';
import { fmt } from '../lib/text';
import { RichInline } from './Tex';

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  format,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  id?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="ctl">
      <label className="ctl-top" htmlFor={fid}>
        <span className="ctl-label">
          <RichInline text={label} />
        </span>
        <output className="ctl-val" htmlFor={fid}>
          {format ? <RichInline text={format(value)} /> : fmt(value)}
        </output>
      </label>
      <input
        id={fid}
        type="range"
        dir="ltr"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ctl">
      {label && (
        <div className="ctl-label">
          <RichInline text={label} />
        </div>
      )}
      <div className="seg" role="radiogroup" aria-label={label?.replace(/\$/g, '')}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'on' : ''}
            onClick={() => onChange(o.value)}
          >
            <RichInline text={o.label} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>
        <RichInline text={label} />
      </span>
    </label>
  );
}

export function Btn({ children, onClick, kind = 'ghost' }: { children: ReactNode; onClick: () => void; kind?: 'ghost' | 'primary' }) {
  return (
    <button type="button" className={`btn btn-${kind}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="ctl-row">{children}</div>;
}
