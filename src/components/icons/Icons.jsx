import React from "react";

function Svg({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 19.5V11.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12 19.5V8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M19 19.5V5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M3.5 19.5H20.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Svg>
  );
}

export function ProductsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 7.5h10l1.5 4.5H5.5L7 7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6.5 12h11v5.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.3 7.5V6.7A2.2 2.2 0 0 1 11.5 4.5h1A2.2 2.2 0 0 1 14.7 6.7v.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function SalesIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 4.8h10a2 2 0 0 1 2 2v12.4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 9h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 16h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Svg>
  );
}

export function InventoryIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 4.8 18 8v8L12 19.2 6 16V8l6-3.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 11.2 18 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 11.2 6 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 11.2v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function ReportsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 19.5V9.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M10.5 19.5v-5.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M16 19.5V6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M21 19.5H3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 7.5h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 16.5h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="16.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </Svg>
  );
}

export function SearchIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5.2a4.8 4.8 0 0 0-4.8 4.8v2.4c0 1.1-.4 2.1-1.2 2.9l-.8.8h13.6l-.8-.8a4.1 4.1 0 0 1-1.2-2.9V10A4.8 4.8 0 0 0 12 5.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.3 18.2a1.9 1.9 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function UserIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19a6.8 6.8 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function LockIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 10V8.5a4 4 0 1 1 8 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6" y="10" width="12" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 13.7v2.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function MenuIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Svg>
  );
}

export function MoonIcon(props) {
  return (
    <Svg {...props}>
      <path d="M19.6 14.6A7.3 7.3 0 0 1 9.4 4.4a6.4 6.4 0 1 0 10.2 10.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

export function SunIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.8v2.1M12 19.1v2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M2.8 12h2.1M19.1 12h2.1M5.5 18.5 7 17M17 7l1.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 9.5 12 15l6-5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <Svg {...props}>
      <path d="M14.5 6 8.5 12l6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <Svg {...props}>
      <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PencilIcon(props) {
  return (
    <Svg {...props}>
      <path d="m14.2 5.8 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 19.5 6 15.2l8.8-8.7a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8l-8.7 8.8L5 19.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrashIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5.8 7.5h12.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m8 7.5.8 11a2 2 0 0 0 2 1.8h2.4a2 2 0 0 0 2-1.8l.8-11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.5 11v6M13.5 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon(props) {
  return (
    <Svg {...props}>
      <path d="M19.5 7 10 16.5 5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function XIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
