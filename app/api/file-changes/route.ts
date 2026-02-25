import { NextRequest } from "next/server";
import { getFileChanges } from "../../lib/git-changes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const dir = request.nextUrl.searchParams.get("dir");

  if (!dir) {
    return Response.json(
      { error: "Missing 'dir' query parameter" },
      { status: 400 }
    );
  }

  try {
    const result = getFileChanges(dir);

    if (!result) {
      return Response.json(
        {
          error: "Directory not found or not a git repository",
          directory: dir,
          files: [],
          totalFiles: 0,
          totalAdditions: 0,
          totalDeletions: 0,
        },
        { status: 404 }
      );
    }

    return Response.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Git command failed",
        files: [],
        totalFiles: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      },
      { status: 500 }
    );
  }
}
