import os
import logging
import time
import json
import subprocess
import boto3
from python_terraform import Terraform
from dotenv import load_dotenv
from botocore.exceptions import ClientError


# ✅ Load .env variables into os.environ
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AWSCredentialManager:
    """Python implementation of the STS assume role credential manager"""
    
    def __init__(self):
        self.cached_credentials = {}
        self.sts_client = None
        
    def _get_sts_client(self):
        """Initialize STS client if not already done"""
        if self.sts_client is None:
            # Use default credentials (from environment) to create STS client
            self.sts_client = boto3.client('sts', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        return self.sts_client
    
    def get_credentials_for_user(self, user_id, project_id):
        """Get temporary credentials for a specific user/project using STS assume role"""
        cache_key = f"{user_id}-{project_id}"
        
        # Check cache first (with expiration)
        if cache_key in self.cached_credentials:
            cached = self.cached_credentials[cache_key]
            if cached['expiration'] > time.time():
                logger.info(f"[AWS] Using cached credentials for user {user_id}, project {project_id}")
                return cached['credentials']
            else:
                # Remove expired credentials
                del self.cached_credentials[cache_key]
        
        try:
            logger.info(f"[AWS] Assuming role for user {user_id}, project {project_id}")
            
            # Validate required environment variables
            role_arn = os.getenv('AWS_ROLE_ARN')
            external_id = os.getenv('AWS_EXTERNAL_ID')
            
            if not role_arn:
                raise ValueError("AWS_ROLE_ARN environment variable is required for STS assume role")
            
            if not external_id:
                raise ValueError("AWS_EXTERNAL_ID environment variable is required for STS assume role")
            
            # Assume role with user-specific session
            sts_client = self._get_sts_client()
            response = sts_client.assume_role(
                RoleArn=role_arn,
                RoleSessionName=f"chart-app-{user_id}-{project_id}",
                ExternalId=external_id,
                DurationSeconds=3600,  # 1 hour
                Tags=[
                    {'Key': 'UserId', 'Value': user_id},
                    {'Key': 'ProjectId', 'Value': project_id},
                    {'Key': 'ManagedBy', 'Value': 'chart-app-platform'},
                    {'Key': 'Environment', 'Value': os.getenv('NODE_ENV', 'development')},
                    {'Key': 'CreatedAt', 'Value': time.strftime('%Y-%m-%dT%H:%M:%SZ')}
                ]
            )
            
            if 'Credentials' not in response:
                raise ValueError("Failed to assume AWS role - no credentials returned")
            
            credentials = {
                'aws_access_key_id': response['Credentials']['AccessKeyId'],
                'aws_secret_access_key': response['Credentials']['SecretAccessKey'],
                'aws_session_token': response['Credentials']['SessionToken']
            }
            
            # Cache credentials (expire 10 minutes before actual expiration for safety)
            expiration_time = response['Credentials']['Expiration'].timestamp() - (10 * 60)
            
            self.cached_credentials[cache_key] = {
                'credentials': credentials,
                'expiration': expiration_time
            }
            
            logger.info(f"[AWS] Successfully assumed role for user {user_id}, expires at {time.ctime(expiration_time)}")
            return credentials
            
        except Exception as e:
            logger.error(f"[AWS] Failed to assume role for user {user_id}: {e}")
            raise Exception(f"AWS role assumption failed: {str(e)}")
    
    def get_credentials(self, user_id=None, project_id=None):
        """
        Get AWS credentials with fallback for local development.
        Supports both direct credentials and IAM role assumption.
        """
        # Check if we should use direct credentials
        has_direct_credentials = os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_SECRET_ACCESS_KEY')
        has_role_config = os.getenv('AWS_ROLE_ARN') and os.getenv('AWS_EXTERNAL_ID')
        
        # Log the credential approach being used
        if has_direct_credentials and not has_role_config:
            logger.info("[AWS] Using direct AWS credentials (Access Key/Secret)")
            return {
                'aws_access_key_id': os.getenv('AWS_ACCESS_KEY_ID'),
                'aws_secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY'),
                'aws_session_token': os.getenv('AWS_SESSION_TOKEN')  # Optional
            }
        
        # If we have role configuration, use role assumption
        if has_role_config:
            if not user_id or not project_id:
                if os.getenv('NODE_ENV') == 'production':
                    raise ValueError("user_id and project_id are required for IAM role assumption in production")
                # In development, we can proceed without user context for testing
                logger.info("[AWS] Warning: Using role assumption without user context (development only)")
                return self.get_credentials_for_user('dev-user', 'dev-project')
            
            logger.info(f"[AWS] Using IAM role assumption for user {user_id}, project {project_id}")
            return self.get_credentials_for_user(user_id, project_id)
        
        # If we have both, prefer role assumption in production
        if has_direct_credentials and has_role_config:
            if os.getenv('NODE_ENV') == 'production':
                logger.info("[AWS] Both credential types available, using IAM role assumption for production")
                if not user_id or not project_id:
                    raise ValueError("user_id and project_id are required for IAM role assumption in production")
                return self.get_credentials_for_user(user_id, project_id)
            else:
                logger.info("[AWS] Both credential types available, using direct credentials for development")
                return {
                    'aws_access_key_id': os.getenv('AWS_ACCESS_KEY_ID'),
                    'aws_secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY'),
                    'aws_session_token': os.getenv('AWS_SESSION_TOKEN')
                }
        
        # No valid credentials found
        raise ValueError(
            "No valid AWS credentials found. Please set either:\n"
            "1. Direct credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n"
            "2. Role assumption: AWS_ROLE_ARN and AWS_EXTERNAL_ID"
        )

