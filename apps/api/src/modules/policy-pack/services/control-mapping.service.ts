/**
 * Control Mapping Service
 * Maps policies to compliance frameworks: ISO 27001, NIST CSF, OWASP ASVS
 */
import { Injectable, Logger } from '@nestjs/common';
import { ControlMapping, ComplianceFramework, MappingStrength } from '../types';

interface FrameworkControl {
  id: string;
  description: string;
  dimensionKeys: string[];
}

@Injectable()
export class ControlMappingService {
  private readonly logger = new Logger(ControlMappingService.name);

  /**
   * Control mappings by framework
   */
  private readonly controlMaps: Record<ComplianceFramework, FrameworkControl[]> = {
    [ComplianceFramework.ISO_27001]: [
      // Annex A Controls
      {
        id: 'A.5.1',
        description: 'Policies for information security',
        dimensionKeys: ['compliance_policy', 'arch_sec'],
      },
      {
        id: 'A.5.2',
        description: 'Information security roles and responsibilities',
        dimensionKeys: ['people_change'],
      },
      {
        id: 'A.6.1',
        description: 'Internal organization',
        dimensionKeys: ['strategy', 'people_change'],
      },
      { id: 'A.6.2', description: 'Mobile devices and teleworking', dimensionKeys: ['arch_sec'] },
      {
        id: 'A.7.1',
        description: 'Human resource security - Prior to employment',
        dimensionKeys: ['people_change'],
      },
      { id: 'A.7.2', description: 'During employment', dimensionKeys: ['people_change'] },
      {
        id: 'A.7.3',
        description: 'Termination and change of employment',
        dimensionKeys: ['people_change'],
      },
      {
        id: 'A.8.1',
        description: 'Asset management - Responsibility for assets',
        dimensionKeys: ['data_ai'],
      },
      {
        id: 'A.8.2',
        description: 'Information classification',
        dimensionKeys: ['data_ai', 'privacy_legal'],
      },
      { id: 'A.8.3', description: 'Media handling', dimensionKeys: ['data_ai'] },
      {
        id: 'A.9.1',
        description: 'Access control - Business requirements',
        dimensionKeys: ['arch_sec'],
      },
      { id: 'A.9.2', description: 'User access management', dimensionKeys: ['arch_sec'] },
      {
        id: 'A.9.3',
        description: 'User responsibilities',
        dimensionKeys: ['arch_sec', 'people_change'],
      },
      {
        id: 'A.9.4',
        description: 'System and application access control',
        dimensionKeys: ['arch_sec', 'devops_iac'],
      },
      { id: 'A.10.1', description: 'Cryptographic controls', dimensionKeys: ['arch_sec'] },
      {
        id: 'A.11.1',
        description: 'Physical security - Secure areas',
        dimensionKeys: ['arch_sec'],
      },
      { id: 'A.11.2', description: 'Equipment', dimensionKeys: ['arch_sec', 'service_ops'] },
      {
        id: 'A.12.1',
        description: 'Operations security - Operational procedures',
        dimensionKeys: ['devops_iac', 'service_ops'],
      },
      {
        id: 'A.12.2',
        description: 'Protection from malware',
        dimensionKeys: ['arch_sec', 'devops_iac'],
      },
      { id: 'A.12.3', description: 'Backup', dimensionKeys: ['devops_iac', 'service_ops'] },
      {
        id: 'A.12.4',
        description: 'Logging and monitoring',
        dimensionKeys: ['devops_iac', 'arch_sec'],
      },
      {
        id: 'A.12.5',
        description: 'Control of operational software',
        dimensionKeys: ['devops_iac'],
      },
      {
        id: 'A.12.6',
        description: 'Technical vulnerability management',
        dimensionKeys: ['arch_sec', 'devops_iac'],
      },
      {
        id: 'A.12.7',
        description: 'Information systems audit considerations',
        dimensionKeys: ['compliance_policy'],
      },
      {
        id: 'A.13.1',
        description: 'Communications security - Network security',
        dimensionKeys: ['arch_sec', 'devops_iac'],
      },
      { id: 'A.13.2', description: 'Information transfer', dimensionKeys: ['arch_sec', 'data_ai'] },
      {
        id: 'A.14.1',
        description: 'Security requirements of information systems',
        dimensionKeys: ['requirements', 'arch_sec'],
      },
      {
        id: 'A.14.2',
        description: 'Security in development and support',
        dimensionKeys: ['devops_iac', 'quality_test'],
      },
      { id: 'A.14.3', description: 'Test data', dimensionKeys: ['quality_test', 'privacy_legal'] },
      { id: 'A.15.1', description: 'Supplier relationships', dimensionKeys: ['compliance_policy'] },
      {
        id: 'A.15.2',
        description: 'Supplier service delivery management',
        dimensionKeys: ['service_ops'],
      },
      { id: 'A.16.1', description: 'Incident management', dimensionKeys: ['service_ops'] },
      {
        id: 'A.17.1',
        description: 'Business continuity - Information security continuity',
        dimensionKeys: ['service_ops'],
      },
      { id: 'A.17.2', description: 'Redundancies', dimensionKeys: ['devops_iac', 'arch_sec'] },
      {
        id: 'A.18.1',
        description: 'Compliance with legal and contractual requirements',
        dimensionKeys: ['compliance_policy', 'privacy_legal'],
      },
      {
        id: 'A.18.2',
        description: 'Information security reviews',
        dimensionKeys: ['quality_test', 'compliance_policy'],
      },
    ],

    [ComplianceFramework.NIST_CSF]: [
      // Identify (ID)
      {
        id: 'ID.AM-1',
        description: 'Physical devices and systems inventoried',
        dimensionKeys: ['devops_iac'],
      },
      {
        id: 'ID.AM-2',
        description: 'Software platforms and applications inventoried',
        dimensionKeys: ['devops_iac'],
      },
      { id: 'ID.AM-3', description: 'Data flows mapped', dimensionKeys: ['data_ai', 'arch_sec'] },
      {
        id: 'ID.BE-1',
        description: 'Organization role in supply chain identified',
        dimensionKeys: ['strategy'],
      },
      {
        id: 'ID.GV-1',
        description: 'Organizational cybersecurity policy established',
        dimensionKeys: ['compliance_policy'],
      },
      {
        id: 'ID.GV-2',
        description: 'Cybersecurity roles and responsibilities coordinated',
        dimensionKeys: ['people_change'],
      },
      {
        id: 'ID.RA-1',
        description: 'Asset vulnerabilities identified',
        dimensionKeys: ['arch_sec'],
      },
      { id: 'ID.RA-3', description: 'Threats identified', dimensionKeys: ['arch_sec'] },
      {
        id: 'ID.RA-5',
        description: 'Risk responses identified',
        dimensionKeys: ['compliance_policy'],
      },
      {
        id: 'ID.RM-1',
        description: 'Risk management processes established',
        dimensionKeys: ['compliance_policy', 'strategy'],
      },

      // Protect (PR)
      {
        id: 'PR.AC-1',
        description: 'Identities and credentials managed',
        dimensionKeys: ['arch_sec'],
      },
      { id: 'PR.AC-3', description: 'Remote access managed', dimensionKeys: ['arch_sec'] },
      { id: 'PR.AC-4', description: 'Access permissions managed', dimensionKeys: ['arch_sec'] },
      {
        id: 'PR.AT-1',
        description: 'Users are informed and trained',
        dimensionKeys: ['people_change'],
      },
      {
        id: 'PR.DS-1',
        description: 'Data-at-rest protected',
        dimensionKeys: ['arch_sec', 'data_ai'],
      },
      { id: 'PR.DS-2', description: 'Data-in-transit protected', dimensionKeys: ['arch_sec'] },
      {
        id: 'PR.DS-5',
        description: 'Protections against data leaks',
        dimensionKeys: ['arch_sec', 'data_ai'],
      },
      {
        id: 'PR.IP-1',
        description: 'Baseline configuration created',
        dimensionKeys: ['devops_iac'],
      },
      {
        id: 'PR.IP-2',
        description: 'SDLC to manage systems implemented',
        dimensionKeys: ['devops_iac', 'quality_test'],
      },
      {
        id: 'PR.IP-9',
        description: 'Response and recovery plans tested',
        dimensionKeys: ['service_ops'],
      },
      {
        id: 'PR.IP-12',
        description: 'Vulnerability management plan developed',
        dimensionKeys: ['arch_sec', 'devops_iac'],
      },
      {
        id: 'PR.MA-1',
        description: 'Maintenance performed and logged',
        dimensionKeys: ['service_ops'],
      },
      {
        id: 'PR.PT-1',
        description: 'Audit/log records determined',
        dimensionKeys: ['devops_iac', 'compliance_policy'],
      },

      // Detect (DE)
      {
        id: 'DE.AE-1',
        description: 'Baseline of network operations established',
        dimensionKeys: ['devops_iac'],
      },
      { id: 'DE.AE-3', description: 'Event data collected', dimensionKeys: ['devops_iac'] },
      {
        id: 'DE.CM-1',
        description: 'Network monitored',
        dimensionKeys: ['devops_iac', 'arch_sec'],
      },
      { id: 'DE.CM-4', description: 'Malicious code detected', dimensionKeys: ['arch_sec'] },
      {
        id: 'DE.CM-7',
        description: 'Unauthorized personnel, connections, devices detected',
        dimensionKeys: ['arch_sec'],
      },
      {
        id: 'DE.DP-4',
        description: 'Event detection communicated',
        dimensionKeys: ['service_ops'],
      },

      // Respond (RS)
      { id: 'RS.RP-1', description: 'Response plan executed', dimensionKeys: ['service_ops'] },
      {
        id: 'RS.CO-2',
        description: 'Incidents reported',
        dimensionKeys: ['service_ops', 'compliance_policy'],
      },
      {
        id: 'RS.AN-1',
        description: 'Notifications from detection systems investigated',
        dimensionKeys: ['service_ops'],
      },
      { id: 'RS.MI-1', description: 'Incidents contained', dimensionKeys: ['service_ops'] },
      { id: 'RS.MI-2', description: 'Incidents mitigated', dimensionKeys: ['service_ops'] },
      {
        id: 'RS.IM-1',
        description: 'Response plans incorporate lessons learned',
        dimensionKeys: ['service_ops'],
      },

      // Recover (RC)
      { id: 'RC.RP-1', description: 'Recovery plan executed', dimensionKeys: ['service_ops'] },
      {
        id: 'RC.IM-1',
        description: 'Recovery plans incorporate lessons learned',
        dimensionKeys: ['service_ops'],
      },
      {
        id: 'RC.CO-3',
        description: 'Recovery activities communicated',
        dimensionKeys: ['service_ops', 'people_change'],
      },
    ],

    [ComplianceFramework.OWASP_ASVS]: [
      // V1: Architecture
      { id: 'V1.1', description: 'Secure SDLC', dimensionKeys: ['devops_iac', 'quality_test'] },
      { id: 'V1.2', description: 'Authentication Architecture', dimensionKeys: ['arch_sec'] },
      { id: 'V1.4', description: 'Access Control Architecture', dimensionKeys: ['arch_sec'] },
      { id: 'V1.5', description: 'Input and Output Architecture', dimensionKeys: ['arch_sec'] },
      { id: 'V1.6', description: 'Cryptographic Architecture', dimensionKeys: ['arch_sec'] },
      { id: 'V1.7', description: 'Errors and Logging', dimensionKeys: ['devops_iac'] },
      {
        id: 'V1.8',
        description: 'Data Protection and Privacy',
        dimensionKeys: ['privacy_legal', 'data_ai'],
      },
      { id: 'V1.9', description: 'Communications Architecture', dimensionKeys: ['arch_sec'] },
      { id: 'V1.10', description: 'Malicious Software Architecture', dimensionKeys: ['arch_sec'] },
      { id: 'V1.11', description: 'Business Logic Architecture', dimensionKeys: ['requirements'] },
      { id: 'V1.12', description: 'Secure File Upload', dimensionKeys: ['arch_sec'] },
      { id: 'V1.14', description: 'Configuration Architecture', dimensionKeys: ['devops_iac'] },

      // V2: Authentication
      { id: 'V2.1', description: 'Password Security', dimensionKeys: ['arch_sec'] },
      { id: 'V2.2', description: 'General Authenticator Security', dimensionKeys: ['arch_sec'] },
      { id: 'V2.5', description: 'Credential Recovery', dimensionKeys: ['arch_sec'] },
      { id: 'V2.7', description: 'Out of Band Verifier', dimensionKeys: ['arch_sec'] },
      {
        id: 'V2.8',
        description: 'Single or Multi Factor One Time Verifier',
        dimensionKeys: ['arch_sec'],
      },

      // V3: Session Management
      { id: 'V3.1', description: 'Session Management', dimensionKeys: ['arch_sec'] },
      { id: 'V3.2', description: 'Session Binding', dimensionKeys: ['arch_sec'] },
      { id: 'V3.3', description: 'Session Logout and Timeout', dimensionKeys: ['arch_sec'] },

      // V4: Access Control
      { id: 'V4.1', description: 'General Access Control', dimensionKeys: ['arch_sec'] },
      { id: 'V4.2', description: 'Operation Level Access Control', dimensionKeys: ['arch_sec'] },

      // V5: Validation
      { id: 'V5.1', description: 'Input Validation', dimensionKeys: ['arch_sec', 'quality_test'] },
      { id: 'V5.2', description: 'Sanitization and Sandboxing', dimensionKeys: ['arch_sec'] },
      {
        id: 'V5.3',
        description: 'Output Encoding and Injection Prevention',
        dimensionKeys: ['arch_sec'],
      },

      // V6: Cryptography
      {
        id: 'V6.1',
        description: 'Data Classification',
        dimensionKeys: ['data_ai', 'privacy_legal'],
      },
      { id: 'V6.2', description: 'Algorithms', dimensionKeys: ['arch_sec'] },
      { id: 'V6.3', description: 'Random Values', dimensionKeys: ['arch_sec'] },

      // V7: Error Handling and Logging
      { id: 'V7.1', description: 'Log Content', dimensionKeys: ['devops_iac'] },
      { id: 'V7.2', description: 'Log Processing', dimensionKeys: ['devops_iac'] },
      { id: 'V7.3', description: 'Log Protection', dimensionKeys: ['devops_iac', 'arch_sec'] },

      // V8: Data Protection
      {
        id: 'V8.1',
        description: 'General Data Protection',
        dimensionKeys: ['data_ai', 'privacy_legal'],
      },
      { id: 'V8.2', description: 'Client-side Data Protection', dimensionKeys: ['arch_sec'] },
      { id: 'V8.3', description: 'Sensitive Private Data', dimensionKeys: ['privacy_legal'] },

      // V9: Communications
      { id: 'V9.1', description: 'Client Communications Security', dimensionKeys: ['arch_sec'] },
      { id: 'V9.2', description: 'Server Communications Security', dimensionKeys: ['arch_sec'] },

      // V10: Malicious Code
      { id: 'V10.1', description: 'Code Integrity Controls', dimensionKeys: ['devops_iac'] },
      {
        id: 'V10.2',
        description: 'Malicious Code Search',
        dimensionKeys: ['arch_sec', 'devops_iac'],
      },

      // V11: Business Logic
      {
        id: 'V11.1',
        description: 'Business Logic Security',
        dimensionKeys: ['requirements', 'quality_test'],
      },

      // V12: Files and Resources
      { id: 'V12.1', description: 'File Upload', dimensionKeys: ['arch_sec'] },
      { id: 'V12.3', description: 'File Execution', dimensionKeys: ['arch_sec'] },

      // V13: API and Web Service
      { id: 'V13.1', description: 'Generic Web Service Security', dimensionKeys: ['arch_sec'] },
      { id: 'V13.2', description: 'RESTful Web Service', dimensionKeys: ['arch_sec'] },

      // V14: Configuration
      { id: 'V14.1', description: 'Build', dimensionKeys: ['devops_iac'] },
      { id: 'V14.2', description: 'Dependency', dimensionKeys: ['devops_iac'] },
      { id: 'V14.3', description: 'Unintended Security Disclosure', dimensionKeys: ['arch_sec'] },
    ],

    // Placeholder entries for other frameworks
    [ComplianceFramework.SOC2]: [],
    [ComplianceFramework.GDPR]: [],
    [ComplianceFramework.PCI_DSS]: [],
    [ComplianceFramework.HIPAA]: [],
    [ComplianceFramework.CIS_CONTROLS]: [],
  };

