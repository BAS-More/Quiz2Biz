# Project Standards

## Tech Stack

### Backend (API)
- **Framework**: NestJS v10+ (Node.js ≥22.0.0)
- **Language**: TypeScript v5.9+
- **ORM**: Prisma v5.8 with PostgreSQL 15
- **Caching**: Redis 7 (via ioredis)
- **Authentication**: JWT with Passport (@nestjs/passport, passport-jwt)
- **Testing**: Jest v29+ with ts-jest
- **API Documentation**: Swagger/OpenAPI via @nestjs/swagger
- **Security**: Helmet, @nestjs/throttler, @sentry/nestjs
- **Cloud Storage**: Azure Blob Storage (@azure/storage-blob)

### Frontend (Web)
- **Framework**: React v19+ with Vite v7+
- **Language**: TypeScript v5.9+
- **Styling**: Tailwind CSS v4+ with @tailwindcss/forms and @tailwindcss/typography
- **State Management**: Zustand v5+
- **Data Fetching**: @tanstack/react-query v5+
- **Forms**: react-hook-form v7+ with @hookform/resolvers
- **Routing**: react-router-dom v7+
- **Validation**: Zod v3+
- **Testing**: Vitest v3+ with @testing-library/react
- **Icons**: lucide-react
- **Error Tracking**: @sentry/react

### Infrastructure
- **IaC**: Terraform (infrastructure/terraform/)
- **Containerization**: Docker with Node.js 20-alpine base
- **CI/CD**: Azure Container Apps + Azure Container Registry
- **Monorepo**: Turbo v1.11+ with npm workspaces
- **E2E Testing**: Playwright v1.58+
- **Performance Testing**: Autocannon + Lighthouse CI

### Shared Libraries
- **Database**: Prisma client (libs/database)
- **Redis**: Connection management (libs/redis)
- **Shared**: DTOs, utilities (libs/shared)

---

## Naming Conventions

### Variables & Functions
- **camelCase** for variables, functions, and methods
  ```typescript
  const userId = 123;
  function getUserData() {}
  ```

### Components & Classes
- **PascalCase** for React components, classes, interfaces, types
  ```typescript
  class UserService {}
  interface UserProfile {}
  type AuthToken = string;
  const LoginForm: React.FC = () => {};
  ```

### Constants
- **UPPER_SNAKE_CASE** for constants and environment variables
  ```typescript
  const API_BASE_URL = 'https://api.example.com';
  const MAX_RETRY_ATTEMPTS = 3;
  ```

### Files & Directories
- **kebab-case** for file names and directories
  ```
  user-profile.component.tsx
  auth-service.ts
  scoring-engine/
  ```

### Test Files
- Use `.spec.ts` for unit tests (NestJS convention)
- Use `.test.ts` or `.test.tsx` for frontend tests (Vitest convention)
- Use `.e2e.ts` for end-to-end tests (Playwright)

### Database
- **snake_case** for Prisma schema field names (PostgreSQL convention)
  ```prisma
  model User {
    user_id     String
    created_at  DateTime
  }
  ```

---

## Error Handling

### Async Operations
- **Use async/await** (NOT Promise.then/catch)
- **Always wrap in try/catch blocks** for all async operations

```typescript
// ✅ CORRECT
async function fetchUserData(userId: string): Promise<User> {
  try {
    const user = await userRepository.findById(userId);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error });
    throw new NotFoundException(`User ${userId} not found`);
  }
}

// ❌ INCORRECT
function fetchUserData(userId: string): Promise<User> {
  return userRepository.findById(userId)
    .then(user => user)
    .catch(error => {
      throw new Error('User not found');
    });
}
```

### NestJS Exception Handling
Use built-in HTTP exceptions:
```typescript
import { 
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException
} from '@nestjs/common';

throw new NotFoundException('Resource not found');
throw new BadRequestException('Invalid input data');
```

### Frontend Error Handling
```typescript
// React Query error handling
const { data, error, isError } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  retry: 3
});

if (isError) {
  return <ErrorState message={error.message} />;
}
```

### Validation Errors
- Backend: Use class-validator with DTOs
- Frontend: Use Zod schemas with react-hook-form

---

## Comment Style

### Self-Documenting Code Priority
- **Code should be self-documenting** through clear naming and structure
- **Do not add excessive comments** explaining what code does
- **Only comment WHY, not WHAT**

### When to Comment

#### ✅ Good Comments (Intent & Context)
```typescript
// Apply exponential backoff to prevent API rate limiting
const delay = Math.pow(2, attempt) * 1000;

// Business rule: Users under 18 cannot complete financial questionnaires
if (user.age < 18 && questionnaire.type === 'FINANCIAL') {
  throw new ForbiddenException('Age restriction');
}

// TODO: Replace with database-backed queue after MVP (Issue #234)
const inMemoryQueue = [];
```

