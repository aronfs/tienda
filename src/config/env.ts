import { config } from "dotenv";
config();

export const env = {
  port: parseInt(process.env.PORT || "3000"),
  jwtSecret: process.env.JWT_SECRET || "super_secret_key_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "10"),
  nodeEnv: process.env.NODE_ENV || "development",
};
