import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getAwsConnection,
  deleteAwsConnection,
} from "@/lib/db/queries/aws-connections";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getAwsConnection(userId);
  return NextResponse.json({ connection });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteAwsConnection(userId);
  return NextResponse.json({ success: true });
}
