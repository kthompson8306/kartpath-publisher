import { randomUUID } from "node:crypto";

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function privateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR is not configured");
  }
  return dir.replace(/\/$/, "");
}

function parseObjectPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const [, bucketName, ...objectParts] = normalized.split("/");
  if (!bucketName || objectParts.length === 0) {
    throw new Error("Invalid object storage path");
  }
  return { bucketName, objectName: objectParts.join("/") };
}

export async function getObjectEntityUploadURL() {
  const objectPath = `${privateObjectDir()}/uploads/${randomUUID()}`;
  const { bucketName, objectName } = parseObjectPath(objectPath);
  const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Object storage signing failed with ${response.status}`);
  }
  const body = (await response.json()) as { signed_url?: string };
  if (!body.signed_url) {
    throw new Error("Object storage returned no signed URL");
  }
  return {
    uploadURL: body.signed_url,
    objectPath: `/objects/${objectPath.slice(privateObjectDir().length + 1)}`,
    expiresInSeconds: 900,
  };
}

export async function getObjectEntityGetURL(objectPath: string): Promise<string> {
  // objectPath is stored as /objects/uploads/<uuid>
  // Reconstruct the full GCS path: PRIVATE_OBJECT_DIR/uploads/<uuid>
  const relativePath = objectPath.replace(/^\/objects/, "");
  const fullPath = `${privateObjectDir()}${relativePath}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "GET",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1-hour GET URL
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Object storage GET signing failed with ${response.status}`);
  }
  const body = (await response.json()) as { signed_url?: string };
  if (!body.signed_url) {
    throw new Error("Object storage returned no signed GET URL");
  }
  return body.signed_url;
}

/**
 * Verify that an object actually exists in GCS by obtaining a short-lived
 * signed GET URL from the sidecar and performing a HEAD request against it.
 *
 * GCS signed GET URLs accept HEAD requests (HEAD is a permission subset of
 * GET), so this works without needing a separate signed HEAD URL.
 *
 * Returns true if the object exists and is accessible, false otherwise.
 * Never throws — a network error or sidecar failure is treated as non-existent
 * to avoid silently marking corrupt uploads as ready.
 */
export async function checkObjectExists(objectPath: string): Promise<boolean> {
  try {
    const relativePath = objectPath.replace(/^\/objects/, "");
    const fullPath = `${privateObjectDir()}${relativePath}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    const signResponse = await fetch(
      `${SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket_name: bucketName,
          object_name: objectName,
          method: "GET",
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!signResponse.ok) return false;
    const body = (await signResponse.json()) as { signed_url?: string };
    if (!body.signed_url) return false;

    const headResponse = await fetch(body.signed_url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });

    return headResponse.ok; // 200 → exists; 404/403 → missing or never uploaded
  } catch {
    return false; // network error, timeout, bad path — treat as non-existent
  }
}
