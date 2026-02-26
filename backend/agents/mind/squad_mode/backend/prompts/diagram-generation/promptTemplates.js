const buildHLDPrompt = (PRD_CONTENT) => {
    return `
You are a senior software architect. Based on the following Product Requirements Document (PRD), generate a **High-Level Design (HLD)** as a Mermaid diagram.

PRD:
${PRD_CONTENT}

Instructions:
1. Analyze the PRD to identify the overall system architecture and main components.
2. Create a Mermaid flowchart or graph diagram showing:
   - Major system components (Frontend, Backend, Database, External Services, etc.)
   - Data flow and interactions between components
   - External dependencies (databases, third-party APIs, integrations, cloud services)
   - Key integrations and communication protocols

3. **CRITICAL MERMAID SYNTAX RULES - MUST FOLLOW EXACTLY**:
\`\`\`mermaid
graph TB
    subgraph Client_Layer[Client Layer]
        A[Web App]
        B[Mobile App]
    end
    
    subgraph Application_Layer[Application Layer]
        C[API Gateway]
        D[Service 1]
        E[Service 2]
    end
    
    subgraph Data_Layer[Data Layer]
        F[(Database)]
        G[(Cache)]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    D --> F
    E --> F
    D --> G
\`\`\`

4. **CRITICAL SUBGRAPH RULES**:
   - ALWAYS use format: subgraph identifier[Display Label] ... end
   - Identifier MUST be alphanumeric_with_underscores (NO SPACES, NO HYPHENS)
   - WRONG: subgraph Frontend ... end
   - CORRECT: subgraph Frontend_Layer[Frontend] ... end
   - WRONG: subgraph Data-Storage ... end
   - CORRECT: subgraph Data_Storage[Data Storage] ... end
   - The identifier comes first, then [Display Label] in brackets
   - Example: subgraph My_Module[My Module]

5. Other Mermaid syntax:
   - "graph TB" for top-to-bottom flowchart or "graph LR" for left-to-right
   - Use arrows (-->, ---, etc.) to show data flow
   - Use descriptive labels for all nodes
   - Use special node shapes: [Square], (Round), [(Database)], {{Diamond}}, etc.
   - Each 'subgraph' must have a matching 'end' keyword
   - Ensure proper indentation inside subgraphs (4 spaces)

6. **FINAL CHECKLIST BEFORE OUTPUTTING**:
   - ✓ Every subgraph has identifier[Label] format (not just identifier)
   - ✓ Identifiers use underscores, not spaces or hyphens
   - ✓ Every subgraph has matching 'end'
   - ✓ Node names use [brackets] not (parentheses) except for databases [(db)]
   - ✓ Only output the mermaid code block

Output ONLY the Mermaid code block between \`\`\`mermaid and \`\`\`, with NO additional text, explanations, or markdown.
`;
};

const buildLLDPrompt = (PRD_CONTENT) => {
    return `
You are a senior software engineer. Based on the following Product Requirements Document (PRD), generate a **Low-Level Design (LLD)** as a Mermaid sequence diagram or class diagram.

PRD:
${PRD_CONTENT}

Instructions:
1. Analyze the PRD to identify key user flows or system interactions.
2. Create a Mermaid sequence diagram showing the detailed flow for the main use case OR a class diagram showing the system structure.

3. **CRITICAL**: Output ONLY a Mermaid diagram code block. Choose ONE of these formats:

**For Sequence Diagram (preferred for showing interactions):**
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Service
    participant Database
    
    User->>Frontend: Submit Request
    Frontend->>API: POST /api/endpoint
    activate API
    API->>Service: Process Request
    activate Service
    Service->>Database: Query Data
    activate Database
    Database-->>Service: Return Data
    deactivate Database
    Service-->>API: Response
    deactivate Service
    API-->>Frontend: JSON Response
    deactivate API
    Frontend-->>User: Display Result
\`\`\`

**CRITICAL - Arrow Syntax Rules:**
- Use EXACTLY ->> (dash-dash-greater-greater) for synchronous calls/requests
- Use EXACTLY -->> (dash-dash-greater-greater) for responses/returns
- NEVER use --> > or - -> or any syntax with spaces between the dashes and arrows
- NO SPACES in arrow syntax: ->> and -->> only!

**For Class Diagram (preferred for showing structure):**
\`\`\`mermaid
classDiagram
    class User {
        +String id
        +String email
        +String name
        +login()
        +logout()
    }
    
    class Product {
        +String id
        +String name
        +Float price
        +getDetails()
    }
    
    class Order {
        +String id
        +Date created
        +calculate()
        +submit()
    }
    
    User "1" --> "*" Order
    Order "*" --> "*" Product
\`\`\`

4. **Sequence Diagram Syntax Requirements:**
   - Declare ALL participants at the top using: participant Name
   - Use ->> for requests (NO SPACES: not --> > or - ->)
   - Use -->> for responses (NO SPACES: not -- >> or - - >>)
   - Use activate and deactivate to show lifelines
   - Use alt/else/end for conditional flows
   - Use loop/end for iterations

5. Include:
   - All major classes/participants
   - Key methods/interactions
   - Data flow and relationships
   - Error handling paths (if sequence diagram)

6. Ensure the diagram is complete, clear, and properly formatted.

Output ONLY the Mermaid code block, no additional text or explanations.
`;
};

const buildERDPrompt = (PRD_CONTENT) => {
    return `
You are a database architect. Based on the following Product Requirements Document (PRD), generate an **Entity Relationship Diagram (ERD)** in Mermaid format.

PRD:
${PRD_CONTENT}

Instructions:
1. Analyze the PRD to identify all major entities (database tables).
2. For each entity, define key attributes with appropriate data types.
3. Define relationships between entities using proper cardinality.

4. **CRITICAL**: Output ONLY a Mermaid ERD code block using this format:
\`\`\`mermaid
erDiagram
    USER {
        id string PK
        email string UK
        name string
        password string
        created_at datetime
    }
    
    PRODUCT {
        id string PK
        name string
        price decimal
        description string
        stock int
    }
    
    ORDER {
        id string PK
        user_id string FK
        order_date datetime
        status string
        total decimal
    }
    
    ORDER_ITEM {
        id string PK
        order_id string FK
        product_id string FK
        quantity int
        price decimal
    }
    
    USER ||--o{ ORDER : "places"
    ORDER ||--|{ ORDER_ITEM : "contains"
    PRODUCT ||--o{ ORDER_ITEM : "included in"
\`\`\`

5. **CRITICAL - Attribute Syntax:**
   - Format: attribute_name data_type constraints
   - CORRECT: id string PK
   - WRONG: string id PK (data type first)
   - CORRECT: email varchar UK
   - WRONG: varchar email UK

6. Relationship syntax:
   - ||--|| : one-to-one
   - ||--o{ : one-to-many (zero or more)
   - ||--|{ : one-to-many (one or more)
   - }o--o{ : many-to-many (zero or more)
   - }|--|{ : many-to-many (one or more)

7. Attribute format (CRITICAL ORDER):
   - field_name data_type constraints
   - Example: user_id int PK
   - Example: email varchar UK
   - Example: created_at datetime
   - Add PK for primary keys
   - Add FK for foreign keys
   - Add UK for unique keys

8. Include ALL entities mentioned in the PRD.
9. Ensure proper normalization (at least 3NF).
10. Use meaningful entity and attribute names.

Output ONLY the Mermaid code block, no additional text or explanations.
`;
};

module.exports = {
    buildHLDPrompt,
    buildLLDPrompt,
    buildERDPrompt
};