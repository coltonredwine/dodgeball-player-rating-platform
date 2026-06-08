"use client";

import { useCallback, useEffect, useState } from "react";
import { TeamColorPicker } from "@/components/team-color-picker";

type TeamRow = {
  id: string;
  pickOrder: number;
  color: string;
  raterId: string;
  captainName: string;
};

type RaterRow = {
  id: string;
  name: string;
  active: boolean;
};

type Props = {
  draftId: string;
  onChanged?: () => void;
};

export function DraftCaptainsSection({ draftId, onChanged }: Props) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [raters, setRaters] = useState<RaterRow[]>([]);
  const [draftStatus, setDraftStatus] = useState("setup");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/drafts/${draftId}/teams`);
    if (!res.ok) return;
    const data = await res.json();
    setTeams(data.teams ?? []);
    setRaters(data.raters ?? []);
    setDraftStatus(data.draftStatus ?? "setup");
  }, [draftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const poolLocked = draftStatus === "complete";

  function setCaptain(teamId: string, raterId: string) {
    setTeams((current) => {
      const team = current.find((entry) => entry.id === teamId);
      if (!team || !raterId) return current;
      const oldRaterId = team.raterId;
      const conflict = current.find((entry) => entry.id !== teamId && entry.raterId === raterId);
      return current.map((entry) => {
        if (entry.id === teamId) return { ...entry, raterId };
        if (conflict && entry.id === conflict.id) return { ...entry, raterId: oldRaterId };
        return entry;
      });
    });
  }

  function setTeamColor(teamId: string, color: string) {
    setTeams((current) =>
      current.map((entry) => (entry.id === teamId ? { ...entry, color } : entry)),
    );
  }

  async function saveCaptains() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teams: teams.map((team) => ({
          id: team.id,
          raterId: team.raterId,
          color: team.color,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not update captains");
      await refresh();
      return;
    }
    setMessage("Captains updated");
    await refresh();
    onChanged?.();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">
        Assign a rater to each pick slot. If you choose someone already assigned elsewhere, the
        previous captain will move to that team automatically when possible.
        {poolLocked ? " Completed drafts cannot be changed." : null}
      </p>
      {message ? (
        <p className={`text-sm ${message === "Captains updated" ? "text-blue-700" : "text-red-700"}`}>
          {message}
        </p>
      ) : null}
      <div className="space-y-2">
        {teams.map((team) => (
          <label key={team.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-16 shrink-0 text-zinc-600">Pick {team.pickOrder}</span>
            <TeamColorPicker
              value={team.color}
              takenColors={teams
                .filter((entry) => entry.id !== team.id)
                .map((entry) => entry.color)}
              disabled={poolLocked || busy}
              onChange={(color) => setTeamColor(team.id, color)}
            />
            <select
              className="min-w-[12rem] flex-1 rounded border px-2 py-1"
              value={team.raterId}
              disabled={poolLocked || busy}
              onChange={(event) => setCaptain(team.id, event.target.value)}
            >
              <option value="">Select captain…</option>
              {raters.map((rater) => (
                <option key={rater.id} value={rater.id}>
                  {rater.name}
                  {!rater.active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={poolLocked || busy || teams.some((team) => !team.raterId)}
        className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
        onClick={() => void saveCaptains()}
      >
        {busy ? "Saving…" : "Save captains"}
      </button>
    </div>
  );
}
