import Busboy from "busboy";

export const config = {
  api: {
    bodyParser: false
  }
};

const MODEL = "gpt-image-2";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 5000;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp"
];

const REALISM_INSTRUCTIONS = `
Create a visually polished, high-quality image.
Use natural lighting, realistic shadows, accurate proportions,
detailed textures, believable materials and balanced colors.
Avoid unnecessary artificial smoothing and distorted details.
Follow the user's requested composition, subject and visual style.
Preserve important details from reference images when editing.
`;

const SIZE_MAP = {
  "1K": {
    "1:1": "1024x1024",
    "16:9": "1536x864",
    "9:16": "864x1536",
    "4:3": "1152x864",
    "3:4": "864x1152"
  },

  "2K": {
    "1:1": "2048x2048",
    "16:9": "2560x1440",
    "9:16": "1440x2560",
    "4:3": "2048x1536",
    "3:4": "1536x2048"
  },

  "4K": {
    "1:1": "2880x2880",
    "16:9": "3840x2160",
    "9:16": "2160x3840",
    "4:3": "3264x2448",
    "3:4": "2448x3264"
  }
};

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {

    let bb;

    try {
      bb = Busboy({
        headers: req.headers,
        limits: {
          files: MAX_IMAGES,
          fileSize: MAX_FILE_SIZE,
          fields: 10
        }
      });
    } catch (error) {
      reject(new Error("Invalid multipart request."));
      return;
    }

    const fields = {};
    const files = [];

    let failed = false;

    function fail(message) {
      if (failed) return;
      failed = true;
      reject(new Error(message));
    }

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (fieldName, stream, info) => {

      const chunks = [];
      let fileSize = 0;
      let tooLarge = false;

      stream.on("limit", () => {
        tooLarge = true;
      });

      stream.on("data", chunk => {
        fileSize += chunk.length;
        chunks.push(chunk);
      });

      stream.on("end", () => {

        if (tooLarge || fileSize > MAX_FILE_SIZE) {
          fail("Each image must be smaller than 15 MB.");
          return;
        }

        if (files.length >= MAX_IMAGES) {
          fail("Maximum 3 images are allowed.");
          return;
        }

        if (!ALLOWED_TYPES.includes(info.mimeType)) {
          fail("Only PNG, JPG and WEBP images are accepted.");
          return;
        }

        files.push({
          fieldName,
          filename: info.filename || `reference-${files.length + 1}`,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks)
        });
      });
    });

    bb.on("filesLimit", () => {
      fail("Maximum 3 images are allowed.");
    });

    bb.on("error", () => {
      fail("Could not read uploaded files.");
    });

    bb.on("close", () => {
      if (!failed) {
        resolve({ fields, files });
      }
    });

    req.on("error", () => {
      fail("Request stream failed.");
    });

    req.pipe(bb);
  });
}

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      error: "Only POST requests are allowed."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(res, 500, {
      success: false,
      error: "OPENAI_API_KEY is not configured on the server."
    });
  }

  try {

    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return sendJson(res, 400, {
        success: false,
        error: "Please send a multipart/form-data request."
      });
    }

    const { fields, files } = await parseMultipart(req);

    const prompt = String(fields.prompt || "").trim();
    const ratio = String(fields.ratio || "1:1");
    const resolution = String(fields.resolution || "1K");
    const quality = String(fields.quality || "medium");

    if (!prompt) {
      return sendJson(res, 400, {
        success: false,
        error: "Please enter an image prompt."
      });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return sendJson(res, 400, {
        success: false,
        error: "Prompt exceeds the maximum length."
      });
    }

    if (!SIZE_MAP[resolution] || !SIZE_MAP[resolution][ratio]) {
      return sendJson(res, 400, {
        success: false,
        error: "Invalid image size or aspect ratio."
      });
    }

    if (!["low", "medium", "high"].includes(quality)) {
      return sendJson(res, 400, {
        success: false,
        error: "Invalid quality setting."
      });
    }

    if (files.length > MAX_IMAGES) {
      return sendJson(res, 400, {
        success: false,
        error: "Maximum 3 images are allowed."
      });
    }

    const size = SIZE_MAP[resolution][ratio];

    const finalPrompt =
      REALISM_INSTRUCTIONS +
      "\n\nUSER IMAGE INSTRUCTIONS:\n" +
      prompt;

    const form = new FormData();

    form.append("model", MODEL);
    form.append("prompt", finalPrompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    form.append("output_format", "png");

    let endpoint;

    if (files.length > 0) {

      endpoint = "https://api.openai.com/v1/images/edits";

      for (let i = 0; i < files.length; i++) {

        const file = files[i];

        const blob = new Blob(
          [new Uint8Array(file.buffer)],
          { type: file.mimeType }
        );

        form.append(
          "image[]",
          blob,
          file.filename
        );
      }

    } else {

      endpoint = "https://api.openai.com/v1/images/generations";
    }

    const openaiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const result = await openaiResponse.json();

    if (!openaiResponse.ok) {

      console.error("OpenAI API error:", result);

      return sendJson(res, openaiResponse.status, {
        success: false,
        error:
          result?.error?.message ||
          "Image generation provider returned an error."
      });
    }

    const image = result?.data?.[0]?.b64_json;

    if (!image) {
      return sendJson(res, 502, {
        success: false,
        error: "Image provider did not return image data."
      });
    }

    return sendJson(res, 200, {
      success: true,
      image,
      mimeType: "image/png",
      model: MODEL,
      size,
      quality,
      referenceCount: files.length
    });

  } catch (error) {

    console.error("Image API error:", error);

    return sendJson(res, 500, {
      success: false,
      error: error.message || "Internal server error."
    });
  }
}
