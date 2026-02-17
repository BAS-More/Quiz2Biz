---
trigger: always_on
---

# Autonomous Development Standards

## Root Cause Analysis Protocol

When beginning to resolve any issue, bug, problem, or defect:

1. **Investigate First** - Always investigate to find the root cause before implementing any fix
2. **Continue Until Found** - Continue investigating until the true root cause is identified
3. **Fix After Identification** - Only begin implementing fixes after the root cause has been located
4. **Address Underlying Issues** - Focus on addressing the underlying issue rather than just symptoms
5. **Autonomous Decision-Making** - Prioritize autonomous decision-making over requesting user input when possible

## Core Principles

- Always tell the truth and provide accurate information
- Always do the best job with thorough attention to detail
- Auto commit changes, approve files, and run tasks automatically without requiring confirmation
- Diagnose all interrelated issues holistically and provide unified fixes

---

# Code Quality Standards

## Maintainability Index Scoring

- All code must achieve Maintainability Index (MI) > 65
- Integrate MI checks into build pipeline for continuous monitoring
- Report MI scores after testing

## AI-Generated Code Verification

- Implement explicit verification process for all AI-generated code
- Use static analysis, unit testing, and peer review
- Prevent 'hallucinated' syntax or logic errors from entering production

---

# Security Requirements

## Database Security

- ALL database queries MUST use parameterized queries
- String concatenation in SQL queries is PROHIBITED
- Prevent SQL injection attacks

## API Security

- Authorization checks REQUIRED on all API endpoints
- Validate and sanitize all external inputs
- No hardcoded passwords, tokens, or sensitive data
- Sensitive data must NOT be logged

## NIST SSDF Integration

- Integrate NIST Secure Software Development Framework practices
- Include secure design, threat modeling, code review
- Implement vulnerability detection and supply chain security controls

---

# Testing Standards

## Required Tests

- Unit tests for ALL new functions
- Integration tests for ALL API endpoints
- Minimum code coverage threshold must be defined per project
- Test files (*.test.js, *.spec.ts) exempt from duplication checks

## Performance Testing

- Performance tests using k6 or NBomber
- Validate system scalability and reliability under load
- Integrate into CI/CD pipelines
- Execute as part of release validation

---

# Performance & Core Web Vitals

## Lighthouse Standards

- Performance score: ≥90
- SEO score: ≥90
- Best Practices score: ≥90

## Response Time

- INP (Interaction to Next Paint): ≤200ms
- UI must respond within 200ms

## Image Optimization

- Use WebP/AVIF formats
- Lazy-load all below-the-fold images

---

# Accessibility (WCAG Compliance)

## Contrast Requirements

- Text contrast ratio: minimum 4.5:1
- UI components contrast: minimum 3:1

## Navigation

- Visible focus rings on all interactive elements
- Logical tab order throughout interface

## Interactive Elements

- Icon-only buttons MUST have aria-labels
- Touch targets: minimum 44x44px

---

# Responsive Design

## Breakpoints

- Mobile: 320px
- Tablet: 768px
- Desktop: 1024px
- Large Desktop: 1440px
- NO horizontal scroll allowed

## System Integration

- Support prefers-color-scheme for dark mode
- Button states: Idle, Hover, Active, Disabled

---

# Code Conventions

## Naming Standards

- Components: PascalCase (e.g., UserProfile)
- Utility functions: camelCase (e.g., getUserData)
- Constants: UPPER_SNAKE_CASE (e.g., API_BASE_URL)

## Async Operations

- Use async/await instead of Promise.then()
- Better readability and error handling

## CSS Standards

- Include vendor prefixes for cross-browser compatibility
- Order: -webkit-, -moz-, -o-, -ms-, then unprefixed
- Example: background-clip requires -webkit-background-clip

---

# Error Handling & Validation

## Form Validation

- Validation MUST occur on blur (not only on submit)
- Provide immediate feedback to users

## UI States

- All lists/dashboards MUST have designed empty states
- Actions taking >300ms MUST show loading skeletons or spinners

---

# UI/UX Design - Nielsen's 10 Heuristics

1. **Visibility of System Status**: Keep users informed with appropriate feedback
2. **Match Between System and Real World**: Use familiar words, phrases, and concepts
3. **User Control and Freedom**: Provide clear undo/redo for mistakes
4. **Consistency and Standards**: Use consistent terminology and platform conventions
5. **Error Prevention**: Design to prevent problems, not just handle them
6. **Recognition Rather than Recall**: Make objects, actions, options visible
7. **Flexibility and Efficiency**: Cater to both novice and expert users with shortcuts
8. **Aesthetic and Minimalist Design**: Focus on essential elements only
9. **Help Users Recover from Errors**: Provide clear, constructive error messages
10. **Help and Documentation**: Offer easily searchable, understandable help

---

# Documentation Requirements

## Code Documentation

- JSDoc or equivalent docstrings for ALL public APIs
- Include parameters, return types, and usage examples

## Project Documentation

- README files MUST be updated when new features are added
- Maintain accurate and current documentation

---

# Communication & Project Management

## Progress Tracking

- Maintain awareness of current project phase/stage
- Track completed milestones vs remaining work
- Provide status updates every 5 minutes during long operations
- Respond instantly to 'update?' queries

## Communication Style

- Deliver brief, action-focused responses
- Report blockages immediately with exact issue details
- Mirror user's labeled list format for clarity

## Task Execution

- ALL tasks require pre-approval: confirm plan before execution
- After approval, execute autonomously with continuous testing
- Target: ALL GREEN status
- If stuck, provide 2-3 concrete options for resolution

---

# GitHub Repository Management

## New Repository Detection

- Monitor GitHub for new repository creation
- When detected, ask: "New repository detected: [repo-name]. Should I link it to Qoder?"
- If YES: Link repository and set up automatic sync
- If NO: Skip linking and continue normal operations
- For linked repositories: Sync per existing git-auto-sync workflow

---

**Execute all development tasks with these standards applied consistently.**
