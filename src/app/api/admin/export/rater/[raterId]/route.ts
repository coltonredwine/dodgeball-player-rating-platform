import { NextResponse } from "next/server";
import { requireAdminLike } from "@/lib/api-auth";
import { csvDownloadResponse } from "@/lib/csv";
import { assertRaterInLeague } from "@/lib/league";
import { buildRaterExportCsv, formatRaterExportFilename } from "@/lib/rater-export";
import { getLatestRaterSubmission } from "@/lib/rater-submission";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdminLike();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const { raterId } = await params;

  try {
    await assertRaterInLeague(raterId, leagueId);
  } catch {
    return NextResponse.json({ error: "Rater not found" }, { status: 404 });
  }

  const submission = await getLatestRaterSubmission(raterId);
  if (!submission) {
    return NextResponse.json({ error: "No submission found" }, { status: 404 });
  }

  const csv = buildRaterExportCsv(submission.ratings);
  const filename = formatRaterExportFilename(
    submission.rater.name,
    submission.submittedAt ?? submission.updatedAt,
  );

  return csvDownloadResponse(filename, csv);
}
