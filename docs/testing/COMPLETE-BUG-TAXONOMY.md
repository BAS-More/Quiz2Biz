# Complete Bug Taxonomy: Every Possible Failure Mode

> **Purpose**: Exhaustive catalog of EVERYTHING that can go wrong in a software system.
> Use this to systematically test for bugs you haven't encountered yet.

---

## Category 1: Data Type & Transformation Bugs

### 1.1 Type Coercion Issues
```
□ String "0" treated as falsy when it should be truthy
□ Number 0 treated as falsy when it's a valid value
□ Empty array [] treated as falsy (it's truthy in JS)
□ Empty object {} treated as falsy (it's truthy in JS)
□ "null" string vs null value
□ "undefined" string vs undefined value
□ "NaN" string vs NaN value
□ "true"/"false" strings vs boolean true/false
□ Number strings "123" not parsed to numbers
□ Float precision: 0.1 + 0.2 !== 0.3
□ BigInt vs Number overflow
□ Date string vs Date object
□ JSON.stringify circular reference crash
□ JSON.parse on non-JSON string crash
```

### 1.2 Encoding Issues
```
□ UTF-8 vs UTF-16 vs ASCII mismatches
□ URL encoding (%20 vs +)
□ HTML entity encoding (&amp; vs &)
□ Base64 encoding/decoding errors
□ Unicode normalization (NFC vs NFD)
□ Byte Order Mark (BOM) in files
□ Line endings (CRLF vs LF)
□ Null bytes in strings
□ Control characters in input
□ Emoji handling (multi-codepoint characters)
□ Zero-width characters
□ RTL text direction markers
```

### 1.3 Serialization/Deserialization
```
□ Object → JSON loses functions
□ Object → JSON loses undefined values
□ Object → JSON loses Symbol keys
□ Date → JSON becomes string (loses methods)
□ Map/Set → JSON loses data
□ Circular references cause infinite loop
□ Prototype chain not preserved
□ Class instances become plain objects
□ BigInt cannot be serialized to JSON
□ Binary data encoding issues
```

---

## Category 2: API & Network Issues

### 2.1 Request Issues
```
□ Missing Content-Type header
□ Wrong Content-Type header (form vs JSON)
□ Missing Authorization header
□ Malformed Authorization header
□ Token in wrong format (Bearer vs Basic)
□ Request body too large (413)
□ Request URL too long (414)
□ Missing required query parameters
□ Query parameter type mismatch
□ Array query params: ?id=1&id=2 vs ?id=1,2
□ Duplicate headers
□ Case-sensitive header names
□ Missing CORS preflight handling
□ OPTIONS request not handled
□ Request timeout not configured
□ No retry on transient failures
□ Retry causes duplicate operations
```

### 2.2 Response Issues
```
□ Response wrapper mismatch (our bug)
□ Inconsistent success/error format
□ Missing error codes
□ Error messages expose internal details
□ Stack traces in production errors
□ Wrong HTTP status codes
□ Missing pagination metadata
□ Cursor-based vs offset pagination mismatch
□ Response not gzipped (performance)
□ Missing cache headers
□ Wrong cache headers (stale data)
□ Missing CORS headers
□ Content-Type mismatch
□ Charset not specified
□ Transfer-Encoding issues
□ Chunked response not handled
```

### 2.3 Network Conditions
```
□ Slow connection (high latency)
□ Intermittent connection (packet loss)
□ Connection dropped mid-request
□ Connection dropped mid-response
□ DNS resolution failure
□ SSL/TLS handshake failure
□ Certificate expired
□ Certificate hostname mismatch
□ Self-signed certificate rejected
□ Proxy authentication required
□ Firewall blocking requests
□ Rate limiting (429)
□ Service temporarily unavailable (503)
□ Gateway timeout (504)
□ Request aborted by client
□ Duplicate requests on retry
```