# Global credential manager instance
aws_credential_manager = AWSCredentialManager()

def deploy_terraform(project_id, user_id=None):
    # Find terraform binary location
    script_dir = os.path.dirname(__file__)
    terraform_bin_path = os.path.join(script_dir, "..", "bin", "terraform")
    
    # Ensure Terraform binary is accessible
    if os.path.exists(terraform_bin_path):
        logger.info(f"[DEPLOY] Found Terraform binary at: {terraform_bin_path}")
        # Add the bin directory to PATH
        bin_dir = os.path.dirname(terraform_bin_path)
        if bin_dir not in os.environ.get('PATH', ''):
            os.environ['PATH'] = bin_dir + ':' + os.environ.get('PATH', '')
            logger.info(f"[DEPLOY] Updated PATH: {os.environ['PATH']}")
    else:
        logger.warning(f"[DEPLOY] Terraform binary not found at: {terraform_bin_path}")
        logger.info(f"[DEPLOY] Falling back to system PATH")
    
    workspace_dir = os.path.join(os.path.dirname(__file__), "workspace", project_id)
    logger.info(f"[DEPLOY] Using workspace directory: {workspace_dir}")
    if not os.path.exists(workspace_dir):
        os.makedirs(workspace_dir)
        logger.info(f"[DEPLOY] Created workspace directory: {workspace_dir}")
    else:
        logger.info(f"[DEPLOY] Using existing workspace directory: {workspace_dir}")
    
    # Get AWS credentials using the credential manager
    try:
        credentials = aws_credential_manager.get_credentials(user_id, project_id)
        logger.info("[DEPLOY] Successfully obtained AWS credentials")
        
        # Set AWS credentials in environment for Terraform
        for key, value in credentials.items():
            if value:  # Only set non-None values
                os.environ[key.upper()] = value
                
    except Exception as e:
        logger.error(f"[DEPLOY] Failed to get AWS credentials: {e}")
        return {"status": "error", "logs": str(e), "error": "Failed to get AWS credentials"}
    
    print("Deploying to AWS region:", os.getenv("AWS_DEFAULT_REGION", os.getenv("AWS_REGION", "us-east-1")))
    logger.info("[DEPLOY] Using AWS credentials from credential manager")
    os.environ["TF_LOG"] = "INFO"
    state_file = os.path.join(workspace_dir, "terraform.tfstate")
    if os.path.exists(state_file) and os.stat(state_file).st_size == 0:
        os.remove(state_file)
        logger.info(f"[DEPLOY] Removed empty state file: {state_file}")
    tf = Terraform(working_dir=workspace_dir)
    logger.info("[DEPLOY] Running terraform init...")
    
    # Test if terraform binary is accessible
    try:
        result = subprocess.run(["terraform", "version"], capture_output=True, text=True, timeout=10)
        logger.info(f"[DEPLOY] Terraform version check: {result.stdout}")
        if result.returncode != 0:
            logger.error(f"[DEPLOY] Terraform version check failed: {result.stderr}")
    except Exception as e:
        logger.error(f"[DEPLOY] Terraform binary test failed: {e}")
    
    init_return_code, init_stdout, init_stderr = tf.init(upgrade=True)
    logger.info(f"[DEPLOY] Init stdout:\n{init_stdout}")
    logger.info(f"[DEPLOY] Init stderr:\n{init_stderr}")
    if init_return_code != 0:
        logger.error("[DEPLOY] Terraform init failed")
        return {"status": "error", "logs": init_stderr, "error": "Terraform init failed"}
    logger.info("[DEPLOY] Running terraform apply...")
    return_code, stdout, stderr = tf.apply(skip_plan=True, capture_output=True)
    logger.info(f"[DEPLOY] Apply stdout:\n{stdout}")
    logger.info(f"[DEPLOY] Apply stderr:\n{stderr}")
    if return_code == 0:
        logger.info("[DEPLOY] Terraform apply succeeded")
    else:
        logger.error("[DEPLOY] Terraform apply failed")
    return {"status": "success" if return_code == 0 else "error", "stdout": stdout, "stderr": stderr}

