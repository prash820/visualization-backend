import logging
from fastapi import FastAPI, Request
from deploy import deploy_terraform, destroy_terraform, get_terraform_outputs, get_terraform_state

app = FastAPI()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "terraform-runner"}

@app.post("/deploy")
async def deploy(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    logger.info(f"📦 [DEPLOY] Received deploy request for project: {project_id}")

    try:
        result = deploy_terraform(project_id)
        logger.info(f"📝 [DEPLOY] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [DEPLOY] Deployment failed")
        return {"error": "Terraform failed", "logs": str(e)}

@app.post("/destroy")
async def destroy(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    logger.info(f"🗑️ [DESTROY] Received destroy request for project: {project_id}")

    try:
        result = destroy_terraform(project_id)
        logger.info(f"📝 [DESTROY] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [DESTROY] Destruction failed")
        return {"error": "Terraform destroy failed", "logs": str(e)}

@app.post("/outputs")
async def outputs(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    logger.info(f"📊 [OUTPUTS] Received outputs request for project: {project_id}")

    try:
        result = get_terraform_outputs(project_id)
        logger.info(f"📝 [OUTPUTS] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [OUTPUTS] Getting outputs failed")
        return {"error": "Failed to get outputs", "logs": str(e)}

@app.post("/state")
async def state(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    logger.info(f"📋 [STATE] Received state request for project: {project_id}")

    try:
        result = get_terraform_state(project_id)
        logger.info(f"📝 [STATE] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [STATE] Getting state failed")
        return {"error": "Failed to get state", "logs": str(e)}
