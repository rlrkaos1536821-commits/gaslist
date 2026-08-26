import React from 'react';

const paths = {
  bell: (
    <>
      <path d="M8.5 18.5h7" />
      <path d="M10 20.5h4" />
      <path d="M5.5 17.5c1.2-1.4 1.8-3 1.8-4.9V10a4.7 4.7 0 0 1 9.4 0v2.6c0 1.9.6 3.5 1.8 4.9H5.5Z" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 5.5h6" />
      <path d="M10 3.5h4a2 2 0 0 1 2 2v1H8v-1a2 2 0 0 1 2-2Z" />
      <path d="M6.5 6.5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-1.5" />
      <path d="M7.5 12h9" />
      <path d="M7.5 16h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.2c0 4.3-2.6 7.4-7 9.3-4.4-1.9-7-5-7-9.3V6l7-2.5Z" />
      <path d="M12 8v6" />
      <path d="M9.5 11.5 12 14l3-4" />
    </>
  ),
  list: (
    <>
      <path d="M7.5 6.5h9" />
      <path d="M7.5 12h9" />
      <path d="M7.5 17.5h9" />
      <path d="M4.5 6.5h.1" />
      <path d="M4.5 12h.1" />
      <path d="M4.5 17.5h.1" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16" />
      <path d="M7 7h10" />
      <path d="m7 7-3 6h6L7 7Z" />
      <path d="m17 7-3 6h6l-3-6Z" />
      <path d="M8 20h8" />
    </>
  ),
  userCheck: (
    <>
      <path d="M9.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M3.5 20a6 6 0 0 1 12 0" />
      <path d="m16 12.5 2 2 3.5-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 21 20H3L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.1" />
    </>
  ),
  spreadsheet: (
    <>
      <path d="M6 3.5h8l4 4v13H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M14 3.5v4h4" />
      <path d="M7.5 12h9" />
      <path d="M7.5 15h9" />
      <path d="M10.5 9v9" />
      <path d="M13.5 9v9" />
    </>
  ),
  share: (
    <>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 20h14" />
    </>
  ),
  play: (
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  ),
  chevronDown: (
    <path d="m7 10 5 5 5-5" />
  ),
  chevronRight: (
    <path d="m10 7 5 5-5 5" />
  ),
};

export default function AppIcon({ name, className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.list}
    </svg>
  );
}
