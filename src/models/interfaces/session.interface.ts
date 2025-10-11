export interface Session {
  _id: string;
  userId: string;
  userRole: string;
  userEmail: string;
  userName: string;

  // 🎯 INFORMAÇÕES DE LOGIN
  loginAt: Date;
  logoutAt?: Date;
  lastActivity: Date;
  status: "online" | "offline" | "idle";

  // 🎯 INFORMAÇÕES DO DISPOSITIVO
  device: {
    type: "mobile" | "tablet" | "desktop" | "unknown";
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    platform: string;
  };

  // 🎯 INFORMAÇÕES DE LOCALIZAÇÃO
  location: {
    ip: string;
    country?: string;
    city?: string;
    timezone?: string;
  };

  // 🎯 INFORMAÇÕES DE SEGURANÇA
  security: {
    userAgent: string;
    isSecure: boolean;
    tokenVersion: number;
  };

  // 🎯 TOKENS
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;

  // 🎯 MÉTRICAS
  duration?: number; // em minutos
  activityCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface SessionActivity {
  _id: string;
  sessionId: string;
  userId: string;
  action: "login" | "logout" | "refresh" | "activity" | "timeout";
  timestamp: Date;
  details: {
    route?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
  };
}
