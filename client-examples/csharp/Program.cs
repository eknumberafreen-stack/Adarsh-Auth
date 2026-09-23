using System;

namespace AdarshAuth
{
    class Program
    {
        // ── Configure Your Application Credentials ─────────────────────
        // Replace with your credentials from https://adarshauth.store/dashboard/applications
        static string name = "Adarsh Internal";
        static string ownerid = "uYwqaPDGiD";
        static string secret = "bdcdd245ee4df9e2baa3872f412755d98554fb398558bd0d3b8affc16353a9fd";
        static string version = "1.0";
        static string url = "https://adarshauth.store/api/client";

        public static api AdarshAuthApp = new api(name, ownerid, secret, version, url);

        static void Main(string[] args)
        {
            Console.Title = "AdarshAuth C# Example";
            PrintBanner();

            Console.WriteLine("\n[*] Initializing AdarshAuth client...");
            AdarshAuthApp.init();

            if (!AdarshAuthApp.response.success)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[-] Initialization Failed: {AdarshAuthApp.response.message}");
                Console.ResetColor();
                Console.WriteLine("\nPress Enter to exit...");
                Console.ReadLine();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[+] Initialized successfully! Version: {AdarshAuthApp.app_data.version}");
            Console.ResetColor();

            Console.WriteLine("\nSelect an option:");
            Console.WriteLine("  [1] Login (Username & Password)");
            Console.WriteLine("  [2] Register (Username, Password & License Key)");
            Console.WriteLine("  [3] License Key Only");
            Console.WriteLine("  [4] Exit");

            Console.Write("\nOption [1-4]: ");
            string? choice = Console.ReadLine()?.Trim();

            switch (choice)
            {
                case "1":
                    Console.Write("Username: ");
                    string? user = Console.ReadLine()?.Trim() ?? "";
                    Console.Write("Password: ");
                    string? pass = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Logging in...");
                    AdarshAuthApp.login(user, pass);
                    break;

                case "2":
                    Console.Write("Username: ");
                    string? regUser = Console.ReadLine()?.Trim() ?? "";
                    Console.Write("Password: ");
                    string? regPass = Console.ReadLine()?.Trim() ?? "";
                    Console.Write("License Key: ");
                    string? regKey = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Registering account...");
                    AdarshAuthApp.register(regUser, regPass, regKey);
                    break;

                case "3":
                    Console.Write("License Key: ");
                    string? key = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Activating license key...");
                    AdarshAuthApp.license(key);
                    break;

                case "4":
                    Environment.Exit(0);
                    break;

                default:
                    Console.WriteLine("\n[-] Invalid option selected.");
                    Console.ReadLine();
                    return;
            }

            if (!AdarshAuthApp.response.success)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[-] Authentication Failed: {AdarshAuthApp.response.message}");
                Console.ResetColor();
                Console.WriteLine("\nPress Enter to exit...");
                Console.ReadLine();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("\n[+] Authentication Successful!");
            Console.ResetColor();

            // Display User Profile Data
            Console.WriteLine(new string('-', 52));
            Console.WriteLine("                USER PROFILE DATA");
            Console.WriteLine(new string('-', 52));
            Console.WriteLine($"  Username     : {AdarshAuthApp.user_data.username}");
            Console.WriteLine($"  IP Address   : {AdarshAuthApp.user_data.ip}");
            Console.WriteLine($"  HWID         : {AdarshAuthApp.user_data.hwid}");
            Console.WriteLine($"  Created Date : {AdarshAuthApp.user_data.createdate}");
            Console.WriteLine($"  Last Login   : {AdarshAuthApp.user_data.lastlogin}");

            if (AdarshAuthApp.user_data.subscriptions.Count > 0)
            {
                Console.WriteLine($"  Subscription : {AdarshAuthApp.user_data.subscriptions[0].subscription}");
                Console.WriteLine($"  Expiry Date  : {AdarshAuthApp.user_data.subscriptions[0].expiry}");
            }
            Console.WriteLine(new string('-', 52));

            // Validate session check
            Console.WriteLine("\n[*] Validating session with server...");
            if (AdarshAuthApp.check())
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[+] Session verified active!");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[-] Session check failed.");
                Console.ResetColor();
            }

            Console.WriteLine("\nPress Enter to exit...");
            Console.ReadLine();
        }

        static void PrintBanner()
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(@"
       _       _                _        _         _   _     
      / \   __| | __ _ _ __ ___| |__    / \  _   _| |_| |__  
     / _ \ / _` |/ _` | '__/ __| '_ \  / _ \| | | | __| '_ \ 
    / ___ \ (_| | (_| | |  \__ \ | | |/ ___ \ |_| | |_| | | |
   /_/   \_\__,_|\__,_|_|  |___/_| |_/_/   \_\__,_|\__|_| |_|
");
            Console.WriteLine(new string('=', 62));
            Console.WriteLine("  Official C# (.NET) Authentication Client");
            Console.WriteLine("  Dashboard: https://adarshauth.store");
            Console.WriteLine(new string('=', 62));
            Console.ResetColor();
        }
    }
}
