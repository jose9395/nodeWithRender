const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require('sharp');
require('dotenv').config();
const app = express();
const port =process.env.PORT || 3000; // You can use any port
const upload = multer();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.post('/process-images', upload.array('pictures', 4), async (req, res) => {
    const files = req.files;

    try {
        const imageParts = await Promise.all(files.map(file => fileToGenerativePart(file.buffer, file.mimetype)));

        const filteredImageParts = imageParts.filter(part => part !== null);

        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const prompt = "Given an image of a box with a visible front face featuring a marked square rectangle measuring 2 cm by 2 cm, use this square as a reference to determine the box's dimensions. Measure the length and breadth, which are the sides of the front face, and the depth, which is perpendicular to the front face. Provide the box's dimensions in the format: length * breadth * depth, using the square for scale.";

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = await response.text();
        console.log(text);
        res.send(text);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error processing images");
    }

    // Cleanup: No need to delete files when processing buffers in-memory

});

async function fileToGenerativePart(buffer, originalMimeType) {
    const acceptedMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
    let mimeType = acceptedMimeTypes.includes(originalMimeType) ? originalMimeType : "image/jpeg";

    try {
        const imageBuffer = await sharp(buffer)
            .toFormat('jpeg', { quality: 90 })
            .toBuffer();

        return {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: "image/jpeg",
            },
        };
    } catch (error) {
        console.error("Error processing file:", error);
        return null;
    }
}

app.listen( port, () => console.log(`Server running on port ${port}`));