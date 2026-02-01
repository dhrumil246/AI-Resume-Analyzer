import type { ActionFunctionArgs } from "react-router";
import { AIResponseFormat, prepareInstructions } from "../../constants";
import { callNimChat, type NimChatMessage } from "~/lib/nim.server";
import {
  validateResumeText,
  validateJobTitle,
  validateJobDescription,
} from "~/lib/validation.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rateLimit.server";

type AnalyzeRequest = {
  resumeText: string;
  jobTitle?: string;
  jobDescription?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  console.log("API analyze called");

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId);

  console.log("Rate limit check:", { clientId, allowed: rateLimit.allowed, remaining: rateLimit.remaining });

  if (!rateLimit.allowed) {
    return new Response("Too many requests. Please try again later.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(process.env.RATE_LIMIT_MAX || "10"),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rateLimit.resetTime),
      },
    });
  }

  // Parse and validate request body
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
    console.log("Request body parsed:", { 
      textLength: body.resumeText?.length, 
      hasJobTitle: !!body.jobTitle,
      hasJobDescription: !!body.jobDescription 
    });
  } catch {
    console.error("Invalid JSON body");
    return new Response("Invalid JSON body", { status: 400 });
  }

  // Validate required field
  if (!body?.resumeText) {
    return new Response("Missing resumeText", { status: 400 });
  }

  // Validate resume text
  const resumeTextError = validateResumeText(body.resumeText);
  if (resumeTextError) {
    return new Response(resumeTextError, { status: 400 });
  }

  // Validate job title if provided
  if (body.jobTitle) {
    const jobTitleError = validateJobTitle(body.jobTitle);
    if (jobTitleError) {
      return new Response(jobTitleError, { status: 400 });
    }
  }

  // Validate job description if provided
  if (body.jobDescription) {
    const jobDescError = validateJobDescription(body.jobDescription);
    if (jobDescError) {
      return new Response(jobDescError, { status: 400 });
    }
  }

  const prompt = prepareInstructions({
    jobTitle: body.jobTitle ?? "",
    jobDescription: body.jobDescription ?? "",
    AIResponseFormat,
  });

  const messages: NimChatMessage[] = [
    {
      role: "system",
      content:
        "You are a professional resume reviewer. Follow instructions strictly and return valid JSON only.",
    },
    {
      role: "user",
      content: `${prompt}\n\nResume:\n${body.resumeText}`,
    },
  ];

  try {
    console.log("Calling NIM API...");
    const feedback = await callNimChat({ 
      messages,
      maxTokens: 3000 // Increased from 1500 to allow complete responses
    });
    console.log("NIM API call successful");
    return new Response(JSON.stringify(feedback), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(process.env.RATE_LIMIT_MAX || "10"),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetTime),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analysis error:", message);
    return new Response("Failed to analyze resume. Please try again.", {
      status: 500,
    });
  }
};
