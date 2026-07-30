import { adminDb } from './firebase-admin';

// Firestore collection that holds one document per signed-in user,
// containing that user's entire app state (profiles, reviews, settings, etc).
const USER_DATA_COLLECTION = 'userData';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'manager' | 'staff';
  username?: string;
  birthday?: string;
  password?: string;
}

export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  isConnected: boolean;
}

export interface BusinessProfile {
  id: string;
  googleAccountId: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  isAutoReplyEnabled: boolean;
  averageRating: number;
  totalReviewsCount: number;
}

export interface Review {
  id: string;
  businessProfileId: string;
  authorName: string;
  authorPhoto: string;
  rating: number; // 1 to 5
  text: string;
  publishTime: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  sentimentScore: number; // -1 to 1
  isNew: boolean;
  status: 'pending' | 'replied' | 'flagged' | 'manual_review';
  errorReason?: string;
  suggestedReplies?: string[]; // 3 suggestions for manual approval if negative protection triggered
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  replyText: string;
  status: 'draft' | 'approved' | 'posted';
  replyTime?: string;
  authorName: string;
  isAutoReplied: boolean;
}

export interface StarSetting {
  action: 'auto' | 'manual' | 'ignore';
  instructions: string;
}

export interface AISettings {
  id: string;
  businessProfileId: string;
  tone: string;
  businessName: string;
  businessType: string;
  brandVoice: string;
  preferredGreeting: string;
  preferredClosing: string;
  keywordsToInclude: string[];
  keywordsToAvoid: string[];
  customInstructions: string;
  starSettings: Record<number, StarSetting>;
  defaultBusinessLanguage?: string;
  replyLanguageStrategy?: 'customer' | 'default';
  customSelectedLanguage?: string;
  isEmailNotificationsEnabled?: boolean;
  isSlackNotificationsEnabled?: boolean;
  isPushNotificationsEnabled?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'new_review' | 'negative_detected' | 'auth_disconnected' | 'api_error' | 'manual_required';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  reviewId?: string;
  businessProfileId?: string;
}

export interface Subscription {
  plan: 'free' | 'pro';
  repliesCountThisMonth: number;
  limitCount: number;
  features: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  ip: string;
  details: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  currentUser: User | null;
  googleAccount: GoogleAccount | null;
  businessProfiles: BusinessProfile[];
  reviews: Review[];
  replies: ReviewReply[];
  aiSettings: AISettings[];
  notifications: AppNotification[];
  subscription: Subscription;
  team: TeamMember[];
  auditLogs: AuditLog[];
}

