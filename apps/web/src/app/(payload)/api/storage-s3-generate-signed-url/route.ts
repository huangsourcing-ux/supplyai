import { cmsMediaPresignRequestSchema } from "@chinasupply/schemas";
import { getPayload } from "payload";

import { createCmsMediaUpload, getCmsMediaPrefix } from "@/cms/media-storage";
import { payloadEnvironment } from "@/env/payload";
import config from "@payload-config";

function errorResponse(message: string, status: number): Response {
  return Response.json({ errors: [{ message }] }, { status });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;

  return origin === new URL(payloadEnvironment.siteUrl).origin;
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return errorResponse("The request origin is not allowed", 403);
  }

  const payload = await getPayload({ config });
  const authentication = await payload.auth({ headers: request.headers });
  if (!authentication.user) {
    return errorResponse("Authentication is required", 401);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("The request body must be valid JSON", 400);
  }

  const parsed = cmsMediaPresignRequestSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("The upload request is invalid", 400);
  }

  const upload = await createCmsMediaUpload({
    contentLength: parsed.data.filesize,
    contentType: parsed.data.mimeType,
  });

  return Response.json({
    docPrefix: getCmsMediaPrefix(),
    expiresAt: upload.expiresAt,
    filename: upload.filename,
    objectKey: upload.objectKey,
    url: upload.uploadUrl,
  });
}
