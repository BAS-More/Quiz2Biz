#!/usr/bin/env python3
"""
GoDaddy DNS Configuration Script
Configures TXT and CNAME records for Azure Container Apps custom domain
"""

import requests
import json
import sys

# GoDaddy API Configuration
API_KEY = "e4CDvNqSEYVm_UtSxc3xmWn5yqPVpGUVJea"
API_SECRET = "URFb65V3c4xkL6KqAhfuqe"
DOMAIN = "quiz2biz.com"

# DNS Records to configure
TXT_RECORD = {
    "name": "asuid.www",
    "type": "TXT",
    "data": "E1B712E425D8535DE7111DF02493351CA9886B3CAF1713AA631F3008DFC59CED",
    "ttl": 600
}

CNAME_RECORD = {
    "name": "www",
    "type": "CNAME",
    "data": "ca-questionnaire-api-dev.happycliff-f616886e.eastus.azurecontainerapps.io",
    "ttl": 3600
}

# Root domain TXT verification record
ROOT_TXT_RECORD = {
    "name": "asuid",
    "type": "TXT",
    "data": "E1B712E425D8535DE7111DF02493351CA9886B3CAF1713AA631F3008DFC59CED",
    "ttl": 600
}

# Root domain CNAME (will use @ for root)
ROOT_CNAME_RECORD = {
    "name": "@",
    "type": "CNAME",
    "data": "ca-questionnaire-api-dev.happycliff-f616886e.eastus.azurecontainerapps.io",
    "ttl": 3600
}

# GoDaddy API endpoint
BASE_URL = f"https://api.godaddy.com/v1/domains/{DOMAIN}/records"
HEADERS = {
    "Authorization": f"sso-key {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json"
}


def add_dns_record(record):
    """Add a DNS record to GoDaddy"""
    url = f"{BASE_URL}/{record['type']}/{record['name']}"

    # Try to update existing record first
    payload = [{
        "data": record["data"],
        "ttl": record["ttl"]
    }]

    print(
        f"Adding {record['type']} record: {record['name']}.{DOMAIN} -> {record['data']}")

    response = requests.put(url, headers=HEADERS, json=payload)

    if response.status_code in [200, 201]:
        print(
            f"✓ Successfully configured {record['type']} record for {record['name']}")
        return True
    else:
        print(
            f"✗ Failed to configure {record['type']} record: {response.status_code}")
        print(f"  Response: {response.text}")
        return False


def main():
    print("=" * 60)
    print("GoDaddy DNS Configuration for Azure Container Apps")
    print("=" * 60)
    print(f"Domain: {DOMAIN}\n")

    # Configure TXT record for www domain verification
    txt_success = add_dns_record(TXT_RECORD)
    print()

    # Configure TXT record for root domain verification
    root_txt_success = add_dns_record(ROOT_TXT_RECORD)
    print()

    # Configure CNAME record for www domain mapping
    cname_success = add_dns_record(CNAME_RECORD)
    print()

    # Configure CNAME record for root domain mapping
    root_cname_success = add_dns_record(ROOT_CNAME_RECORD)
    print()

    if txt_success and cname_success and root_txt_success:
        print("=" * 60)
        print("✓ DNS Configuration Complete!")
        print("=" * 60)
        print("\nDNS records configured:")
        print(f"  1. TXT: asuid.www.{DOMAIN}")
        print(f"  2. TXT: asuid.{DOMAIN}")
        print(f"  3. CNAME: www.{DOMAIN} -> Container App")
        print(f"  4. CNAME: {DOMAIN} -> Container App (if supported)")
        print("\nDNS propagation typically takes 5-15 minutes.")
        print("You can now continue with the HTTPS setup.")
        return 0
    else:
        print("=" * 60)
        print("✗ DNS Configuration Failed")
        print("=" * 60)
        print("\nPlease check the error messages above and try again.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