// Loaded Imported Seed Data
export const getSeededData = (): DatabaseSchema => {
  const accountId = 'google-oauth-123';
  return {
    users: [
      {
        id: 'user-001',
        name: 'Dr. Evelyn Carter',
        email: 'evelyn.carter@pearlsmiledental.com',
        avatar: 'https://picsum.photos/seed/evelyn/100/100',
        role: 'owner',
        username: 'evelyncarter',
        birthday: '1984-06-18'
      }
    ],
    currentUser: {
      id: 'user-001',
      name: 'Dr. Evelyn Carter',
      email: 'evelyn.carter@pearlsmiledental.com',
      avatar: 'https://picsum.photos/seed/evelyn/100/100',
      role: 'owner',
      username: 'evelyncarter',
      birthday: '1984-06-18'
    },
    googleAccount: {
      id: accountId,
      email: 'evelyn.carter.office@gmail.com',
      name: 'Evelyn Carter DDS',
      accessToken: 'ya29.a0ARWdsn...',
      refreshToken: '1//0g4WDS...',
      expiresAt: Date.now() + 3600 * 1000,
      isConnected: true,
    },
    businessProfiles: [
      {
        id: 'bp-001',
        googleAccountId: accountId,
        name: 'Pearl Smile Dental Clinic',
        category: 'Dentist & Cosmetic Dental Clinic',
        address: '450 Sutter St Suite 1200, San Francisco, CA 94108',
        phone: '(415) 555-0190',
        website: 'https://pearlsmiledental.example.com',
        isAutoReplyEnabled: true,
        averageRating: 4.8,
        totalReviewsCount: 148,
      },
      {
        id: 'bp-002',
        googleAccountId: accountId,
        name: 'The Sage Bistro',
        category: 'Casual Fine Dining Restaurant',
        address: '900 Valencia St, San Francisco, CA 94110',
        phone: '(415) 555-0210',
        website: 'https://thesagebistro.example.com',
        isAutoReplyEnabled: false,
        averageRating: 4.6,
        totalReviewsCount: 312,
      },
    ],
    aiSettings: [
      {
        id: 'set-001',
        businessProfileId: 'bp-001',
        tone: 'Luxury Brand',
        businessName: 'Pearl Smile Dental Clinic',
        businessType: 'Boutique Cosmetic Dentistry',
        brandVoice: 'Polite, professional, informative, soothing, premium',
        preferredGreeting: 'Thank you so much for sharing your experience,',
        preferredClosing: 'We look forward to keeping your smile bright,',
        keywordsToInclude: ['cosmetic smile', 'comfort', 'Dr. Carter', 'caring dental team'],
        keywordsToAvoid: ['cheap', 'pain', 'scary', 'affordable', 'budget'],
        customInstructions: 'Our business is a luxury dental clinic. Replies should be polite, professional, premium, and highlight our commitment to elite customer service.',
        starSettings: {
          5: { action: 'auto', instructions: 'Thank customers warmly and invite them back.' },
          4: { action: 'auto', instructions: 'Thank them and ask for suggestions to elevate their next experience.' },
          3: { action: 'auto', instructions: 'Acknowledge feedback and offer a warm contact point with our team.' },
          2: { action: 'manual', instructions: 'Do not auto-reply. Send notification for manual approval and highlight resolution.' },
          1: { action: 'manual', instructions: 'Do not auto-reply. Send notification for manual approval and legal escalation.' }
        }
      },
      {
        id: 'set-002',
        businessProfileId: 'bp-002',
        tone: 'Hospitality Style',
        businessName: 'The Sage Bistro',
        businessType: 'Farm-to-Table French-American Bistro',
        brandVoice: 'Warm, culinary-focused, friendly, generous',
        preferredGreeting: 'Hi there,',
        preferredClosing: 'See you next time at our farm table,',
        keywordsToInclude: ['fresh ingredients', 'culinary passion', 'neighborhood gem', 'seasonal dishes'],
        keywordsToAvoid: ['microwave', 'frozen', 'overpriced'],
        customInstructions: 'We are a cozy, farm-to-table bistro. We treat our clients like family. Highlight seasonal offerings and sustainable gastronomy.',
        starSettings: {
          5: { action: 'auto', instructions: 'Incorporate kitchen greetings and invite back for seasonal specials.' },
          4: { action: 'auto', instructions: 'Express appreciation and note we are always refining our menu.' },
          3: { action: 'manual', instructions: 'Ask what culinary aspect fell short and suggest speaking to our manager.' },
          2: { action: 'manual', instructions: 'Always manual approval. Offer direct contact details of our operations director.' },
          1: { action: 'manual', instructions: 'Always manual approval. Express deep apologies and alert the Head Chef.' }
        }
      }
    ],
    reviews: [
      {
        id: 'rev-001',
        businessProfileId: 'bp-001',
        authorName: 'Marcus Aurelio',
        authorPhoto: 'https://picsum.photos/seed/marcus/100/100',
        rating: 5,
        text: 'Absolute gold standard of cosmetic dentistry. From the luxury reception to Dr. Carter\'s incredible attention to detail. I had teeth whitening done and my smile has never felt more bright and polished. The boutique service is unmatched.',
        publishTime: '2 hours ago',
        sentiment: 'positive',
        sentimentScore: 0.95,
        isNew: true,
        status: 'pending'
      },
      {
        id: 'rev-002',
        businessProfileId: 'bp-001',
        authorName: 'Amanda Seyfried',
        authorPhoto: 'https://picsum.photos/seed/amanda/100/100',
        rating: 4,
        text: 'The clinic is stunning and clean like a 5-star hotel. My cleaning with the hygienist was very comforting. Only tiny complaint was the 10 minute wait past my scheduled slot, but Dr. Evelyn Carter of course apologized and was a delight.',
        publishTime: 'Yesterday',
        sentiment: 'positive',
        sentimentScore: 0.72,
        isNew: false,
        status: 'replied'
      },
      {
        id: 'rev-003',
        businessProfileId: 'bp-001',
        authorName: 'Jeremy Bernstein',
        authorPhoto: 'https://picsum.photos/seed/jeremy/100/100',
        rating: 2,
        text: 'Extremely over-priced cosmetic treatment. I called to request a refund on my whitening retainer since it was slightly loose, but they said they need me to re-appoint. I do not have time for this, I paid premium money and expect perfect fits without additional visits.',
        publishTime: '2 days ago',
        sentiment: 'negative',
        sentimentScore: -0.65,
        isNew: true,
        status: 'manual_review',
        suggestedReplies: [
          'Dear Jeremy, We sincerely apologize that your cosmetic retainer did not present the perfect premium fit we strive to deliver. We would love to adjust this minor detail right away for you at zero extra charge. Please contact Dr. Carter directly to resolve.',
          'Hi Jeremy, Thank you for raising this point. Pearl Smile prides itself on premier comfort. While we do require a quick in-office check to ensure medical compliance, we want to expedite this for you. Please let us know if we can coordinate custom delivery.',
          'Hello Jeremy, We understand your time is exceptionally valuable. We are eager to adjust your retainer instantly. Please give our concierge team a call today so we can arrange an express VIP slot for you to get this corrected.'
        ]
      },
      {
        id: 'rev-004',
        businessProfileId: 'bp-002',
        authorName: 'Clara Oswald',
        authorPhoto: 'https://picsum.photos/seed/clara/100/100',
        rating: 5,
        text: 'This bistro is an absolute dream! The seasonal mushroom risotto was packed with deep, divine farm flavors, and the wine pairings proposed by our waitress were impeccable. We sat in the heated cozy patio. Will definitely return!',
        publishTime: '3 days ago',
        sentiment: 'positive',
        sentimentScore: 0.98,
        isNew: false,
        status: 'replied'
      },
      {
        id: 'rev-005',
        businessProfileId: 'bp-002',
        authorName: 'Douglas Miller',
        authorPhoto: 'https://picsum.photos/seed/doug/100/100',
        rating: 1,
        text: 'Service was highly hostile and unprofessional. Food took almost 45 minutes to arrive on a Tuesday evening, and the steak was completely cold in the center. Avoid this place unless you want to spend premium prices for frozen standard dinners. I am legal-planning a chargeback.',
        publishTime: '4 days ago',
        sentiment: 'critical',
        sentimentScore: -0.88,
        isNew: false,
        status: 'manual_review',
        suggestedReplies: [
          'Hello Douglas, we are deeply concerned by your experience, especially regarding our waittimes and the steak preparation. We invite you to contact our General Manager immediately at operations@thesagebistro.com to enable us to make things right.',
          'Dear Douglas, we sincerely apologize for the unacceptable service standard you encountered and the dish temperature. Our Head Chef was alerted immediately. We want to extend our deepest apologies and hope to invite you for a complimentary meal.',
          'Hi Douglas, thank you for your candid feedback. Hostility is absolutely not in our family code, and our team failed you. We are reaching out privately to review your bill and secure an authentic apology.'
        ]
      }
    ],
    replies: [
      {
        id: 'rep-002',
        reviewId: 'rev-002',
        replyText: 'Thank you so much for sharing your experience, Amanda. We are extremely pleased that you found our premium cosmetic suite to be hotel-grade and clean! We extend our warmest apologies for the ten minutes slippage, and we look forward to keeping your smile bright upon your next boutique session.',
        status: 'posted',
        replyTime: 'Yesterday',
        authorName: 'Dr. Evelyn Carter',
        isAutoReplied: true,
      },
      {
        id: 'rep-004',
        reviewId: 'rev-004',
        replyText: 'Hi there, Clara! We are filled with joy that our farm garden patio and the seasonal mushroom risotto hit all the cozy farm notes for a memorable night. See you next time at our farm table for our upcoming summer menu specials!',
        status: 'posted',
        replyTime: '2 days ago',
        authorName: 'General Manager',
        isAutoReplied: false,
      }
    ],
    notifications: [
      {
        id: 'not-001',
        type: 'negative_detected',
        title: 'Negative Review Flagged - Refund Request',
        message: 'A 2-star review from Jeremy Bernstein was flagged for manual review due to a refund request. System has generated 3 AI drafts.',
        timestamp: '2 hours ago',
        read: false,
        reviewId: 'rev-003',
        businessProfileId: 'bp-001'
      },
      {
        id: 'not-003',
        type: 'manual_required',
        title: 'Critical Complaint Detected',
        message: 'A 1-star review from Douglas Miller is in the Manual Approval queue due to extreme cold steak and legal threats.',
        timestamp: '4 days ago',
        read: true,
        reviewId: 'rev-005',
        businessProfileId: 'bp-002'
      }
    ],
    subscription: {
      plan: 'pro',
      repliesCountThisMonth: 82,
      limitCount: 500,
      features: [
        'Unlimited Connected Google Accounts',
        'Multiple Business Profiles Management',
        'Advanced Gemini Sentiment Analytics',
        'Negative Review Protective Filter',
        'Custom Brand Voices & Specific Tone Matching',
        'Team Member Roles and Multi-seat Access'
      ]
    },
    team: [
      { id: 'team-001', name: 'Dr. Evelyn Carter', email: 'evelyn.carter@pearlsmiledental.com', role: 'owner', permissions: ['all'] },
      { id: 'team-002', name: 'Sarah Lin', email: 'sarah.lin@pearlsmiledental.com', role: 'manager', permissions: ['manage_settings', 'approve_replies'] },
      { id: 'team-003', name: 'John Doe', email: 'johndoe.clinic@gmail.com', role: 'staff', permissions: ['view_reviews', 'edit_suggested_replies'] }
    ],
    auditLogs: [
      {
        id: 'log-001',
        userId: 'user-001',
        userName: 'Dr. Evelyn Carter',
        action: 'Google Business Profile Connected',
        ip: '192.168.1.100',
        details: 'Successfully connected Google Account evelyn.carter.office@gmail.com and synced 2 locations.',
        timestamp: '3 days ago'
      },
      {
        id: 'log-002',
        userId: 'user-001',
        userName: 'Dr. Evelyn Carter',
        action: 'AI Settings Updated',
        ip: '192.168.1.100',
        details: 'Changed 3-Star Review policy for Pearl Smile Dental to "Auto Reply" with premium brand guidelines.',
        timestamp: 'Yesterday'
      }
    ]
  };
};

