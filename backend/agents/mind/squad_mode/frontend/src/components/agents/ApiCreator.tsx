import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, Server, FileDown, ChevronsUpDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CodeDisplay from "../CodeDisplay";
import { useToast } from "@/hooks/use-toast";
import { AutogrowingTextarea } from "@/components/ui/autogrowing-textarea";
//import { callGeminiApi } from "@/utils/aiUtils";
// Removed local prompt definitions. We now fetch prompts from backend.
import { toast } from "sonner";

interface ApiCreatorProps {
  fileContent?: string | null;
  fileName?: string | null;
}

interface ApiEndpoint {
  method: string;
  path: string;
  parameters: {
    query: string[];
    path: string[];
    headers: string[];
  };
  security: {
    authentication: string;
    authorization: string;
    rateLimit: string;
    caching: string;
  };
  description: string;
  requestBody: {
    schema: string;
    example: string;
    validation: string;
  };
  response: {
    schema: string;
    example: string;
    statusCodes: {
      [key: string]: string;
    };
  };
  errorHandling: string;
  testing: string;
}

interface DataModel {
  name: string;
  schema: string;
  description: string;
  relationships: string;
  validation: string;
  indexes: string;
  migrations: string;
  additionalNotes: string;
}

interface ApiPlan {
  overview: {
    purpose: string;
    techStack: string;
    architecture: string;
    testing: string;
    documentation: string;
    monitoring: string;
    logging: string;
    errorHandling: string;
    performance: string;
    scalability: string;
    maintainability: string;
    bestPractices: string;
    futureFeatures: string;
    additionalNotes: string;
  };
  endpoints: ApiEndpoint[];
  dataModels: DataModel[];
  implementation: {
    setup: {
      projectStructure: string;
      dependencies: string;
      configuration: string;
      database: string;
    };
    authentication: {
      strategy: string;
      setup: string;
      middleware: string;
      utils: string;
      errorHandling: string;
    };
    middleware: {
      errorHandler: string;
      logging: string;
      validation: string;
      security: string;
      rateLimiting: string;
      caching: string;
    };
    routes: {
      structure: string;
      controllers: string;
      services: string;
      repositories: string;
      validation: string;
      errorHandling: string;
    };
    utils: {
      helpers: string;
      constants: string;
      types: string;
      config: string;
    };
  };
  security: {
    authentication: string[];
    authorization: string[];
    dataProtection: string[];
    apiSecurity: string[];
    encryption: string[];
    vulnerabilities: string[];
    compliance: string[];
  };
  deployment: {
    environment: {
      development: string;
      staging: string;
      production: string;
    };
    infrastructure: {
      servers: string;
      databases: string;
      caching: string;
      monitoring: string;
    };
    ci_cd: {
      pipeline: string;
      testing: string;
      deployment: string;
      rollback: string;
    };
    scaling: {
      horizontal: string;
      vertical: string;
      loadBalancing: string;
    };
  };
}

