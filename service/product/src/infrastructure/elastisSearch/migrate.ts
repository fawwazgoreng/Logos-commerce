import { PrismaClient } from "../database/generated/prisma";
import { elasticsearch } from "./setup";

const prisma = new PrismaClient();
const es = elasticsearch;

const migrate = async () => {
    let TAKE_BATCH = 500;
    let skip = 0;
    let total = 0;
    while (true) {
        const products = await prisma.product.findMany({
            take: TAKE_BATCH,
            skip,
            select: {
                id: true,
                storeId: true,
                name: true,
                slug:true,
                description: true,
                price: true,
                stock: true,
                mainImage: true,
                createdAt: true,
                version: true,
                category: {
                    select: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true
                            }
                        }
                    }
                }
            }
        });
        if (products.length === 0) break;
        const ops = products.flatMap((product) => [
            { index: { _index: "product", _id: String(product.id) } },
            {
                id: String(product.id),
                storeId: product.storeId,
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                stock: product.stock,
                mainImage: product.mainImage,
                createdAt: product.createdAt,
                version: product.version,
                category: {
                    id: product.category.map(i => i.category.id),
                    name: product.category.map(i => i.category.name),
                    slug: product.category.map(i => i.category.slug),
                }
            },
        ]);
        const { errors, items } = await es.bulk({ operations: ops });
        if (errors) {
            const failed = items.map((item) => item.index?.error);
            console.log(`error batch ${failed}`);
        }
        total += products.length;
        skip += products.length;
        console.log(`migrated ${total} products...`);
    }
    console.log("migrated done")
    process.exit();
};

migrate().catch((error) => {
    console.error(error);
    process.exit(1);
});
