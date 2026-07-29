import { addPost } from "./calendar";
import { pushNotification } from "./notifications-store";

export type CampaignStatus = 
  | "Draft"
  | "Researching"
  | "Generating"
  | "Awaiting Review"
  | "Approved"
  | "Scheduled"
  | "Publishing"
  | "Published"
  | "Analytics Complete"
  | "Archived"
  | "Rejected";

export interface ImageAsset {
  id: string;
  url: string;
  title: string;
  prompt?: string;
  approved: boolean;
}

export interface VideoAsset {
  id: string;
  url: string;
  title: string;
  duration: string;
  resolution: string;
  status: "Ready" | "Generating" | "Needs Approval";
  approved: boolean;
  posterUrl?: string;
}

export interface AIQualityCheck {
  hookScore: number;       // e.g. 96
  captionScore: number;    // e.g. 92
  brandConsistency: number;// e.g. 98
  visualQuality: number;   // e.g. 95
  aiConfidence: number;    // e.g. 94
  overallScore: number;    // e.g. 95
}

export interface CampaignContent {
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  thumbnailDescription: string;
  musicRecommendation: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "status_change" | "ai_action" | "review" | "schedule" | "publish" | "analytics" | "system";
  title: string;
  description: string;
  user?: string;
}

export interface CampaignMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  roiScore: number;
}

export interface Campaign {
  id: string;
  name: string;
  targetAccount: string;
  status: CampaignStatus;
  aiConfidence: number;
  createdAt: string;
  scheduledDate?: string;
  publishedDate?: string;
  rejectionReason?: string;
  niche: string;
  images: ImageAsset[];
  videos: VideoAsset[];
  content: CampaignContent;
  qualityCheck: AIQualityCheck;
  timeline?: TimelineEvent[];
  metrics?: CampaignMetrics;
}

