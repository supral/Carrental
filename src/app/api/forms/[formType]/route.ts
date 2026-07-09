import { NextRequest, NextResponse } from "next/server";
import { createLeadFromForm } from "@/lib/forms/create-lead-from-form";
import { isFormType } from "@/lib/forms/form-types";
import { FormValidationError, validateFormSubmission } from "@/lib/forms/validate-form";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formType: string }> }
) {
  try {
    const { formType } = await params;

    if (!isFormType(formType)) {
      return NextResponse.json(
        { success: false, error: `Invalid form type: ${formType}` },
        { status: 400 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const sanitized = validateFormSubmission(formType, body);
    const lead = await createLeadFromForm(formType, sanitized);

    return NextResponse.json(
      {
        success: true,
        message: "Your enquiry has been received. We'll be in touch shortly.",
        data: { id: lead.id },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FormValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, errors: error.errors },
        { status: error.status }
      );
    }

    console.error("[Forms API]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
