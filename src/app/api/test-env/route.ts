import { NextResponse } from "next/server";

export async function GET() {
  const brevoApiKey = process.env.BREVO_API_KEY || "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "kerooegypt2030@gmail.com";
  const emailToTest = "kerooegypt2030@gmail.com";

  let sendResult = "Not attempted";
  let errorDetail = null;

  if (brevoApiKey) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: "DOKRAN Test", email: senderEmail },
          to: [{ email: emailToTest }],
          subject: "DOKRAN BREVO TEST",
          textContent: "This is a test email via Brevo API.",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        sendResult = "Success! Brevo API sent the email.";
      } else {
        sendResult = "Failed via Brevo API";
        errorDetail = data;
      }
    } catch (err: any) {
      sendResult = "Network Error";
      errorDetail = err.message;
    }
  } else {
    sendResult = "BREVO_API_KEY is missing";
  }

  return NextResponse.json({
    hasBrevoKey: !!brevoApiKey,
    brevoKeyPreview: brevoApiKey ? `${brevoApiKey.slice(0, 8)}...` : "Missing",
    senderEmail,
    nextAuthUrl: process.env.NEXTAUTH_URL || "Not Set",
    sendResult,
    errorDetail
  });
}
