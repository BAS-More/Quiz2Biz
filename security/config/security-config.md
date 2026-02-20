# Security Configuration

## Rate Limiting

```yaml
general:
  ttl: 60000  # 1 minute
  limit: 100  # 100 requests per minute

login:
  ttl: 60000
  limit: 5    # 5 login attempts per minute

api:
  ttl: 60000
  limit: 1000 # 1000 API calls per minute (authenticated)
```

## JWT Configuration

```yaml
access_token:
  algorithm: HS256
  expiration: 15m
  
refresh_token:
  algorithm: HS256
  expiration: 7d
  rotation: true  # Issue new refresh token on each use
```

## Password Policy

```yaml
bcrypt_rounds: 12
min_length: 8
require_uppercase: true
require_lowercase: true
require_number: true
require_special: false
```

## CORS Configuration

```yaml
development:
  origins:
    - http://localhost:3001
  credentials: true

production:
  origins:
    - https://quiz2biz.com
    - https://www.quiz2biz.com
  credentials: true
```

## Security Headers (Helmet)

```yaml
contentSecurityPolicy: true
crossOriginEmbedderPolicy: false
crossOriginOpenerPolicy: true
crossOriginResourcePolicy: true
dnsPrefetchControl: true
frameguard: true
hidePoweredBy: true
hsts: true
ieNoOpen: true
noSniff: true
originAgentCluster: true
permittedCrossDomainPolicies: true
referrerPolicy: true
xssFilter: true
```

## Audit Logging

```yaml
enabled: true
retention_days: 90
logged_events:
  - authentication
  - authorization_failure
  - data_access
  - admin_actions
  - security_events
excluded_paths:
  - /health
  - /health/live
  - /health/ready
```
