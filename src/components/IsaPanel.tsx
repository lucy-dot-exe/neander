import { OPS, h2 } from '../neander/isa';

export function IsaPanel() {
  return (
    <div className="isa-wrap">
      <table>
        <thead>
          <tr><th>Código</th><th>Instrução</th><th>Efeito</th></tr>
        </thead>
        <tbody>
          {Object.entries(OPS).map(([name, op]) => (
            <tr key={name}>
              <td>{h2(op.code)}</td>
              <td>{name}{op.size === 2 ? ' end' : ''}</td>
              <td>{op.effect}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Diretivas: <code>ORG 128</code> define o endereço do próximo byte, <code>DB 5, -1, 0Ah</code> grava bytes,{' '}
        <code>DS 4</code> reserva bytes zerados, <code>DEZ EQU 10</code> dá nome a uma constante e <code>END</code> encerra a
        montagem. Rótulos terminam com dois-pontos. Números podem ser escritos como <code>12</code>, <code>0Ch</code>,{' '}
        <code>0x0C</code> ou <code>1100b</code>. Comentários começam com <code>;</code>.
      </p>
      <p>
        Atalhos: <code>Ctrl+Enter</code> monta, <code>F10</code> dá um passo, <code>Shift+F10</code> volta, <code>F5</code>{' '}
        executa ou pausa e <code>F9</code> marca um ponto de parada na linha do cursor (no modo Código, clicar na margem
        também marca).
      </p>
    </div>
  );
}
