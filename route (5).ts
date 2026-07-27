import { NextRequest, NextResponse } from "next/server";
import { db, getSeededData, User } from "@/lib/database";

// GET /api/auth/session - Get active session user & google account
export async function GET() {
  try {
    const data = db.get();
    return NextResponse.json({
      currentUser: data.currentUser,
      googleAccount: data.googleAccount,
      subscription: data.subscription
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/auth/session - Handle signup, login, logout, profile update, account delete, export data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, fullName, username, email, password, birthday, avatar, newPassword } = body;

    let resData: any = { success: false };

    db.update((schema) => {
      // 1. SIGNUP
      if (action === "signup") {
        const newUser: User = {
          id: 'user-' + Date.now(),
          name: fullName || "New User",
          email: email || "user@example.com",
          avatar: avatar || "https://picsum.photos/seed/user/100/100",
          role: 'owner',
          username: username || "user123",
          birthday: birthday || "",
          password: password || ""
        };

        schema.users.push(newUser);
        schema.currentUser = newUser;
        
        // Add audit log
        schema.auditLogs.unshift({
          id: 'log-' + Date.now(),
          userId: newUser.id,
          userName: newUser.name,
          action: 'User Registered & Logged In',
          ip: '127.0.0.1',
          details: `Account registered successfully for ${newUser.name} (${newUser.email}).`,
          timestamp: 'Just now'
        });

        resData = { success: true, user: newUser };
      }
      
      // 2. LOGIN
      else if (action === "login") {
        // Authenticate user
        let user = schema.users.find(u => u.email.toLowerCase() === (email || "").toLowerCase());
        
        if (!user) {
          // If no users exist, let's auto-create on first email login to keep it fluid, 
          // or seed Evelyn Carter if logging in with her email
          if (email && email.toLowerCase().includes("carter")) {
            const seed = getSeededData();
            schema.users = seed.users;
            schema.currentUser = seed.users[0];
            schema.googleAccount = seed.googleAccount;
            schema.businessProfiles = seed.businessProfiles;
            schema.aiSettings = seed.aiSettings;
            schema.reviews = seed.reviews;
            schema.replies = seed.replies;
            schema.team = seed.team;
            schema.subscription = seed.subscription;
            schema.notifications = seed.notifications;
            schema.auditLogs = seed.auditLogs;
            user = seed.users[0];
          } else {
            // Auto create new user to prevent login blocker (premium design friendliness)
            const newUser: User = {
              id: 'user-' + Date.now(),
              name: email ? email.split('@')[0] : "Demo Owner",
              email: email || "demo@example.com",
              avatar: `https://picsum.photos/seed/${email}/100/100`,
              role: 'owner',
              username: email ? email.split('@')[0] : "demo123",
              birthday: birthday || "1994-06-18",
              password: password || "password"
            };
            schema.users.push(newUser);
            schema.currentUser = newUser;
            user = newUser;
          }
        } else {
          // Verify password simple check
          if (password && user.password && user.password !== password) {
            throw new Error("Incorrect credentials");
          }
          schema.currentUser = user;
        }

        schema.auditLogs.unshift({
          id: 'log-' + Date.now(),
          userId: user.id,
          userName: user.name,
          action: 'User Logged In',
          ip: '127.0.0.1',
          details: `User ${user.name} logged in successfully.`,
          timestamp: 'Just now'
        });

        resData = { success: true, user };
      }

      // 3. LOGOUT
      else if (action === "logout") {
        const prevUser = schema.currentUser;
        schema.currentUser = null;
        
        if (prevUser) {
          schema.auditLogs.unshift({
            id: 'log-' + Date.now(),
            userId: prevUser.id,
            userName: prevUser.name,
            action: 'User Logged Out',
            ip: '127.0.0.1',
            details: `User ${prevUser.name} signed out.`,
            timestamp: 'Just now'
          });
        }
        resData = { success: true };
      }

      // 4. UPDATE_PROFILE
      else if (action === "update_profile") {
        if (!schema.currentUser) {
          throw new Error("Unauthorized");
        }

        const currentId = schema.currentUser.id;
        const uIdx = schema.users.findIndex(u => u.id === currentId);
        
        const updated = {
          ...schema.currentUser,
          name: fullName || schema.currentUser.name,
          username: username || schema.currentUser.username,
          email: email || schema.currentUser.email,
          birthday: birthday !== undefined ? birthday : schema.currentUser.birthday,
          avatar: avatar || schema.currentUser.avatar
        };

        if (newPassword) {
          updated.password = newPassword;
        }

        schema.currentUser = updated;
        if (uIdx !== -1) {
          schema.users[uIdx] = updated;
        }

        schema.auditLogs.unshift({
          id: 'log-' + Date.now(),
          userId: currentId,
          userName: updated.name,
          action: 'Profile Updated',
          ip: '127.0.0.1',
          details: `Modified personal account details.`,
          timestamp: 'Just now'
        });

        resData = { success: true, user: updated };
      }

      // 5. DELETE_ACCOUNT
      else if (action === "delete_account") {
        schema.currentUser = null;
        schema.users = [];
        schema.googleAccount = null;
        schema.businessProfiles = [];
        schema.reviews = [];
        schema.replies = [];
        schema.aiSettings = [];
        schema.notifications = [];
        schema.team = [];
        schema.auditLogs = [];
        schema.subscription = {
          plan: 'free',
          repliesCountThisMonth: 0,
          limitCount: 100,
          features: ['1 Business Profile Limit', '100 SaaS AI replies/month']
        };
        resData = { success: true };
      }
    });

    return NextResponse.json(resData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