### 2.4 API Versioning Issues
```
□ Breaking change in new version
□ Old clients calling deprecated endpoints
□ Version header not sent
□ Version in URL vs header mismatch
□ Sunset headers not respected
□ Backwards compatibility broken
□ Forward compatibility not considered
□ Schema drift between versions
```

---

## Category 3: Authentication & Authorization

### 3.1 Authentication Bugs
```
□ Login accepts empty password
□ Login accepts null password
□ Password comparison timing attack
□ Password stored in plain text
□ Password logged in request body
□ Password visible in error messages
□ Remember me token never expires
□ Session token predictable
□ Session token in URL (logged/cached)
□ Session fixation attack possible
□ Session not invalidated on logout
□ Session not invalidated on password change
□ Multiple active sessions not tracked
□ OAuth state parameter not validated
□ OAuth redirect_uri not validated
□ OAuth token swap attack possible
□ JWT signature not validated
□ JWT algorithm confusion attack
□ JWT expiry not enforced
□ Refresh token reuse after rotation
□ Refresh token not bound to client
□ Account enumeration via login
□ Account enumeration via registration
□ Account enumeration via password reset
□ Brute force not rate limited
□ Credential stuffing not detected
□ MFA bypass vulnerabilities
□ MFA codes reusable
□ MFA backup codes predictable
```

### 3.2 Authorization Bugs
```
□ IDOR - Direct object reference without auth check
□ Horizontal privilege escalation (user A → user B data)
□ Vertical privilege escalation (user → admin)
□ Missing function-level access control
□ Role check bypassed via parameter tampering
□ JWT role claim not validated against database
□ Cached permissions not invalidated
□ Race condition in permission check
□ Default deny not implemented
□ Wildcard permissions too broad
□ Path traversal in authorization
□ Resource ownership not verified
□ Deleted user still has permissions
□ Suspended user still has permissions
□ API key permissions not scoped
□ OAuth scopes not enforced
```

### 3.3 Session Management
```
□ Session ID regeneration on login missing
□ Session ID in URL
□ Session ID predictable
□ Session timeout not implemented
□ Session timeout too long
□ Absolute session timeout missing
□ Idle session timeout missing
□ Session cookie not HttpOnly
□ Session cookie not Secure
□ Session cookie not SameSite
□ Session stored client-side (tamperable)
□ Session data not encrypted
□ Session fixation possible
□ Concurrent session limit not enforced
□ Session revocation not working
□ Session sharing across subdomains
```

---

## Category 4: Database & Data Integrity

### 4.1 Query Issues
```
□ SQL injection (parameterized queries not used)
□ NoSQL injection (query object injection)
□ ORM query builder injection
□ Raw query string concatenation
□ Unescaped LIKE patterns
□ ORDER BY injection
□ LIMIT/OFFSET injection
□ Column name injection
□ Table name injection
□ N+1 query problem (performance)
□ Missing indexes (slow queries)
□ Index not used (wrong query plan)
□ Full table scan on large tables
□ Deadlocks on concurrent writes
□ Lock timeout exceeded
□ Connection pool exhausted
□ Long-running transaction blocking
□ Cursor leak (not closed)
```

### 4.2 Data Integrity Issues
```
□ Foreign key constraint violated
□ Unique constraint violated
□ Check constraint violated
□ NOT NULL constraint violated
□ Orphaned records after delete
□ Cascade delete unintended
□ Cascade update unintended
□ Soft delete not filtered in queries
□ Hard delete without cascade
□ Audit timestamps not set
□ Created/updated by not tracked
□ Version mismatch (optimistic locking)
□ Lost update (no locking)
□ Dirty read (uncommitted data)
□ Non-repeatable read
□ Phantom read
□ Write skew anomaly
```

### 4.3 Transaction Issues
```
□ Transaction not started
□ Transaction not committed
□ Transaction not rolled back on error
□ Nested transaction handling wrong
□ Savepoint not used
□ Transaction timeout too short
□ Transaction isolation level wrong
□ Cross-database transaction issues
□ Distributed transaction failure
□ Two-phase commit failure
□ Idempotency not ensured
□ Retry causes duplicate insert
```

