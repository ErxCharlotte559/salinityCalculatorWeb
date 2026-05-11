export type StoreCode = "ew" | "cs" | "hv";

export type ProductCode =
    | "duck"
    | "pork"
    | "feet"
    | "beef"
    | "chicken"
    | "spicy";

export const STORE_PRODUCTS: Record<StoreCode, ProductCode[]> = {
    ew: ["duck", "pork", "feet", "beef", "chicken", "spicy"],
    cs: ["duck", "pork", "feet", "beef", "chicken"],
    hv: ["duck", "pork", "chicken", "spicy"],
};

export const STORE_POT_CAPACITY: Record<
    StoreCode,
    Partial<Record<ProductCode, number>>
> = {
    ew: {
        duck: 40,
        pork: 50,
        feet: 22,
        beef: 27,
        chicken: 32,
        spicy: 22,
    },

    cs: {
        duck: 40,
        pork: 48,
        feet: 33,
        beef: 24,
        chicken: 35,
    },

    hv: {
        duck: 44,
        pork: 44,
        chicken: 44,
        spicy: 17,
    },
};

export const STORES: {
    code: StoreCode;
    name: string;
}[] = [
    { code: "ew", name: "Eastwood" },
    { code: "cs", name: "Campsie" },
    { code: "hv", name: "Hurstville" },
];

export const PRODUCT_LABEL_MAP: Record<string, ProductCode> = {
    鸭: "duck",
    猪: "pork",
    脚: "feet",
    尖: "feet",
    牛: "beef",
    鸡: "chicken",
    辣: "spicy",
};

export const PRODUCT_TARGET_SALINITY: Record<ProductCode, number> = {
    duck: 4.45,
    pork: 3.3,
    feet: 3.1,
    beef: 3.3,
    chicken: 4.45,
    spicy: 3.3,
};

export function getProductCode(label: string | null): ProductCode | null {
    if (!label) return null;
    return PRODUCT_LABEL_MAP[label] ?? null;
}

export function getTargetSalinity(label: string | null): number | null {
    const code = getProductCode(label);
    if (!code) return null;
    return PRODUCT_TARGET_SALINITY[code];
}

export function getPotCapacity(
    store: StoreCode,
    label: string | null,
): number | null {
    const productCode = getProductCode(label);
    if (!productCode) return null;

    return STORE_POT_CAPACITY[store][productCode] ?? null;
}

export function isProductAvailableInStore(
    store: StoreCode,
    label: string | null,
): boolean {
    const productCode = getProductCode(label);
    if (!productCode) return false;

    return STORE_PRODUCTS[store].includes(productCode);
}

export type IngredientCode =
    | "salt"
    | "MSG"
    | "soySauce"
    | "rockSugar"
    | "oysterSauce"
    | "chickenPowder";

export const INGREDIENT_LABELS: Record<IngredientCode, string> = {
    salt: "盐",
    MSG: "味精",
    soySauce: "酱油",
    rockSugar: "冰糖",
    oysterSauce: "蚝油",
    chickenPowder: "鸡粉",
};

export const PRODUCT_INGREDIENT_RATIO: Record<
    ProductCode,
    Partial<Record<IngredientCode, number>>
> = {
    duck: {
        salt: 1,
        MSG: 1 / 4,
        rockSugar: 1,
        soySauce: 1.2,
    },
    pork: {
        salt: 1,
        MSG: 0.3,
        rockSugar: 1,
        soySauce: 1.3,
        oysterSauce: 1 / 10,
    },
    feet: {
        salt: 1,
        MSG: 0.3,
        rockSugar: 1,
        soySauce: 1.3,
        oysterSauce: 1 / 10,
    },
    beef: {
        salt: 1,
        MSG: 1 / 3,
        rockSugar: 1,
        soySauce: 1.2,
        oysterSauce: 1 / 10,
    },
    chicken: {
        salt: 1,
        MSG: 1 / 4,
        chickenPowder: 0,
    },
    spicy: {
        salt: 1,
        MSG: 1 / 3,
        rockSugar: 1,
        soySauce: 1.2,
        oysterSauce: 1 / 10,
    },
};
