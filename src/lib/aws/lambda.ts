import {
  LambdaClient,
  UpdateFunctionCodeCommand,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

function getLambdaClient(
  credentials: AwsTempCredentials,
  region: string,
): LambdaClient {
  return new LambdaClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export async function updateFunctionCode(
  credentials: AwsTempCredentials,
  region: string,
  functionName: string,
  zipBuffer: Buffer,
): Promise<void> {
  const client = getLambdaClient(credentials, region);

  await client.send(
    new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: zipBuffer,
    }),
  );
}

export interface InvokeResult {
  statusCode: number;
  body: string;
  error?: string;
}

export async function invokeFunction(
  credentials: AwsTempCredentials,
  region: string,
  functionName: string,
  payload: string,
): Promise<InvokeResult> {
  const client = getLambdaClient(credentials, region);

  const response = await client.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(payload),
    }),
  );

  const responsePayload = response.Payload
    ? Buffer.from(response.Payload).toString("utf-8")
    : "{}";

  if (response.FunctionError) {
    return {
      statusCode: 500,
      body: responsePayload,
      error: response.FunctionError,
    };
  }

  return {
    statusCode: response.StatusCode ?? 200,
    body: responsePayload,
  };
}

export function zipFunctionCode(code: string, handler: string): Buffer {
  // Simple ZIP creation for a single file
  // The handler is "index.handler" so the file must be "index.js"
  const filename = handler.split(".")[0] + ".js";
  return createZip(filename, code);
}

function createZip(filename: string, content: string): Buffer {
  const data = Buffer.from(content, "utf-8");
  const nameBuffer = Buffer.from(filename, "utf-8");
  const now = new Date();

  const dosTime =
    ((now.getSeconds() >> 1) & 0x1f) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getHours() & 0x1f) << 11);
  const dosDate =
    (now.getDate() & 0x1f) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (((now.getFullYear() - 1980) & 0x7f) << 9);

  const crc = crc32(data);

  // Local file header
  const localHeader = Buffer.alloc(30 + nameBuffer.length);
  localHeader.writeUInt32LE(0x04034b50, 0); // signature
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(0, 8); // compression: stored
  localHeader.writeUInt16LE(dosTime, 10);
  localHeader.writeUInt16LE(dosDate, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18); // compressed size
  localHeader.writeUInt32LE(data.length, 22); // uncompressed size
  localHeader.writeUInt16LE(nameBuffer.length, 26);
  localHeader.writeUInt16LE(0, 28); // extra field length
  nameBuffer.copy(localHeader, 30);

  const centralOffset = localHeader.length + data.length;

  // Central directory header
  const centralHeader = Buffer.alloc(46 + nameBuffer.length);
  centralHeader.writeUInt32LE(0x02014b50, 0); // signature
  centralHeader.writeUInt16LE(20, 4); // version made by
  centralHeader.writeUInt16LE(20, 6); // version needed
  centralHeader.writeUInt16LE(0, 8); // flags
  centralHeader.writeUInt16LE(0, 10); // compression
  centralHeader.writeUInt16LE(dosTime, 12);
  centralHeader.writeUInt16LE(dosDate, 14);
  centralHeader.writeUInt32LE(crc, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(nameBuffer.length, 28);
  centralHeader.writeUInt16LE(0, 30); // extra field
  centralHeader.writeUInt16LE(0, 32); // comment
  centralHeader.writeUInt16LE(0, 34); // disk start
  centralHeader.writeUInt16LE(0, 36); // internal attrs
  centralHeader.writeUInt32LE(0, 38); // external attrs
  centralHeader.writeUInt32LE(0, 42); // local header offset
  nameBuffer.copy(centralHeader, 46);

  // End of central directory
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // central dir disk
  endRecord.writeUInt16LE(1, 8); // entries on disk
  endRecord.writeUInt16LE(1, 10); // total entries
  endRecord.writeUInt32LE(centralHeader.length, 12); // central dir size
  endRecord.writeUInt32LE(centralOffset, 16); // central dir offset
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localHeader, data, centralHeader, endRecord]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
