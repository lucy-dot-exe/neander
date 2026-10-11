import type { Speed, Status } from '../hooks/useSimulator';

interface Props {
  status: Status;
  running: boolean;
  canBack: boolean;
  speed: Speed;
  onSpeed(s: Speed): void;
  onAssemble(): void;
  onBack(): void;
  onStep(): void;
  onToggleRun(): void;
  onReset(): void;
}

const icon = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function TopBar({ status, running, canBack, speed, onSpeed, onAssemble, onBack, onStep, onToggleRun, onReset }: Props) {
  return (
    <header className="top">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          {[1, 0, 1, 1, 0, 1, 0, 0].map((on, i) => <i key={i} className={on ? 'on' : ''} />)}
        </div>
        <h1>Bancada Neander</h1>
      </div>
      <div className="run" role="toolbar" aria-label="Controles do programa">
        <span className={`status ${status.kind}`} role="status">{status.text}</span>
        <button className="btn primary" title="Montar o código e carregá-lo na memória (Ctrl+Enter)" onClick={onAssemble}>Montar</button>
        <div className="icon-group" role="group" aria-label="Controles de execução">
          <button className="btn" title="Voltar: desfazer a última instrução (Shift+F10)" aria-label="Voltar" disabled={!canBack} onClick={onBack}>
            <svg {...icon}><path d="M7 4L3 8l4 4M3 8h10" /></svg>
          </button>
          <button className="btn" title="Passo: executar uma instrução (F10)" aria-label="Passo" onClick={onStep}>
            <svg {...icon}><path d="M9 4l4 4-4 4M13 8H3" /></svg>
          </button>
          <button
            className={running ? 'btn running' : 'btn'}
            title={running ? 'Pausar (F5)' : 'Executar até um HLT ou ponto de parada (F5)'}
            aria-label={running ? 'Pausar' : 'Executar'}
            onClick={onToggleRun}
          >
            {running ? (
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 3v10l8.5-5z" /></svg>
            )}
          </button>
          <button className="btn" title="Reiniciar: zerar os registradores e restaurar a memória" aria-label="Reiniciar" onClick={onReset}>
            <svg {...icon}><path d="M3 3v4h4" /><path d="M3.5 7A5 5 0 1 1 4 11" /></svg>
          </button>
        </div>
        <select className="select" aria-label="Velocidade" title="Velocidade" value={speed} onChange={e => onSpeed(e.target.value as Speed)}>
          <option value="2">2/s</option>
          <option value="8">8/s</option>
          <option value="30">30/s</option>
          <option value="200">200/s</option>
          <option value="max">Máx.</option>
        </select>
      </div>
    </header>
  );
}
