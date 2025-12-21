# NFR Implementation Plan
## Missing or Partially Implemented Requirements (Ordered: Easy → Hard)

---

## 🟢 EASY (1-2 days each)

### 1. Account Lockout After Failed Login Attempts
**NFR:** Lock accounts after 5 failed login attempts.

**Current Status:** Planned but not clearly implemented.

**Implementation Steps:**
1. Add account lockout fields to Firestore user document (`security` section):
   - `failedLoginAttempts` (number, default: 0)
   - `accountLockedUntil` (timestamp, nullable)
   - `lastFailedLoginAttempt` (timestamp, nullable)
2. Create backend endpoint `/api/v1/auth/check-lockout` to check lockout status before sign-in
3. Create backend endpoint `/api/v1/auth/record-failed-attempt` to increment failed attempts counter
4. Create backend endpoint `/api/v1/auth/reset-failed-attempts` to reset counter on successful login
5. Modify frontend `lib/auth.ts` to check lockout status BEFORE attempting Firebase sign-in
6. On failed Firebase sign-in, call backend to record failed attempt
7. Lock account (set `accountLockedUntil` timestamp) after 5 failed attempts
8. Implement lockout duration (30 minutes default, configurable)
9. Check lockout status and show appropriate error messages
10. Auto-unlock after lockout duration expires
11. Log lockout events for security audit

**Files to Modify:**
- Backend: `backend/app/services/firebase_service.py` - Add lockout fields to user creation
- Backend: `backend/app/api/v1/auth.py` - Add lockout endpoints
- Frontend: `lib/auth.ts` - Check lockout before sign-in, record failures
- Frontend: `app/sign-in/page.tsx` - Show lockout messages
- Admin: Add unlock functionality in admin panel (future)

**Estimated Effort:** 1-2 days

---

### 2. Workflow Execution Timing Optimization
**NFR:** Workflow execution shall commence within 5 seconds of trigger activation.

**Current Status:** Timing is tracked but not optimized.

**Implementation Steps:**
1. Add detailed timing metrics for workflow trigger → execution start
2. Identify bottlenecks in workflow initialization
3. Implement async/parallel processing for workflow setup
4. Add queue prioritization for time-sensitive workflows
5. Optimize database queries during workflow initialization
6. Cache frequently accessed workflow configurations
7. Set up monitoring alerts if execution start exceeds 5 seconds
8. Add performance dashboard showing workflow execution start times

**Files to Modify:**
- Backend: Workflow execution engine (`backend/app/workflow/` or similar)
- Backend: Trigger handling logic
- Backend: Analytics/monitoring service
- Frontend: Admin performance dashboard

**Estimated Effort:** 2-3 days

---

## 🟡 MEDIUM (3-5 days each)

### 3. Multi-Factor Authentication (MFA) UI Implementation
**NFR:** System shall implement multi-factor authentication.

**Current Status:** MFA support mentioned in documentation but not fully implemented in UI.

**Implementation Steps:**
1. Review existing MFA backend implementation (if any)
2. Create MFA setup UI component (TOTP QR code display, backup codes)
3. Create MFA verification UI component (OTP input)
4. Add MFA toggle in user settings/profile page
5. Integrate MFA check in login flow
6. Add MFA recovery flow (backup codes, email recovery)
7. Update session management to require MFA verification
8. Add admin controls for MFA enforcement policies
9. Test with authenticator apps (Google Authenticator, Authy, etc.)
10. Add user documentation/tutorial for MFA setup

**Files to Modify:**
- Backend: MFA endpoints (setup, verify, recovery)
- Frontend: `app/settings/` or `app/profile/` - MFA settings component
- Frontend: `app/sign-in/` - MFA verification step
- Frontend: User onboarding flow
- Documentation: User guide for MFA

**Estimated Effort:** 3-5 days

---

### 4. WCAG 2.1 AA Accessibility Compliance
**NFR:** Interface shall follow WCAG 2.1 AA accessibility guidelines.

**Current Status:** Accessibility considerations mentioned but not fully implemented.