export const getEmptyDatabase = (): DatabaseSchema => {
  return {
    users: [],
    currentUser: null,
    googleAccount: null,
    businessProfiles: [],
    reviews: [],
    replies: [],
    aiSettings: [],
    notifications: [],
    subscription: {
      plan: 'pro',
      repliesCountThisMonth: 0,
      limitCount: 500,
      features: [
        'Unlimited Connected Google Accounts',
        'Multiple Business Profiles Management',
        'Advanced Gemini Sentiment Analytics',
        'Negative Review Protective Filter',
        'Custom Brand Voices & Specific Tone Matching',
        'Team Member Roles and Multi-seat Access'
      ]
    },
    team: [],
    auditLogs: []
  };
};

/**
 * Per-user database backed by Firestore. Each signed-in user gets exactly
 * one document (keyed by their Firebase uid) holding their whole app state.
 * This replaces the old fs.writeFileSync-based store, which could never work
 * on Vercel: serverless functions get a read-only filesystem and don't share
 * disk state between invocations, so nothing written to a local file ever
 * actually persisted or was visible to the next request.
 */
export class UserDatabase {
  private uid: string;
  private data: DatabaseSchema | null = null;

  constructor(uid: string) {
    this.uid = uid;
  }

  private docRef() {
    return adminDb.collection(USER_DATA_COLLECTION).doc(this.uid);
  }

  public async get(): Promise<DatabaseSchema> {
    if (this.data) return this.data;

    const snap = await this.docRef().get();
    if (snap.exists) {
      this.data = snap.data() as DatabaseSchema;
    } else {
      this.data = getEmptyDatabase();
      await this.docRef().set(this.data);
    }
    return this.data;
  }

  public async update(updater: (db: DatabaseSchema) => void): Promise<DatabaseSchema> {
    const current = await this.get();
    updater(current);
    await this.docRef().set(current);
    this.data = current;
    return current;
  }

  public async reset(): Promise<DatabaseSchema> {
    this.data = getEmptyDatabase();
    await this.docRef().set(this.data);
    return this.data;
  }

  public async seedDemoData(): Promise<DatabaseSchema> {
    this.data = getSeededData();
    await this.docRef().set(this.data);
    return this.data;
  }
}

export function getUserDatabase(uid: string): UserDatabase {
  return new UserDatabase(uid);
}