export default function ApiCreator({ fileContent, fileName }: ApiCreatorProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiPlan, setApiPlan] = useState<ApiPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateApiPlan = (plan: any): plan is ApiPlan => {
    try {
      if (!plan || typeof plan !== 'object') {
        console.error("Plan is not a valid object");
        return false;
      }
      const requiredSections = ['overview', 'endpoints', 'dataModels', 'implementation', 'security', 'deployment'];
      for (const section of requiredSections) {
        if (!(section in plan)) {
          console.error(`Missing required section: ${section}`);
          return false;
        }
      }
      const requiredOverviewFields = [
        'purpose', 'techStack', 'architecture', 'testing', 'documentation',
        'monitoring', 'logging', 'errorHandling', 'performance', 'scalability',
        'maintainability', 'bestPractices', 'futureFeatures', 'additionalNotes'
      ];
      for (const field of requiredOverviewFields) {
        if (!(field in plan.overview)) {
          console.error(`Missing required overview field: ${field}`);
          return false;
        }
      }
      if (!Array.isArray(plan.endpoints)) {
        console.error("Endpoints must be an array");
        return false;
      }
      if (!Array.isArray(plan.dataModels)) {
        console.error("Data models must be an array");
        return false;
      }
      const requiredImplementationSections = ['setup', 'authentication', 'middleware', 'routes', 'utils'] as const;
      for (const section of requiredImplementationSections) {
        if (!(section in plan.implementation)) {
          console.error(`Missing required implementation section: ${section}`);
          return false;
        }
        const sectionFields = {
          setup: ['projectStructure', 'dependencies', 'configuration', 'database'] as const,
          authentication: ['strategy', 'setup', 'middleware', 'utils', 'errorHandling'] as const,
          middleware: ['errorHandler', 'logging', 'validation', 'security', 'rateLimiting', 'caching'] as const,
          routes: ['structure', 'controllers', 'services', 'repositories', 'validation', 'errorHandling'] as const,
          utils: ['helpers', 'constants', 'types', 'config'] as const
        } as const;
        const fields = sectionFields[section];
        for (const field of fields) {
          if (!(field in plan.implementation[section])) {
            console.error(`Missing required field in implementation.${section}: ${field}`);
            return false;
          }
        }
      }
      if (typeof plan.security !== 'object') {
        console.error("Security must be an object");
        return false;
      }
      const requiredSecuritySections = [
        'authentication', 'authorization', 'dataProtection',
        'apiSecurity', 'encryption', 'vulnerabilities', 'compliance'
      ] as const;
      for (const section of requiredSecuritySections) {
        if (!(section in plan.security)) {
          console.error(`Missing required security section: ${section}`);
          return false;
        }
        if (!Array.isArray(plan.security[section])) {
          console.error(`Security section ${section} must be an array`);
          return false;
        }
      }
      const requiredDeploymentSections = ['environment', 'infrastructure', 'ci_cd', 'scaling'] as const;
      for (const section of requiredDeploymentSections) {
        if (!(section in plan.deployment)) {
          console.error(`Missing required deployment section: ${section}`);
          return false;
        }
      }
      const requiredEnvironmentFields = ['development', 'staging', 'production'] as const;
      for (const field of requiredEnvironmentFields) {
        if (!(field in plan.deployment.environment)) {
          console.error(`Missing required environment field: ${field}`);
          return false;
        }
      }
      const requiredInfrastructureFields = ['servers', 'databases', 'caching', 'monitoring'] as const;
      for (const field of requiredInfrastructureFields) {
        if (!(field in plan.deployment.infrastructure)) {
          console.error(`Missing required infrastructure field: ${field}`);
          return false;
        }
      }
      const requiredCiCdFields = ['pipeline', 'testing', 'deployment', 'rollback'] as const;
      for (const field of requiredCiCdFields) {
        if (!(field in plan.deployment.ci_cd)) {
          console.error(`Missing required CI/CD field: ${field}`);
          return false;
        }
      }
      const requiredScalingFields = ['horizontal', 'vertical', 'loadBalancing'] as const;
      for (const field of requiredScalingFields) {
        if (!(field in plan.deployment.scaling)) {
          console.error(`Missing required scaling field: ${field}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error validating API plan:", error);
      return false;
    }
  };

  const extractJsonFromResponse = (response: string): any => {
    const codeBlockMatch = response.match(/```(?:json)?([\s\S]*?)```/i);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {}
    }
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const jsonContent = response.substring(jsonStart, jsonEnd);
      try {
        return JSON.parse(jsonContent);
      } catch (e) {}
    }
    try {
      return JSON.parse(response);
    } catch (e) {
      throw new Error('Failed to extract valid JSON from Gemini response.');
    }
  };

  async function fetchApiPlanPrompt(description: string, fileContent?: string | null): Promise<string> {
    const res = await fetch('/api/prompts/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'getApiPlanPrompt', params: [description, fileContent || null] })
    });
    const data = await res.json();
    if (!res.ok || !data?.prompt) {
      throw new Error(data?.message || 'Failed to fetch API plan prompt from backend');
    }
    return data.prompt as string;
  }

  const generateApiPlanWithAI = async (prompt: string): Promise<ApiPlan> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please sign in to generate API plans');
      }

      const response = await fetch('/api/api-plan/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt
        })
      });

      let parsedResponse;
      try {
        const data = await response.json();
        if (data && typeof data.content === 'string') {
          parsedResponse = extractJsonFromResponse(data.content);
        } else {
          throw new Error('No content field in Gemini response');
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        throw new Error('Failed to parse Gemini response as JSON. Please try again.');
      }

      if (!validateApiPlan(parsedResponse)) {
        console.error('Invalid API plan structure:', parsedResponse);
        throw new Error('Generated API plan does not match the required structure. Please try again.');
      }
      return parsedResponse as ApiPlan;
    } catch (error) {
      console.error('Error generating API plan:', error);
      throw error;
    }
  };

  const handleCreateApi = async () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for your API",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const prompt = await fetchApiPlanPrompt(description, fileContent);
      const generatedApiPlan = await generateApiPlanWithAI(prompt);
      setApiPlan(generatedApiPlan);
      toast({
        title: "API Plan Generated",
        description: "Your custom API plan has been created based on your requirements.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error generating API plan:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!apiPlan) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-2">API Creator</h1>
          <p className="text-squadrun-gray">
            Create a new API endpoint using natural language. Describe what you want your API to do, and we'll generate the code for you.
          </p>
        </div>
        
        <Card className="flex-1 border border-squadrun-gray/20 bg-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Describe Your API Requirements</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-60px)]">
            <AutogrowingTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the API you want to create. You can include details about endpoints, data models, authentication requirements, etc."
              className="bg-squadrun-darker/50 border-squadrun-gray/20 text-white"
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-between items-center">
        <Button
          onClick={handleCreateApi}
          className="bg-squadrun-primary hover:bg-squadrun-vivid text-white mt-4 ml-auto"
          disabled={isProcessing || description.trim() === ""}
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <Server className="mr-2 h-4 w-4" /> Generate API Plan
            </>
          )}
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-2">API Implementation Plan</h1>
        <p className="text-squadrun-gray">
          Complete roadmap for implementing a production-ready API based on your requirements.
        </p>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="data-models">Data Models</TabsTrigger>
            <TabsTrigger value="implementation">Implementation</TabsTrigger>
            <TabsTrigger value="security-deployment">Security & Deployment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-0">
            <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">API Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-white mb-1">Purpose</h3>
                    <p className="text-sm text-squadrun-gray">{apiPlan.overview.purpose}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-1">Recommended Tech Stack</h3>
                    <p className="text-sm text-squadrun-gray">{apiPlan.overview.techStack}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-1">Architecture</h3>
                    <p className="text-sm text-squadrun-gray">{apiPlan.overview.architecture}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="endpoints" className="mt-0">
            <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">API Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiPlan.endpoints.map((endpoint: ApiEndpoint, index: number) => (
                    <div key={index} className="border border-squadrun-primary/10 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <span className={`px-2 py-1 text-xs rounded mr-2 ${
                          endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-300' :
                          endpoint.method === 'POST' ? 'bg-green-500/20 text-green-300' :
                          endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-300' :
                          endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="text-white font-mono">{endpoint.path}</span>
                      </div>
                      
                      <p className="text-sm text-squadrun-gray mb-3">{endpoint.description}</p>
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="parameters">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Parameters
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Query Parameters</h4>
                                <ul className="list-disc pl-5 text-sm text-white">
                                  {endpoint.parameters.query.map((param, i) => (
                                    <li key={i}>{param}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Path Parameters</h4>
                                <ul className="list-disc pl-5 text-sm text-white">
                                  {endpoint.parameters.path.map((param, i) => (
                                    <li key={i}>{param}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Headers</h4>
                                <ul className="list-disc pl-5 text-sm text-white">
                                  {endpoint.parameters.headers.map((header, i) => (
                                    <li key={i}>{header}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="security">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Security
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Authentication</h4>
                                <p className="text-sm text-white">{endpoint.security.authentication}</p>
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Authorization</h4>
                                <p className="text-sm text-white">{endpoint.security.authorization}</p>
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Rate Limit</h4>
                                <p className="text-sm text-white">{endpoint.security.rateLimit}</p>
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Caching</h4>
                                <p className="text-sm text-white">{endpoint.security.caching}</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="request">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Request
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Schema</h4>
                                <CodeDisplay code={endpoint.requestBody.schema} language="javascript" />
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Example</h4>
                                <CodeDisplay code={endpoint.requestBody.example} language="javascript" />
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Validation</h4>
                                <p className="text-sm text-white">{endpoint.requestBody.validation}</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="response">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Response
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Schema</h4>
                                <CodeDisplay code={endpoint.response.schema} language="javascript" />
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Example</h4>
                                <CodeDisplay code={endpoint.response.example} language="javascript" />
                              </div>
                              <div>
                                <h4 className="text-xs text-squadrun-gray mb-1">Status Codes</h4>
                                <div className="space-y-1">
                                  {Object.entries(endpoint.response.statusCodes).map(([code, description]) => (
                                    <div key={code} className="flex items-start">
                                      <span className="text-xs font-mono text-squadrun-primary mr-2">{code}</span>
                                      <span className="text-sm text-white">{description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="error-handling">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Error Handling
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{endpoint.errorHandling}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="testing">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Testing
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{endpoint.testing}</p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data-models" className="mt-0">
            <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Data Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiPlan.dataModels.map((model: DataModel, index: number) => (
                    <div key={index} className="border border-squadrun-primary/10 rounded-md p-4">
                      <h3 className="text-sm font-medium text-white mb-2">{model.name}</h3>
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="schema">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Schema
                          </AccordionTrigger>
                          <AccordionContent>
                            <CodeDisplay code={model.schema} language="javascript" />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="description">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Description
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{model.description}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="relationships">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Relationships
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{model.relationships}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="validation">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Validation
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{model.validation}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="indexes">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Indexes
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{model.indexes}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="migrations">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Migrations
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{model.migrations}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="notes">
                          <AccordionTrigger className="text-sm font-medium text-white">
                            Additional Notes
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-white">{model.additionalNotes}</p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="implementation" className="mt-0">
            <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Implementation Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="setup">
                    <AccordionTrigger className="text-sm font-medium text-white">
                      Project Setup
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Project Structure</h4>
                          <CodeDisplay code={apiPlan.implementation.setup.projectStructure} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Dependencies</h4>
                          <CodeDisplay code={apiPlan.implementation.setup.dependencies} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Configuration</h4>
                          <CodeDisplay code={apiPlan.implementation.setup.configuration} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Database</h4>
                          <CodeDisplay code={apiPlan.implementation.setup.database} language="javascript" />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="authentication">
                    <AccordionTrigger className="text-sm font-medium text-white">
                      Authentication
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Strategy</h4>
                          <p className="text-sm text-white">{apiPlan.implementation.authentication.strategy}</p>
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Setup</h4>
                          <CodeDisplay code={apiPlan.implementation.authentication.setup} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Middleware</h4>
                          <CodeDisplay code={apiPlan.implementation.authentication.middleware} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Utils</h4>
                          <CodeDisplay code={apiPlan.implementation.authentication.utils} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Error Handling</h4>
                          <CodeDisplay code={apiPlan.implementation.authentication.errorHandling} language="javascript" />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="middleware">
                    <AccordionTrigger className="text-sm font-medium text-white">
                      Middleware
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Error Handler</h4>
                          <CodeDisplay code={apiPlan.implementation.middleware.errorHandler} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Logging</h4>
                          <CodeDisplay code={apiPlan.implementation.middleware.logging} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Validation</h4>
                          <CodeDisplay code={apiPlan.implementation.middleware.validation} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Security</h4>
                          <CodeDisplay code={apiPlan.implementation.middleware.security} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Rate Limiting</h4>
                          <CodeDisplay code={apiPlan.implementation.middleware.rateLimiting} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Caching</h4>
                          <CodeDisplay code={apiPlan.implementation.middleware.caching} language="javascript" />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="routes">
                    <AccordionTrigger className="text-sm font-medium text-white">
                      Routes
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Structure</h4>
                          <CodeDisplay code={apiPlan.implementation.routes.structure} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Controllers</h4>
                          <CodeDisplay code={apiPlan.implementation.routes.controllers} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Services</h4>
                          <CodeDisplay code={apiPlan.implementation.routes.services} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Repositories</h4>
                          <CodeDisplay code={apiPlan.implementation.routes.repositories} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Validation</h4>
                          <CodeDisplay code={apiPlan.implementation.routes.validation} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Error Handling</h4>
                          <CodeDisplay code={apiPlan.implementation.routes.errorHandling} language="javascript" />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="utils">
                    <AccordionTrigger className="text-sm font-medium text-white">
                      Utils
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Helpers</h4>
                          <CodeDisplay code={apiPlan.implementation.utils.helpers} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Constants</h4>
                          <CodeDisplay code={apiPlan.implementation.utils.constants} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Types</h4>
                          <CodeDisplay code={apiPlan.implementation.utils.types} language="javascript" />
                        </div>
                        <div>
                          <h4 className="text-xs text-squadrun-gray mb-1">Config</h4>
                          <CodeDisplay code={apiPlan.implementation.utils.config} language="javascript" />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security-deployment" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="authentication">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Authentication
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.authentication.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="authorization">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Authorization
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.authorization.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="data-protection">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Data Protection
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.dataProtection.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="api-security">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        API Security
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.apiSecurity.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="encryption">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Encryption
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.encryption.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="vulnerabilities">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Vulnerabilities
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.vulnerabilities.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="compliance">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Compliance
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
                          {apiPlan.security.compliance.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Deployment</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="environment">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Environment Setup
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Development</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.environment.development}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Staging</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.environment.staging}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Production</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.environment.production}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="infrastructure">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Infrastructure
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Servers</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.infrastructure.servers}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Databases</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.infrastructure.databases}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Caching</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.infrastructure.caching}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Monitoring</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.infrastructure.monitoring}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ci-cd">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        CI/CD
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Pipeline</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.ci_cd.pipeline}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Testing</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.ci_cd.testing}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Deployment</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.ci_cd.deployment}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Rollback</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.ci_cd.rollback}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="scaling">
                      <AccordionTrigger className="text-sm font-medium text-white">
                        Scaling
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Horizontal Scaling</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.scaling.horizontal}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Vertical Scaling</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.scaling.vertical}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-squadrun-gray mb-1">Load Balancing</h4>
                            <p className="text-sm text-white">{apiPlan.deployment.scaling.loadBalancing}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button
          variant="outline" 
          className="text-squadrun-gray border-squadrun-primary/20 hover:bg-squadrun-primary/10"
          onClick={() => setApiPlan(null)}
        >
          <ChevronsUpDown className="mr-2 h-4 w-4" /> Edit Requirements
        </Button>
      </div>
    </div>
  );
}
