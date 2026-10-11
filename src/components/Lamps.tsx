const BITS = [7, 6, 5, 4, 3, 2, 1, 0];

/** A byte as a row of eight indicator lamps, bit 7 first. */
export function Lamps({ value, small = false }: { value: number; small?: boolean }) {
  return (
    <div className={small ? 'lamps sm' : 'lamps nibble-gap'} role="img" aria-label={`bits ${(value & 255).toString(2).padStart(8, '0')}`}>
      {BITS.map(b => (
        <span key={b} className={value & (1 << b) ? 'lamp on' : 'lamp'} title={`bit ${b}`} />
      ))}
    </div>
  );
}

export function Lamp({ on }: { on: boolean }) {
  return <span className={on ? 'lamp on' : 'lamp'} />;
}