  /**
   * Get control mappings for a dimension
   */
  getMappingsForDimension(
    dimensionKey: string,
    frameworks: ComplianceFramework[] = [
      ComplianceFramework.ISO_27001,
      ComplianceFramework.NIST_CSF,
      ComplianceFramework.OWASP_ASVS,
    ],
  ): ControlMapping[] {
    const mappings: ControlMapping[] = [];

    for (const framework of frameworks) {
      const controls = this.controlMaps[framework] || [];
      for (const control of controls) {
        if (control.dimensionKeys.includes(dimensionKey)) {
          mappings.push({
            framework,
            controlId: control.id,
            controlDescription: control.description,
            mappingStrength: MappingStrength.FULL,
          });
        }
      }
    }

    return mappings;
  }

  /**
   * Get all controls for a framework
   */
  getFrameworkControls(framework: ComplianceFramework): FrameworkControl[] {
    return this.controlMaps[framework] || [];
  }

  /**
   * Get coverage summary for a dimension across frameworks
   */
  getCoverageSummary(dimensionKey: string): Record<ComplianceFramework, number> {
    const summary: Record<string, number> = {};

    for (const framework of Object.values(ComplianceFramework)) {
      const controls = this.controlMaps[framework] || [];
      const matchingControls = controls.filter((c) => c.dimensionKeys.includes(dimensionKey));
      summary[framework] = matchingControls.length;
    }

    return summary as Record<ComplianceFramework, number>;
  }
}
