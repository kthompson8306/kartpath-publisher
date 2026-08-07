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