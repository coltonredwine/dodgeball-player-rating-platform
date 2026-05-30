"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SessionRole } from "@/lib/auth";
import { canSeeRaterPasscode } from "@/lib/rbac";
import { DB_RATER_ROLES, DbRaterRole } from "@/lib/rater-roles";

type Rater = {
  id: string;
  name: string;
  email: string;
  role: DbRaterRole;
  passcodeDisplay: string | null;
  active: boolean;
};

type Permissions = {
  viewerRole: SessionRole;
  canEdit: boolean;
  canEditName: boolean;
  canEditRole: boolean;
  canEditActive: boolean;
  canDelete: boolean;
  canAdd: boolean;
};

type Props = {
  raters: Rater[];
  permissions: Permissions;
};

export function RatersEditor({ raters, permissions }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [newRater, setNewRater] = useState({
    name: "",
    email: "",
    role: "rater" as DbRaterRole,
    passcode: "",
    active: true,
  });

  async function saveRater(
    raterId: string,
    data: {
      name: string;
      email: string;
      role: DbRaterRole;
      passcode: string;
      active: boolean;
    },
  ) {
    setPendingId(raterId);
    setMessage(null);
    setError(null);

    const body: Record<string, string | boolean> = {
      email: data.email,
    };

    if (permissions.canEditName) body.name = data.name;
    if (permissions.canEditRole) body.role = data.role;
    if (permissions.canEditActive) body.active = data.active;
    if (data.passcode) body.passcode = data.passcode;

    const response = await fetch(`/api/admin/raters/${raterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setPendingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to save rater");
      return false;
    }

    setMessage("Rater saved.");
    setEditingId(null);
    router.refresh();
    return true;
  }

  async function deleteRater(raterId: string) {
    setPendingId(raterId);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/raters/${raterId}`, { method: "DELETE" });
    setPendingId(null);
    setDeleteTargetId(null);
    setEditingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to delete rater");
      return;
    }

    setMessage("Rater deleted.");
    router.refresh();
  }

  async function addRater(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/raters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRater),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to add rater");
      return;
    }

    setNewRater({ name: "", email: "", role: "rater", passcode: "", active: true });
    setMessage("Rater added.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {permissions.canEdit ? (
        <p className="text-xs text-zinc-600">
          Click Edit on a rater to update their details. Leave passcode blank to keep the current
          code.
        </p>
      ) : null}

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <table className="min-w-full border-collapse rounded border border-zinc-200 text-sm">
        <thead className="bg-zinc-100 text-zinc-900">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Role</th>
            <th className="px-3 py-2 text-left">Passcode</th>
            <th className="px-3 py-2 text-left">Active</th>
            <th className="px-3 py-2 text-left" />
          </tr>
        </thead>
        <tbody>
          {raters.map((rater) => (
            <RaterRow
              key={rater.id}
              rater={rater}
              permissions={permissions}
              isEditing={editingId === rater.id}
              pending={pendingId === rater.id}
              onEdit={() => {
                setError(null);
                setEditingId(rater.id);
              }}
              onCancel={() => setEditingId(null)}
              onSave={saveRater}
              onDelete={
                permissions.canDelete ? () => setDeleteTargetId(rater.id) : undefined
              }
            />
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete rater?"
        message="This will permanently remove the rater and all of their submissions."
        pending={pendingId === deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) void deleteRater(deleteTargetId);
        }}
      />

      {permissions.canAdd ? (
        <form className="space-y-2 rounded border border-zinc-200 p-4" onSubmit={addRater}>
          <h3 className="font-medium">Add rater</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded border border-zinc-300 px-2 py-1"
              placeholder="Name"
              value={newRater.name}
              onChange={(event) =>
                setNewRater((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <input
              className="rounded border border-zinc-300 px-2 py-1"
              placeholder="Email"
              type="email"
              value={newRater.email}
              onChange={(event) =>
                setNewRater((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <select
              className="rounded border border-zinc-300 px-2 py-1"
              value={newRater.role}
              onChange={(event) =>
                setNewRater((current) => ({
                  ...current,
                  role: event.target.value as DbRaterRole,
                }))
              }
            >
              {DB_RATER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-zinc-300 px-2 py-1"
              placeholder="Passcode (optional)"
              value={newRater.passcode}
              onChange={(event) =>
                setNewRater((current) => ({ ...current, passcode: event.target.value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newRater.active}
              onChange={(event) =>
                setNewRater((current) => ({ ...current, active: event.target.checked }))
              }
            />
            Active
          </label>
          <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
            Add rater
          </button>
        </form>
      ) : null}
    </div>
  );
}

function RaterRow({
  rater,
  permissions,
  isEditing,
  pending,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  rater: Rater;
  permissions: Permissions;
  isEditing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (
    raterId: string,
    data: {
      name: string;
      email: string;
      role: DbRaterRole;
      passcode: string;
      active: boolean;
    },
  ) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(rater.name);
  const [email, setEmail] = useState(rater.email);
  const [role, setRole] = useState(rater.role);
  const [passcode, setPasscode] = useState("");
  const [active, setActive] = useState(rater.active);

  useEffect(() => {
    setName(rater.name);
    setEmail(rater.email);
    setRole(rater.role);
    setActive(rater.active);
  }, [rater]);

  useEffect(() => {
    if (!isEditing) {
      setName(rater.name);
      setEmail(rater.email);
      setRole(rater.role);
      setPasscode("");
      setActive(rater.active);
    }
  }, [isEditing, rater]);

  const rowClass = `border-t border-zinc-200 ${rater.active ? "" : "bg-zinc-50 text-zinc-500"}`;
  const passcodeVisible = canSeeRaterPasscode(
    { role: permissions.viewerRole, email: "", name: "" },
    rater.role,
  );

  if (!isEditing) {
    return (
      <tr className={rowClass}>
        <td className="px-3 py-2">{rater.name}</td>
        <td className="px-3 py-2">{rater.email}</td>
        <td className="px-3 py-2 capitalize">{rater.role}</td>
        <td className="px-3 py-2 font-mono text-xs">
          {passcodeVisible ? rater.passcodeDisplay ?? "—" : "—"}
        </td>
        <td className="px-3 py-2">{rater.active ? "Yes" : "No"}</td>
        <td className="px-3 py-2">
          {permissions.canEdit ? (
            <button
              type="button"
              className="text-sm text-blue-700 underline hover:text-blue-900"
              onClick={onEdit}
            >
              Edit
            </button>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClass}>
      <td className="px-3 py-2">
        {permissions.canEditName ? (
          <input
            className="w-full min-w-[5rem] rounded border border-zinc-300 px-2 py-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          rater.name
        )}
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[8rem] rounded border border-zinc-300 px-2 py-1"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        {permissions.canEditRole ? (
          <select
            className="rounded border border-zinc-300 px-2 py-1 capitalize"
            value={role}
            onChange={(event) => setRole(event.target.value as DbRaterRole)}
          >
            {DB_RATER_ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span className="capitalize">{rater.role}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[5rem] rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          placeholder={passcodeVisible ? rater.passcodeDisplay ?? "New passcode" : "New passcode"}
        />
      </td>
      <td className="px-3 py-2">
        {permissions.canEditActive ? (
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        ) : (
          rater.active ? "Yes" : "No"
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              void onSave(rater.id, {
                name: permissions.canEditName ? name : rater.name,
                email,
                role: permissions.canEditRole ? role : rater.role,
                passcode,
                active: permissions.canEditActive ? active : rater.active,
              })
            }
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </button>
          {onDelete ? (
            <button
              type="button"
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
              disabled={pending}
              onClick={onDelete}
            >
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
