"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScrollableListCard } from "@/components/scrollable-list-card";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  link: string | null;
  active: boolean;
};

type Permissions = {
  canEditNames: boolean;
  canDelete: boolean;
};

type Props = {
  players: Player[];
  permissions: Permissions;
};

export function PlayersEditor({ players, permissions }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    firstName: "",
    lastName: "",
    link: "",
    active: true,
  });

  async function savePlayer(playerId: string, data: Omit<Player, "id">) {
    setPendingId(playerId);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        link: data.link ?? "",
        active: data.active,
      }),
    });

    setPendingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to save player");
      return false;
    }

    setMessage("Player saved.");
    setEditingId(null);
    router.refresh();
    return true;
  }

  async function deletePlayer(playerId: string) {
    setPendingId(playerId);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/players/${playerId}`, { method: "DELETE" });
    setPendingId(null);
    setDeleteTargetId(null);
    setEditingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to delete player");
      return;
    }

    setMessage("Player deleted.");
    router.refresh();
  }

  async function addPlayer(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlayer),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to add player");
      return;
    }

    setNewPlayer({ firstName: "", lastName: "", link: "", active: true });
    setMessage("Player added.");
    router.refresh();
  }

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-xs text-zinc-600">
        Click Edit on a player to update their details. Existing scores stay attached.
      </p>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <ScrollableListCard title="Players">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-100 text-zinc-900">
          <tr>
            <th className="px-3 py-2 text-left">First</th>
            <th className="px-3 py-2 text-left">Last</th>
            <th className="px-3 py-2 text-left">Link</th>
            <th className="px-3 py-2 text-left">Active</th>
            <th className="px-3 py-2 text-left" />
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              permissions={permissions}
              isEditing={editingId === player.id}
              pending={pendingId === player.id}
              onEdit={() => {
                setError(null);
                setEditingId(player.id);
              }}
              onCancel={() => setEditingId(null)}
              onSave={savePlayer}
              onDelete={
                permissions.canDelete ? () => setDeleteTargetId(player.id) : undefined
              }
            />
          ))}
        </tbody>
        </table>
      </ScrollableListCard>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete player?"
        message="This will permanently remove the player and all of their ratings."
        pending={pendingId === deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) void deletePlayer(deleteTargetId);
        }}
      />

      <form className="min-w-0 space-y-2 rounded border border-zinc-200 p-4" onSubmit={addPlayer}>
        <h3 className="font-medium">Add player</h3>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          <input
            className="min-w-0 w-full rounded border border-zinc-300 px-2 py-1"
            placeholder="First name"
            value={newPlayer.firstName}
            onChange={(event) =>
              setNewPlayer((current) => ({ ...current, firstName: event.target.value }))
            }
            required
          />
          <input
            className="min-w-0 w-full rounded border border-zinc-300 px-2 py-1"
            placeholder="Last name"
            value={newPlayer.lastName}
            onChange={(event) =>
              setNewPlayer((current) => ({ ...current, lastName: event.target.value }))
            }
            required
          />
          <input
            className="min-w-0 w-full rounded border border-zinc-300 px-2 py-1 sm:col-span-2"
            placeholder="Link (optional)"
            value={newPlayer.link}
            onChange={(event) =>
              setNewPlayer((current) => ({ ...current, link: event.target.value }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newPlayer.active}
            onChange={(event) =>
              setNewPlayer((current) => ({ ...current, active: event.target.checked }))
            }
          />
          Active
        </label>
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
          Add player
        </button>
      </form>
    </div>
  );
}

function PlayerRow({
  player,
  permissions,
  isEditing,
  pending,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  player: Player;
  permissions: Permissions;
  isEditing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (playerId: string, data: Omit<Player, "id">) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [link, setLink] = useState(player.link ?? "");
  const [active, setActive] = useState(player.active);

  useEffect(() => {
    setFirstName(player.firstName);
    setLastName(player.lastName);
    setLink(player.link ?? "");
    setActive(player.active);
  }, [player]);

  useEffect(() => {
    if (!isEditing) {
      setFirstName(player.firstName);
      setLastName(player.lastName);
      setLink(player.link ?? "");
      setActive(player.active);
    }
  }, [isEditing, player]);

  const rowClass = `border-t border-zinc-200 ${player.active ? "" : "bg-zinc-50 text-zinc-500"}`;

  if (!isEditing) {
    return (
      <tr className={rowClass}>
        <td className="px-3 py-2">{player.firstName}</td>
        <td className="px-3 py-2">{player.lastName}</td>
        <td className="px-3 py-2 text-zinc-600">
          {player.link ? (
            <a
              className="text-blue-700 underline"
              href={player.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Link
            </a>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2">{player.active ? "Yes" : "No"}</td>
        <td className="px-3 py-2">
          <button
            type="button"
            className="text-sm text-blue-700 underline hover:text-blue-900"
            onClick={onEdit}
          >
            Edit
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClass}>
      <td className="px-3 py-2">
        {permissions.canEditNames ? (
          <input
            className="w-full min-w-[5rem] rounded border border-zinc-300 px-2 py-1"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        ) : (
          player.firstName
        )}
      </td>
      <td className="px-3 py-2">
        {permissions.canEditNames ? (
          <input
            className="w-full min-w-[5rem] rounded border border-zinc-300 px-2 py-1"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        ) : (
          player.lastName
        )}
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[8rem] rounded border border-zinc-300 px-2 py-1"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://..."
        />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              void onSave(player.id, {
                firstName: permissions.canEditNames ? firstName : player.firstName,
                lastName: permissions.canEditNames ? lastName : player.lastName,
                link: link || null,
                active,
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