**Implementation Steps:**
1. **Audit Phase:**
   - Run automated accessibility testing (axe DevTools, WAVE)
   - Manual keyboard navigation testing
   - Screen reader testing (NVDA, JAWS, VoiceOver)
   - Color contrast analysis

2. **Implementation Phase:**
   - Add ARIA labels to all interactive elements
   - Ensure proper heading hierarchy (h1-h6)
   - Add alt text to all images and icons
   - Fix color contrast ratios (minimum 4.5:1 for text)
   - Implement keyboard navigation for all features
   - Add skip navigation links
   - Ensure focus indicators are visible
   - Make forms accessible (labels, error messages, required fields)
   - Ensure modals/dialogs are keyboard accessible
   - Add screen reader announcements for dynamic content

3. **Testing Phase:**
   - Test with multiple screen readers
   - Test with keyboard-only navigation
   - Test with browser zoom (200%)
   - Validate HTML semantics

**Files to Modify:**
- All frontend components (`components/`, `app/`)
- Global styles (`app/globals.css`)
- UI component library (`components/ui/`)
- Forms and interactive elements

**Estimated Effort:** 4-5 days

---

### 5. Automated Daily Backups
**NFR:** System shall perform automated daily backups with point-in-time recovery capability.

**Current Status:** Backup settings in UI but appear configurable rather than automatic.

**Implementation Steps:**
1. **Backend Implementation:**
   - Create backup service/script (`backend/scripts/backup_service.py`)
   - Implement database backup (PostgreSQL/MySQL dump or similar)
   - Implement file storage backup (user uploads, checkpoints)
   - Add backup scheduling (cron job or task scheduler)
   - Implement incremental backup strategy
   - Add backup verification (test restore capability)
   - Store backups in secure, encrypted location
   - Implement backup retention policy (e.g., 30 days daily, 12 months monthly)

2. **Monitoring & Alerts:**
   - Add backup success/failure logging
   - Set up alerts for backup failures
   - Add backup status dashboard in admin panel
   - Track backup sizes and storage usage

3. **Recovery Implementation:**
   - Create restore script/endpoint
   - Implement point-in-time recovery selection
   - Add recovery testing procedures
   - Document recovery procedures

**Files to Create/Modify:**
- Backend: `backend/scripts/backup_service.py`
- Backend: Backup scheduling configuration
- Backend: Admin API endpoints for backup management
- Frontend: Admin backup management UI
- Documentation: Backup and recovery procedures

**Estimated Effort:** 4-5 days

---

## 🔴 HARD (1-2 weeks each)

### 6. Recovery Time Objective (RTO) and Recovery Point Objective (RPO) Implementation
**NFR:** RTO < 4 hours, RPO < 1 hour.

**Current Status:** Objectives documented but actual implementation sparse.

**Implementation Steps:**
1. **Infrastructure Setup:**
   - Set up disaster recovery (DR) environment
   - Implement automated failover mechanisms
   - Set up database replication (primary → standby)
   - Configure load balancer for automatic failover
   - Set up monitoring for DR environment health

2. **Backup Strategy Enhancement:**
   - Implement hourly backups (to meet RPO < 1 hour)
   - Set up real-time replication for critical data
   - Implement transaction log shipping (for databases)
   - Test backup restoration times

3. **Recovery Procedures:**
   - Document step-by-step recovery procedures
   - Create automated recovery scripts
   - Implement recovery testing schedule (quarterly)
   - Set up recovery time tracking
   - Create runbooks for common failure scenarios

4. **Testing & Validation:**
   - Conduct DR drills
   - Measure actual RTO and RPO
   - Optimize based on test results
   - Document lessons learned

5. **Monitoring:**
   - Add RTO/RPO metrics dashboard
   - Set up alerts for backup/replication failures
   - Track recovery time in incident reports

**Files to Create/Modify:**
- Infrastructure: DR environment configuration
- Backend: Replication and failover logic
- Backend: Recovery automation scripts
- Documentation: DR procedures and runbooks
- Admin: DR status dashboard

**Estimated Effort:** 1-2 weeks

