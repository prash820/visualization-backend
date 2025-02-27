// src/routes/graphviz.ts
import express from "express";
import  { Request, Response,  } from "express";
import asyncHandler from "../utils/asyncHandler"; // or "express-async-handler"
import { spawn } from "child_process";

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { dotCode, outputFormat = "svg" } = req.body;
    if (!dotCode) {
      return res.status(400).json({ error: "dotCode is required" });
    }

    // The result of spawn needs to be handled in events, so we do not truly have an "await" scenario
    // but we can wrap it in a Promise if we want the function to be purely async:

    const svgOrPngBuffer = await new Promise<Buffer>((resolve, reject) => {
      const dot = spawn("dot", [`-T${outputFormat}`]);
      const dataBuffer: Buffer[] = [];
      let errorBuffer = "";

      dot.stdout.on("data", (chunk) => dataBuffer.push(chunk));
      dot.stderr.on("data", (chunk) => (errorBuffer += chunk.toString()));
      dot.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(dataBuffer));
        } else {
          reject(errorBuffer || "Graphviz rendering error");
        }
      });

      dot.stdin.write(dotCode);
      dot.stdin.end();
    });

    if (outputFormat === "svg") {
      res.type("image/svg+xml").send(svgOrPngBuffer);
    } else if (outputFormat === "png") {
      res.type("image/png").send(svgOrPngBuffer);
    } else {
      res.status(400).json({ error: "Unsupported output format" });
    }
  })
);

export default router;
