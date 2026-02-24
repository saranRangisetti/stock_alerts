import { NextResponse } from "next/server";
import { getEmailSettings, saveEmailSettings } from "@/lib/storage";
import { sendTestEmail } from "@/lib/email";

export async function GET() {
  const settings = getEmailSettings();
  // Don't expose the full app password to the frontend
  return NextResponse.json({
    enabled: settings.enabled,
    senderEmail: settings.senderEmail,
    recipientEmail: settings.recipientEmail,
    hasPassword: !!settings.senderAppPassword,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderEmail, senderAppPassword, recipientEmail, enabled, testEmail } = body;

    if (testEmail) {
      // Send a test email with provided settings
      const settings = {
        enabled: true,
        senderEmail: senderEmail || "",
        senderAppPassword: senderAppPassword || "",
        recipientEmail: recipientEmail || "",
      };

      if (!settings.senderEmail || !settings.senderAppPassword || !settings.recipientEmail) {
        return NextResponse.json(
          { error: "All email fields are required to send a test" },
          { status: 400 },
        );
      }

      const result = await sendTestEmail(settings);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send test email" },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true, message: "Test email sent!" });
    }

    // Save settings
    const existing = getEmailSettings();
    const settings = {
      enabled: enabled ?? existing.enabled,
      senderEmail: senderEmail ?? existing.senderEmail,
      // Only update password if provided (not empty)
      senderAppPassword: senderAppPassword || existing.senderAppPassword,
      recipientEmail: recipientEmail ?? existing.recipientEmail,
    };

    saveEmailSettings(settings);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
