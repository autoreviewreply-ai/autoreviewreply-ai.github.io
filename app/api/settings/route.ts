import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// GET /api/settings - Fetch AI parameters for a business profile
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const data = db.get();
    const settings = data.aiSettings.find(s => s.businessProfileId === profileId);

    if (!settings) {
      return NextResponse.json({ error: "AI Settings not found for this profile" }, { status: 404 });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings - Update detailed instructions or star parameters
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      businessProfileId, 
      tone, 
      businessName, 
      businessType, 
      brandVoice, 
      preferredGreeting, 
      preferredClosing, 
      keywordsToInclude, 
      keywordsToAvoid, 
      customInstructions, 
      starSettings,
      defaultBusinessLanguage,
      replyLanguageStrategy,
      customSelectedLanguage,
      isEmailNotificationsEnabled,
      isPushNotificationsEnabled
    } = body;

    if (!businessProfileId) {
      return NextResponse.json({ error: "Business Profile ID is required" }, { status: 400 });
    }

    let updatedSettings = null;

    db.update((schema) => {
      const idx = schema.aiSettings.findIndex(s => s.businessProfileId === businessProfileId);
      
      const payload = {
        id: idx !== -1 ? schema.aiSettings[idx].id : 'set-' + Date.now(),
        businessProfileId,
        tone: tone || 'Professional',
        businessName: businessName || '',
        businessType: businessType || '',
        brandVoice: brandVoice || '',
        preferredGreeting: preferredGreeting || '',
        preferredClosing: preferredClosing || '',
        keywordsToInclude: Array.isArray(keywordsToInclude) ? keywordsToInclude : [],
        keywordsToAvoid: Array.isArray(keywordsToAvoid) ? keywordsToAvoid : [],
        customInstructions: customInstructions || '',
        starSettings: starSettings || {
          5: { action: 'auto', instructions: 'Thank them' },
          4: { action: 'auto', instructions: 'Thank them and ask suggestions' },
          3: { action: 'manual', instructions: 'Acknowledge' },
          2: { action: 'manual', instructions: 'Manual approval' },
          1: { action: 'manual', instructions: 'Manual approval' }
        },
        defaultBusinessLanguage: defaultBusinessLanguage || 'English',
        replyLanguageStrategy: replyLanguageStrategy || 'customer',
        customSelectedLanguage: customSelectedLanguage || 'English',
        isEmailNotificationsEnabled: isEmailNotificationsEnabled !== undefined ? isEmailNotificationsEnabled : true,
        isPushNotificationsEnabled: isPushNotificationsEnabled !== undefined ? isPushNotificationsEnabled : true
      };

      if (idx !== -1) {
        schema.aiSettings[idx] = payload;
      } else {
        schema.aiSettings.push(payload);
      }
      
      updatedSettings = payload;

      // Add audit log
      schema.auditLogs.unshift({
        id: 'log-' + Date.now(),
        userId: 'user-001',
        userName: schema.users[0]?.name || 'Dr. Evelyn Carter',
        action: 'AI Config Overhauled',
        ip: '127.0.0.1',
        details: `Overhauled AI settings and star-based routing rules for profile id: ${businessProfileId}. Tone set: ${tone}.`,
        timestamp: 'Just now'
      });
    });

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
