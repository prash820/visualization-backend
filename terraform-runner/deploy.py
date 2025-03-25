import os
from python_terraform import Terraform


def deploy_terraform(project_id):
    workspace_dir = f"./workspaces/{project_id}"
    
    # Ensure the directory exists, otherwise create it
    if not os.path.exists(workspace_dir):
        os.makedirs(workspace_dir)
    
    tf = Terraform(working_dir=workspace_dir)
    tf.init()
    
    return_code, stdout, stderr = tf.apply(skip_plan=True, capture_output=True)

    return {
        "status": "success" if return_code == 0 else "error",
        "stdout": stdout,
        "stderr": stderr
    }
