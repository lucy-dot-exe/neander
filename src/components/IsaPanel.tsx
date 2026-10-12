import { useI18n } from '../i18n/context';
import { OPS, h2, type OpInfo, type OpName } from '../neander/isa';

export function IsaPanel() {
  const { t } = useI18n();
  return (
    <div className="isa-wrap">
      <table>
        <thead>
          <tr><th>{t.isa.code}</th><th>{t.isa.instruction}</th><th>{t.isa.effect}</th></tr>
        </thead>
        <tbody>
          {(Object.entries(OPS) as [OpName, OpInfo][]).map(([name, op]) => (
            <tr key={name}>
              <td>{h2(op.code)}</td>
              <td>{name}{op.size === 2 ? ` ${t.isa.operand}` : ''}</td>
              <td>{t.ops[name].effect}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{t.isa.directives}</p>
      <p>{t.isa.shortcuts}</p>
    </div>
  );
}