def get_aws_clients(user_id=None, project_id=None):
    """Initialize AWS clients with proper error handling"""
    try:
        credentials = aws_credential_manager.get_credentials(user_id, project_id)
        session = boto3.Session(
            aws_access_key_id=credentials['aws_access_key_id'],
            aws_secret_access_key=credentials['aws_secret_access_key'],
            aws_session_token=credentials.get('aws_session_token'),
            region_name=os.getenv('AWS_DEFAULT_REGION', os.getenv('AWS_REGION', 'us-east-1'))
        )
        
        return {
            's3': session.client('s3'),
            'lambda': session.client('lambda'),
            'apigateway': session.client('apigateway'),
            'apigatewayv2': session.client('apigatewayv2'),
            'dynamodb': session.client('dynamodb'),
            'iam': session.client('iam')
        }
    except Exception as e:
        logger.warning(f"⚠️ Could not initialize AWS clients: {e}")
        return None

def extract_resources_from_state(state_data):
    """Extract AWS resource information from Terraform state"""
    resources = {
        's3_buckets': [],
        'lambda_functions': [],
        'api_gateways': [],
        'dynamodb_tables': [],
        'iam_roles': []
    }
    
    if not state_data or 'resources' not in state_data:
        return resources
    
    for resource in state_data['resources']:
        resource_type = resource.get('type', '')
        instances = resource.get('instances', [])
        
        for instance in instances:
            attributes = instance.get('attributes', {})
            
            if resource_type == 'aws_s3_bucket':
                bucket_name = attributes.get('bucket')
                if bucket_name:
                    resources['s3_buckets'].append({
                        'name': bucket_name,
                        'arn': attributes.get('arn'),
                        'region': attributes.get('region')
                    })
            
            elif resource_type == 'aws_lambda_function':
                function_name = attributes.get('function_name')
                if function_name:
                    resources['lambda_functions'].append({
                        'name': function_name,
                        'arn': attributes.get('arn'),
                        'role': attributes.get('role')
                    })
            
            elif resource_type in ['aws_api_gateway_rest_api', 'aws_apigatewayv2_api']:
                api_id = attributes.get('id')
                if api_id:
                    resources['api_gateways'].append({
                        'id': api_id,
                        'name': attributes.get('name'),
                        'type': 'v1' if resource_type == 'aws_api_gateway_rest_api' else 'v2'
                    })
            
            elif resource_type == 'aws_dynamodb_table':
                table_name = attributes.get('name')
                if table_name:
                    resources['dynamodb_tables'].append({
                        'name': table_name,
                        'arn': attributes.get('arn')
                    })
            
            elif resource_type == 'aws_iam_role':
                role_name = attributes.get('name')
                if role_name:
                    resources['iam_roles'].append({
                        'name': role_name,
                        'arn': attributes.get('arn')
                    })
    
    return resources

