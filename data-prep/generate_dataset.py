"""
generate_dataset.py
===================
Deterministic synthetic IT ticket dataset generator for the HCLTech Hackathon.
Produces realistic historical IT tickets covering common enterprise scenarios,
including near-duplicates, diverse technical error codes, and verified resolutions.

Seed: 42 (reproducible)
Target size: 400 tickets
"""

import json
import random
from datetime import datetime, timedelta

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

CATEGORIES = {
    "Network": {
        "subcategories": ["VPN", "Wi-Fi", "DNS", "Firewall", "Bandwidth", "Switch/Router"],
        "services": ["Corporate VPN", "Office Wi-Fi Guest & Corp", "Internal DNS Resolver", "Edge Firewall", "Core LAN"],
        "assignment_groups": ["Network Support", "Infrastructure Operations", "Security Operations"],
        "scenarios": [
            {
                "title": "VPN disconnects with error 800 after authentication",
                "desc": "User connects to GlobalProtect VPN using MFA. After 30 seconds, connection drops with 'Error 800: Unable to establish VPN tunnel to gateway 10.240.0.1'.",
                "sub": "VPN",
                "priority": "P2",
                "intent": "Incident",
                "service": "Corporate VPN",
                "res": "Flushed local DNS cache, updated GlobalProtect client to version 6.1.2, and re-authenticated against gateway 10.240.0.1. Connection stable for 48h."
            },
            {
                "title": "GlobalProtect VPN connection drops repeatedly",
                "desc": "VPN tunnel disconnects intermittently every 5 to 10 minutes. Error log shows 'Gateway 10.240.0.1 keep-alive timeout'. Affects remote user on Windows 11.",
                "sub": "VPN",
                "priority": "P2",
                "intent": "Incident",
                "service": "Corporate VPN",
                "res": "Adjusted MTU size to 1350 on virtual network adapter and disabled IPv6 binding on WAN miniport. VPN tunnel verified stable."
            },
            {
                "title": "Cannot resolve internal hostnames via corp DNS",
                "desc": "Workstation receives error 'DNS_PROBE_FINISHED_NXDOMAIN' when pinging internal services like gitlab.corp.internal. External websites resolve correctly.",
                "sub": "DNS",
                "priority": "P3",
                "intent": "Incident",
                "service": "Internal DNS Resolver",
                "res": "DHCP option 006 lease refreshed. Pointed workstation DNS server to secondary internal resolver 10.10.1.2. Validated nslookup gitlab.corp.internal succeeded."
            },
            {
                "title": "Office 4th floor Wi-Fi signal degraded and dropping packets",
                "desc": "Multiple employees on floor 4 reporting 40% packet loss and latency spikes >800ms when connected to 'Corp-Secure-5G' SSID.",
                "sub": "Wi-Fi",
                "priority": "P1",
                "intent": "Incident",
                "service": "Office Wi-Fi Guest & Corp",
                "res": "Diagnosed rogue AP on channel 36 causing co-channel interference. Re-tuned Cisco WLC dynamic channel assignment to channel 149 and rebooted AP-4F-East."
            },
            {
                "title": "Firewall blocking outbound HTTPS traffic to AWS S3 bucket",
                "desc": "Build pipeline server 10.50.4.12 receiving HTTP 403 / connection reset when pushing deployment artifacts to s3.us-east-1.amazonaws.com.",
                "sub": "Firewall",
                "priority": "P2",
                "intent": "Incident",
                "service": "Edge Firewall",
                "res": "Updated Palo Alto firewall security rule SEC-RULE-AWS-EGRESS to whitelist outbound TCP port 443 destination FQDN *.s3.amazonaws.com."
            }
        ]
    },
    "Access & Identity": {
        "subcategories": ["Account Lockout", "Password Reset", "MFA / 2FA", "Active Directory", "Permissions / Access Request"],
        "services": ["Active Directory Domain Services", "Okta Identity Cloud", "Azure AD / Entra ID", "PAM CyberArk"],
        "assignment_groups": ["Identity & Access Management", "IT Service Desk", "Security Operations"],
        "scenarios": [
            {
                "title": "User account locked out after multiple failed logon attempts",
                "desc": "Employee account 'jdoe@corp.com' is locked out in Active Directory. Security event log shows Event ID 4625 originating from workstation WS-1049.",
                "sub": "Account Lockout",
                "priority": "P3",
                "intent": "Incident",
                "service": "Active Directory Domain Services",
                "res": "Unlocked AD account using Active Directory Users & Computers. Cleared cached stale credentials stored in Windows Credential Manager on WS-1049."
            },
            {
                "title": "Account locked out repeatedly every 15 minutes",
                "desc": "User 'asmith' gets locked out continuously even after password reset. Domain controller PDC-01 logs BadPwdCount incrementing from mobile phone Exchange ActiveSync.",
                "sub": "Account Lockout",
                "priority": "P2",
                "intent": "Incident",
                "service": "Active Directory Domain Services",
                "res": "Located offending device via lockout status tool: user's personal smartphone had old cached password in iOS Mail. Removed account profile and re-added with OAuth."
            },
            {
                "title": "Urgent self-service password reset token expired",
                "desc": "Employee returning from medical leave unable to complete SSPR. Error message: 'Verification token expired or invalid'. User is locked out of workstation.",
                "sub": "Password Reset",
                "priority": "P3",
                "intent": "Service Request",
                "service": "Okta Identity Cloud",
                "res": "Verified employee identity via voice verification with HR manager. Issued temporary one-time password (TOTP) valid for 4 hours with mandatory reset on next logon."
            },
            {
                "title": "MFA push notification not arriving on Authenticator app",
                "desc": "User upgraded to iPhone 15 and is not receiving Microsoft Authenticator push notifications. Error: 'We didn't hear from you'. User cannot access SSO portal.",
                "sub": "MFA / 2FA",
                "priority": "P2",
                "intent": "Incident",
                "service": "Azure AD / Entra ID",
                "res": "Revoked existing MFA sessions in Entra ID admin center. Re-registered user's Microsoft Authenticator app via QR code. Test push notification confirmed successful."
            },
            {
                "title": "Access request for Finance shared folder 'N:\\Finance\\FY26_Budgets'",
                "desc": "New senior financial analyst requires Read/Write permissions to restricted network share. Ticket contains approved sign-off from Finance Director.",
                "sub": "Permissions / Access Request",
                "priority": "P3",
                "intent": "Service Request",
                "service": "Active Directory Domain Services",
                "res": "Added user account to security group 'SG-FIN-Budgets-RW'. Synchronized group memberships across domain controllers. Verified NTFS ACL inheritance."
            }
        ]
    },
    "Hardware": {
        "subcategories": ["Laptop", "Desktop", "Monitor", "Printer", "Docking Station", "Peripheral"],
        "services": ["End User Computing", "Print Server Services", "Hardware Asset Management"],
        "assignment_groups": ["Desktop Support", "Field Services", "Hardware Operations"],
        "scenarios": [
            {
                "title": "Dell Latitude 5430 battery swelling and keyboard bulging",
                "desc": "User reports trackpad is unresponsive and keyboard is visibly raised. Laptop chassis is separating. Safety hazard reported.",
                "sub": "Laptop",
                "priority": "P1",
                "intent": "Incident",
                "service": "End User Computing",
                "res": "Immediately powered off machine for safety. Issued loaner Dell Latitude 7440, migrated BitLocker-encrypted NVMe data, and dispatched damaged unit for hazardous battery replacement under warranty."
            },
            {
                "title": "Network printer PRN-FL3-COLOR in error state with paper jam 13.00.00",
                "desc": "Floor 3 shared HP LaserJet Enterprise MFP M608 displays error code '13.00.00 Paper Jam inside top cover'. Print queue currently has 28 jobs backed up.",
                "sub": "Printer",
                "priority": "P3",
                "intent": "Incident",
                "service": "Print Server Services",
                "res": "Cleared crumpled cardstock trapped in fuser assembly. Cleaned pickup rollers with isopropyl alcohol. Restarted Windows Print Spooler on PRINT-SRV-02 and cleared queue."
            },
            {
                "title": "Dual monitor display flickering via Thunderbolt docking station",
                "desc": "External 4K Dell monitors connected via WD19TBS dock intermittently turn black for 3 seconds then recover. Occurs when opening GPU-intensive applications.",
                "sub": "Docking Station",
                "priority": "P3",
                "intent": "Incident",
                "service": "End User Computing",
                "res": "Flashed dock firmware to release 01.00.25. Updated Intel Iris Xe Graphics driver to 31.0.101.4575. Replaced passive DisplayPort cables with VESA-certified DP 1.4 cables."
            },
            {
                "title": "Blue Screen of Death (BSOD) DRIVER_IRQL_NOT_LESS_OR_EQUAL on boot",
                "desc": "Engineering workstation crashes on startup with stop code 0x000000D1 pointing to offending driver 'nvlddmkm.sys'. System reboots into automatic repair loop.",
                "sub": "Desktop",
                "priority": "P2",
                "intent": "Incident",
                "service": "End User Computing",
                "res": "Booted system into Windows Safe Mode. Ran Display Driver Uninstaller (DDU) to purge corrupted graphics driver. Installed certified NVIDIA Studio Driver 537.58. Ran MemTest86 with 0 errors."
            }
        ]
    },
    "Software": {
        "subcategories": ["Operating System", "Office 365", "Browser", "Developer Tools", "VPN Client", "Antivirus"],
        "services": ["Endpoint Management (Intune)", "Microsoft 365 Suite", "CrowdStrike Falcon", "Enterprise Browser Services"],
        "assignment_groups": ["Desktop Support", "Application Support", "Security Operations"],
        "scenarios": [
            {
                "title": "Microsoft Outlook crashing immediately upon opening profile",
                "desc": "Outlook 365 crashes with Event ID 1000 in Application Event Log. Faulting module name: OUTLMAPI.DLL. Safe mode 'outlook.exe /safe' boots normally.",
                "sub": "Office 365",
                "priority": "P3",
                "intent": "Incident",
                "service": "Microsoft 365 Suite",
                "res": "Identified conflicting third-party Adobe PDF COM Add-in. Disabled offending add-in in Outlook trust center. Rebuilt local OST cache by renaming Outlook.ost. Outlook running normally."
            },
            {
                "title": "Software installation error 0x80070005 Access is denied during CAD install",
                "desc": "AutoCAD 2026 deployment fails via Company Portal with exit code 0x80070005. Antivirus telemetry shows quarantine event for setup executable temp file.",
                "sub": "Developer Tools",
                "priority": "P2",
                "intent": "Incident",
                "service": "Endpoint Management (Intune)",
                "res": "Whitelisted SHA-256 hash of signed Autodesk installer in CrowdStrike Falcon console. Cleared C:\\Windows\\Temp installer staging directory. Reran install via Intune management extension successfully."
            },
            {
                "title": "Google Chrome showing STATUS_ACCESS_VIOLATION on intranet portals",
                "desc": "Enterprise Chrome browser crashes with Aw Snap code 'STATUS_ACCESS_VIOLATION' when loading internal SAP WebGUI portal. Edge works intermittently.",
                "sub": "Browser",
                "priority": "P3",
                "intent": "Incident",
                "service": "Enterprise Browser Services",
                "res": "Cleared browser local profile storage and disabled hardware acceleration in chrome://settings/system. Pushed standardized Chrome GPO policy v122.0 to workstation."
            },
            {
                "title": "Windows Update failure error 0x80248007 on Windows 11 Enterprise",
                "desc": "Cumulative update KB5034441 fails repeatedly at 78% progress bar with error code 0x80248007. Windows update troubleshooter detects database corruption.",
                "sub": "Operating System",
                "priority": "P3",
                "intent": "Incident",
                "service": "Endpoint Management (Intune)",
                "res": "Stopped wuauserv and bits services. Purged corrupted software distribution catalog at C:\\Windows\\SoftwareDistribution. Ran 'DISM /Online /Cleanup-Image /RestoreHealth' followed by 'sfc /scannow'. Update completed."
            }
        ]
    },
    "Server & Infrastructure": {
        "subcategories": ["Web Server", "Database", "Virtual Machine", "Storage & Backup", "Cloud Service"],
        "services": ["Linux Application Cluster", "PostgreSQL Database Service", "VMware vSphere Cluster", "SAN Storage PureStorage"],
        "assignment_groups": ["Infrastructure Operations", "Database Administration", "Cloud Operations"],
        "scenarios": [
            {
                "title": "Production API gateway returning HTTP 502 Bad Gateway to clients",
                "desc": "Nginx reverse proxy server web-gw-prod01 returning HTTP 502. Upstream connection refused on socket 127.0.0.1:8080. CPU utilization at 100%.",
                "sub": "Web Server",
                "priority": "P1",
                "intent": "Incident",
                "service": "Linux Application Cluster",
                "res": "Diagnosed Out-Of-Memory (OOM) killer terminating Node.js worker processes. Increased container memory ceiling from 2GB to 6GB and enabled horizontal pod autoscaler (HPA) to scale to 8 replicas."
            },
            {
                "title": "Database connection pool exhausted on prod-db-01.corp",
                "desc": "Application logs show 'FATAL: remaining connection slots are reserved for non-superuser connections'. Active connection count reached max_connections=200.",
                "sub": "Database",
                "priority": "P1",
                "intent": "Incident",
                "service": "PostgreSQL Database Service",
                "res": "Terminated 84 idle in transaction connections from leaked background billing cron job. Configured PgBouncer connection pooling layer with transaction mode and max_client_conn=1000."
            },
            {
                "title": "ESXi host host-04.datacenter lost storage path to SAN lun_vmfs_02",
                "desc": "VMware vCenter alert: Storage connectivity degraded on Host 04. Fiber channel HBA port 1 reporting link status DOWN. 14 production VMs running in degraded read-only mode.",
                "sub": "Virtual Machine",
                "priority": "P1",
                "intent": "Incident",
                "service": "VMware vSphere Cluster",
                "res": "Initiated automated vSphere Storage vMotion to migrate affected VMs to host-02. Replaced faulty optical SFP+ transceiver on Brocade FC switch port 12. Storage multipathing verified ACTIVE-OPTIMIZED."
            },
            {
                "title": "Backup job failed: VSS writer error code 0x800423f4 on FileServer-01",
                "desc": "Veeam backup job DAILY_FILESHARE failed. Log output: 'VSS control error: Freeze timeout. System Writer is in state Failed'.",
                "sub": "Storage & Backup",
                "priority": "P2",
                "intent": "Incident",
                "service": "SAN Storage PureStorage",
                "res": "Inspected 'vssadmin list writers' which reported System Writer error. Re-registered VSS DLL components in C:\\Windows\\System32 and increased shadow copy storage limit from 10GB to UNBOUNDED."
            }
        ]
    },
    "Email & Collaboration": {
        "subcategories": ["Outlook / Exchange", "Microsoft Teams", "Shared Mailbox", "Calendar / Scheduling"],
        "services": ["Exchange Online", "Microsoft Teams", "Microsoft 365 Cloud"],
        "assignment_groups": ["Collaboration Support", "IT Service Desk", "Exchange Admin"],
        "scenarios": [
            {
                "title": "Emails stuck in Outlook Outbox not sending to external recipients",
                "desc": "User reports 12 emails with attachments >25MB queued in Outbox with send/receive error 0x8004210B. Inbound email delivery works without issue.",
                "sub": "Outlook / Exchange",
                "priority": "P3",
                "intent": "Incident",
                "service": "Exchange Online",
                "res": "Identified outgoing attachment size exceeded Exchange Online tenant policy limit (35MB). Configured OneDrive link sharing for large files. Removed stuck message from Outbox and verified mail flow."
            },
            {
                "title": "User unable to access Shared Mailbox 'procurement-inbox@corp.com'",
                "desc": "Procurement officer receives access denied when expanding shared mailbox in Outlook desktop: 'Cannot display the folder. Microsoft Outlook cannot access the specified folder location.'",
                "sub": "Shared Mailbox",
                "priority": "P3",
                "intent": "Incident",
                "service": "Exchange Online",
                "res": "Checked Exchange Online permissions. Added FullAccess and SendAs permissions via PowerShell: 'Add-MailboxPermission -Identity procurement-inbox -User employee@corp.com -AccessRights FullAccess -AutoMapping $true'."
            },
            {
                "title": "Microsoft Teams microphone and video feed glitching during conference calls",
                "desc": "Teams desktop client video feed freezes after 2 minutes of meeting. Audio cuts in and out with error 'Your network is causing poor call quality'.",
                "sub": "Microsoft Teams",
                "priority": "P2",
                "intent": "Incident",
                "service": "Microsoft Teams",
                "res": "Cleared Teams desktop app cache in %appdata%\\Microsoft\\Teams. Disabled GPU hardware acceleration in Teams application settings. Verified QoS DSCP packet markings on local network switch."
            },
            {
                "title": "Room booking calendar decline: Conflicting meeting room reservation",
                "desc": "Executive assistant unable to book Executive Boardroom 10A for board meeting. Calendar auto-attendant rejects meeting invite with conflicting recurring orphaned instance.",
                "sub": "Calendar / Scheduling",
                "priority": "P3",
                "intent": "Incident",
                "service": "Exchange Online",
                "res": "Connected to Exchange Online PowerShell. Executed 'Remove-CalendarEvents -Identity ExecutiveBoardroom10A -CancelOrganizedMeetings' for deleted employee's orphaned series. Successfully booked requested slot."
            }
        ]
    }
}