#### ❌ Bad Comments (Obvious/Redundant)
```typescript
// Increment counter by 1
counter++;

// Get user by ID
const user = await getUserById(id);

// Return true if valid
return isValid;
```

### JSDoc for Public APIs
- **Required** for all exported functions, classes, methods
- Include `@param`, `@returns`, `@throws` annotations

```typescript
/**
 * Calculate residual risk score based on dimension weights
 * @param dimensions - Array of scored dimensions with weights
 * @param totalQuestions - Total number of questions answered
 * @returns Normalized residual risk score (0-100)
 * @throws {ValidationException} If dimensions array is empty
 */
export function calculateResidualRisk(
  dimensions: ScoredDimension[],
  totalQuestions: number
): number {
  // Implementation
}
```

### Interface & Type Documentation
```typescript
/**
 * Represents a user session with authentication state
 */
interface UserSession {
  /** JWT access token */
  accessToken: string;
  /** Token expiration timestamp (Unix epoch) */
  expiresAt: number;
  /** User profile data */
  user: UserProfile;
}
```

---

## Code Quality Standards

### Function Length
- Target: ≤30 lines per function
- Maximum: 50 lines (refactor if exceeded)

### Cyclomatic Complexity
- Target: ≤10 per function
- Maximum: 15 (refactor if exceeded)

### File Length
- Target: ≤400 lines per file
- Maximum: 600 lines (split into modules if exceeded)

### DRY Principle
- No code duplication >3 instances
- Extract repeated logic into utility functions
- Use shared libraries (libs/shared) for cross-app utilities

### Type Safety
- **No `any` types** without explicit justification comment
- Enable strict TypeScript mode
- Use Zod for runtime validation

---

## Testing Standards

### Coverage Requirements
- **Minimum**: 80% line coverage, 70% branch coverage
- **Unit tests** required for all new functions
- **Integration tests** required for all API endpoints
- **E2E tests** for critical user flows

### Test Structure
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com' };
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toHaveProperty('userId');
      expect(result.email).toBe(userData.email);
    });

    it('should throw BadRequestException for invalid email', async () => {
      // Arrange
      const invalidData = { email: 'invalid' };
      
      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects.toThrow(BadRequestException);
    });
  });
});
```

---

## Security Standards

### Input Validation
- **All external inputs** must be validated
- Backend: class-validator + DTOs
- Frontend: Zod schemas

### Database Queries
- **Parameterized queries ONLY** (Prisma handles this)
- **NO string concatenation** in SQL queries

### Authentication
- **Authorization checks** on all protected API endpoints
- Use `@UseGuards(JwtAuthGuard)` decorator
- **No hardcoded passwords, tokens, or secrets**

### Environment Variables
- **Never commit secrets** to version control
- Use `.env` files (gitignored)
- Required variables documented in `.env.example`

---

## Performance Standards

### Lighthouse Scores (Frontend)
- Performance: ≥90
- SEO: ≥90
- Best Practices: ≥90
- Accessibility: ≥90

### Response Times
- API endpoints: <200ms (p95)
- INP (Interaction to Next Paint): ≤200ms
- Database queries: <50ms (p95)

### Optimization Requirements
- Images: WebP/AVIF format, lazy-load below-the-fold
- Code splitting: Dynamic imports for routes
- Database: Indexes on frequently queried fields
- Caching: Redis for expensive computations

---

## Accessibility Standards (WCAG AA)

### Contrast Requirements
- Text: minimum 4.5:1 contrast ratio
- UI components: minimum 3:1 contrast ratio

### Keyboard Navigation
- Visible focus rings on all interactive elements
- Logical tab order throughout interface

### Interactive Elements
- Icon-only buttons MUST have aria-labels
- Touch targets: minimum 44x44px

### Responsive Design
- Breakpoints: 320px, 768px, 1024px, 1440px
- No horizontal scroll
- Support prefers-color-scheme for dark mode

---

## Git Commit Standards

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding tests
- `docs`: Documentation changes
- `chore`: Build/tooling changes

### Examples
```
feat(scoring): implement residual risk calculation

Add exponential decay model for dimension weighting
based on question count and answer confidence.

Closes #234
```

---

## Enforcement

These standards are **mandatory** and enforced through:
- ESLint + Prettier (automated formatting)
- Pre-commit hooks (lint-staged + husky)
- CI/CD pipeline checks
- Code review requirements

**Trigger**: Always active - applies to all code written in this project.
