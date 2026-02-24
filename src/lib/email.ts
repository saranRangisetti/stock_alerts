import nodemailer from "nodemailer";
import { TrackedProduct } from "./storage";

export interface EmailSettings {
  enabled: boolean;
  senderEmail: string;
  senderAppPassword: string;
  recipientEmail: string;
}

export async function sendRestockEmail(
  settings: EmailSettings,
  products: TrackedProduct[],
): Promise<{ success: boolean; error?: string }> {
  if (!settings.enabled || products.length === 0) {
    return { success: false, error: "Email not enabled or no products" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: settings.senderEmail,
      pass: settings.senderAppPassword,
    },
  });

  const productRows = products
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #333;">
          ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #333;">
          <strong style="color: #fff;">${p.name}</strong><br/>
          <span style="color: #aaa; font-size: 12px;">${p.source.toUpperCase()}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #333; color: #22c55e; font-weight: bold;">
          ${p.price ? `$${p.price.toFixed(2)}` : "Check price"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #333;">
          <a href="${p.url}" style="background: #22c55e; color: #000; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">BUY NOW</a>
        </td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="background: #0a0a0a; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #18181b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #000; font-size: 24px;">RESTOCK ALERT!</h1>
          <p style="margin: 4px 0 0; color: #052e16; font-size: 14px;">
            ${products.length} item${products.length > 1 ? "s" : ""} back in stock at MSRP
          </p>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${productRows}
          </table>
          <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 24px;">
            Sent by Inventory Alerts - Pokemon & One Piece MSRP Restock Tracker
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const subject =
      products.length === 1
        ? `RESTOCK ALERT: ${products[0].name}`
        : `RESTOCK ALERT: ${products.length} items back in stock!`;

    await transporter.sendMail({
      from: `"Inventory Alerts" <${settings.senderEmail}>`,
      to: settings.recipientEmail,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Email send failed:", message);
    return { success: false, error: message };
  }
}

export async function sendTestEmail(
  settings: EmailSettings,
): Promise<{ success: boolean; error?: string }> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: settings.senderEmail,
      pass: settings.senderAppPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Inventory Alerts" <${settings.senderEmail}>`,
      to: settings.recipientEmail,
      subject: "Inventory Alerts - Test Email",
      html: `
        <div style="background: #0a0a0a; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #18181b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
            <div style="background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #000; font-size: 24px;">Test Email</h1>
              <p style="margin: 4px 0 0; color: #422006; font-size: 14px;">Your email notifications are working!</p>
            </div>
            <div style="padding: 24px; text-align: center;">
              <p style="color: #d4d4d8; font-size: 16px;">
                You'll receive emails like this whenever a tracked item restocks at MSRP.
              </p>
              <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
                Sent by Inventory Alerts - Pokemon & One Piece MSRP Restock Tracker
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
