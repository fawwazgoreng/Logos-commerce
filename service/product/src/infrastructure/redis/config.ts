import Redis, { RedisOptions } from "ioredis";
import { env } from "../../config";

const keyPrefix = `${env.APP_NAME}:${env.NODE_ENV}:`;

const RedisConfig : RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: String(env.REDIS_PASSWORD),
    db: env.REDIS_DB,
    keyPrefix
};

export default new Redis(RedisConfig);
