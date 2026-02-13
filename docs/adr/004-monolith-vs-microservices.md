# ADR-004: Monolith vs Microservices Architecture

## Status
Accepted

## Date
2026-01-28

## Context
Quiz-to-Build is a new product requiring rapid development and iteration. The architecture must balance development velocity, operational simplicity, and future scalability needs.

### Requirements
- Rapid feature development and deployment
- Small initial team (1-3 developers)
- Clear module boundaries for future extraction
- Cost-effective infrastructure
- Easy debugging and monitoring
- Support for eventual scale-out

### Options Considered

#### Option 1: Pure Microservices
- **Pros**: Independent scaling, technology flexibility, team autonomy
- **Cons**: Operational complexity, network latency, distributed debugging

#### Option 2: Modular Monolith
- **Pros**: Simple deployment, easy debugging, low latency, clear boundaries
- **Cons**: Shared scaling, potential coupling, single deployment unit

#### Option 3: Hybrid (Core Monolith + Extracted Services)
- **Pros**: Best of both, gradual extraction, optimized per-service
- **Cons**: Requires extraction criteria, mixed operational model

## Decision
**We will build a Modular Monolith** with clear module boundaries that enable future service extraction:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MODULAR MONOLITH                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    API Gateway Layer                     ││
│  │           (NestJS Controllers + Guards)                  ││
│  └─────────────────────────────────────────────────────────┘│
│                            │                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Module Layer                          ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │   Auth   │ │ Session  │ │ Scoring  │ │   QPG    │   ││
│  │  │  Module  │ │  Module  │ │  Engine  │ │  Module  │   ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │ Question │ │ Document │ │ Policy   │ │ Adaptive │   ││
│  │  │  -naire  │ │Generator │ │   Pack   │ │  Logic   │   ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
│                            │                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  Shared Infrastructure                   ││
│  │        (Database, Cache, Events, Logging)               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Module Design Principles

#### 1. Clear Boundaries
Each module:
- Has its own directory under `src/modules/`
- Exports only through public API (`index.ts`)
- Owns its database entities
- Communicates via well-defined interfaces

#### 2. Module Structure
```
src/modules/
├── scoring-engine/
│   ├── index.ts              # Public API
│   ├── scoring-engine.module.ts
│   ├── scoring-engine.service.ts
│   ├── scoring-engine.controller.ts
│   ├── dto/                  # Data Transfer Objects
│   ├── entities/             # Database entities
│   ├── services/             # Internal services
│   └── types/                # TypeScript types
```

#### 3. Inter-Module Communication
```typescript
// Preferred: Dependency Injection via Module imports
@Module({
  imports: [ScoringEngineModule],
  // ...
})
export class QpgModule {}

// For loose coupling: Event-based communication
@Injectable()
export class SessionService {
  constructor(private eventEmitter: EventEmitter2) {}
  
  async completeSession(sessionId: string) {
    // ... complete session logic
    this.eventEmitter.emit('session.completed', { sessionId });
  }
}
```

### Extraction Criteria
A module should be extracted to a microservice when:

| Criteria | Threshold |
|----------|-----------|
| Independent scaling needed | >10x traffic vs other modules |
| Different technology required | Non-Node.js optimal |
| Team ownership boundary | Dedicated team of 3+ |
| Deployment independence | Separate release cycle |
| Failure isolation | Critical path isolation |

### Extraction-Ready Patterns

#### Database
```typescript
// Each module uses its own schema prefix
// Enables future database-per-service
@Entity('scoring_results')  // scoring_ prefix
export class ScoringResult { /* ... */ }

@Entity('qpg_prompts')      // qpg_ prefix
export class QpgPrompt { /* ... */ }
```

#### API Versioning
```typescript
// Version prefix enables future API gateway routing
@Controller('api/v1/scoring')
export class ScoringController { /* ... */ }
```

### Current Module Inventory

| Module | Responsibility | Extraction Likelihood |
|--------|---------------|----------------------|
| Auth | Authentication/Authorization | Low (cross-cutting) |
| Session | Quiz session management | Medium |
| Questionnaire | Question bank, adaptive logic | Medium |
| Scoring Engine | Score calculation, formulas | High (CPU-intensive) |
| Document Generator | PDF/report generation | High (CPU-intensive) |
| QPG | Prompt generation | Medium |
| Policy Pack | Policy document generation | Medium |

## Consequences

### Positive
- Rapid development with simple deployment
- Easy debugging and tracing
- Low operational overhead
- Clear path to extraction when needed
- Cost-effective initial infrastructure

### Negative
- Shared scaling (entire app scales together)
- Single point of deployment
- Potential for module coupling if not disciplined

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Module coupling | Enforce boundaries via linting, code review |
| Premature extraction | Clear extraction criteria defined |
| Scaling bottleneck | Monitor module-level metrics, extract when criteria met |

## Compliance Mapping
- **ISO 27001**: A.14.2 (Secure development)
- **12-Factor App**: Factor IV (Backing services as attached resources)

## Related ADRs
- ADR-005: Database Choice
- ADR-001: Authentication (Auth module)
