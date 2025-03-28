import os
import logging
import time
from python_terraform import Terraform
from dotenv import load_dotenv


# ✅ Load .env variables into os.environ
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def deploy_terraform(project_id):
    workspace_dir = os.path.join(os.path.dirname(__file__), "workspaces", project_id)
    
    # ✅ Ensure the workspace directory exists
    if not os.path.exists(workspace_dir):
        os.makedirs(workspace_dir)
        logger.info(f"📁 Created workspace directory: {workspace_dir}")
    else:
        logger.info(f"📂 Using existing workspace directory: {workspace_dir}")


    # ✅ Optional: Log what region you're deploying to
    print("Deploying to AWS region:", os.getenv("AWS_DEFAULT_REGION"))
    logger.info("🔐 Using AWS credentials from .env")

    # Enable Terraform debug logs
    os.environ["TF_LOG"] = "INFO"

    state_file = os.path.join(workspace_dir, "terraform.tfstate")
    if os.path.exists(state_file) and os.stat(state_file).st_size == 0:
        os.remove(state_file)  # optional: or rename it for backup

    # ✅ Terraform will automatically pick up these from os.environ
    tf = Terraform(working_dir=workspace_dir)
    logger.info("⚙️ Running terraform init...")

    init_return_code, init_stdout, init_stderr = tf.init(upgrade=True)
    time.sleep(2)  # wait for provider plugin to be ready
    logger.info("🧪 Init stdout:\n%s", init_stdout)
    logger.info("🧪 Init stderr:\n%s", init_stderr)

    if init_return_code != 0:
        logger.error("❌ Terraform init failed")
        return {
            "status": "error",
            "logs": init_stderr,
            "error": "Terraform init failed"
        }

    logger.info("🚀 Running terraform apply...")
    return_code, stdout, stderr = tf.apply(skip_plan=True, capture_output=True)
    
    if return_code == 0:
        logger.info("✅ Terraform apply succeeded")
    else:
        logger.error("❌ Terraform apply failed")

    return {
        "status": "success" if return_code == 0 else "error",
        "stdout": stdout,
        "stderr": stderr
    }
