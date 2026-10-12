import { useI18n } from '../i18n/context';
import { recText, type View } from '../neander/format';
import type { Machine } from '../neander/machine';

const SHOWN = 150;

export function HistoryPanel({ machine: m, view, onSelect }: { machine: Machine; view: View; onSelect(a: number): void }) {
  const { lang, t } = useI18n();
  const recent = m.trace.slice(-SHOWN).reverse();
  return (
    <>
      <dl className="counters">
        <div><dt>{t.history.instructions}</dt><dd>{m.steps.toLocaleString(lang)}</dd></div>
        <div><dt>{t.history.accesses}</dt><dd>{m.accesses.toLocaleString(lang)}</dd></div>
      </dl>
      <ol className="trace" reversed>
        {recent.length === 0 ? (
          <li className="empty">
            {t.history.empty}
            <br />
            {t.history.hintBefore} <b>{t.top.step}</b> {t.history.hintAfter}
          </li>
        ) : (
          recent.map((r, i) => {
            const [ins, effect] = recText(r, view, t);
            return (
              <li key={m.trace.length - i} onClick={() => onSelect(r.at)}>
                <span className="t-n">{r.kind === 'edit' ? '✎' : r.n}</span>
                <span className="t-a">{r.kind === 'edit' ? '' : view.fmtA(r.at)}</span>
                <span className="t-i">{ins}</span>
                <span className="t-e">{effect}</span>
              </li>
            );
          })
        )}
      </ol>
    </>
  );
}
