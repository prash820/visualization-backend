import { Request, Response } from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const saveIaCToFile = (projectId: string, iacCode: string): string => {
    console.log("Saving IAC to file");
  const workspaceDir = path.join(__dirname, "../../terraform-runner/workspaces", projectId);
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  const filePath = path.join(workspaceDir, "main.tf");
  fs.writeFileSync(filePath, iacCode);
  return workspaceDir;
};

// ✅ Export this function
export const deployInfrastructure = async (req: Request, res: Response) => {
  const { projectId, iacCode } = req.body;

  if (!projectId || !iacCode) {
    return res.status(400).json({ error: "Missing projectId or iacCode." });
  }

  try {
    saveIaCToFile(projectId, iacCode);

    const response = await fetch("http://localhost:8000/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    const result = await response.json();

    if (result.status === "success") {
      return res.status(200).json({ message: "Deployment successful", logs: result.stdout });
    } else {
      return res.status(500).json({ error: "Terraform failed", logs: result.stderr });
    }
  } catch (error) {
    console.error("Deployment error:", error);
    return res.status(500).json({ error: "Deployment failed." });
  }
};
