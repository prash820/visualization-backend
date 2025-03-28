import logging
from fastapi import FastAPI, Request
from .deploy import deploy_terraform

app = FastAPI()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/deploy")
async def deploy(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    logger.info(f"📦 Received deploy request for project: {project_id}")

    try:
        result = deploy_terraform(project_id)
        logger.info(f"📝 Deployment result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ Deployment failed with exception")
        return {"error": "Terraform failed", "logs": str(e)}
