import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const TASKS_FILE = join(process.cwd(), "data", "agent-tasks.json");

export async function GET() {
  try {
    const raw = await readFile(TASKS_FILE, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { tasks: [], error: String(err) },
      { status: 500 }
    );
  }
}
