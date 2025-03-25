from fastapi import FastAPI, Request
from deploy import deploy_terraform

app = FastAPI()

@app.post("/deploy")
async def deploy(request: Request):
    data = await request.json()
    project_id = data.get("projectId")
    result = deploy_terraform(project_id)
    return result
