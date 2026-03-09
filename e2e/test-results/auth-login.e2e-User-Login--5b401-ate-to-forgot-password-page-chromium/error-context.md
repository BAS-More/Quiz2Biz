# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to main content" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e5]:
    - link "Quiz2Biz" [ref=e6] [cursor=pointer]:
      - /url: /
      - img [ref=e8]
      - heading "Quiz2Biz" [level=1] [ref=e11]
    - paragraph [ref=e12]: Adaptive Client Questionnaire System
  - main [ref=e13]:
    - generic [ref=e15]:
      - heading "Forgot your password?" [level=2] [ref=e16]
      - paragraph [ref=e17]: Enter your email address and we'll send you a link to reset your password.
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: Email address
          - textbox "Email address" [ref=e21]:
            - /placeholder: you@example.com
        - button "Send reset link" [ref=e22]
      - link "Back to sign in" [ref=e24] [cursor=pointer]:
        - /url: /auth/login
        - img [ref=e25]
        - text: Back to sign in
    - generic [ref=e27]:
      - generic [ref=e28]:
        - img [ref=e29]
        - generic [ref=e31]: SSL Secured
      - generic [ref=e32]: "|"
      - link "Privacy Policy" [ref=e33] [cursor=pointer]:
        - /url: /privacy
      - generic [ref=e34]: "|"
      - link "Terms" [ref=e35] [cursor=pointer]:
        - /url: /terms
  - contentinfo [ref=e36]:
    - paragraph [ref=e37]: © 2026 Quiz2Biz. All rights reserved.
```