def cleanup_s3_buckets(s3_client, buckets):
    """Completely empty and prepare S3 buckets for deletion"""
    cleanup_logs = []
    
    for bucket in buckets:
        bucket_name = bucket['name']
        try:
            logger.info(f"🧹 Cleaning up S3 bucket: {bucket_name}")
            
            # Check if bucket exists
            try:
                s3_client.head_bucket(Bucket=bucket_name)
            except s3_client.exceptions.NoSuchBucket:
                logger.info(f"✅ Bucket {bucket_name} already deleted")
                cleanup_logs.append(f"Bucket {bucket_name}: Already deleted")
                continue
            except Exception as e:
                logger.warning(f"⚠️ Cannot access bucket {bucket_name}: {e}")
                cleanup_logs.append(f"Bucket {bucket_name}: Access error - {e}")
                continue
            
            # Remove all objects
            try:
                paginator = s3_client.get_paginator('list_objects_v2')
                pages = paginator.paginate(Bucket=bucket_name)
                
                objects_deleted = 0
                for page in pages:
                    if 'Contents' in page:
                        objects = [{'Key': obj['Key']} for obj in page['Contents']]
                        if objects:
                            s3_client.delete_objects(
                                Bucket=bucket_name,
                                Delete={'Objects': objects}
                            )
                            objects_deleted += len(objects)
                
                if objects_deleted > 0:
                    logger.info(f"🗑️ Deleted {objects_deleted} objects from {bucket_name}")
                    cleanup_logs.append(f"Bucket {bucket_name}: Deleted {objects_deleted} objects")
                
            except Exception as e:
                logger.warning(f"⚠️ Error deleting objects from {bucket_name}: {e}")
                cleanup_logs.append(f"Bucket {bucket_name}: Error deleting objects - {e}")
            
            # Remove all object versions and delete markers
            try:
                paginator = s3_client.get_paginator('list_object_versions')
                pages = paginator.paginate(Bucket=bucket_name)
                
                versions_deleted = 0
                for page in pages:
                    # Delete versions
                    if 'Versions' in page:
                        versions = [{'Key': v['Key'], 'VersionId': v['VersionId']} 
                                  for v in page['Versions']]
                        if versions:
                            s3_client.delete_objects(
                                Bucket=bucket_name,
                                Delete={'Objects': versions}
                            )
                            versions_deleted += len(versions)
                    
                    # Delete delete markers
                    if 'DeleteMarkers' in page:
                        markers = [{'Key': m['Key'], 'VersionId': m['VersionId']} 
                                 for m in page['DeleteMarkers']]
                        if markers:
                            s3_client.delete_objects(
                                Bucket=bucket_name,
                                Delete={'Objects': markers}
                            )
                            versions_deleted += len(markers)
                
                if versions_deleted > 0:
                    logger.info(f"🗑️ Deleted {versions_deleted} versions/markers from {bucket_name}")
                    cleanup_logs.append(f"Bucket {bucket_name}: Deleted {versions_deleted} versions/markers")
                
            except Exception as e:
                logger.warning(f"⚠️ Error deleting versions from {bucket_name}: {e}")
                cleanup_logs.append(f"Bucket {bucket_name}: Error deleting versions - {e}")
            
            logger.info(f"✅ S3 bucket {bucket_name} cleaned and ready for deletion")
            cleanup_logs.append(f"Bucket {bucket_name}: Successfully cleaned")
            
        except Exception as e:
            logger.error(f"❌ Failed to clean bucket {bucket_name}: {e}")
            cleanup_logs.append(f"Bucket {bucket_name}: Cleanup failed - {e}")
    
    return cleanup_logs

