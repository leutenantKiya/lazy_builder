import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  // Server
  PORT: Number(process.env.PORT) || 3001,
  WEBSOCKET_PORT: Number(process.env.VITE_WEBSOCKET_PORT) || 4444,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "default",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SALT: Number(process.env.SALT) || 12,

  // Client origin (for CORS)
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",

  // Database
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, "../../../data/lazy_builder.db"),
} as const;
