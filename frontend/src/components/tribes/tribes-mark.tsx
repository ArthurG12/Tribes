import Image from "next/image";

export function TribesMark({ className = "size-6" }: { className?: string }) {
  return <Image src="/tribes-emblem.png" alt="Tribes" width={48} height={48} className={className} />;
}