### 4.4 Migration Issues
```
□ Migration not reversible
□ Migration breaks existing data
□ Migration timeout on large tables
□ Migration locks table too long
□ Migration order incorrect
□ Migration applied twice
□ Migration skipped
□ Schema drift between environments
□ Seed data inconsistent
□ Test data in production
```

---

## Category 5: Caching Issues

### 5.1 Cache Correctness
```
□ Stale data served after update
□ Cache key collision (different data, same key)
□ Cache key not including all variants
□ Cache not invalidated on write
□ Cache invalidated too aggressively
□ Cache stampede (thundering herd)
□ Cache miss storm on cold start
□ Negative caching (caching errors)
□ Cache poisoning (malicious data cached)
□ User A sees User B's cached data
□ Sensitive data cached
□ PII in cache logs
```

### 5.2 Cache Configuration
```
□ TTL too short (no benefit)
□ TTL too long (stale data)
□ Max memory not set (OOM)
□ Eviction policy wrong
□ Cache size monitoring missing
□ Cache hit rate not tracked
□ Serialization overhead high
□ Compression not enabled
□ Connection pooling not used
□ Cluster not configured properly
```

### 5.3 Distributed Cache Issues
```
□ Network partition handling
□ Split brain scenario
□ Inconsistent reads across nodes
□ Write propagation delay
□ Node failure not detected
□ Node rejoining causes duplicates
□ Rebalancing causes cache miss
□ Hot key problem (single node overload)
```

---

## Category 6: Concurrency & Race Conditions

### 6.1 Race Conditions
```
□ Check-then-act race (TOCTOU)
□ Read-modify-write race
□ Double-checked locking broken
□ Singleton initialization race
□ Lazy initialization race
□ Counter increment race
□ Balance update race (overdraft)
□ Inventory update race (oversell)
□ File write race (corruption)
□ Config reload race
□ Connection pool race
□ Resource allocation race
□ Event ordering race
```

### 6.2 Deadlocks
```
□ Lock ordering inconsistent
□ Lock not released on error
□ Lock timeout not configured
□ Distributed lock issues
□ Database lock escalation
□ Self-deadlock (reentrant lock needed)
□ Priority inversion
□ Livelock (infinite retry)
□ Starvation (unfair scheduling)
```

### 6.3 Async Issues
```
□ Promise not awaited
□ Promise rejection not handled
□ Callback hell losing context
□ Event loop blocking
□ Memory leak from unresolved promises
□ Race between async operations
□ Async iterator not closed
□ Stream backpressure not handled
□ Message queue order not guaranteed
□ Duplicate message processing
□ Message lost on crash
□ Poison message blocking queue
```

---

## Category 7: State Management

### 7.1 Frontend State Issues
```
□ State not initialized correctly
□ State mutation without notification
□ Derived state not updated
□ State sync between tabs missing
□ State persistence incomplete
□ State hydration mismatch (SSR)
□ State cleared on refresh
□ State not cleared on logout
□ Stale closure capturing old state
□ State update batching issues
□ Optimistic update not reverted on error
□ Loading state not tracked
□ Error state not cleared
□ Form state lost on navigation
□ Undo/redo state not tracked
```

### 7.2 Backend State Issues
```
□ Global state mutation
□ Request-scoped state leak
□ Session state size too large
□ Session state not serializable
□ In-memory state lost on restart
□ Sticky session required but not configured
□ State inconsistent across instances
□ State versioning not handled
□ State migration on deploy failed
□ Circuit breaker state issues
□ Feature flag state inconsistent
```

### 7.3 Distributed State Issues
```
□ Eventual consistency not handled
□ CAP theorem violation attempt
□ Split brain handling missing
□ Conflict resolution not defined
□ Vector clock/version conflict
□ State replication lag
□ State partition recovery
□ Leader election issues
□ Consensus failure
```

