# Documentation Generation API

This API provides endpoints for generating system design documentation asynchronously.

## Base URL

```
https://chartai-backend-697f80778bd2.herokuapp.com/api/documentation
```

## Endpoints

### 1. Generate Documentation

Initiates the documentation generation process. Returns a job ID that can be used to track the generation progress.

```http
POST /generate
```

#### Request Body

```json
{
  "prompt": "string",      // Required: Description of the system to document
  "umlDiagrams": {        // Optional: UML diagrams to include in the documentation
    "classDiagram": "string",
    "sequenceDiagram": "string",
    "componentDiagram": "string"
  }
}
```

#### Response

```json
{
  "status": "accepted",
  "jobId": "string",      // Unique identifier for the generation job
  "message": "Documentation generation started",
  "checkStatusUrl": "/api/documentation/status/{jobId}"
}
```

#### Error Response

```json
{
  "error": "string"       // Error message if generation cannot be initiated
}
```

### 2. Check Documentation Status

Retrieves the current status of a documentation generation job.

```http
GET /status/{jobId}
```

#### Path Parameters

- `jobId` (string, required): The unique identifier of the documentation generation job

#### Response

```json
{
  "jobId": "string",
  "status": "pending" | "processing" | "completed" | "failed",
  "progress": number,     // Progress percentage (0-100)
  "result": {            // Present only when status is "completed"
    "metadata": {
      "title": "string",
      "authors": ["string"],
      "date_created": "string",
      "date_updated": "string",
      "reviewers": ["string"],
      "version": "string",
      "status": "string",
      "document_scope": "string"
    },
    "executive_summary": "string",
    "goals": {
      "goals_list": ["string"],
      "non_goals_list": ["string"]
    },
    "background_context": "string",
    "requirements": {
      "functional": ["string"],
      "non_functional": ["string"],
      "regulatory_compliance": ["string"]
    },
    "proposed_architecture": {
      "high_level_architecture_diagram": "string",
      "components": [
        {
          "name": "string",
          "purpose": "string",
          "responsibility": "string",
          "inputs_outputs": "string",
          "failure_modes": "string",
          "interfaces": "string"
        }
      ],
      "data_models": [
        {
          "name": "string",
          "description": "string",
          "fields": ["string"]
        }
      ],
      "external_integrations": [
        {
          "name": "string",
          "purpose": "string",
          "interface": "string"
        }
      ]
    },
    "detailed_design": {
      "sequence_diagrams": [
        {
          "name": "string",
          "description": "string"
        }
      ],
      "algorithms": [
        {
          "name": "string",
          "description": "string",
          "complexity": "string"
        }
      ],
      "modules_classes": [
        {
          "name": "string",
          "purpose": "string",
          "responsibilities": ["string"]
        }
      ],
      "concurrency_model": "string",
      "retry_idempotency_logic": "string"
    },
    "api_contracts": {
      "api_type": "string",
      "endpoints": [
        {
          "path": "string",
          "method": "string",
          "description": "string",
          "request_format": "string",
          "response_format": "string"
        }
      ],
      "request_response_format": "string",
      "error_handling": "string",
      "versioning_strategy": "string"
    },
    "deployment_infrastructure": {
      "environment_setup": [
        {
          "environment": "string",
          "requirements": ["string"]
        }
      ],
      "iac_outline": "string",
      "ci_cd_strategy": "string",
      "feature_flags": "string",
      "secrets_configuration": "string"
    },
    "observability_plan": {
      "logging": "string",
      "metrics": "string",
      "tracing": "string",
      "dashboards": "string",
      "alerting_rules": "string"
    },
    "security_considerations": {
      "threat_model": "string",
      "encryption": {
        "at_rest": "string",
        "in_transit": "string"
      },
      "authentication_authorization": "string",
      "secrets_handling": "string",
      "security_reviews_required": boolean
    },
    "failure_handling_resilience": {
      "failure_modes": "string",
      "fallbacks_retries": "string",
      "graceful_degradation": "string",
      "disaster_recovery": "string"
    },
    "cost_estimation": {
      "infrastructure": "string",
      "third_party_services": "string",
      "storage_bandwidth": "string"
    },
    "risks_tradeoffs": [
      {
        "risk": "string",
        "mitigation": "string",
        "tradeoff": "string"
      }
    ],
    "alternatives_considered": [
      {
        "alternative": "string",
        "pros": ["string"],
        "cons": ["string"],
        "why_rejected": "string"
      }
    ],
    "rollout_plan": {
      "strategy": "string",
      "data_migration": "string",
      "stakeholder_communication": "string",
      "feature_flags_usage": "string"
    },
    "post_launch_checklist": {
      "health_checks": "string",
      "regression_coverage": "string",
      "load_testing": "string",
      "ownership_and_runbooks": "string"
    },
    "open_questions": [
      {
        "question": "string",
        "impact": "string",
        "next_steps": "string"
      }
    ],
    "appendix": {
      "external_links": ["string"],
      "reference_docs": ["string"],
      "terminology": [
        {
          "term": "string",
          "definition": "string"
        }
      ]
    }
  },
  "error": "string"       // Present only when status is "failed"
}
```

#### Error Response

```json
{
  "error": "string"       // Error message if job not found or other error
}
```

## Usage Example

```typescript
// 1. Start documentation generation
const startGeneration = async () => {
  const response = await fetch('/api/documentation/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: "Create a task management system",
      umlDiagrams: {
        classDiagram: "...",
        sequenceDiagram: "..."
      }
    })
  });
  
  const { jobId, checkStatusUrl } = await response.json();
  return jobId;
};

// 2. Poll for status
const checkStatus = async (jobId: string) => {
  const response = await fetch(`/api/documentation/status/${jobId}`);
  const { status, progress, result, error } = await response.json();
  
  if (status === 'completed') {
    return result;
  } else if (status === 'failed') {
    throw new Error(error);
  }
  
  // Continue polling if still processing
  return null;
};

// 3. Usage in React component
const DocumentationGenerator = () => {
  const [progress, setProgress] = useState(0);
  const [documentation, setDocumentation] = useState(null);
  const [error, setError] = useState(null);

  const generateDocumentation = async () => {
    try {
      const jobId = await startGeneration();
      
      // Poll every 2 seconds
      const pollInterval = setInterval(async () => {
        const result = await checkStatus(jobId);
        
        if (result) {
          clearInterval(pollInterval);
          setDocumentation(result);
        }
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {progress > 0 && <ProgressBar value={progress} />}
      {documentation && <DocumentationViewer doc={documentation} />}
      <button onClick={generateDocumentation}>Generate Documentation</button>
    </div>
  );
};
```

## Notes

1. The documentation generation process is asynchronous and may take several minutes to complete.
2. It's recommended to implement a polling mechanism with appropriate intervals (e.g., 2-5 seconds).
3. The job status will be maintained for a limited time (implementation dependent).
4. All timestamps are in ISO 8601 format.
5. The API supports CORS and can be called from any origin. 