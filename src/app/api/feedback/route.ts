import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { type, message, name } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const label = type === "idea" ? "Idée" : "Retour";
  const from = name?.trim() || "Anonyme";

  await resend.emails.send({
    from: "Kiekoutsa <onboarding@resend.dev>",
    to: "mathis.coutaye@epitech.eu",
    subject: `[La Boite] ${label} de ${from}`,
    text: `Type : ${label}\nDe : ${from}\n\n${message}`,
  });

  return NextResponse.json({ ok: true });
}
