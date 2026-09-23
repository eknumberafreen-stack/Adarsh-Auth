"""
================================================================
  AdarshAuth — Python Example Application
  Interactive CLI Login, Registration & License Authentication
================================================================
"""

import sys
import adarshauth

# ── Configure Your Application Credentials ─────────────────────
# Replace with your credentials from https://adarshauth.store/dashboard/applications
APP_NAME    = "Adarsh Internal"
OWNER_ID    = "uYwqaPDGiD"
APP_SECRET  = "bdcdd245ee4df9e2baa3872f412755d98554fb398558bd0d3b8affc16353a9fd"
APP_VERSION = "1.0"
API_URL     = "https://adarshauth.store/api/client"


def print_banner():
    banner = r"""
       _       _                _        _         _   _     
      / \   __| | __ _ _ __ ___| |__    / \  _   _| |_| |__  
     / _ \ / _` |/ _` | '__/ __| '_ \  / _ \| | | | __| '_ \ 
    / ___ \ (_| | (_| | |  \__ \ | | |/ ___ \ |_| | |_| | | |
   /_/   \_\__,_|\__,_|_|  |___/_| |_/_/   \_\__,_|\__|_| |_|
    """
    print(banner)
    print("=" * 62)
    print("  Official Python Authentication Client")
    print("  Dashboard: https://adarshauth.store")
    print("=" * 62)


def main():
    print_banner()

    print("\n[*] Initializing AdarshAuth client...")
    auth = adarshauth.api(
        name=APP_NAME,
        ownerid=OWNER_ID,
        secret=APP_SECRET,
        version=APP_VERSION,
        url=API_URL
    )

    try:
        if not auth.init():
            print(f"[-] Initialization Failed: {auth.response.message}")
            input("\nPress Enter to exit...")
            sys.exit(1)
    except Exception as e:
        print(f"[-] Connection Error: {e}")
        input("\nPress Enter to exit...")
        sys.exit(1)

    print(f"[+] Initialized successfully! Version: {auth.app_data.version}")

    print("\nSelect an option:")
    print("  [1] Login (Username & Password)")
    print("  [2] Register (Username, Password & License Key)")
    print("  [3] License Key Only")
    print("  [4] Exit")

    choice = input("\nOption [1-4]: ").strip()

    if choice == "1":
        username = input("Username: ").strip()
        password = input("Password: ").strip()
        print("\n[*] Logging in...")
        if auth.login(username, password):
            print("\n[+] Authentication Successful!")
        else:
            print(f"\n[-] Login Failed: {auth.response.message}")
            input("\nPress Enter to exit...")
            sys.exit(1)

    elif choice == "2":
        username = input("Username: ").strip()
        password = input("Password: ").strip()
        license_key = input("License Key: ").strip()
        print("\n[*] Registering account...")
        if auth.register(username, password, license_key):
            print("\n[+] Registration & Login Successful!")
        else:
            print(f"\n[-] Registration Failed: {auth.response.message}")
            input("\nPress Enter to exit...")
            sys.exit(1)

    elif choice == "3":
        license_key = input("License Key: ").strip()
        print("\n[*] Activating license key...")
        if auth.license(license_key):
            print("\n[+] License Key Validated Successfully!")
        else:
            print(f"\n[-] Activation Failed: {auth.response.message}")
            input("\nPress Enter to exit...")
            sys.exit(1)

    elif choice == "4":
        print("\nExiting...")
        sys.exit(0)
    else:
        print("\n[-] Invalid option selected.")
        sys.exit(1)

    # Display User Details
    print("-" * 50)
    print("               USER PROFILE DATA")
    print("-" * 50)
    print(f"  Username     : {auth.user_data.username}")
    print(f"  IP Address   : {auth.user_data.ip}")
    print(f"  HWID         : {auth.user_data.hwid}")
    print(f"  Subscription : {auth.user_data.subscription}")
    print(f"  Expiry Date  : {auth.user_data.expiry}")
    print(f"  Created Date : {auth.user_data.createdate}")
    print(f"  Last Login   : {auth.user_data.lastlogin}")
    print("-" * 50)

    # Session verification test
    print("\n[*] Verifying active session with server...")
    if auth.check():
        print("[+] Session verified active!")
    else:
        print("[-] Session invalid or expired.")

    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
