"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Save, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INTEREST_CATEGORIES } from "@/lib/tribes-data";
import { apiRequest, type Tribe } from "@/lib/social-types";

export default function EditMyTribePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState<Tribe["format"]>("Presencial");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ tribes: Tribe[] }>("/api/tribes?managed=true")
      .then(({ tribes }) => {
        if (!active) return;
        const current = tribes.find((item) => item.id === id);
        if (!current) {
          setError("Esta tribo não existe ou você não tem permissão para editá-la.");
          return;
        }
        setTribe(current);
        setName(current.name);
        setDescription(current.description);
        setCategory(current.category);
        setFormat(current.format);
        setCity(current.city);
        setNeighborhood(current.neighborhood);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a tribo.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await apiRequest<{ tribe: Tribe }>(`/api/tribes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, category, format, city, neighborhood }),
      });
      setTribe(result.tribe);
      router.push("/minhas-tribos");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="flex justify-center py-20"><LoaderCircle className="size-6 animate-spin text-primary" /></main>;

  return (
    <main className="mx-auto max-w-2xl space-y-5">
      <Link href="/minhas-tribos" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Voltar para minhas tribos</Link>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-8">
        <Badge className="bg-primary/10 text-primary"><Users className="size-3" />Gestão da comunidade</Badge>
        <h1 className="mt-3 font-heading text-2xl font-extrabold">Editar tribo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualize as informações que aparecem para quem encontra sua comunidade.</p>
        {tribe && (
          <form onSubmit={(event) => void save(event)} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="tribe-name">Nome</Label><Input id="tribe-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} minLength={2} maxLength={80} required /></div>
            <div className="space-y-1.5"><Label htmlFor="tribe-description">Descrição</Label><Textarea id="tribe-description" value={description} onChange={(event) => { setDescription(event.target.value); setSaved(false); }} minLength={2} maxLength={1000} rows={5} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="tribe-category">Categoria</Label><select id="tribe-category" value={category} onChange={(event) => { setCategory(event.target.value); setSaved(false); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{INTEREST_CATEGORIES.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}</select></div>
              <div className="space-y-1.5"><Label htmlFor="tribe-format">Formato</Label><select id="tribe-format" value={format} onChange={(event) => { setFormat(event.target.value as Tribe["format"]); setSaved(false); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option>Presencial</option><option>Híbrido</option><option>Online</option></select></div>
              <div className="space-y-1.5"><Label htmlFor="tribe-city">Cidade</Label><Input id="tribe-city" value={city} onChange={(event) => { setCity(event.target.value); setSaved(false); }} minLength={2} maxLength={100} required /></div>
              <div className="space-y-1.5"><Label htmlFor="tribe-neighborhood">Bairro</Label><Input id="tribe-neighborhood" value={neighborhood} onChange={(event) => { setNeighborhood(event.target.value); setSaved(false); }} maxLength={100} placeholder="Opcional" /></div>
            </div>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {saved && <p role="status" className="text-sm font-medium text-primary">Alterações salvas com sucesso.</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" nativeButton={false} render={<Link href="/minhas-tribos" />}>Cancelar</Button>
              <Button type="submit" disabled={saving || name.trim().length < 2 || description.trim().length < 2 || city.trim().length < 2}>
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        )}
        {!tribe && error && <p role="alert" className="mt-5 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </section>
    </main>
  );
}
