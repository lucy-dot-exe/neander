import { recText, type View } from '../neander/format';
import type { Machine } from '../neander/machine';

const SHOWN = 150;

export function HistoryPanel({ machine: m, view, onSelect }: { machine: Machine; view: View; onSelect(a: number): void }) {
  const recent = m.trace.slice(-SHOWN).reverse();
  return (
    <>
      <dl className="counters">
        <div><dt>Instruções</dt><dd>{m.steps.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Acessos à memória</dt><dd>{m.accesses.toLocaleString('pt-BR')}</dd></div>
      </dl>
      <ol className="trace" reversed>
        {recent.length === 0 ? (
          <li className="empty">
            Nada foi executado ainda.
            <br />
            Clique em <b>Passo</b> para executar a primeira instrução.
          </li>
        ) : (
          recent.map((t, i) => {
            const [ins, effect] = recText(t, view);
            return (
              <li key={m.trace.length - i} onClick={() => onSelect(t.at)}>
                <span className="t-n">{t.kind === 'edit' ? '✎' : t.n}</span>
                <span className="t-a">{t.kind === 'edit' ? '' : view.fmtA(t.at)}</span>
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
