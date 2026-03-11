const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const os = require("os");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Loads local .env if you test locally, but Railway will prioritize its own variables
dotenv.config();

const app = express();

// Enable CORS so your Netlify/GitHub Pages frontend can communicate with this backend
app.use(cors());
app.use(express.json());

/* File Upload Setup - using OS temp directory to prevent cloud storage issues */
const upload = multer({ dest: os.tmpdir() });

// --- CRITICAL CHECK FOR RAILWAY ---
// If the variable isn't set properly in Railway, the app will fail loudly right here.
if (!process.env.GEMINI_API_KEY) {
  console.error("🚨 FATAL ERROR: GEMINI_API_KEY is missing from environment variables!");
  process.exit(1); 
}

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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    
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
    
    // Specific error handling to give you clues on the frontend
    if (error.message && error.message.includes("API_KEY_INVALID")) {
      res.status(400).json({ result: "API Key is invalid. Please check the Railway variables." });
    } else if (error.status === 429) {
      res.status(429).json({ result: "Quota exceeded. Please wait and try again." });
    } else if (error.status === 403) {
      res.status(403).json({ result: "API Key is restricted or leaked. Generate a new one." });
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