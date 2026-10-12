import { memo, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/context';
import type { Assembly } from '../neander/assembler';
import { meaning, type View } from '../neander/format';
import type { Machine } from '../neander/machine';

interface RowProps {
  a: number;
  mark: string;
  addr: string;
  val: string;
  label: string;
  mean: string;
  soft: boolean;
  cls: string;
  hidden: boolean;
  onSelect(a: number): void;
}

const Row = memo(function Row({ a, mark, addr, val, label, mean, soft, cls, hidden, onSelect }: RowProps) {
  return (
    <tr data-a={a} className={cls} hidden={hidden} onClick={() => onSelect(a)}>
      <td className="c-mark">{mark}</td>
      <td className="c-addr">{addr}</td>
      <td className="c-val">{val}</td>
      <td className="c-label">{label}</td>
      <td className={soft ? 'c-mean soft' : 'c-mean'}>{mean}</td>
    </tr>
  );
});

interface Props {
  machine: Machine;
  program: Assembly;
  view: View;
  selected: number | null;
  breakpoints: ReadonlySet<number>;
  hideUnused: boolean;
  followPc: boolean;
  onSelect(a: number): void;
}

const ADDRS = Array.from({ length: 256 }, (_, a) => a);

export function MemoryTable({ machine: m, program, view, selected, breakpoints, hideUnused, followPc, onSelect }: Props) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const target = m.nextDataTarget();

  const scrollTo = (a: number) => {
    const box = scrollRef.current;
    const tr = box?.querySelector<HTMLTableRowElement>(`tr[data-a="${a}"]`);
    if (!box || !tr || tr.hidden) return;
    const head = box.querySelector('thead')?.offsetHeight ?? 0;
    const top = tr.offsetTop, bottom = top + tr.offsetHeight;
    if (top - head < box.scrollTop) box.scrollTop = top - head - 40;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 40;
  };

  useEffect(() => {
    if (followPc) scrollTo(m.pc);
  }, [m.pc, followPc]);

  const move = (d: number) => {
    let a = selected ?? m.pc;
    for (let k = 0; k < 256; k++) {
      a = Math.max(0, Math.min(255, a + d));
      const row = scrollRef.current?.querySelector<HTMLTableRowElement>(`tr[data-a="${a}"]`);
      if (!row?.hidden || a === 0 || a === 255) break;
    }
    onSelect(a);
    requestAnimationFrame(() => scrollTo(a));
  };

  return (
    <div
      className="mem-scroll"
      ref={scrollRef}
      tabIndex={0}
      aria-label={t.memory.label}
      onKeyDown={e => {
        const d = ({ ArrowDown: 1, ArrowUp: -1, PageDown: 16, PageUp: -16 } as Record<string, number>)[e.key];
        if (!d) return;
        e.preventDefault();
        move(d);
      }}
    >
      <table className="mem">
        <thead>
          <tr>
            <th aria-label={t.memory.marker} />
            <th>{t.memory.address}</th>
            <th>{t.memory.value}</th>
            <th>{t.memory.label_}</th>
            <th>{t.memory.meaning}</th>
          </tr>
        </thead>
        <tbody>
          {ADDRS.map(a => {
            const v = m.mem[a];
            const used = !!(program.role[a] || v || m.fetches[a] || m.reads[a] || m.writes[a] || a === m.pc);
            const bp = breakpoints.has(a);
            const mean = meaning(a, m, program, view, t);
            const cls = [
              used ? '' : 'unused',
              a === m.pc ? 'pc' : '',
              a === target ? 'target' : '',
              a === m.lastRead ? 'read' : '',
              a === m.lastWrite ? 'wrote' : '',
              a === selected ? 'selected' : '',
              bp ? 'bp' : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <Row
                key={a}
                a={a}
                mark={a === m.pc ? '▶' : bp ? '●' : ''}
                addr={view.fmtA(a)}
                val={view.fmtV(v)}
                label={program.labelAt[a] ?? ''}
                mean={mean.text}
                soft={mean.soft}
                cls={cls}
                hidden={hideUnused && !used && a !== selected}
                onSelect={onSelect}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
