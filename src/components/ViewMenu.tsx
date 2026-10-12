import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/context';
import type { Base, DisplayFormat } from '../neander/format';
import { Segmented } from './Segmented';

const BASES: { value: Base; label: string }[] = [
  { value: 'hex', label: 'Hex' },
  { value: 'dec', label: 'Dec' },
  { value: 'bin', label: 'Bin' }
];

interface Props {
  fmt: DisplayFormat;
  onFmt(fmt: DisplayFormat): void;
  followPc: boolean;
  onFollowPc(v: boolean): void;
  hideUnused: boolean;
  onHideUnused(v: boolean): void;
}

export function ViewMenu({ fmt, onFmt, followPc, onFollowPc, hideUnused, onHideUnused }: Props) {
  const { t } = useI18n();
  const v = t.view;
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <details className="menu" ref={ref}>
      <summary>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" />
          <circle cx="5" cy="4" r="1.6" fill="currentColor" />
          <circle cx="11" cy="8" r="1.6" fill="currentColor" />
          <circle cx="7" cy="12" r="1.6" fill="currentColor" />
        </svg>
        {v.menu}
      </summary>
      <div className="menu-body">
        <div className="menu-row">
          <span id="lbl-addr">{v.address}</span>
          <Segmented small labelledBy="lbl-addr" options={BASES} value={fmt.addr} onChange={addr => onFmt({ ...fmt, addr })} />
        </div>
        <div className="menu-row">
          <span id="lbl-val">{v.value}</span>
          <Segmented small labelledBy="lbl-val" options={BASES} value={fmt.val} onChange={val => onFmt({ ...fmt, val })} />
        </div>
        <label>
          <input type="checkbox" checked={followPc} onChange={e => onFollowPc(e.target.checked)} /> {v.followPc}
        </label>
        <label>
          <input type="checkbox" checked={hideUnused} onChange={e => onHideUnused(e.target.checked)} /> {v.hideUnused}
        </label>
        <div className="legend">
          <span><i className="lg-pc" />PC</span>
          <span><i className="lg-target" />{v.usedNext}</span>
          <span><i className="lg-read" />{v.readNow}</span>
          <span><i className="lg-write" />{v.writtenNow}</span>
        </div>
      </div>
    </details>
  );
}