const STORAGE_KEY = "tlis_review_center_campaigns_v3";

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "rev-101",
    name: "Quiet Luxury GRWM Morning Routine",
    targetAccount: "@aether.luxury",
    status: "Awaiting Review",
    aiConfidence: 94,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    niche: "Quiet Luxury Skincare",
    images: [
      {
        id: "img-1",
        url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
        title: "Minimalist Skincare Shelfie",
        prompt: "Minimalist luxury glass bottles on Italian Carrara marble surface, morning natural sunlight, warm neutral tones 8k",
        approved: false,
      },
      {
        id: "img-2",
        url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80",
        title: "Cashmere Robe & Silk Eye Mask",
        prompt: "Ultra soft ivory cashmere robe folded beside raw silk eye mask on beige linen duvet, soft shadow depth",
        approved: true,
      },
    ],
    videos: [
      {
        id: "vid-1",
        url: "https://assets.mixkit.co/videos/preview/mixkit-skin-care-product-being-applied-to-face-41133-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
        title: "60-Second Aesthetic GRWM Clip",
        duration: "00:58",
        resolution: "1080x1920 (9:16)",
        status: "Ready",
        approved: false,
      }
    ],
    content: {
      hook: "POV: You found the skincare routine that Silicon Valley billionaires actually use quietly...",
      caption: "Quiet luxury isn't about logos or noisy claims. It's about elevated essentials, pure formulations, and knowing what to use — and what to leave behind.",
      cta: "Save this clip for your Sunday morning aesthetic reset & explore the full guide in bio.",
      hashtags: ["#QuietLuxury", "#MinimalistSkincare", "#OldMoneyAesthetic", "#GRWM", "#LuxuryLifestyle"],
      thumbnailDescription: "Close-up of golden serum droplet landing on clean Carrara marble with serif typography text over top.",
      musicRecommendation: "Ludovico Einaudi - Nuvole Bianche (Subtle Piano Ambient Reverb)",
    },
    qualityCheck: {
      hookScore: 96,
      captionScore: 92,
      brandConsistency: 98,
      visualQuality: 95,
      aiConfidence: 94,
      overallScore: 95,
    },
    timeline: [
      {
        id: "tl-1",
        timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        type: "status_change",
        title: "Campaign Draft Initialized",
        description: "Created campaign draft targeting @aether.luxury",
        user: "Automation Engine"
      },
      {
        id: "tl-2",
        timestamp: new Date(Date.now() - 3600000 * 3.2).toISOString(),
        type: "ai_action",
        title: "Trend Research Completed",
        description: "Scraped Quiet Luxury Skincare metrics. Found 94% viral correlation for Carrara marble visuals.",
        user: "Intelligence Vault"
      },
      {
        id: "tl-3",
        timestamp: new Date(Date.now() - 3600000 * 3.1).toISOString(),
        type: "ai_action",
        title: "Assets & Copy Synthesized",
        description: "Gemini 2.0 generated 2 4K images and 1 60s video clip with 94% AI confidence score.",
        user: "Gemini 2.0 AI"
      },
      {
        id: "tl-4",
        timestamp: new Date(Date.now() - 3600000 * 3.0).toISOString(),
        type: "status_change",
        title: "Moved to Awaiting Review",
        description: "Automated pipeline placed campaign in Review Center approval queue.",
        user: "TLIS Pipeline"
      }
    ]
  },
  {
    id: "rev-102",
    name: "Silicon Valley Minimalist Wardrobe Edit",
    targetAccount: "@velvet.vogue",
    status: "Awaiting Review",
    aiConfidence: 91,
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    niche: "Old Money Fashion",
    images: [
      {
        id: "img-3",
        url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
        title: "Unbranded Loro Piana Style Coat",
        prompt: "Tailored beige wool overcoat hanging against warm concrete wall, neutral color palette",
        approved: false,
      },
      {
        id: "img-4",
        url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80",
        title: "Handcrafted Leather Loafers Detail",
        prompt: "Handstitched dark espresso leather loafers resting on parquet wood floor, warm indirect lighting",
        approved: false,
      }
    ],
    videos: [
      {
        id: "vid-2",
        url: "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-wearing-a-coat-41132-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
        title: "Capsule Wardrobe Assembly Reel",
        duration: "00:42",
        resolution: "1080x1920 (9:16)",
        status: "Ready",
        approved: false,
      }
    ],
    content: {
      hook: "3 Unwritten rules of Dressing Like a Tech Founder Who Doesn't Need Validation...",
      caption: "True luxury is invisible to those who search for logos. It's in the weave of double-faced cashmere and hand-burnished leather.",
      cta: "Tap the bookmark icon to save this capsule breakdown for your next seasonal refresh.",
      hashtags: ["#CapsuleWardrobe", "#QuietLuxury", "#SilentWealth", "#OldMoneyStyle", "#TechFounder"],
      thumbnailDescription: "Folded cashmere knitwear stack with golden serif title overlay: 'The 3 Unspoken Wardrobe Rules'",
      musicRecommendation: "Max Richter - On The Nature Of Daylight (Soft String Arrangement)",
    },
    qualityCheck: {
      hookScore: 92,
      captionScore: 89,
      brandConsistency: 95,
      visualQuality: 91,
      aiConfidence: 91,
      overallScore: 92,
    },
    timeline: [
      {
        id: "tl-5",
        timestamp: new Date(Date.now() - 3600000 * 7.5).toISOString(),
        type: "status_change",
        title: "Draft Initialized",
        description: "Created campaign targeting @velvet.vogue",
        user: "Automation Engine"
      },
      {
        id: "tl-6",
        timestamp: new Date(Date.now() - 3600000 * 7.0).toISOString(),
        type: "status_change",
        title: "Moved to Awaiting Review",
        description: "Ready for creative director approval",
        user: "TLIS Pipeline"
      }
    ]
  },
  {
    id: "rev-103",
    name: "Private Jet Set Hospitality Protocol",
    targetAccount: "@aether.luxury",
    status: "Approved",
    aiConfidence: 96,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    niche: "Private Aviation & Travel",
    images: [
      {
        id: "img-5",
        url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
        title: "Cabin Interior Warm Ambiance",
        prompt: "Private jet luxury cabin interior with champagne flutes on mahogany table, sunset glow",
        approved: true,
      }
    ],
    videos: [
      {
        id: "vid-3",
        url: "https://assets.mixkit.co/videos/preview/mixkit-airplane-flying-over-clouds-during-sunset-1208-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
        title: "Sunset Flight Departure",
        duration: "00:45",
        resolution: "1080x1920 (9:16)",
        status: "Ready",
        approved: true,
      }
    ],
    content: {
      hook: "Inside the private aviation protocol that 0.01% travelers use to avoid jet lag...",
      caption: "Comfort is not a luxury — it's an optimization strategy when flying between Zurich, London, and New York.",
      cta: "Follow @aether.luxury for daily private aviation insights and bespoke itinerary breakdowns.",
      hashtags: ["#PrivateJet", "#JetSetLife", "#LuxuryTravel", "#ExecutiveTravel", "#AetherLuxury"],
      thumbnailDescription: "Gulfstream cabin window view at 40,000 feet with golden typography.",
      musicRecommendation: "Lo-Fi Deep Ambient Chill - Sunset Altitude",
    },
    qualityCheck: {
      hookScore: 97,
      captionScore: 95,
      brandConsistency: 98,
      visualQuality: 96,
      aiConfidence: 96,
      overallScore: 97,
    },
    timeline: [
      {
        id: "tl-7",
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        type: "review",
        title: "Approved by Creative Lead",
        description: "Passed AI Quality check with 97/100 score.",
        user: "Executive Lead"
      }
    ]
  },
  {
    id: "rev-104",
    name: "Swiss Alps Chalet Architectural Tour",
    targetAccount: "@quiet.serenity",
    status: "Scheduled",
    aiConfidence: 93,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    scheduledDate: new Date(Date.now() + 3600000 * 18).toISOString(),
    niche: "Luxury Architecture & Real Estate",
    images: [
      {
        id: "img-6",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
        title: "Chalet Living Room Fireplace",
        prompt: "Modern Swiss chalet living room with floor to ceiling glass windows facing snowy Alpine peaks, roaring fireplace",
        approved: true,
      }
    ],
    videos: [
      {
        id: "vid-4",
        url: "https://assets.mixkit.co/videos/preview/mixkit-snow-falling-on-a-forest-of-pine-trees-41071-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
        title: "Alpine Sanctuary Walkthrough",
        duration: "00:52",
        resolution: "1080x1920 (9:16)",
        status: "Ready",
        approved: true,
      }
    ],
    content: {
      hook: "Would you spend $45M on this invisible Alpine chalet hidden in the Swiss mountains?",
      caption: "Designed by renowned architects to blur the boundary between raw granite mountain faces and cozy fireside warmth.",
      cta: "Comment 'ALPS' below to receive the complete floorplan blueprint directly.",
      hashtags: ["#LuxuryRealEstate", "#SwissAlps", "#ArchitectureDigest", "#ChaletDesign", "#QuietLuxury"],
      thumbnailDescription: "Panoramic Alpine chalet view at twilight with firepit glow.",
      musicRecommendation: "Yiruma - River Flows In You (Acoustic Guitar Reverb)",
    },
    qualityCheck: {
      hookScore: 94,
      captionScore: 91,
      brandConsistency: 96,
      visualQuality: 94,
      aiConfidence: 93,
      overallScore: 94,
    },
    timeline: [
      {
        id: "tl-8",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: "schedule",
        title: "Scheduled for Auto-Publishing",
        description: "Sent to TikTok Scheduler for dispatch tomorrow at 11:00 AM EST.",
        user: "Scheduler Service"
      }
    ]
  },
  {
    id: "rev-105",
    name: "Monaco Yachting Evening Sunset Protocol",
    targetAccount: "@aether.luxury",
    status: "Analytics Complete",
    aiConfidence: 98,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    publishedDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    niche: "Yachting & Maritime Luxury",
    images: [
      {
        id: "img-7",
        url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&auto=format&fit=crop&q=80",
        title: "Superyacht Deck Dining Setting",
        prompt: "Superyacht aft deck sunset dining arrangement, crystal glasses reflecting Cote d'Azur twilight",
        approved: true,
      }
    ],
    videos: [
      {
        id: "vid-5",
        url: "https://assets.mixkit.co/videos/preview/mixkit-yacht-sailing-in-the-sea-at-sunset-41130-large.mp4",
        posterUrl: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&auto=format&fit=crop&q=80",
        title: "Cote d'Azur Sunset Sail",
        duration: "00:38",
        resolution: "1080x1920 (9:16)",
        status: "Ready",
        approved: true,
      }
    ],
    content: {
      hook: "The unspoken etiquette rules of attending a private superyacht dinner in Port Hercules...",
      caption: "From bare-feet deck rules to discrete toast signals — mastering maritime luxury culture.",
      cta: "Save for your next Riviera voyage.",
      hashtags: ["#MonacoYachting", "#Superyacht", "#CotedAzur", "#MonacoLife", "#AetherLuxury"],
      thumbnailDescription: "Port Hercules harbor lights reflected on calm dark Mediterranean waters.",
      musicRecommendation: "Riviera Deep House Sunset Edit",
    },
    qualityCheck: {
      hookScore: 98,
      captionScore: 97,
      brandConsistency: 99,
      visualQuality: 98,
      aiConfidence: 98,
      overallScore: 98,
    },
    metrics: {
      views: 184200,
      likes: 24800,
      comments: 1420,
      shares: 3100,
      engagementRate: 15.9,
      roiScore: 9.8
    },
    timeline: [
      {
        id: "tl-9",
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        type: "status_change",
        title: "Draft Initialized",
        description: "Created campaign targeting @aether.luxury",
        user: "Automation Engine"
      },
      {
        id: "tl-10",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: "publish",
        title: "Published to TikTok",
        description: "Post live via Open API. Link generated.",
        user: "Publisher"
      },
      {
        id: "tl-11",
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        type: "analytics",
        title: "Analytics Aggregated",
        description: "Reached 184,200 views and 15.9% engagement rate.",
        user: "Analytics Engine"
      }
    ]
  }
];

