"""
================================================================
  AdarshAuth — Python Example Application
  Production-Grade Authentication for Python Applications
================================================================
"""

import sys
import os
import time
import platform
import adarshauth

# ── Application Credentials ────────────────────────────────────
APP_NAME    = "TESTING"
OWNER_ID    = "uYwqaPDGiD"
APP_SECRET  = "d75618f252aebbc05a1522118ed738094365844b21c4e76e46d23bfa5ce88ba1"
APP_VERSION = "1.0"
API_URL     = "https://adarshauth.store/api/client"


def clear():
    if platform.system() == 'Windows':
        os.system('cls & title AdarshAuth Python Example')
    else:
        os.system('clear')


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
    clear()
    print_banner()

    print("\n[*] Initializing AdarshAuth...")
    auth = adarshauth.api(
        name=APP_NAME,
        ownerid=OWNER_ID,
        secret=APP_SECRET,
        version=APP_VERSION,
        url=API_URL
    )

    if not auth.init():
        print(f"[-] Status: {auth.response.message}")
        time.sleep(2)
        sys.exit(1)

    print(f"[+] Status: Initialized successfully! (v{auth.app_data.version})")

    print("""
1. Login
2. Register
3. Upgrade
4. License Key Only
    """)

    ans = input("Select Option: ").strip()

    if ans == "1":
        user = input('Provide username: ').strip()
        password = input('Provide password: ').strip()
        print("\n[*] Logging in...")
        if not auth.login(user, password):
            print(f"\n[-] Status: {auth.response.message}")
            time.sleep(2)
            sys.exit(1)

    elif ans == "2":
        user = input('Provide username: ').strip()
        password = input('Provide password: ').strip()
        license_key = input('Provide License: ').strip()
        print("\n[*] Registering...")
        if not auth.register(user, password, license_key):
            print(f"\n[-] Status: {auth.response.message}")
            time.sleep(2)
            sys.exit(1)

    elif ans == "3":
        user = input('Provide username: ').strip()
        license_key = input('Provide License: ').strip()
        print("\n[*] Upgrading account...")
        if auth.upgrade(user, license_key):
            print("\n[+] Status: Successfully upgraded user account!")
        else:
            print(f"\n[-] Status: {auth.response.message}")
        time.sleep(2)
        sys.exit(0)

    elif ans == "4":
        key = input('Enter your license: ').strip()
        print("\n[*] Activating license key...")
        if not auth.license(key):
            print(f"\n[-] Status: {auth.response.message}")
            time.sleep(2)
            sys.exit(1)

    else:
        print("\n[-] Invalid option")
        time.sleep(2)
        sys.exit(1)

    print("\n[+] Logged In!")

    # Display User Data
    print("\nUser data: ")
    print("Username: " + auth.user_data.username)
    print("IP address: " + auth.user_data.ip)
    print("Hardware-Id: " + auth.user_data.hwid)

    subs = auth.user_data.subscriptions
    for i in range(len(subs)):
        sub = subs[i].get("subscription", "default")
        expiry = subs[i].get("expiry", "Lifetime")
        timeleft = subs[i].get("timeleft", expiry)
        print(f"[{i + 1} / {len(subs)}] | Subscription: {sub} - Expiry: {expiry} - Timeleft: {timeleft}")

    print("Created at: " + auth.user_data.createdate)
    if auth.user_data.lastlogin:
        print("Last login at: " + auth.user_data.lastlogin)
    print("Expires at: " + auth.user_data.expires)

    print("\n[*] Validating session with server...")
    if auth.check():
        print("[+] Session verified active!")
    else:
        print("[-] Session check failed.")

    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
