"use client";

export function TribesMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className} fill="none">
      <path d="M5 8.5 22.8 18.7v9.1L5 17.5V8.5Z" fill="currentColor" />
      <path d="m43 8.5-17.8 10.2v9.1L43 17.5V8.5Z" fill="currentColor" />
      <path d="M5 22.5 22.8 32.7V43L5 32.8v-10.3Z" fill="currentColor" />
      <path d="m43 22.5-17.8 10.2V43L43 32.8V22.5Z" fill="currentColor" />
      <path d="m34.8 32.2 8.2-4.7v9.1l-8.2 4.7v-9.1Z" fill="#F07835" />
    </svg>
  );
}