export function loadCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CAMPAIGNS));
      return INITIAL_CAMPAIGNS;
    }
    const parsed = JSON.parse(raw) as Campaign[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CAMPAIGNS;
  } catch {
    return INITIAL_CAMPAIGNS;
  }
}

export function saveCampaigns(campaigns: Campaign[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    window.dispatchEvent(new CustomEvent("tlis_review_center_update"));
    window.dispatchEvent(new CustomEvent("tlis_lifecycle_update"));
  } catch (err) {
    console.error("Failed to save review center campaigns", err);
  }
}

export function getCampaignById(id: string): Campaign | undefined {
  return loadCampaigns().find(c => c.id === id);
}

export function addTimelineEvent(campaignId: string, event: Omit<TimelineEvent, "id" | "timestamp">): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === campaignId);
  if (index === -1) return undefined;

  const newEvent: TimelineEvent = {
    ...event,
    id: `tl-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
  };

  const timeline = campaigns[index].timeline || [];
  campaigns[index].timeline = [newEvent, ...timeline];

  saveCampaigns(campaigns);
  return campaigns[index];
}

export function createCampaign(data: Omit<Campaign, "id" | "createdAt">): Campaign {
  const campaigns = loadCampaigns();
  const newId = `rev-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const newCampaign: Campaign = {
    ...data,
    id: newId,
    createdAt: nowIso,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: nowIso,
        type: "status_change",
        title: `Campaign Created (${data.status})`,
        description: `Campaign initialized for ${data.targetAccount}`,
        user: "TLIS Pipeline"
      }
    ]
  };

  campaigns.unshift(newCampaign);
  saveCampaigns(campaigns);

  // Notify system
  pushNotification({
    title: "New Campaign Created",
    message: `Campaign '${newCampaign.name}' is now in stage ${newCampaign.status}.`,
    type: "info",
    category: "campaign",
    actionUrl: `/review-center?id=${newCampaign.id}`,
    campaignId: newCampaign.id
  });

  return newCampaign;
}

