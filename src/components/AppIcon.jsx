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
  mail: (
    <>
      <path d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="m4 8 8 6 8-6" />
    </>
  ),
  sun: (
    <>
      <path d="M12 4v1.5" />
      <path d="M12 18.5V20" />
      <path d="M4 12h1.5" />
      <path d="M18.5 12H20" />
      <path d="m6.3 6.3 1.1 1.1" />
      <path d="m16.6 16.6 1.1 1.1" />
      <path d="m17.7 6.3-1.1 1.1" />
      <path d="m7.4 16.6-1.1 1.1" />
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    </>
  ),
  moon: (
    <path d="M20 14.3A7.7 7.7 0 0 1 9.7 4a8 8 0 1 0 10.3 10.3Z" />
  ),
  play: (
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  ),
  reset: (
    <>
      <path d="M18.5 8.2A7.5 7.5 0 1 0 19 15" />
      <path d="M18.5 8.2V4.5" />
      <path d="M18.5 8.2h-3.7" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14 7 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M9 7V4.5h6V7" />
    </>
  ),
  search: (
    <>
      <path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  image: (
    <>
      <path d="M5.5 4.5h13A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5Z" />
      <path d="m5 16 4.2-4.2a1.3 1.3 0 0 1 1.8 0l2 2 1.4-1.4a1.3 1.3 0 0 1 1.8 0L20 16" />
      <path d="M15.5 9h.1" />
    </>
  ),
  camera: (
    <>
      <path d="M8.5 6.5 10 4.5h4l1.5 2h2.5A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17V9A2.5 2.5 0 0 1 6 6.5h2.5Z" />
      <path d="M12 15.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M17 10h.1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 5-7 7 7 7" />
    </>
  ),
  chevronDown: (
    <path d="m7 10 5 5 5-5" />
  ),
  chevronRight: (
    <path d="m10 7 5 5-5 5" />
  ),
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
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
