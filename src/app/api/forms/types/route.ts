import { NextResponse } from "next/server";
import { FORM_TYPES } from "@/lib/forms/form-types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, data: FORM_TYPES });
}