---

### 7. PCI DSS Level 1 Full Compliance
**NFR:** System shall comply with PCI DSS Level 1 requirements for payment processing.

**Current Status:** Stripe integration exists, but full Level 1 compliance details not evident.

**Implementation Steps:**
1. **Assessment Phase:**
   - Conduct PCI DSS gap analysis
   - Identify all systems in cardholder data environment (CDE)
   - Review current security controls
   - Document network architecture

2. **Technical Implementation:**
   - **Requirement 1-2:** Network security
     - Implement firewall rules
     - Document network segmentation
     - Restrict access to CDE
   - **Requirement 3:** Protect stored cardholder data
     - Ensure no card data storage (already done via Stripe)
     - Document data flow diagrams
     - Implement data retention policies
   - **Requirement 4:** Encrypt transmission
     - Verify TLS 1.3 implementation
     - Disable insecure protocols
     - Document encryption standards
   - **Requirement 5-6:** Anti-virus and secure systems
     - Implement vulnerability management
     - Regular security patching
     - Anti-malware solutions
   - **Requirement 7-9:** Access control
     - Implement role-based access control (RBAC)
     - Document access policies
     - Restrict physical access (if applicable)
   - **Requirement 10:** Network monitoring
     - Enhance audit logging (already implemented)
     - Implement log monitoring and alerting
     - Secure log storage
   - **Requirement 11:** Security testing
     - Implement vulnerability scanning
     - Penetration testing
     - Intrusion detection/prevention
   - **Requirement 12:** Security policy
     - Create comprehensive security policy
     - Implement security awareness training
     - Incident response plan

3. **Documentation:**
   - Network diagrams
   - Data flow diagrams
   - Security policies and procedures
   - Incident response plan
   - Change management procedures
   - Access control matrices

4. **Compliance Validation:**
   - Engage with Qualified Security Assessor (QSA)
   - Complete Self-Assessment Questionnaire (SAQ) or full audit
   - Address any findings
   - Obtain Attestation of Compliance (AOC)

5. **Ongoing Maintenance:**
   - Quarterly vulnerability scans
   - Annual penetration testing
   - Regular policy reviews
   - Staff training updates

**Files to Create/Modify:**
- Infrastructure: Network security configuration
- Backend: Enhanced access controls
- Backend: Vulnerability scanning integration
- Documentation: PCI DSS compliance documentation
- Policies: Security policies and procedures
- Admin: Enhanced security monitoring dashboard

**Estimated Effort:** 2-4 weeks (depending on current state and QSA engagement)

---

## Summary Table

| Priority | NFR | Difficulty | Estimated Time | Dependencies |
|----------|-----|------------|----------------|--------------|
| 1 | Account Lockout | 🟢 Easy | 1-2 days | None |
| 2 | Workflow Execution Timing | 🟢 Easy | 2-3 days | None |
| 3 | MFA UI Implementation | 🟡 Medium | 3-5 days | Backend MFA support |
| 4 | WCAG 2.1 AA Compliance | 🟡 Medium | 4-5 days | None |
| 5 | Automated Daily Backups | 🟡 Medium | 4-5 days | Backup infrastructure |
| 6 | RTO/RPO Implementation | 🔴 Hard | 1-2 weeks | Backup system, DR infrastructure |
| 7 | PCI DSS Level 1 Compliance | 🔴 Hard | 2-4 weeks | Security infrastructure, QSA engagement |

---

## Recommended Implementation Order

1. **Week 1:** Easy items (1-2) - Quick wins, low risk
2. **Week 2-3:** Medium items (3-5) - Core functionality improvements
3. **Week 4-6:** Hard items (6-7) - Infrastructure and compliance (can run in parallel with ongoing work)

---

## Notes

- **Easy items** can be implemented in parallel by different developers
- **Medium items** may require some coordination but are mostly independent
- **Hard items** (especially PCI DSS) may require external resources (QSA, security consultants)
- Consider implementing items 1-6 before tackling items 7-8, as they provide foundation for the harder requirements
- Regular testing and validation should be part of each implementation phase