---

## Category 8: Time & Date Issues

### 8.1 Timezone Issues
```
□ Timezone not stored with datetime
□ Timezone assumed incorrectly
□ UTC not used internally
□ Timezone conversion wrong direction
□ DST transition handled incorrectly
□ DST transition: 2:30 AM doesn't exist
□ DST transition: 1:30 AM happens twice
□ Timezone offset vs timezone name
□ Historical timezone changes not considered
□ User timezone not captured
□ Server timezone assumed to be user timezone
□ Database storing local time not UTC
```

### 8.2 Date Calculation Issues
```
□ Day calculation off by one
□ Month calculation ignoring varying days
□ Year calculation ignoring leap years
□ Leap year February 29 not handled
□ Leap second not handled
□ Week number calculation varies by locale
□ Week start day varies by locale
□ Fiscal year vs calendar year
□ Date range inclusive vs exclusive
□ Date comparison ignoring time component
□ Date equality check failing (time component)
□ Duration calculation wrong (months vary)
```

### 8.3 Time-Sensitive Logic
```
□ Token expiry timezone mismatch
□ Scheduled job timezone wrong
□ Cron expression timezone not specified
□ Rate limit window boundary race
□ Time-based UUID collision
□ Timestamp precision insufficient
□ Clock skew between servers
□ NTP sync issues
□ Monotonic clock not used for elapsed time
□ System clock manipulation
□ Time travel in tests not reset
```

---

## Category 9: Input Validation

### 9.1 Missing Validation
```
□ Required field not checked
□ Field type not validated
□ Field format not validated
□ Field length not checked
□ Field range not checked
□ Enum value not validated
□ Array length not checked
□ Nested object not validated
□ File type not validated
□ File size not checked
□ Image dimensions not checked
□ URL format not validated
□ Email format not validated
□ Phone format not validated
□ Credit card format not validated
□ Date format not validated
```

### 9.2 Validation Bypass
```
□ Client-side only validation (bypassable)
□ Validation on wrong layer
□ Partial object update bypasses validation
□ Bulk operations skip validation
□ Import function skips validation
□ API direct access bypasses UI validation
□ Different validation client vs server
□ Validation regex incorrect
□ Unicode confusables bypass validation
□ Null byte truncation bypass
□ Length check before decode (bypass with encoding)
□ Type juggling bypass (PHP-style)
```

### 9.3 Injection Vulnerabilities
```
□ SQL injection
□ NoSQL injection
□ LDAP injection
□ XPath injection
□ XML injection (XXE)
□ Command injection
□ Code injection (eval)
□ Template injection (SSTI)
□ Header injection (CRLF)
□ Log injection
□ Email header injection
□ Path traversal
□ Null byte injection
□ Format string injection
□ Expression language injection
□ GraphQL injection
□ CSV injection
```

---

## Category 10: Output Encoding

### 10.1 XSS Vulnerabilities
```
□ Reflected XSS (input in response)
□ Stored XSS (database → page)
□ DOM XSS (client-side injection)
□ HTML context not escaped
□ JavaScript context not escaped
□ CSS context not escaped
□ URL context not escaped
□ Attribute context not escaped
□ Template literal injection
□ innerHTML used with user data
□ document.write used
□ eval() with user data
□ setTimeout/setInterval with strings
□ SVG allowing scripts
□ MathML allowing scripts
□ PDF with JavaScript
□ Flash with user data
□ Base64 encoded XSS
□ Unicode escaped XSS
□ Mutation XSS (browser parsing quirks)
```

### 10.2 Other Output Issues
```
□ Sensitive data in error messages
□ Sensitive data in logs
□ Sensitive data in URLs
□ Sensitive data in headers
□ PII in analytics
□ Secrets in client bundle
□ Source maps in production
□ Debug info in production
□ Version info disclosed
□ Technology stack disclosed
□ Directory listing enabled
□ Error stack traces shown
```

