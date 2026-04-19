# Quick Start Checklist ✅

Follow this checklist to get started in 15 minutes!

## ☑️ Setup (5 minutes)

- [ ] **MongoDB is running**
  ```bash
  mongosh  # Should connect successfully
  ```

- [ ] **Redis is running**
  ```bash
  redis-cli ping  # Should return PONG
  ```

- [ ] **Environment configured**
  ```bash
  # Copy .env.example to .env
  # Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
  ```

- [ ] **Start the application**
  ```bash
  npm run dev  # Starts both backend and frontend
  ```

- [ ] **Verify servers are running**
  - Backend: http://localhost:5000/health
  - Frontend: http://localhost:3000

---

## ☑️ Dashboard Setup (5 minutes)

- [ ] **Create account**
  - Go to http://localhost:3000
  - Click "Sign up"
  - Enter email and password
  - Click "Create Account"

- [ ] **Create application**
  - Click "Applications" in sidebar
  - Click "Create Application"
  - Name: "My First App"
  - Click "Create"

- [ ] **Get credentials**
  - Click "Credentials" button
  - Copy Owner ID
  - Copy App Secret
  - Save both securely

- [ ] **Generate license**
  - Click "Licenses" in sidebar
  - Click "Generate Licenses"
  - Type: Lifetime, Count: 1
  - Click "Generate"
  - Copy the license key

---

## ☑️ Test with C# Client (5 minutes)

- [ ] **Configure client**
  ```bash
  cd client-examples/csharp
  # Edit AuthClient.cs
  # Update: appName, ownerId, appSecret
  ```

- [ ] **Build client**
  ```bash
  dotnet build
  ```

- [ ] **Run and register**
  ```bash
  dotnet run
  # Select: 1 (Register)
  # Username: testuser
  # Password: password123
  # License: (paste your license key)
  ```

- [ ] **Verify in dashboard**
  - Go to "Users" page
  - See "testuser" in the list
  - Go to "Sessions" page
  - See active session

---

## ☑️ Test Features

- [ ] **Test login**
  - Run C# client again
  - Select: 2 (Login)
  - Use same credentials

- [ ] **Test ban/unban**
  - Ban user from dashboard
  - Try to login → Should fail
  - Unban user
  - Login works again

- [ ] **Test session management**
  - View active sessions
  - Terminate a session
  - Client gets disconnected

---

## 🎉 You're Done!

Everything is working! Now you can:

1. **Integrate with your software** - Use the C# client as reference
2. **Customize the UI** - Edit frontend files
3. **Deploy to production** - See DEPLOYMENT.md
4. **Read full documentation** - See STEP_BY_STEP_GUIDE.md

---

## 🆘 Quick Troubleshooting

**Backend won't start?**
→ Check MongoDB and Redis are running

**Frontend shows errors?**
→ Run `cd frontend && npm install`

**C# client can't connect?**
→ Verify Owner ID and App Secret are correct

**License key invalid?**
→ Make sure you generated it for the correct application

---

## 📚 Next Steps

- [ ] Read STEP_BY_STEP_GUIDE.md for detailed instructions
- [ ] Read API.md for API reference
- [ ] Read SECURITY.md for security features
- [ ] Read DEPLOYMENT.md for production deployment

**Happy coding! 🚀**
