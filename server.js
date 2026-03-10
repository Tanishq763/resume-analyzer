const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const os = require("os"); // Added to find the system's temp directory
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();

// Enable CORS so your Netlify frontend can talk to this Render backend
app.use(cors());
app.use(express.json());

// REMOVED: app.use(express.static("public")); <- We don't need this anymore!

/* File Upload Setup - using OS temp directory for Render compatibility */
const upload = multer({ dest: os.tmpdir() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/analyze", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ result: "Please upload a resume PDF" });
  }

  try {
    const jobDescription = req.body.jobDescription || "Not provided";
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const resumeText = pdfData.text.slice(0, 8000);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using the latest model
    
    const prompt = `
      Act as an ATS expert. Analyze the following resume against the job description.
      Provide: ATS Score (0-100), Strengths, Missing Skills, and Improvement Tips.
      
      Resume: ${resumeText}
      Job Description: ${jobDescription}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ result: text });
  } catch (error) {
    console.error("Analysis Error:", error);
    if (error.status === 429) {
      res.status(429).json({ result: "Quota exceeded. Please wait and try again." });
    } else {
      res.status(500).json({ result: "Internal Server Error during analysis." });
    }
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));