---

## Category 11: File Handling

### 11.1 Upload Vulnerabilities
```
□ Unrestricted file upload
□ File type check bypass (magic bytes)
□ File extension check bypass (double extension)
□ MIME type spoofing
□ Polyglot files (valid image + script)
□ ZIP bomb (decompression bomb)
□ XML bomb (billion laughs)
□ File name injection (path traversal)
□ File overwrite (existing files)
□ Symlink following
□ Race condition in upload
□ Temp file not cleaned
□ Upload size not limited
□ Upload quota not enforced
□ Malware not scanned
□ Image not reprocessed (EXIF data)
□ SVG with embedded script
□ HTML file upload (stored XSS)
```

### 11.2 Download Issues
```
□ Path traversal in filename
□ Open redirect via file path
□ Arbitrary file read
□ Sensitive file disclosure
□ Source code disclosure
□ Configuration file disclosure
□ Backup file disclosure (.bak, .old)
□ Log file disclosure
□ Content-Disposition not set
□ Content-Type sniffing (X-Content-Type-Options missing)
□ Download not authenticated
□ Download not authorized
□ Signed URL expiry too long
□ Signed URL not scoped
```

---

## Category 12: Error Handling

### 12.1 Error Exposure
```
□ Stack trace in production
□ Database errors exposed
□ File paths exposed
□ Internal IPs exposed
□ Credentials in errors
□ SQL query in errors
□ Debug info in errors
□ Verbose error messages
□ Different errors for valid/invalid users
□ Error timing leaks information
```

### 12.2 Error Handling Bugs
```
□ Exception not caught
□ Exception swallowed silently
□ Wrong exception type caught
□ Generic catch hides specific errors
□ Error not logged
□ Error logged with sensitive data
□ Error not propagated correctly
□ Error state not cleaned up
□ Partial operation on error
□ Transaction not rolled back
□ Resource not released on error
□ Retry without backoff
□ Infinite retry loop
□ Error callback not called
□ Promise rejection unhandled
□ Async error lost
```

### 12.3 Error Response Issues
```
□ HTTP 200 with error in body
□ HTTP 500 for client errors
□ Wrong HTTP status code
□ Error format inconsistent
□ Error code missing
□ Error message not helpful
□ Localized error not available
□ Error not actionable
□ Retry-After header missing
□ Error links broken
□ Error documentation missing
```

---

## Category 13: Security Misconfigurations

### 13.1 HTTP Security Headers
```
□ X-Content-Type-Options missing
□ X-Frame-Options missing
□ X-XSS-Protection misconfigured
□ Content-Security-Policy missing
□ Content-Security-Policy too permissive
□ Strict-Transport-Security missing
□ Referrer-Policy missing
□ Permissions-Policy missing
□ CORS too permissive (*)
□ CORS credentials with wildcard
□ Access-Control-Allow-Headers too broad
□ Access-Control-Expose-Headers leaks info
```

### 13.2 Cookie Security
```
□ HttpOnly flag missing
□ Secure flag missing
□ SameSite flag missing
□ Domain too broad
□ Path too broad
□ Expiry too long
□ Cookie prefix not used (__Secure-, __Host-)
□ Sensitive data in cookies
□ Cookie size too large
□ Too many cookies
```

### 13.3 TLS/SSL Issues
```
□ TLS 1.0/1.1 enabled
□ Weak cipher suites
□ SSL renegotiation vulnerability
□ Certificate not validated
□ Certificate pinning bypass
□ Mixed content (HTTP in HTTPS)
□ HSTS not enforced
□ HSTS includeSubdomains missing
□ HSTS preload not configured
□ Certificate transparency not enforced
```

