import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const { title, category } = await req.json();
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    throw new ValidationError("A job title is required to generate a description.");
  }

  const categoryHint = category ? ` in the ${category} category` : "";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 220,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant for a local services marketplace in the Philippines. " +
          "When given a job title, write a clear, practical job description a homeowner would post. " +
          "Write 2–3 sentences. Be specific about what the provider should do. " +
          "Use plain language, no markdown, no bullet points.",
      },
      {
        role: "user",
        content: `Job title: "${title.trim()}"${categoryHint}. Write a job description.`,
      },
    ],
  });

  const description = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!description) throw new Error("AI returned an empty response. Please try again.");

  return NextResponse.json({ description }, { status: 200 });
});
