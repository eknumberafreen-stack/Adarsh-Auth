package com.adarshauth;

import java.util.Scanner;

public class Main {
    // ── Application Credentials ────────────────────────────────────
    private static final String APP_NAME = "TESTING";
    private static final String OWNER_ID = "uYwqaPDGiD";
    private static final String APP_SECRET = "d75618f252aebbc05a1522118ed738094365844b21c4e76e46d23bfa5ce88ba1";
    private static final String APP_VERSION = "1.0";
    private static final String API_URL = "https://adarshauth.store/api/client";

    public static void main(String[] args) {
        printBanner();

        System.out.println("\n[*] Connecting to AdarshAuth...");
        AdarshAuth auth = new AdarshAuth(APP_NAME, OWNER_ID, APP_SECRET, APP_VERSION, API_URL);

        if (!auth.init()) {
            System.err.println("\n[-] Status: " + auth.response.message);
            try { Thread.sleep(2500); } catch (Exception ignored) {}
            System.exit(1);
        }

        System.out.println("[+] Status: Initialized successfully! (v" + auth.appData.version + ")");

        Scanner scanner = new Scanner(System.in);
        System.out.print("\n [1] Login\n [2] Register\n [3] Upgrade\n [4] License key only\n\n Choose option: ");
        String choice = scanner.nextLine().trim();

        String username, password, key;

        switch (choice) {
            case "1":
                System.out.print("\n Enter username: ");
                username = scanner.nextLine().trim();
                System.out.print(" Enter password: ");
                password = scanner.nextLine().trim();

                System.out.println("\n[*] Logging in...");
                auth.login(username, password);
                break;

            case "2":
                System.out.print("\n Enter username: ");
                username = scanner.nextLine().trim();
                System.out.print(" Enter password: ");
                password = scanner.nextLine().trim();
                System.out.print(" Enter license: ");
                key = scanner.nextLine().trim();

                System.out.println("\n[*] Registering...");
                auth.register(username, password, key);
                break;

            case "3":
                System.out.print("\n Enter username: ");
                username = scanner.nextLine().trim();
                System.out.print(" Enter license: ");
                key = scanner.nextLine().trim();

                System.out.println("\n[*] Upgrading account...");
                auth.upgrade(username, key);
                System.out.println("\n Status: " + auth.response.message);
                try { Thread.sleep(2500); } catch (Exception ignored) {}
                System.exit(0);
                break;

            case "4":
                System.out.print("\n Enter license: ");
                key = scanner.nextLine().trim();

                System.out.println("\n[*] Activating license key...");
                auth.license(key);
                break;

            default:
                System.err.println("\n[-] Invalid selection.");
                try { Thread.sleep(2000); } catch (Exception ignored) {}
                System.exit(1);
        }

        if (!auth.response.success) {
            System.err.println("\n[-] Status: " + auth.response.message);
            try { Thread.sleep(2500); } catch (Exception ignored) {}
            System.exit(1);
        }

        System.out.println("\n[+] Logged In!");

        // Display User Details
        System.out.println("\n User data:");
        System.out.println(" Username: " + auth.userData.username);
        System.out.println(" IP address: " + auth.userData.ip);
        System.out.println(" Hardware-Id: " + auth.userData.hwid);
        System.out.println(" Created at: " + auth.userData.createdate);
        if (auth.userData.lastlogin != null && !auth.userData.lastlogin.isEmpty()) {
            System.out.println(" Last login: " + auth.userData.lastlogin);
        }
        System.out.println(" Subscription: " + auth.userData.subscription);
        System.out.println(" Expiry Date: " + auth.userData.expiryDate);

        // Validate active session
        System.out.println("\n[*] Validating session with server...");
        if (auth.check()) {
            System.out.println("[+] Session verified active!");
        } else {
            System.err.println("[-] Session check failed.");
        }

        System.out.println("\nPress Enter to exit...");
        scanner.nextLine();
    }

    private static void printBanner() {
        System.out.println("\n" +
                "       _       _                _        _         _   _     \n" +
                "      / \\   __| | __ _ _ __ ___| |__    / \\  _   _| |_| |__  \n" +
                "     / _ \\ / _` |/ _` | '__/ __| '_ \\  / _ \\| | | | __| '_ \\ \n" +
                "    / ___ \\ (_| | (_| | |  \\__ \\ | | |/ ___ \\ |_| | |_| | | |\n" +
                "   /_/   \\_\\__,_|\\__,_|_|  |___/_| |_/_/   \\_\\__,_|\\__|_| |_|\n");
        System.out.println("==============================================================");
        System.out.println("  Official Java / Android Authentication Client");
        System.out.println("  Dashboard: https://adarshauth.store");
        System.out.println("==============================================================");
    }
}
