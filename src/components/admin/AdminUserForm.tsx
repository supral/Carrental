"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSIGNABLE_ADMIN_ROLES, ROLE_LABELS } from "@/lib/admin/permissions";
import { createAdminUser, updateAdminUser } from "@/lib/admin/admin-user-actions";

interface DealerOption {
  id: string;
  name: string;
}

interface AdminUserFormProps {
  dealers: DealerOption[];
  initial?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone: string | null;
    dealerId: string | null;
  };
}

export default function AdminUserForm({ dealers, initial }: AdminUserFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initial?.role ?? Role.ADMIN);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [dealerId, setDealerId] = useState(initial?.dealerId ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        role,
        phone: phone || undefined,
        dealerId: role === Role.DEALER_MANAGER ? dealerId || undefined : undefined,
        password: password || undefined,
      };

      if (initial) {
        await updateAdminUser(initial.id, payload);
        router.push("/admin/admins");
      } else {
        if (!password) throw new Error("Password is required");
        await createAdminUser({ ...payload, password });
        router.push("/admin/admins");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save admin user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5 rounded-xl border border-border bg-card p-6">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="password">{initial ? "New password (optional)" : "Password"}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!initial}
          minLength={6}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ADMIN_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {role === Role.DEALER_MANAGER && (
        <div>
          <Label>Dealer</Label>
          <Select value={dealerId} onValueChange={setDealerId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select dealer" /></SelectTrigger>
            <SelectContent>
              {dealers.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>{dealer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : initial ? "Update admin" : "Create admin"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/admins")}>Cancel</Button>
      </div>
    </form>
  );
}
