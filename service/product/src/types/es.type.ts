export interface EsSearchProduct {
    query: string,
    sort: "relevance" | "newest" | "oldest",
    price: number,
    category: string,
    storeId: string,
    from?: number,
    size?: number
}