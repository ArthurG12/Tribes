import Image from "next/image";

export function UserAvatar({
  name,
  avatarUrl,
  className = "size-10",
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading font-bold text-primary ${className}`}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt={`Foto de perfil de ${name}`} fill unoptimized sizes="96px" className="object-cover" />
      ) : (
        name.trim().slice(0, 1).toUpperCase() || "?"
      )}
    </span>
  );
}
