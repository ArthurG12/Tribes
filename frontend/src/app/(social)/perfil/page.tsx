"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Check, LoaderCircle, Save, Trash2, UserRound } from "lucide-react";
import { useCurrentUser, type CurrentUser } from "@/components/social/auth-guard";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageFileError, readImageAsDataUrl } from "@/lib/image-file";
import { apiRequest } from "@/lib/social-types";

export default function ProfileSettingsPage() {
  const { user, setUser } = useCurrentUser();
  const [name, setName] = useState(user.name);
  const [aboutMe, setAboutMe] = useState(user.aboutMe);
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = avatar === undefined ? user.avatarUrl : avatar;

  async function selectAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setSaved(false);
    if (!file) return;
    try {
      setAvatar(await readImageAsDataUrl(file));
    } catch (imageError) {
      setError(imageError instanceof ImageFileError && imageError.code === "unsupported-type"
        ? "Escolha uma imagem JPEG, PNG ou WebP."
        : imageError instanceof ImageFileError && imageError.code === "too-large"
          ? "A foto deve ter no máximo 5 MB."
          : "Não foi possível ler essa imagem.");
      event.target.value = "";
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        name,
        aboutMe,
        ...(avatar !== undefined ? { avatar } : {}),
      };
      const result = await apiRequest<{ user: CurrentUser }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser(result.user);
      setName(result.user.name);
      setAboutMe(result.user.aboutMe);
      setAvatar(undefined);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar seu perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary"><UserRound className="size-4" />Sua conta</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Editar perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conte para sua comunidade quem você é.</p>
      </header>

      <form onSubmit={(event) => void saveProfile(event)} className="space-y-6 rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-8">
        <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            {previewUrl ? (
              <div className="relative size-28 overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm">
                <Image src={previewUrl} alt={`Prévia da foto de ${name}`} fill unoptimized sizes="112px" className="object-cover" />
              </div>
            ) : (
              <UserAvatar name={name} avatarUrl={null} className="size-28 text-3xl" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-lg font-bold">Foto de perfil</h2>
            <p className="text-sm text-muted-foreground">JPEG, PNG ou WebP · até 5 MB</p>
            <div className="flex flex-wrap gap-2">
              <label htmlFor="profile-avatar" className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted">
                <Camera className="size-4" />Escolher foto
              </label>
              <Input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} className="sr-only" aria-label="Escolher foto de perfil" />
              {previewUrl && <Button type="button" variant="ghost" size="sm" onClick={() => { setAvatar(null); setSaved(false); }}><Trash2 className="size-4" />Remover</Button>}
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-sm font-semibold">Nome</label>
          <Input id="profile-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} minLength={2} maxLength={80} required autoComplete="name" />
          <p className="text-xs text-muted-foreground">Esse nome será mostrado nas suas publicações e comentários.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-about" className="text-sm font-semibold">Sobre mim</label>
          <Textarea id="profile-about" value={aboutMe} onChange={(event) => { setAboutMe(event.target.value); setSaved(false); }} maxLength={500} rows={5} placeholder="Compartilhe um pouco sobre você e seus interesses..." />
          <p className="text-right text-xs text-muted-foreground">{aboutMe.length}/500</p>
        </div>

        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {saved && <p role="status" className="flex items-center gap-2 text-sm font-medium text-primary"><Check className="size-4" />Perfil atualizado.</p>}
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" disabled={saving || name.trim().length < 2} className="rounded-xl">
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </main>
  );
}
