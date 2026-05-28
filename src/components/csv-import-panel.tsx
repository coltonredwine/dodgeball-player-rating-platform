import Link from "next/link";

type Props = {
  title: string;
  importAction: string;
  entity: "players" | "raters";
};

export function CsvImportPanel({ title, importAction, entity }: Props) {
  const base = `/api/admin/csv/${entity}`;

  return (
    <form
      className="space-y-3 rounded border border-zinc-200 p-4"
      action={importAction}
      method="post"
      encType="multipart/form-data"
    >
      <h2 className="font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
          href={`${base}?kind=current`}
        >
          Download current CSV
        </Link>
        <Link
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
          href={`${base}?kind=template`}
        >
          Download blank template
        </Link>
      </div>
      <input type="file" name="file" accept=".csv" required />
      <button className="block rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
        Upload CSV
      </button>
    </form>
  );
}
