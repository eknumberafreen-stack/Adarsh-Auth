package com.adarshauth;

import java.util.Scanner;

public class Main {
    // ── Configure Your Application Credentials ─────────────────────
    // Replace with your credentials from https://adarshauth.store/dashboard/applications
    private static final String APP_NAME = "Adarsh Internal";
    private static final String OWNER_ID = "uYwqaPDGiD";
    private static final String APP_SECRET = "bdcdd245ee4df9e2baa3872f412755d98554fb398558bd0d3b8affc16353a9fd";
    private static final String APP_VERSION = "1.0";
    private static final String API_URL = "https://adarshauth.store/api/client";

    public static void main(String[] args) {
        printBanner();

        System.out.println("\n[*] Initializing AdarshAuth client...");
        AdarshAuth auth = new AdarshAuth(APP_NAME, OWNER_ID, APP_SECRET, APP_VERSION, API_URL);

        if (!auth.init()) {
            System.err.println("\n[-] Initialization Failed: " + auth.response.message);
            System.out.println("\nPress Enter to exit...");
            new Scanner(System.in).nextLine();
            System.exit(1);
        }

        System.out.println("[+] Initialized successfully! Version: " + auth.appData.version);

        Scanner scanner = new Scanner(System.in);
        System.out.println("\nSelect an option:");
        System.out.println("  [1] Login (Username & Password)");
        System.out.println("  [2] Register (Username, Password & License Key)");
        System.out.println("  [3] License Key Only");
        System.out.println("  [4] Exit");

        System.out.print("\nOption [1-4]: ");
        String choice = scanner.nextLine().trim();

        switch (choice) {
            case "1":
                System.out.print("Username: ");
                String user = scanner.nextLine().trim();
                System.out.print("Password: ");
                String pass = scanner.nextLine().trim();

                System.out.println("\n[*] Logging in...");
                auth.login(user, pass);
                break;

            case "2":
                System.out.print("Username: ");
                String regUser = scanner.nextLine().trim();
                System.out.print("Password: ");
                String regPass = scanner.nextLine().trim();
                System.out.print("License Key: ");
                String regKey = scanner.nextLine().trim();

                System.out.println("\n[*] Registering account...");
                auth.register(regUser, regPass, regKey);
                break;

            case "3":
                System.out.print("License Key: ");
                String key = scanner.nextLine().trim();

                System.out.println("\n[*] Activating license key...");
                auth.license(key);
                break;

            case "4":
                System.out.println("\nExiting...");
                System.exit(0);
                break;

            default:
                System.err.println("\n[-] Invalid option selected.");
                System.exit(1);
        }

        if (!auth.response.success) {
            System.err.println("\n[-] Authentication Failed: " + auth.response.message);
            System.out.println("\nPress Enter to exit...");
            scanner.nextLine();
            System.exit(1);
        }

        System.out.println("\n[+] Authentication Successful!");

        // Display User Details
        System.out.println("--------------------------------------------------");
        System.out.println("                USER PROFILE DATA");
        System.out.println("--------------------------------------------------");
        System.out.println("  Username     : " + auth.userData.username);
        System.out.println("  IP Address   : " + auth.userData.ip);
        System.out.println("  HWID         : " + auth.userData.hwid);
        System.out.println("  Subscription : " + auth.userData.subscription);
        System.out.println("  Expiry Date  : " + auth.userData.expiryDate);
        System.out.println("  Created Date : " + auth.userData.createdate);
        System.out.println("  Last Login   : " + auth.userData.lastlogin);
        System.out.println("--------------------------------------------------");

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
