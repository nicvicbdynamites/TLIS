/**
 * Secrets Manager — detect which API keys are present without exposing values.
 *
 * Usage:
 *   import { secretsManager } from "./secrets-manager.js";
 *   secretsManager.isConfigured("gemini") // → true
 *   secretsManager.getStatuses()          // → [{key, provider, configured, envVar}]
 */

export interface SecretStatus {
  key:        string;
  provider:   string;
  configured: boolean;
  envVar:     string;
}

const SECRET_MAP: Array<{ key: string; envVar: string; provider: string }> = [
  { key: "gemini",         envVar: "GEMINI_API_KEY",           provider: "Google Gemini"           },
  { key: "openai",         envVar: "OPENAI_API_KEY",            provider: "OpenAI"                  },
  { key: "claude",         envVar: "ANTHROPIC_API_KEY",         provider: "Anthropic Claude"        },
  { key: "deepseek",       envVar: "DEEPSEEK_API_KEY",          provider: "DeepSeek"                },
  { key: "grok",           envVar: "XAI_API_KEY",               provider: "xAI Grok"               },
  { key: "mistral",        envVar: "MISTRAL_API_KEY",           provider: "Mistral AI"              },
  { key: "openrouter",     envVar: "OPENROUTER_API_KEY",        provider: "OpenRouter"              },
  { key: "ahrefs",         envVar: "AHREFS_API_KEY",            provider: "Ahrefs"                  },
  { key: "semrush",        envVar: "SEMRUSH_API_KEY",           provider: "SEMrush"                 },
  { key: "reddit_id",      envVar: "REDDIT_CLIENT_ID",          provider: "Reddit"                  },
  { key: "reddit_secret",  envVar: "REDDIT_CLIENT_SECRET",      provider: "Reddit"                  },
  { key: "google_search",  envVar: "GOOGLE_CREDENTIALS",        provider: "Google Search Console"   },
  { key: "tiktok",         envVar: "TIKTOK_API_KEY",            provider: "TikTok"                  },
  { key: "instagram",      envVar: "INSTAGRAM_API_KEY",         provider: "Instagram"               },
  { key: "youtube",        envVar: "YOUTUBE_API_KEY",           provider: "YouTube"                 },
  { key: "pinterest",      envVar: "PINTEREST_API_KEY",         provider: "Pinterest"               },
];

class SecretsManager {
  isConfigured(key: string): boolean {
    const entry = SECRET_MAP.find(s => s.key === key);
    if (!entry) return false;
    return Boolean(process.env[entry.envVar]?.trim());
  }

  /** Returns the raw value — ONLY use server-side, never send to client */
  getKey(key: string): string | undefined {
    const entry = SECRET_MAP.find(s => s.key === key);
    if (!entry) return undefined;
    return process.env[entry.envVar]?.trim() || undefined;
  }

  getStatuses(): SecretStatus[] {
    return SECRET_MAP.map(({ key, envVar, provider }) => ({
      key,
      provider,
      configured: Boolean(process.env[envVar]?.trim()),
      envVar,
    }));
  }

  /** Summary counts for health dashboards */
  getSummary(): { total: number; configured: number; unconfigured: number } {
    const statuses = this.getStatuses();
    const configured = statuses.filter(s => s.configured).length;
    return { total: statuses.length, configured, unconfigured: statuses.length - configured };
  }
}

export const secretsManager = new SecretsManager();
