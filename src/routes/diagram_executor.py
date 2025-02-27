#!/usr/bin/env python3
import sys
import os
import uuid
import re
import subprocess
import json
import yaml

CONFIG_FILE = "/Users/prashanthboovaragavan/Documents/visualization/visualization-backend/src/routes/aws_nodes.json"  # Change to "aws_nodes.yaml" if needed

def load_config(file_path):
    """Load AWS node configuration (JSON/YAML)."""
    if file_path.endswith(".json"):
        with open(file_path, "r") as f:
            return json.load(f)
    elif file_path.endswith(".yaml") or file_path.endswith(".yml"):
        with open(file_path, "r") as f:
            return yaml.safe_load(f)
    return {}

# Load valid AWS services
aws_nodes = load_config(CONFIG_FILE)
print(json.dumps(aws_nodes, indent=2), file=sys.stderr)

def is_valid_aws_node(service, category, aws_services):
    """Check if a given AWS node is valid, considering known aliases."""
    if category in aws_services:
        valid_services = aws_services[category]

        # Direct match
        if service in valid_services:
            return True

        # Alias handling: check if the lowercase form exists
        for valid_service in valid_services:
            if service.lower() == valid_service.lower():
                return True

        # **Alias fallback logic** (e.g., check for common mappings)
        alias_map = {
            "SQS": "SimpleQueueServiceSqs",
            "SNS": "SimpleNotificationServiceSns",
            "CloudWatch": "Cloudwatch"  # If this exists in another category
        }
        if service in alias_map and alias_map[service] in valid_services:
            return True

    return False

def validate_and_fix_imports(code):
    """Ensure only valid AWS imports are used and print debugging info."""
    fixed_imports = []
    invalid_imports = []

    import_pattern = re.compile(r"from\s+diagrams\.aws\.([a-zA-Z0-9_]+)\s+import\s+([a-zA-Z0-9_, ]+)")

    for line in code.split("\n"):
        match = import_pattern.match(line)
        if match:
            category = match.group(1)
            services = [s.strip() for s in match.group(2).split(",")]

            print(f"[DEBUG] Checking AWS imports for category: {category}", file=sys.stderr)
            print(f"[DEBUG] Loaded AWS services: {aws_nodes.get('aws', {}).get(category, [])}", file=sys.stderr)

            valid_services = []
            for service in services:
                if is_valid_aws_node(service, category, aws_nodes.get("aws", {})):
                    valid_services.append(service)
                else:
                    print(f"[WARNING] Removing invalid AWS import: {service} from diagrams.aws.{category}", file=sys.stderr)

            if valid_services:
                fixed_imports.append(f"from diagrams.aws.{category} import {', '.join(valid_services)}")
            else:
                invalid_imports.append(line)
        else:
            fixed_imports.append(line)

    return "\n".join(fixed_imports)

def fix_diagram_args(code: str, file_id: str) -> str:
    """
    Ensures each `with Diagram(...)` contains:
    filename="/tmp/<uuid>", outformat="png".
    """
    pattern = r'(with\s+Diagram\s*\(([^)]*)\)\s*:)'

    def _replacer(match):
        full_match = match.group(1)
        args_str = match.group(2).strip()

        # Remove any existing filename= or outformat= params
        args_str = re.sub(r'filename\s*=\s*["\'].*?["\']\s*,?\s*', '', args_str)
        args_str = re.sub(r'outformat\s*=\s*["\'].*?["\']\s*,?\s*', '', args_str)
        args_str = args_str.strip().strip(',')

        # Separate quoted diagram name if present
        name_arg, other_args = "", ""
        leading_str_match = re.match(r'^("[^"]*"|\'[^\']*\')(.*)$', args_str)
        if leading_str_match:
            name_arg = leading_str_match.group(1).strip()
            other_args = leading_str_match.group(2).strip().lstrip(',')
        else:
            other_args = args_str

        forced = f'filename="/tmp/{file_id}", outformat="png"'
        final_args = ", ".join(filter(None, [name_arg, other_args, forced]))

        return f'with Diagram({final_args}):'

    return re.sub(pattern, _replacer, code)

def main():
    try:
        original_code = sys.stdin.read()
        file_id = str(uuid.uuid4())
        temp_py = f"/tmp/{file_id}.py"
        out_filename = f"/tmp/{file_id}.png"

        # Validate and fix AWS imports
        validated_code = validate_and_fix_imports(original_code)

        # Fix Diagram arguments
        modified_code = fix_diagram_args(validated_code, file_id)

        print(f"[diagram_executor] Received code:\n{original_code}", file=sys.stderr)
        print(f"[diagram_executor] Modified code:\n{modified_code}", file=sys.stderr)
        print(f"[diagram_executor] Writing code to {temp_py}", file=sys.stderr)

        with open(temp_py, "w") as f:
            f.write(modified_code)

        print(f"[diagram_executor] Running script: {temp_py}", file=sys.stderr)
        result = subprocess.run(
            ["/Users/prashanthboovaragavan/Documents/visualization/visualization-backend/myvenv/bin/python", temp_py],
            capture_output=True,
            timeout=20
        )

        print(f"[diagram_executor] Return code: {result.returncode}", file=sys.stderr)
        if result.returncode != 0:
            sys.stderr.write(result.stderr.decode("utf-8"))
            sys.exit(result.returncode)

        if os.path.exists(out_filename):
            with open(out_filename, "rb") as f:
                sys.stdout.buffer.write(f.read())
            os.remove(out_filename)
        else:
            print("[diagram_executor] No output file found!", file=sys.stderr)
            sys.exit(1)

        # Cleanup
        if os.path.exists(temp_py):
            os.remove(temp_py)

    except Exception as e:
        print(f"[diagram_executor] Exception: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
