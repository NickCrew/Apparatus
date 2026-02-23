export function CrtFilterDefs() {
  return (
    <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden" focusable="false">
      <defs>
        <filter id="crt-noise-filter-lite" x="-5%" y="-5%" width="110%" height="110%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.72 0"
          />
        </filter>
        <filter id="crt-chromatic-filter-lite" x="-5%" y="-5%" width="110%" height="110%">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.02" intercept="0" />
            <feFuncG type="linear" slope="0.98" intercept="0" />
            <feFuncB type="linear" slope="1.03" intercept="0" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