export function updateCampaignStatus(id: string, newStatus: CampaignStatus, note?: string): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return undefined;

  const oldStatus = campaigns[index].status;
  campaigns[index].status = newStatus;

  // Add timeline
  const newEvent: TimelineEvent = {
    id: `tl-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: "status_change",
    title: `Status Transition: ${newStatus}`,
    description: note || `Campaign moved from ${oldStatus} to ${newStatus}`,
    user: "User Action"
  };

  campaigns[index].timeline = [newEvent, ...(campaigns[index].timeline || [])];

  saveCampaigns(campaigns);

  // PUSH NOTIFICATION
  pushNotification({
    title: `Campaign ${newStatus}`,
    message: `'${campaigns[index].name}' status changed to ${newStatus}.`,
    type: newStatus === "Published" ? "publish" : newStatus === "Awaiting Review" ? "info" : "success",
    category: "campaign",
    actionUrl: `/review-center?id=${id}`,
    campaignId: id
  });

  return campaigns[index];
}

export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return undefined;

  campaigns[index] = { ...campaigns[index], ...updates };
  saveCampaigns(campaigns);
  return campaigns[index];
}

export function approveCampaign(id: string): Campaign | undefined {
  return updateCampaignStatus(id, "Approved", "Approved by Creative Lead in Review Center.");
}

export function rejectCampaign(id: string, reason?: string): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return undefined;

  campaigns[index].status = "Rejected";
  campaigns[index].rejectionReason = reason || "Campaign rejected during creative review.";
  
  const newEvent: TimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "review",
    title: "Campaign Rejected",
    description: reason || "Rejected during creative review",
    user: "User Reviewer"
  };

  campaigns[index].timeline = [newEvent, ...(campaigns[index].timeline || [])];
  saveCampaigns(campaigns);

  pushNotification({
    title: "Campaign Rejected",
    message: `'${campaigns[index].name}' was rejected: ${reason || "Failed review"}`,
    type: "warning",
    category: "campaign",
    actionUrl: `/review-center?id=${id}`,
    campaignId: id
  });

  return campaigns[index];
}

export function scheduleCampaign(id: string, scheduledDate: string): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return undefined;

  campaigns[index].status = "Scheduled";
  campaigns[index].scheduledDate = scheduledDate;

  const newEvent: TimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "schedule",
    title: "Scheduled for Publishing",
    description: `Target publish time: ${new Date(scheduledDate).toLocaleString()}`,
    user: "Scheduler"
  };

  campaigns[index].timeline = [newEvent, ...(campaigns[index].timeline || [])];
  saveCampaigns(campaigns);

  // Send to Content Calendar automatically!
  try {
    const dateObj = new Date(scheduledDate);
    const scheduledDay = dateObj.toISOString().slice(0, 10);
    const scheduledTime = dateObj.toTimeString().slice(0, 5);

    addPost({
      title: campaigns[index].name,
      content: `${campaigns[index].content.hook}\n\n${campaigns[index].content.caption}`,
      type: "hook",
      platform: "TikTok",
      niche: campaigns[index].niche || "Quiet Luxury",
      status: "scheduled",
      scheduledDay,
      scheduledTime,
    });
  } catch (e) {
    console.warn("Failed to push scheduled campaign to calendar", e);
  }

  pushNotification({
    title: "Campaign Scheduled",
    message: `'${campaigns[index].name}' scheduled for ${new Date(scheduledDate).toLocaleString()}.`,
    type: "success",
    category: "publish",
    actionUrl: `/review-center?id=${id}`,
    campaignId: id
  });

  return campaigns[index];
}

export function publishCampaign(id: string): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return undefined;

  const nowIso = new Date().toISOString();
  campaigns[index].status = "Published";
  campaigns[index].publishedDate = nowIso;

  const newEvent: TimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    type: "publish",
    title: "Published Live to TikTok",
    description: `Successfully broadcasted to target account ${campaigns[index].targetAccount}`,
    user: "Publisher Engine"
  };

  campaigns[index].timeline = [newEvent, ...(campaigns[index].timeline || [])];
  saveCampaigns(campaigns);

  try {
    const today = nowIso.slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5);
    addPost({
      title: campaigns[index].name,
      content: `${campaigns[index].content.hook}\n\n${campaigns[index].content.caption}`,
      type: "hook",
      platform: "TikTok",
      niche: campaigns[index].niche || "Quiet Luxury",
      status: "posted",
      scheduledDay: today,
      scheduledTime: timeNow,
    });
  } catch (e) {
    console.warn("Failed to push published campaign to calendar", e);
  }

  pushNotification({
    title: "Publish Successful! 🚀",
    message: `'${campaigns[index].name}' is now live on TikTok @ ${campaigns[index].targetAccount}.`,
    type: "publish",
    category: "publish",
    actionUrl: `/analytics`,
    campaignId: id
  });

  return campaigns[index];
}

export function completeAnalytics(id: string, metrics?: CampaignMetrics): Campaign | undefined {
  const campaigns = loadCampaigns();
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) return undefined;

  campaigns[index].status = "Analytics Complete";
  if (metrics) {
    campaigns[index].metrics = metrics;
  }

  const newEvent: TimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "analytics",
    title: "Analytics Data Aggregated",
    description: "Post metrics compiled into Intelligence Vault and Analytics dashboard.",
    user: "Analytics Service"
  };

  campaigns[index].timeline = [newEvent, ...(campaigns[index].timeline || [])];
  saveCampaigns(campaigns);

  pushNotification({
    title: "Analytics Aggregated",
    message: `'${campaigns[index].name}' metrics performance report generated.`,
    type: "success",
    category: "campaign",
    actionUrl: `/analytics`,
    campaignId: id
  });

  return campaigns[index];
}

export function archiveCampaign(id: string): Campaign | undefined {
  return updateCampaignStatus(id, "Archived", "Campaign archived into historical vault.");
}

export function getReviewCenterStats() {
  const campaigns = loadCampaigns();
  const todayStr = new Date().toISOString().slice(0, 10);

  const draft = campaigns.filter(c => c.status === "Draft").length;
  const researching = campaigns.filter(c => c.status === "Researching").length;
  const generating = campaigns.filter(c => c.status === "Generating").length;
  const awaitingReview = campaigns.filter(c => c.status === "Awaiting Review").length;
  const approvedToday = campaigns.filter(c => 
    c.status === "Approved" || 
    (c.status === "Scheduled" && c.scheduledDate?.startsWith(todayStr)) ||
    (c.status === "Published" && c.publishedDate?.startsWith(todayStr))
  ).length;
  const scheduled = campaigns.filter(c => c.status === "Scheduled").length;
  const publishing = campaigns.filter(c => c.status === "Publishing").length;
  const published = campaigns.filter(c => c.status === "Published").length;
  const analyticsComplete = campaigns.filter(c => c.status === "Analytics Complete").length;
  const archived = campaigns.filter(c => c.status === "Archived").length;

  return {
    draft,
    researching,
    generating,
    awaitingReview,
    approvedToday,
    scheduled,
    publishing,
    published,
    analyticsComplete,
    archived,
    total: campaigns.length,
  };
}

export async function refineContentWithAI(
  campaign: Campaign,
  action: "improve" | "rewrite" | "luxury" | "viral" | "shorten" | "expand"
): Promise<CampaignContent> {
  const { content, niche } = campaign;

  let newHook = content.hook;
  let newCaption = content.caption;
  let newCta = content.cta;
  let newHashtags = [...content.hashtags];

  switch (action) {
    case "improve":
      newHook = `POV: Discovering the ${niche} secret that industry insiders keep behind closed doors...`;
      newCaption = `${content.caption} Elevated design meets effortless function — crafted for those who demand quiet elegance.`;
      newCta = `Bookmark this ${niche} protocol and explore the link in bio.`;
      break;

    case "rewrite":
      newHook = `Why ${niche} connoisseurs never compromise on the 3 fundamental rules of luxury...`;
      newCaption = `Redefining sophistication through intentional minimalism. True quality speaks in whispers, not shouts.`;
      break;

    case "luxury":
      newHook = `The silent luxury rule: How discreet ${niche} curation replaces loud branding...`;
      newCaption = `An homage to timeless craftsmanship and understated perfection in ${niche}.`;
      newHashtags = ["#QuietLuxury", "#SilentWealth", "#TimelessElegance", "#OldMoneyAesthetic", "#LuxuryLifestyle"];
      break;

    case "viral":
      newHook = `Stop scrolling: 99% of people get ${niche} wrong — here's what Silicon Valley leaders actually do...`;
      newCaption = `The internet is obsessed with this minimalist ${niche} routine for a reason. Here is the exact step-by-step breakdown. 🔥`;
      newCta = `Save this before it goes viral and share with someone who needs this!`;
      newHashtags = ["#ViralTikTok", "#QuietLuxury", "#GrowthHack", "#MinimalistLife", "#MindsetShift"];
      break;

    case "shorten":
      newHook = content.hook.length > 50 ? content.hook.slice(0, 50) + "..." : content.hook;
      newCaption = content.caption.split(". ")[0] + ".";
      newCta = "Save for later.";
      break;

    case "expand":
      newHook = `${content.hook} (Part 1 of the Quiet Luxury Blueprint Series)`;
      newCaption = `${content.caption}\n\n1. Focus on tactile materials.\n2. Prioritize clean silhouettes.\n3. Embrace subtle warm tones.`;
      newCta = `Follow for Part 2 releasing tomorrow at 11 AM EST.`;
      break;
  }

  return {
    ...content,
    hook: newHook,
    caption: newCaption,
    cta: newCta,
    hashtags: newHashtags,
  };
}
