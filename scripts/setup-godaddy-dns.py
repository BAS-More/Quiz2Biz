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
WWW_CNAME_RECORD = {
    "name": "www",
    "type": "CNAME",
    "data": "ca-questionnaire-web-prod.wittyriver-206156ea.australiasoutheast.azurecontainerapps.io",
    "ttl": 600
}

API_CNAME_RECORD = {
    "name": "api",
    "type": "CNAME",
    "data": "ca-questionnaire-api-prod.wittyriver-206156ea.australiasoutheast.azurecontainerapps.io",
    "ttl": 600
}

WWW_TXT_RECORD = {
    "name": "asuid.www",
    "type": "TXT",
    "data": "E1B712E425D8535DE7111DF02493351CA9886B3CAF1713AA631F3008DFC59CED",
    "ttl": 600
}

API_TXT_RECORD = {
    "name": "asuid.api",
    "type": "TXT",
    "data": "E1B712E425D8535DE7111DF02493351CA9886B3CAF1713AA631F3008DFC59CED",
    "ttl": 600
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

    # Configure CNAME record for www subdomain
    www_cname_success = add_dns_record(WWW_CNAME_RECORD)
    print()

    # Configure CNAME record for api subdomain
    api_cname_success = add_dns_record(API_CNAME_RECORD)
    print()

    # Configure TXT record for www domain verification
    www_txt_success = add_dns_record(WWW_TXT_RECORD)
    print()

    # Configure TXT record for api domain verification
    api_txt_success = add_dns_record(API_TXT_RECORD)
    print()

    if www_cname_success and api_cname_success and www_txt_success and api_txt_success:
        print("=" * 60)
        print("✓ DNS Configuration Complete!")
        print("=" * 60)
        print("\nDNS records configured:")
        print(f"  1. CNAME: www.{DOMAIN} -> Web Container App")
        print(f"  2. CNAME: api.{DOMAIN} -> API Container App")
        print(f"  3. TXT: asuid.www.{DOMAIN} (Azure verification)")
        print(f"  4. TXT: asuid.api.{DOMAIN} (Azure verification)")
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
