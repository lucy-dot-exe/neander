import type { Speed, Status } from '../hooks/useSimulator';
import { useI18n } from '../i18n/context';
import { LANGS, type Lang } from '../i18n/messages';
import { Segmented } from './Segmented';

interface Props {
  status: Status;
  running: boolean;
  canBack: boolean;
  speed: Speed;
  onSpeed(s: Speed): void;
  onLang(lang: Lang): void;
  onAssemble(): void;
  onBack(): void;
  onStep(): void;
  onToggleRun(): void;
  onReset(): void;
}

const icon = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function TopBar({ status, running, canBack, speed, onSpeed, onLang, onAssemble, onBack, onStep, onToggleRun, onReset }: Props) {
  const { lang, t } = useI18n();
  const top = t.top;
  return (
    <header className="top">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          {[1, 0, 1, 1, 0, 1, 0, 0].map((on, i) => <i key={i} className={on ? 'on' : ''} />)}
        </div>
        <h1>{t.title}</h1>
      </div>
      <div className="run" role="toolbar" aria-label={top.controls}>
        <span className={`status ${status.kind}`} role="status">{status.text(t)}</span>
        <button className="btn primary" title={top.assembleTitle} onClick={onAssemble}>{top.assemble}</button>
        <div className="icon-group" role="group" aria-label={top.runControls}>
          <button className="btn" title={top.backTitle} aria-label={top.back} disabled={!canBack} onClick={onBack}>
            <svg {...icon}><path d="M7 4L3 8l4 4M3 8h10" /></svg>
          </button>
          <button className="btn" title={top.stepTitle} aria-label={top.step} onClick={onStep}>
            <svg {...icon}><path d="M9 4l4 4-4 4M13 8H3" /></svg>
          </button>
          <button
            className={running ? 'btn running' : 'btn'}
            title={running ? top.pauseTitle : top.runTitle}
            aria-label={running ? top.pause : top.run}
            onClick={onToggleRun}
          >
            {running ? (
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 3v10l8.5-5z" /></svg>
            )}
          </button>
          <button className="btn" title={top.resetTitle} aria-label={top.reset} onClick={onReset}>
            <svg {...icon}><path d="M3 3v4h4" /><path d="M3.5 7A5 5 0 1 1 4 11" /></svg>
          </button>
        </div>
        <select className="select" aria-label={top.speed} title={top.speed} value={speed} onChange={e => onSpeed(e.target.value as Speed)}>
          <option value="2">2/s</option>
          <option value="8">8/s</option>
          <option value="30">30/s</option>
          <option value="200">200/s</option>
          <option value="max">{top.max}</option>
        </select>
        <Segmented
          label={t.language}
          value={lang}
          onChange={onLang}
          options={LANGS.map(l => ({ value: l.value, label: l.label, title: l.name }))}
        />
      </div>
    </header>
  );
}
