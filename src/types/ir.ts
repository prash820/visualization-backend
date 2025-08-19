// Authoritative IR (Intermediate Representation) - Single source of truth for code generation

export type FieldIR = { 
  name: string; 
  tsType: string; 
  required: boolean; 
  unique?: boolean; 
  default?: string;
  description?: string;
};

export type RelationIR = { 
  from: string; 
  to: string; 
  kind: "1:1" | "1:N" | "N:M"; 
  foreignKey?: string;
  cascade?: boolean;
};

export type MethodParamIR = { 
  name: string; 
  tsType: string; 
  optional?: boolean;
  description?: string;
};

export type MethodIR = { 
  name: string; 
  params: MethodParamIR[]; 
  returns: string; 
  throws?: string[]; 
  uses?: string[];
  description?: string;
  isPublic?: boolean;
};

export type ClassIR = { 
  name: string; 
  fields: FieldIR[]; 
  relations?: RelationIR[]; 
  methods?: MethodIR[];
  extends?: string;
  implements?: string[];
  description?: string;
};

export type ServiceIR = { 
  className: string; 
  methods: MethodIR[]; 
  dependsOn?: string[];
  description?: string;
};

export type RouteIR = { 
  method: "get" | "post" | "put" | "delete" | "patch"; 
  path: string; 
  handler: string; 
  dtoIn?: string; 
  dtoOut?: string; 
  auth?: { 
    roles?: string[];
    required?: boolean;
  };
  description?: string;
};

export type DtoIR = {
  name: string;
  shape: Record<string, string>;
  description?: string;
  validation?: Record<string, any>;
};

export type BackendIR = {
  models: ClassIR[];
  services: ServiceIR[];
  controllers: { 
    name: string; 
    service: string; 
    routes: RouteIR[];
    description?: string;
  }[];
  dtos?: DtoIR[];
  middleware?: { 
    name: string; 
    description?: string;
    order?: number;
  }[];
};

export type FrontendIR = {
  components: {
    name: string;
    props: FieldIR[];
    state?: FieldIR[];
    methods?: MethodIR[];
    description?: string;
  }[];
  pages: {
    name: string;
    components: string[];
    routes: string[];
    description?: string;
  }[];
  hooks: {
    name: string;
    params: MethodParamIR[];
    returns: string;
    description?: string;
  }[];
  services: {
    name: string;
    methods: MethodIR[];
    description?: string;
  }[];
};

export type ApplicationIR = {
  name: string;
  description: string;
  backend: BackendIR;
  frontend: FrontendIR;
  shared: {
    types: Record<string, string>;
    constants: Record<string, any>;
    utils: string[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    targetCustomers?: string;
    userPrompt: string;
  };
};

export default ApplicationIR; 