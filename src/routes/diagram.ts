// src/routes/diagrams.ts
import express from "express";
import type { Request, Response,  } from "express";
import { spawn } from "child_process";
import asyncHandler from "../utils/asyncHandler";


const router = express.Router();

router.post("/", asyncHandler(async (req: Request, res: Response) => {
  try {
    // We expect { code: string } in the request body -> the Python code from the user's project
    const { code } = req.body;
    if (!code) {
    console.log("[diagrams] No 'code' provided in request body.");
      return res.status(400).json({ error: "No Diagrams code provided." });
    }
    
    console.log(`[diagrams] Received code : ${code}`);

    const pyPath = "/Users/prashanthboovaragavan/Documents/visualization/visualization-backend/myvenv/bin/python";
    const python = spawn(pyPath, ["/Users/prashanthboovaragavan/Documents/visualization/visualization-backend/src/routes/diagram_executor.py"]); // Adjust path as needed

    let dataBuffer: Buffer[] = [];
    let errorBuffer = "";

    python.stdout.on("data", (chunk) => dataBuffer.push(chunk));
    python.stderr.on("data", (chunk) => (errorBuffer += chunk.toString()));

    python.on("close", (exitCode) => {
      if (exitCode === 0) {
        const fileBuffer = Buffer.concat(dataBuffer);
        // We'll assume PNG for now. If you want user to specify PNG vs SVG, handle it
        res.type("image/png").send(fileBuffer);
      } else {
        console.error("Diagrams execution error:", errorBuffer);
        res.status(500).json({ error: errorBuffer || "Failed to generate diagram." });
      }
    });

    // Pipe user's code to the python script
    python.stdin.write(code);
    python.stdin.end();
  } catch (error) {
    console.error("Error in /api/render-diagrams route:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}));

export default router;