### 13.4 Server Configuration
```
□ Debug mode enabled
□ Default credentials active
□ Unnecessary services running
□ Open ports exposed
□ Admin interface exposed
□ Version headers disclosed
□ Directory listing enabled
□ Backup files accessible
□ Source control files accessible (.git)
□ IDE files accessible (.idea, .vscode)
□ Environment files accessible (.env)
□ Temporary files accessible
□ Log files accessible
□ Core dumps accessible
```

---

## Category 14: Business Logic Flaws

### 14.1 Transaction Flaws
```
□ Price manipulation
□ Quantity manipulation
□ Discount stacking
□ Coupon reuse
□ Negative quantity order
□ Zero price order
□ Currency manipulation
□ Decimal precision exploitation
□ Race condition double-spend
□ Insufficient funds not checked
□ Balance goes negative
□ Refund exceeds payment
□ Transfer to self
□ Circular reference exploitation
```

### 14.2 Workflow Flaws
```
□ Step skipping possible
□ Step replay possible
□ Workflow state manipulation
□ Approval bypass
□ Multi-approval not enforced
□ Deadline bypass
□ Cooldown bypass
□ Limit bypass (daily, monthly)
□ Quota bypass
□ Rate limit bypass (distributed)
□ Feature flag bypass
□ A/B test manipulation
□ Invitation system abuse
□ Referral system abuse
```

### 14.3 Data Validation Flaws
```
□ Business rule not enforced
□ Constraint only in UI
□ Cross-field validation missing
□ Cross-entity validation missing
□ Historical data validation missing
□ Duplicate detection missing
□ Consistency check missing
□ Sanity check missing
□ Range check missing
□ Format check missing
```

---

## Category 15: Performance Issues

### 15.1 Memory Issues
```
□ Memory leak (growing over time)
□ Event listener not removed
□ Closure capturing large objects
□ Cache growing unbounded
□ Buffer not released
□ Connection not closed
□ File handle not closed
□ Circular reference preventing GC
□ Large object in heap
□ String concatenation in loop
□ Array growing unbounded
□ History/undo growing unbounded
```

### 15.2 CPU Issues
```
□ Blocking event loop
□ Synchronous I/O
□ Expensive computation in request
□ Regex catastrophic backtracking
□ Inefficient algorithm (O(n²) vs O(n))
□ Unnecessary computation
□ Repeated computation (not cached)
□ Polling instead of events
□ Busy wait loop
□ Infinite loop
```

### 15.3 Network Issues
```
□ N+1 query problem
□ Over-fetching data
□ Under-fetching data (multiple requests)
□ No pagination
□ No compression
□ No caching
□ Cache bypass (bust)
□ DNS lookup on every request
□ No connection pooling
□ Connection not kept alive
□ SSL handshake on every request
□ No request batching
□ No request deduplication
```

### 15.4 Database Issues
```
□ Missing index
□ Wrong index type
□ Index not used
□ Full table scan
□ Large result set
□ No pagination
□ No streaming
□ Cartesian product (bad join)
□ Correlated subquery
□ Function on indexed column
□ LIKE '%term%' (full scan)
□ Unnecessary columns selected
□ Large transactions
□ Lock contention
```

---

## Category 16: Third-Party Integration

### 16.1 API Integration Issues
```
□ API key exposed in client
□ API key not rotated
□ API rate limit not handled
□ API quota not tracked
□ API deprecation not monitored
□ API version mismatch
□ API response format changed
□ API timeout not configured
□ API retry not implemented
□ API circuit breaker missing
□ API fallback not implemented
□ API error not mapped correctly
□ API webhook not verified
□ API webhook replay attack
```

### 16.2 SDK/Library Issues
```
□ Vulnerable dependency
□ Outdated dependency
□ Abandoned dependency
□ License violation
□ Breaking change in minor version
□ Transitive dependency conflict
□ Bundle size impact not assessed
□ Tree-shaking not working
□ Polyfill not included
□ Feature detection not used
□ Global namespace pollution
□ Monkey patching conflicts
```

