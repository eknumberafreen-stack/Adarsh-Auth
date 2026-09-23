#include <iostream>
#include <string>
#include "adarshauth.hpp"

// ── Configure Your Application Credentials ─────────────────────
// Replace with your credentials from https://adarshauth.store/dashboard/applications
const std::string name = "Adarsh Internal";
const std::string ownerid = "uYwqaPDGiD";
const std::string secret = "bdcdd245ee4df9e2baa3872f412755d98554fb398558bd0d3b8affc16353a9fd";
const std::string version = "1.0";
const std::string url = "https://adarshauth.store/api/client";

AdarshAuth::api AdarshAuthApp(name, ownerid, secret, version, url);

void print_banner() {
    std::cout << R"(
       _       _                _        _         _   _     
      / \   __| | __ _ _ __ ___| |__    / \  _   _| |_| |__  
     / _ \ / _` |/ _` | '__/ __| '_ \  / _ \| | | | __| '_ \ 
    / ___ \ (_| | (_| | |  \__ \ | | |/ ___ \ |_| | |_| | | |
   /_/   \_\__,_|\__,_|_|  |___/_| |_/_/   \_\__,_|\__|_| |_|
)" << std::endl;
    std::cout << "==============================================================" << std::endl;
    std::cout << "  Official C++ Authentication Client" << std::endl;
    std::cout << "  Dashboard: https://adarshauth.store" << std::endl;
    std::cout << "==============================================================" << std::endl;
}

int main() {
    SetConsoleTitleA("AdarshAuth C++ Example");
    print_banner();

    std::cout << "\n[*] Initializing AdarshAuth client..." << std::endl;
    if (!AdarshAuthApp.init()) {
        std::cerr << "\n[-] Initialization Failed: " << AdarshAuthApp.response.message << std::endl;
        std::cout << "\nPress Enter to exit...";
        std::cin.get();
        return 1;
    }

    std::cout << "[+] Initialized successfully! Version: " << AdarshAuthApp.app_data.version << std::endl;

    std::cout << "\nSelect an option:" << std::endl;
    std::cout << "  [1] Login (Username & Password)" << std::endl;
    std::cout << "  [2] Register (Username, Password & License Key)" << std::endl;
    std::cout << "  [3] License Key Only" << std::endl;
    std::cout << "  [4] Exit" << std::endl;

    std::cout << "\nOption [1-4]: ";
    int choice = 0;
    std::cin >> choice;
    std::cin.ignore();

    if (choice == 1) {
        std::string user, pass;
        std::cout << "Username: ";
        std::getline(std::cin, user);
        std::cout << "Password: ";
        std::getline(std::cin, pass);

        std::cout << "\n[*] Logging in..." << std::endl;
        AdarshAuthApp.login(user, pass);
    }
    else if (choice == 2) {
        std::string user, pass, key;
        std::cout << "Username: ";
        std::getline(std::cin, user);
        std::cout << "Password: ";
        std::getline(std::cin, pass);
        std::cout << "License Key: ";
        std::getline(std::cin, key);

        std::cout << "\n[*] Registering account..." << std::endl;
        AdarshAuthApp.regstr(user, pass, key);
    }
    else if (choice == 3) {
        std::string key;
        std::cout << "License Key: ";
        std::getline(std::cin, key);

        std::cout << "\n[*] Activating license key..." << std::endl;
        AdarshAuthApp.license(key);
    }
    else if (choice == 4) {
        return 0;
    }
    else {
        std::cerr << "\n[-] Invalid option selected." << std::endl;
        return 1;
    }

    if (!AdarshAuthApp.response.success) {
        std::cerr << "\n[-] Authentication Failed: " << AdarshAuthApp.response.message << std::endl;
        std::cout << "\nPress Enter to exit...";
        std::cin.get();
        return 1;
    }

    std::cout << "\n[+] Authentication Successful!" << std::endl;

    // Display User Details
    std::cout << "--------------------------------------------------" << std::endl;
    std::cout << "                USER PROFILE DATA" << std::endl;
    std::cout << "--------------------------------------------------" << std::endl;
    std::cout << "  Username     : " << AdarshAuthApp.user_data.username << std::endl;
    std::cout << "  IP Address   : " << AdarshAuthApp.user_data.ip << std::endl;
    std::cout << "  HWID         : " << AdarshAuthApp.user_data.hwid << std::endl;
    std::cout << "  Subscription : " << AdarshAuthApp.user_data.subscription << std::endl;
    std::cout << "  Expiry Date  : " << AdarshAuthApp.user_data.expiry << std::endl;
    std::cout << "  Created Date : " << AdarshAuthApp.user_data.createdate << std::endl;
    std::cout << "  Last Login   : " << AdarshAuthApp.user_data.lastlogin << std::endl;
    std::cout << "--------------------------------------------------" << std::endl;

    // Validate active session
    std::cout << "\n[*] Validating session with server..." << std::endl;
    if (AdarshAuthApp.check()) {
        std::cout << "[+] Session verified active!" << std::endl;
    } else {
        std::cerr << "[-] Session check failed." << std::endl;
    }

    std::cout << "\nPress Enter to exit...";
    std::cin.get();
    return 0;
}
