import { Client } from "@elastic/elasticsearch";
import { env } from "../../config";

export const elasticsearch = new Client({
    node: env.ELASTICSEARCH_URL,
    auth: {
        apiKey: String(env.ELASTICSEARCH_API_KEY),
    },
});
