import { google } from "googleapis";
import formidable from "formidable";
import fs from "fs";
import { Readable } from "stream";

// Disable default body parsing (Vercel requirement for file upload)
export const config = {
    api: {
        bodyParser: false,
    },
};

const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(400).send("Upload error");

        const file = files.file[0];
        const fileStream = fs.createReadStream(file.filepath);

        try {
            const response = await drive.files.create({
                requestBody: {
                    name: file.originalFilename,
                    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
                },
                media: {
                    mimeType: file.mimetype,
                    body: fileStream,
                },
            });

            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: "reader",
                    type: "anyone",
                },
            });

            const publicUrl = `https://drive.google.com/uc?id=${response.data.id}`;
            res.status(200).json({ fileId: response.data.id, url: publicUrl });
        } catch (e) {
            res.status(500).send("Upload failed");
        }
    });
}
