#include <iostream>
#include <string>
#include "adarshauth.hpp"

// ── Application Credentials ────────────────────────────────────
const std::string name = "TESTING";
const std::string ownerid = "uYwqaPDGiD";
const std::string secret = "d75618f252aebbc05a1522118ed738094365844b21c4e76e46d23bfa5ce88ba1";
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

    std::cout << "\n[*] Connecting to AdarshAuth..." << std::endl;
    if (!AdarshAuthApp.init()) {
        std::cerr << "\n[-] Status: " << AdarshAuthApp.response.message << std::endl;
        Sleep(2500);
        return 1;
    }

    std::cout << "[+] Status: Initialized successfully! (v" << AdarshAuthApp.app_data.version << ")" << std::endl;

    std::cout << "\n [1] Login\n [2] Register\n [3] Upgrade\n [4] License key only\n\n Choose option: ";
    int choice = 0;
    std::cin >> choice;
    std::cin.ignore();

    if (choice == 1) {
        std::string user, pass;
        std::cout << "\n Enter username: ";
        std::getline(std::cin, user);
        std::cout << " Enter password: ";
        std::getline(std::cin, pass);

        std::cout << "\n[*] Logging in..." << std::endl;
        AdarshAuthApp.login(user, pass);
    }
    else if (choice == 2) {
        std::string user, pass, key;
        std::cout << "\n Enter username: ";
        std::getline(std::cin, user);
        std::cout << " Enter password: ";
        std::getline(std::cin, pass);
        std::cout << " Enter license: ";
        std::getline(std::cin, key);

        std::cout << "\n[*] Registering..." << std::endl;
        AdarshAuthApp.regstr(user, pass, key);
    }
    else if (choice == 3) {
        std::string user, key;
        std::cout << "\n Enter username: ";
        std::getline(std::cin, user);
        std::cout << " Enter license: ";
        std::getline(std::cin, key);

        std::cout << "\n[*] Upgrading account..." << std::endl;
        AdarshAuthApp.upgrade(user, key);
        std::cout << "\n Status: " << AdarshAuthApp.response.message << std::endl;
        Sleep(2500);
        return 0;
    }
    else if (choice == 4) {
        std::string key;
        std::cout << "\n Enter license: ";
        std::getline(std::cin, key);

        std::cout << "\n[*] Activating license key..." << std::endl;
        AdarshAuthApp.license(key);
    }
    else {
        std::cerr << "\n[-] Invalid selection." << std::endl;
        Sleep(2000);
        return 1;
    }

    if (!AdarshAuthApp.response.success) {
        std::cerr << "\n[-] Status: " << AdarshAuthApp.response.message << std::endl;
        Sleep(2500);
        return 1;
    }

    std::cout << "\n[+] Logged In!" << std::endl;

    // Display User Details
    std::cout << "\n User data:" << std::endl;
    std::cout << " Username: " + AdarshAuthApp.user_data.username << std::endl;
    std::cout << " IP address: " + AdarshAuthApp.user_data.ip << std::endl;
    std::cout << " Hardware-Id: " + AdarshAuthApp.user_data.hwid << std::endl;
    std::cout << " Created at: " + AdarshAuthApp.user_data.createdate << std::endl;
    if (!AdarshAuthApp.user_data.lastlogin.empty()) {
        std::cout << " Last login: " + AdarshAuthApp.user_data.lastlogin << std::endl;
    }
    std::cout << " Subscription: " + AdarshAuthApp.user_data.subscription << std::endl;
    std::cout << " Expiry Date: " + AdarshAuthApp.user_data.expiry << std::endl;

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