def cleanup_lambda_functions(lambda_client, functions):
    """Clean up Lambda functions and associated resources"""
    cleanup_logs = []
    
    for function in functions:
        function_name = function['name']
        try:
            logger.info(f"🔧 Preparing Lambda function for deletion: {function_name}")
            
            # Remove event source mappings
            try:
                mappings = lambda_client.list_event_source_mappings(FunctionName=function_name)
                for mapping in mappings.get('EventSourceMappings', []):
                    lambda_client.delete_event_source_mapping(UUID=mapping['UUID'])
                    logger.info(f"🗑️ Removed event source mapping: {mapping['UUID']}")
            except Exception as e:
                logger.warning(f"⚠️ Error removing event source mappings: {e}")
            
            cleanup_logs.append(f"Lambda {function_name}: Prepared for deletion")
            
        except lambda_client.exceptions.ResourceNotFoundException:
            logger.info(f"✅ Lambda function {function_name} already deleted")
            cleanup_logs.append(f"Lambda {function_name}: Already deleted")
        except Exception as e:
            logger.warning(f"⚠️ Error preparing Lambda {function_name}: {e}")
            cleanup_logs.append(f"Lambda {function_name}: Preparation warning - {e}")
    
    return cleanup_logs

def cleanup_api_gateways(apigateway_client, apigatewayv2_client, gateways):
    """Clean up API Gateway resources"""
    cleanup_logs = []
    
    for gateway in gateways:
        gateway_id = gateway['id']
        gateway_type = gateway['type']
        
        try:
            logger.info(f"🌐 Preparing API Gateway for deletion: {gateway_id} (type: {gateway_type})")
            
            client = apigateway_client if gateway_type == 'v1' else apigatewayv2_client
            
            if gateway_type == 'v1':
                try:
                    client.get_rest_api(restApiId=gateway_id)
                    cleanup_logs.append(f"API Gateway v1 {gateway_id}: Ready for deletion")
                except client.exceptions.NotFoundException:
                    cleanup_logs.append(f"API Gateway v1 {gateway_id}: Already deleted")
            else:
                try:
                    client.get_api(ApiId=gateway_id)
                    cleanup_logs.append(f"API Gateway v2 {gateway_id}: Ready for deletion")
                except client.exceptions.NotFoundException:
                    cleanup_logs.append(f"API Gateway v2 {gateway_id}: Already deleted")
            
        except Exception as e:
            logger.warning(f"⚠️ Error checking API Gateway {gateway_id}: {e}")
            cleanup_logs.append(f"API Gateway {gateway_id}: Check warning - {e}")
    
    return cleanup_logs

