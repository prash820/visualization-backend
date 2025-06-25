import logging
import os
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
    user_id = data.get("userId")  # Optional for STS assume role
    logger.info(f"📦 [DEPLOY] Received deploy request for project: {project_id}, user: {user_id}")

    try:
        result = deploy_terraform(project_id, user_id)
        logger.info(f"📝 [DEPLOY] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [DEPLOY] Deployment failed")
        return {"error": "Terraform failed", "logs": str(e)}

@app.post("/destroy")
async def destroy(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    user_id = data.get("userId")  # Optional for STS assume role
    logger.info(f"🗑️ [DESTROY] Received destroy request for project: {project_id}, user: {user_id}")

    try:
        result = destroy_terraform(project_id, user_id)
        logger.info(f"📝 [DESTROY] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [DESTROY] Destruction failed")
        return {"error": "Terraform destroy failed", "logs": str(e)}

@app.post("/outputs")
async def outputs(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    user_id = data.get("userId")  # Optional for STS assume role
    logger.info(f"📊 [OUTPUTS] Received outputs request for project: {project_id}, user: {user_id}")

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
    user_id = data.get("userId")  # Optional for STS assume role
    logger.info(f"📋 [STATE] Received state request for project: {project_id}, user: {user_id}")

    try:
        result = get_terraform_state(project_id)
        logger.info(f"📝 [STATE] Result: {result['status']}")
        return result
    except Exception as e:
        logger.exception("❌ [STATE] Getting state failed")
        return {"error": "Failed to get state", "logs": str(e)}

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable (Heroku sets this)
    port = int(os.environ.get("TERRAFORM_PORT", 8000))
    
    logger.info(f"🚀 Starting Terraform FastAPI service on port {port}")
    
    # Run the server
    uvicorn.run(
        app, 
        host="0.0.0.0",  # Bind to all interfaces for Heroku
        port=port,
        log_level="info"
    )