### 16.3 External Service Issues
```
□ Service availability not monitored
□ Service degradation not detected
□ Service timeout not handled
□ Service error not retried
□ Service circuit not broken
□ Service fallback not provided
□ Service data not cached
□ Service credentials exposed
□ Service credentials not rotated
□ Service SLA not monitored
□ Multi-region failover not tested
```

---

## Category 17: Deployment & Infrastructure

### 17.1 Build Issues
```
□ Dev dependencies in production
□ Debug code in production
□ Test code in production
□ Source maps in production
□ Environment variables hardcoded
□ Secrets in source control
□ Secrets in build logs
□ Build not reproducible
□ Build cache invalidation wrong
□ Tree-shaking not working
□ Dead code not eliminated
□ Bundle size too large
□ Asset optimization missing
```

### 17.2 Configuration Issues
```
□ Env var not set
□ Env var wrong type
□ Env var wrong value
□ Config file missing
□ Config file wrong format
□ Config not validated
□ Config drift between envs
□ Feature flags inconsistent
□ Secrets not encrypted at rest
□ Secrets not rotated
□ Default config in production
□ Debug config in production
```

### 17.3 Infrastructure Issues
```
□ Container resource limits not set
□ Container security context wrong
□ Health check not configured
□ Health check too simple
□ Readiness vs liveness confusion
□ Startup probe missing
□ Graceful shutdown not implemented
□ Signal handling missing
□ Rolling update causes downtime
□ Blue-green deployment issues
□ Canary deployment issues
□ Rollback not tested
□ Auto-scaling not configured
□ Auto-scaling too aggressive
□ Load balancer misconfigured
□ DNS TTL too long
□ CDN cache not invalidated
```

---

## Category 18: Observability Issues

### 18.1 Logging Issues
```
□ Not enough logging
□ Too much logging
□ Log level wrong
□ Log format inconsistent
□ Log not structured
□ Log not searchable
□ Log correlation ID missing
□ PII in logs
□ Secrets in logs
□ Stack trace not included
□ Context not included
□ Log aggregation not working
□ Log retention too short
□ Log rotation not configured
□ Log disk full
```

### 18.2 Monitoring Issues
```
□ Metrics not collected
□ Wrong metrics collected
□ Metric cardinality too high
□ Metric not labeled correctly
□ Alert threshold wrong
□ Alert fatigue (too many alerts)
□ Alert not actionable
□ On-call rotation not configured
□ Escalation not configured
□ Runbook not available
□ Dashboard not available
□ SLI not defined
□ SLO not defined
□ Error budget not tracked
```

### 18.3 Tracing Issues
```
□ Trace context not propagated
□ Trace sampling too aggressive
□ Trace not linked to logs
□ Trace not linked to metrics
□ Span not created for important operations
□ Span attributes missing
□ Trace storage full
□ Trace visualization not working
```

---

## Category 19: Accessibility Issues (WCAG)

### 19.1 Perceivable
```
□ Images missing alt text
□ Alt text not descriptive
□ Decorative images have alt text (should be empty)
□ Audio/video missing captions
□ Audio/video missing transcript
□ Color only conveys information
□ Color contrast insufficient (4.5:1 text, 3:1 large)
□ Text cannot be resized to 200%
□ Content requires horizontal scrolling at 320px
□ Information lost when zoomed
```

### 19.2 Operable
```
□ Not keyboard accessible
□ Keyboard trap exists
□ Focus not visible
□ Focus order illogical
□ Skip links missing
□ Page title not descriptive
□ Link text not descriptive
□ Heading structure incorrect
□ No way to stop animations
□ Flashing content (seizure risk)
□ Time limits not adjustable
□ Touch target too small (44x44)
```

### 19.3 Understandable
```
□ Language not specified
□ Language changes not marked
□ Abbreviations not explained
□ Error not described
□ Error not linked to field
□ Error suggestion not provided
□ Consistent navigation not maintained
□ Consistent identification not maintained
□ Required fields not indicated
□ Input purpose not identified
```