def destroy_terraform_with_cleanup(project_id, user_id=None):
    """
    Destroy Terraform infrastructure with comprehensive cleanup.
    This function handles AWS resource cleanup before running terraform destroy.
    """
    # Find terraform binary location
    script_dir = os.path.dirname(__file__)
    terraform_bin_path = os.path.join(script_dir, "..", "bin", "terraform")
    
    # Ensure Terraform binary is accessible
    if os.path.exists(terraform_bin_path):
        logger.info(f"[DESTROY] Found Terraform binary at: {terraform_bin_path}")
        # Add the bin directory to PATH
        bin_dir = os.path.dirname(terraform_bin_path)
        if bin_dir not in os.environ.get('PATH', ''):
            os.environ['PATH'] = bin_dir + ':' + os.environ.get('PATH', '')
            logger.info(f"[DESTROY] Updated PATH: {os.environ['PATH']}")
    else:
        logger.warning(f"[DESTROY] Terraform binary not found at: {terraform_bin_path}")
        logger.info(f"[DESTROY] Falling back to system PATH")
    
    workspace_dir = os.path.join(os.path.dirname(__file__), "workspace", project_id)
    logger.info(f"🗑️ [DESTROY] Starting infrastructure destruction for project: {project_id}")
    logger.info(f"🗑️ [DESTROY] Using workspace directory: {workspace_dir}")
    
    cleanup_logs = []

    if not os.path.exists(workspace_dir):
        logger.warning(f"📁 Workspace directory does not exist: {workspace_dir}")
        return {
            "status": "success",
            "stdout": "No infrastructure to destroy - workspace does not exist",
            "stderr": "",
            "cleanup_logs": []
        }

    logger.info(f"🗑️ Starting enhanced destroy for project: {project_id}")
    
    # Get AWS credentials using the credential manager
    try:
        credentials = aws_credential_manager.get_credentials(user_id, project_id)
        logger.info("🔐 [DESTROY] Successfully obtained AWS credentials")
        
        # Set AWS credentials in environment for Terraform
        for key, value in credentials.items():
            if value:  # Only set non-None values
                os.environ[key.upper()] = value
                
    except Exception as e:
        logger.error(f"[DESTROY] Failed to get AWS credentials: {e}")
        cleanup_logs.append(f"Warning: Could not get AWS credentials - {e}")

    # Enable Terraform debug logs
    os.environ["TF_LOG"] = "INFO"

    # Check if state exists
    state_file = os.path.join(workspace_dir, "terraform.tfstate")
    if not os.path.exists(state_file) or os.stat(state_file).st_size == 0:
        logger.info("📁 No Terraform state found - nothing to destroy")
        return {
            "status": "success",
            "stdout": "No infrastructure to destroy - no state found",
            "stderr": "",
            "cleanup_logs": []
        }

    aws_clients = get_aws_clients(user_id, project_id)
    
    # Step 1: Read Terraform state and extract resources
    try:
        with open(state_file, 'r') as f:
            state_data = json.load(f)
        
        resources = extract_resources_from_state(state_data)
        logger.info(f"📋 Found resources to clean: S3({len(resources['s3_buckets'])}), Lambda({len(resources['lambda_functions'])}), API Gateway({len(resources['api_gateways'])}), DynamoDB({len(resources['dynamodb_tables'])})")
        
        # Step 2: Pre-cleanup AWS resources if clients available
        if aws_clients:
            logger.info("🧹 Starting pre-cleanup of AWS resources...")
            
            # Clean S3 buckets first (most common failure point)
            if resources['s3_buckets']:
                s3_logs = cleanup_s3_buckets(aws_clients['s3'], resources['s3_buckets'])
                cleanup_logs.extend(s3_logs)
            
            # Prepare Lambda functions
            if resources['lambda_functions']:
                lambda_logs = cleanup_lambda_functions(aws_clients['lambda'], resources['lambda_functions'])
                cleanup_logs.extend(lambda_logs)
            
            # Prepare API Gateways
            if resources['api_gateways']:
                api_logs = cleanup_api_gateways(aws_clients['apigateway'], aws_clients['apigatewayv2'], resources['api_gateways'])
                cleanup_logs.extend(api_logs)
            
            logger.info("✅ Pre-cleanup completed")
        else:
            logger.warning("⚠️ AWS clients not available - skipping pre-cleanup")
            cleanup_logs.append("Warning: AWS clients not available for pre-cleanup")
    
    except Exception as e:
        logger.warning(f"⚠️ Error during pre-cleanup: {e}")
        cleanup_logs.append(f"Pre-cleanup error: {e}")

    # Step 3: Run Terraform destroy
    logger.info("🗑️ Running terraform destroy...")
    
    try:
        result = subprocess.run(
            ["terraform", "destroy", "-auto-approve", "-no-color", "-input=false"],
            cwd=workspace_dir,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        return_code = result.returncode
        stdout = result.stdout
        stderr = result.stderr
        
        # If destroy failed, try one more time with refresh
        if return_code != 0 and "BucketNotEmpty" not in stderr:
            logger.info("🔄 First destroy attempt failed, trying with refresh...")
            time.sleep(5)  # Wait a bit
            
            # Try refresh first
            subprocess.run(
                ["terraform", "refresh"],
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            # Try destroy again
            result = subprocess.run(
                ["terraform", "destroy", "-auto-approve", "-no-color", "-input=false"],
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                timeout=600
            )
            return_code = result.returncode
            stdout = result.stdout
            stderr = result.stderr
            
            cleanup_logs.append("Performed retry with refresh")
        
    except subprocess.TimeoutExpired:
        return_code = 1
        stdout = ""
        stderr = "Terraform destroy timed out after 10 minutes"
        cleanup_logs.append("Error: Terraform destroy timeout")
    except Exception as e:
        return_code = 1
        stdout = ""
        stderr = f"Error running terraform destroy: {str(e)}"
        cleanup_logs.append(f"Error: Exception during destroy - {e}")

    # Step 4: Log results
    if return_code == 0:
        logger.info("✅ Infrastructure destroy completed successfully")
        cleanup_logs.append("SUCCESS: All infrastructure destroyed")
        
        # Clean up workspace directory
        try:
            import shutil
            shutil.rmtree(workspace_dir)
            logger.info(f"🧹 Cleaned up workspace directory: {workspace_dir}")
            cleanup_logs.append("Workspace directory cleaned up")
        except Exception as e:
            logger.warning(f"⚠️ Could not clean workspace directory: {e}")
            cleanup_logs.append(f"Warning: Workspace cleanup failed - {e}")
    else:
        logger.error("❌ Infrastructure destroy failed")
        cleanup_logs.append(f"FAILED: Terraform destroy failed - {stderr}")

    return {
        "status": "success" if return_code == 0 else "error",
        "stdout": stdout,
        "stderr": stderr,
        "cleanup_logs": cleanup_logs
    }

# Keep the original function name for backward compatibility
def destroy_terraform(project_id, user_id=None):
    """Wrapper function for backward compatibility"""
    return destroy_terraform_with_cleanup(project_id, user_id)

def get_terraform_outputs(project_id):
    workspace_dir = os.path.join(os.path.dirname(__file__), "workspace", project_id)
    
    if not os.path.exists(workspace_dir):
        logger.warning(f"📁 Workspace directory does not exist: {workspace_dir}")
        return {
            "status": "success",
            "outputs": {},
            "message": "Workspace does not exist"
        }

    logger.info(f"📊 Getting Terraform outputs for project: {project_id}")

    state_file = os.path.join(workspace_dir, "terraform.tfstate")
    
    if not os.path.exists(state_file) or os.stat(state_file).st_size == 0:
        logger.info("📁 No Terraform state file found")
        return {
            "status": "success",
            "outputs": {},
            "message": "No state file found"
        }

    try:
        with open(state_file, 'r') as f:
            state_data = json.load(f)
        
        # Extract outputs from state file
        outputs = {}
        if 'outputs' in state_data:
            for key, output_data in state_data['outputs'].items():
                if 'value' in output_data:
                    outputs[key] = output_data['value']
        
        logger.info(f"✅ Retrieved {len(outputs)} outputs from state file")
        return {
            "status": "success",
            "outputs": outputs
        }
            
    except Exception as e:
        logger.error(f"❌ Exception getting outputs: {str(e)}")
        return {
            "status": "error",
            "outputs": {},
            "error": str(e)
        }

def get_terraform_state(project_id):
    workspace_dir = os.path.join(os.path.dirname(__file__), "workspace", project_id)
    
    if not os.path.exists(workspace_dir):
        logger.warning(f"📁 Workspace directory does not exist: {workspace_dir}")
        return {
            "status": "success",
            "state": {},
            "message": "Workspace does not exist"
        }

    state_file = os.path.join(workspace_dir, "terraform.tfstate")
    
    if not os.path.exists(state_file) or os.stat(state_file).st_size == 0:
        logger.info("📁 No Terraform state file found")
        return {
            "status": "success",
            "state": {},
            "message": "No state file found"
        }

    try:
        with open(state_file, 'r') as f:
            state_data = json.load(f)
        
        logger.info(f"✅ Retrieved Terraform state for project: {project_id}")
        return {
            "status": "success",
            "state": state_data
        }
        
    except Exception as e:
        logger.error(f"❌ Error reading state file: {str(e)}")
        return {
            "status": "error",
            "state": {},
            "error": str(e)
        }
