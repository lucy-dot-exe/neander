import type { View } from '../neander/format';
import type { Machine } from '../neander/machine';
import { Lamp, Lamps } from './Lamps';

export function Registers({ machine, view }: { machine: Machine; view: View }) {
  return (
    <div className="regs">
      <span className="reg-name" title="Acumulador">AC</span>
      <Lamps value={machine.ac} />
      <b className="reg-val">{view.fmtV(machine.ac)}</b>
      <span className="flag" title="Negativo"><Lamp on={!!machine.n} />N</span>
      <span className="reg-name" title="Contador de programa">PC</span>
      <Lamps value={machine.pc} />
      <b className="reg-val">{view.fmtA(machine.pc)}</b>
      <span className="flag" title="Zero"><Lamp on={!!machine.z} />Z</span>
    </div>
  );
}

export function NextInstruction({ machine, ins, what, view }: { machine: Machine; ins: string; what: string; view: View }) {
  return (
    <div className="next" aria-live="polite">
      <span className="eyebrow">{machine.halted ? 'Parado' : 'Próxima'}</span>
      {!machine.halted && <span className="addr">{view.fmtA(machine.pc)}</span>}
      <span className="next-ins">{ins}</span>
      <span className="next-what">{what}</span>
    </div>
  );
}
