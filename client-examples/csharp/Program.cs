using System;
using System.Threading;

namespace AdarshAuth
{
    class Program
    {
        // ── Application Credentials ────────────────────────────────────
        static string name = "TESTING";
        static string ownerid = "uYwqaPDGiD";
        static string secret = "d75618f252aebbc05a1522118ed738094365844b21c4e76e46d23bfa5ce88ba1";
        static string version = "1.0";
        static string url = "https://adarshauth.store/api/client";

        public static api AdarshAuthApp = new api(name, ownerid, secret, version, url);

        static void Main(string[] args)
        {
            Console.Title = "AdarshAuth C# Example";
            PrintBanner();

            Console.WriteLine("\n[*] Connecting to AdarshAuth...");
            AdarshAuthApp.init();

            if (!AdarshAuthApp.response.success)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[-] Status: {AdarshAuthApp.response.message}");
                Console.ResetColor();
                Thread.Sleep(2500);
                Environment.Exit(1);
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[+] Status: Initialized successfully! (v{AdarshAuthApp.app_data.version})");
            Console.ResetColor();

            Console.Write("\n [1] Login\n [2] Register\n [3] Upgrade\n [4] License key only\n\n Choose option: ");
            string? choice = Console.ReadLine()?.Trim();

            string username, password, key;

            switch (choice)
            {
                case "1":
                    Console.Write("\n Enter username: ");
                    username = Console.ReadLine()?.Trim() ?? "";
                    Console.Write(" Enter password: ");
                    password = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Logging in...");
                    AdarshAuthApp.login(username, password);
                    break;

                case "2":
                    Console.Write("\n Enter username: ");
                    username = Console.ReadLine()?.Trim() ?? "";
                    Console.Write(" Enter password: ");
                    password = Console.ReadLine()?.Trim() ?? "";
                    Console.Write(" Enter license: ");
                    key = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Registering...");
                    AdarshAuthApp.register(username, password, key);
                    break;

                case "3":
                    Console.Write("\n Enter username: ");
                    username = Console.ReadLine()?.Trim() ?? "";
                    Console.Write(" Enter license: ");
                    key = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Upgrading account...");
                    AdarshAuthApp.upgrade(username, key);
                    Console.WriteLine("\n Status: " + AdarshAuthApp.response.message);
                    Thread.Sleep(2500);
                    Environment.Exit(0);
                    break;

                case "4":
                    Console.Write("\n Enter license: ");
                    key = Console.ReadLine()?.Trim() ?? "";

                    Console.WriteLine("\n[*] Activating license key...");
                    AdarshAuthApp.license(key);
                    break;

                default:
                    Console.WriteLine("\n[-] Invalid selection.");
                    Thread.Sleep(2000);
                    Environment.Exit(1);
                    break;
            }

            if (!AdarshAuthApp.response.success)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[-] Status: {AdarshAuthApp.response.message}");
                Console.ResetColor();
                Thread.Sleep(2500);
                Environment.Exit(1);
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("\n[+] Logged In!");
            Console.ResetColor();

            // Display User Data
            Console.WriteLine("\n User data:");
            Console.WriteLine(" Username: " + AdarshAuthApp.user_data.username);
            Console.WriteLine(" IP address: " + AdarshAuthApp.user_data.ip);
            Console.WriteLine(" Hardware-Id: " + AdarshAuthApp.user_data.hwid);
            Console.WriteLine(" Created at: " + AdarshAuthApp.user_data.createdate);
            if (!string.IsNullOrEmpty(AdarshAuthApp.user_data.lastlogin))
            {
                Console.WriteLine(" Last login: " + AdarshAuthApp.user_data.lastlogin);
            }

            if (AdarshAuthApp.user_data.subscriptions.Count > 0)
            {
                Console.WriteLine(" Subscription: " + AdarshAuthApp.user_data.subscriptions[0].subscription);
                Console.WriteLine(" Expiry Date: " + AdarshAuthApp.user_data.subscriptions[0].expiry);
            }

            // Session check
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
