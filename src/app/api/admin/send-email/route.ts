import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { isEmailConfigured, sendEmail } from "@/lib/email";

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "leads:manage")) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return Response.json(
      { success: false, error: "Email is not configured on the server." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = sendEmailSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid email data" }, { status: 400 });
  }

  const { to, subject, body: message } = parsed.data;

  try {
    await sendEmail({
      to,
      subject,
      text: message,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[admin/send-email]", error);
    return Response.json(
      { success: false, error: "Failed to send email. Please try again." },
      { status: 500 }
    );
  }
}