### 19.4 Robust
```
□ Invalid HTML markup
□ ARIA roles misused
□ ARIA states not updated
□ Name, role, value not exposed
□ Status messages not announced
□ Live regions not used correctly
□ Custom components not accessible
□ Third-party widgets not accessible
```

---

## Category 20: Mobile-Specific Issues

### 20.1 Responsive Design
```
□ Viewport not configured
□ Touch targets too small
□ Hover-only interactions
□ Pinch-zoom disabled unnecessarily
□ Fixed positioning issues
□ Landscape orientation not supported
□ Viewport units (vh) issues on mobile
□ Safe area insets not handled
□ Notch/punch hole not handled
□ Soft keyboard obscures input
```

### 20.2 Mobile Network
```
□ No offline support
□ Large payloads on mobile
□ No request prioritization
□ Images not optimized
□ No lazy loading
□ Service worker not used
□ App shell not cached
□ Background sync not used
□ Push notifications broken
```

### 20.3 Mobile Platform
```
□ Deep links not working
□ Universal links not configured
□ App store assets missing
□ App permissions not explained
□ Platform-specific gestures missing
□ Share functionality missing
□ Clipboard access issues
□ File picker issues
□ Camera access issues
□ Location access issues
```

---

## Category 21: Internationalization (i18n)

### 21.1 Translation Issues
```
□ Hardcoded strings
□ String concatenation (word order)
□ Pluralization not handled
□ Gender agreement not handled
□ Context not provided for translators
□ Truncation due to length differences
□ Translation keys missing
□ Fallback language not configured
□ Translation loading fails silently
□ Machine translation not reviewed
```

### 21.2 Locale Issues
```
□ Date format not localized
□ Time format not localized
□ Number format not localized
□ Currency format not localized
□ Sorting/collation locale-unaware
□ Search not locale-aware
□ Text direction (RTL) not handled
□ Font not supporting all scripts
□ Line breaking not locale-aware
□ Address format not localized
□ Phone format not localized
□ Postal code validation locale-specific
```

### 21.3 Content Issues
```
□ Legal content not localized
□ Marketing content not localized
□ Images with text not localized
□ Videos not localized
□ PDF/documents not localized
□ Emails not localized
□ Error messages not localized
□ Date picker not localized
□ Form labels not localized
□ Accessibility text not localized
```

---

## Testing Execution Matrix

For each category above, execute:

| Test Type | What to Test | Tool/Method |
|-----------|--------------|-------------|
| Unit | Individual functions | Jest, Mocha |
| Integration | Component interaction | Supertest, TestContainers |
| Contract | API shape | OpenAPI validation |
| E2E | User flows | Playwright, Cypress |
| Security | OWASP Top 10 | OWASP ZAP, Burp Suite |
| Performance | Load, stress | k6, Artillery |
| Accessibility | WCAG 2.2 | axe-core, WAVE |
| Visual | Regression | Percy, Chromatic |
| Chaos | Resilience | Chaos Monkey |
| Fuzzing | Edge cases | AFL, libFuzzer |

---

## Automated Testing Triggers

Run specific tests when:

| Change Type | Tests to Run |
|-------------|--------------|
| API endpoint changed | Contract tests, Integration tests |
| Database schema changed | Migration tests, Data integrity tests |
| Auth logic changed | Security tests, Auth flow tests |
| UI component changed | Visual regression, Accessibility tests |
| Dependency updated | Security scan, Full regression |
| Config changed | Environment tests, Integration tests |
| New feature added | Full test suite |
| Bug fix | Specific regression + related tests |

---

## Bug Prevention Checklist

Before every deployment, verify:

```
□ All test categories executed
□ No critical/high security issues
□ No accessibility violations
□ Performance within thresholds
□ Error rates within SLO
□ All environments tested
□ Rollback tested
□ Monitoring alerts configured
□ Runbooks updated
□ Release notes complete
```