ENVIRONMENTS = ["Production", "Staging", "Development", "QA", "DR"]
ENV_WEIGHTS = [0.65, 0.15, 0.10, 0.07, 0.03]

STATUSES = ["Resolved", "Closed", "In Progress", "Assigned", "New", "Pending"]
STATUS_WEIGHTS = [0.75, 0.10, 0.07, 0.04, 0.03, 0.01]

DATA_ACCESS_LEVELS = ["internal", "confidential", "restricted", "public"]
ACCESS_LEVEL_WEIGHTS = [0.75, 0.15, 0.08, 0.02]

BASE_DATE = datetime(2026, 1, 1, 8, 0, 0)

def generate_ticket(idx):
    ticket_id = f"INC-{1000 + idx}"
    
    # Select category
    cat_name = random.choice(list(CATEGORIES.keys()))
    cat_data = CATEGORIES[cat_name]
    
    # Pick a base scenario
    scenario = random.choice(cat_data["scenarios"])
    
    # Determine variation / near-duplicate style
    # In ~15% of tickets, introduce realistic title/desc variations to simulate duplicate incident families
    is_duplicate_variation = (idx % 7 == 0)
    
    title = scenario["title"]
    desc = scenario["desc"]
    
    if is_duplicate_variation:
        prefixes = ["[URGENT] ", "RE: Incident - ", "Ticket Escalation: ", "Fwd: Problem: ", "Recurring issue: "]
        suffixes = [" - please assist ASAP", " (affecting multiple users)", " [Host: prod-srv-01]", " - recurring since morning"]
        title = random.choice(prefixes) + title + (random.choice(suffixes) if random.random() > 0.5 else "")
        desc = f"Reporting again: {desc} Contact extension 4402 if needed."

    subcategory = scenario["sub"]
    priority = scenario["priority"]
    intent = scenario["intent"]
    affected_service = scenario["service"]
    assignment_group = random.choice(cat_data["assignment_groups"])
    
    # Environment
    env = random.choices(ENVIRONMENTS, weights=ENV_WEIGHTS)[0]
    
    # Status
    status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
    
    # Timestamps
    created_offset_hours = random.randint(1, 1000)
    created_at = BASE_DATE + timedelta(hours=created_offset_hours, minutes=random.randint(0, 59))
    
    resolution_text = None
    resolved_at = None
    
    if status in ["Resolved", "Closed"]:
        resolution_text = scenario["res"]
        resolution_duration_hours = random.randint(1, 48)
        resolved_at = created_at + timedelta(hours=resolution_duration_hours, minutes=random.randint(5, 55))
    
    access_level = random.choices(DATA_ACCESS_LEVELS, weights=ACCESS_LEVEL_WEIGHTS)[0]
    
    ticket = {
        "ticket_id": ticket_id,
        "title": title,
        "description": desc,
        "raw_text": f"Title: {title}\nDescription: {desc}",
        "category": cat_name,
        "subcategory": subcategory,
        "priority": priority,
        "intent": intent,
        "affected_service": affected_service,
        "environment": env,
        "status": status,
        "assignment_group": assignment_group,
        "resolution_text": resolution_text,
        "created_at": created_at.isoformat() + "Z",
        "resolved_at": resolved_at.isoformat() + "Z" if resolved_at else None,
        "source_type": "synthetic",
        "data_access_level": access_level
    }
    
    return ticket

def main():
    total_tickets = 400
    tickets = [generate_ticket(i + 1) for i in range(total_tickets)]
    
    output_path = "../dataset/historical_tickets_raw.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(tickets, f, indent=2)
        
    print(f"Generated {len(tickets)} synthetic tickets successfully at {output_path}")

if __name__ == "__main__":
    main()
