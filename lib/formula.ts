import type { CalculationItem, ExtractedData, ExtractedItem } from "./types";

import {
    getProductCode,
    PRODUCT_INGREDIENT_RATIO,
    type IngredientCode,
} from "./config";

export function calculateRealSalinity(
    originalWeight: number | null,
    mixedWeight: number | null,
    meterReading: number | null,
): number | null {
    if (meterReading === null) {
        return null;
    }

    // 普通品类：只有盐度计读数
    if (originalWeight === null && mixedWeight === null) {
        return meterReading;
    }

    // 脚 / 牛：有原液重量、混合液重量
    if (
        originalWeight === null ||
        mixedWeight === null ||
        originalWeight <= 0
    ) {
        return null;
    }

    return (mixedWeight * meterReading) / originalWeight;
}

export function recalculateItem(item: CalculationItem): CalculationItem {
    return {
        ...item,
        salinity: calculateRealSalinity(
            item.originalWeight,
            item.mixedWeight,
            item.meterReading,
        ),
    };
}

function getCalculationItem(item: ExtractedItem): CalculationItem {
    return {
        label: item.label ?? "未知",
        originalWeight: item.originalWeight,
        mixedWeight: item.mixedWeight,
        meterReading: item.meterReading,
        salinity: calculateRealSalinity(
            item.originalWeight,
            item.mixedWeight,
            item.meterReading,
        ),
        raw: item.raw,
    };
}

export function calculateFromExtractedData(
    data: ExtractedData,
): CalculationItem[] {
    return data.items.map(getCalculationItem);
}

export function calculateSaltToAdd(
    targetSalinity: number | null,
    currentSalinity: number | null,
    capacity: number | null | undefined,
): number | null {
    console.log("checking readings");
    if (
        targetSalinity === null ||
        currentSalinity === null ||
        capacity === null ||
        capacity === undefined
    ) {
        return null;
    }
    console.log(
        `Calculating salt to add: target=${targetSalinity}, current=${currentSalinity}, capacity=${capacity}`,
    );
    return Math.max((targetSalinity - currentSalinity) * capacity * 10, 0);
}

export function calculateIngredients(
    label: string | null,
    saltToAdd: number | null,
): string | null {
    if (saltToAdd === null) return null;

    const productCode = getProductCode(label);
    if (!productCode) return null;

    const ratios = PRODUCT_INGREDIENT_RATIO[productCode];

    const amounts: Partial<Record<IngredientCode, number>> = {};

    for (const [ingredient, ratio] of Object.entries(ratios)) {
        const key = ingredient as IngredientCode;

        if (key === "chickenPowder") continue;
        if (productCode === "pork" && key === "oysterSauce") continue;

        amounts[key] = saltToAdd * ratio;
    }

    for (const ingredient of Object.keys(ratios) as IngredientCode[]) {
        const special = calculateSpecialIngredient(
            productCode,
            ingredient,
            saltToAdd,
            amounts,
        );

        if (special !== null) {
            amounts[ingredient] = special;
        }
    }

    const outputOrder: IngredientCode[] = [
        "salt",
        "MSG",
        "rockSugar",
        "soySauce",
        "oysterSauce",
        "chickenPowder",
    ];

    return outputOrder
        .filter((ingredient) => amounts[ingredient] !== undefined)
        .map((ingredient) => Math.floor(amounts[ingredient] ?? 0))
        .join("/");
}

function floorToMultiple(value: number, step: number): number {
    return Math.floor(value / step) * step;
}

function ceilToMultiple(value: number, step: number): number {
    return Math.ceil(value / step) * step;
}

function calculateSpecialIngredient(
    productCode: string,
    ingredient: IngredientCode,
    baseSalt: number,
    currentAmounts: Partial<Record<IngredientCode, number>>,
): number | null {
    // 猪：蚝油 = 盐 / 10 后取 floor
    if (
        (productCode === "pork" || productCode === "feet") &&
        ingredient === "oysterSauce"
    ) {
        return floorToMultiple(baseSalt / 10, 5);
    }

    // 牛 / 辣：蚝油 = 盐 / 10，然后向上取 5 的倍数
    if (
        (productCode === "beef" || productCode === "spicy") &&
        ingredient === "oysterSauce"
    ) {
        return ceilToMultiple(baseSalt / 10, 5);
    }

    // 鸡：鸡粉由味精决定
    // 味精 >= 50，则鸡粉 = 味精 - 10
    // 否则鸡粉 = 味精 - 5
    if (productCode === "chicken" && ingredient === "chickenPowder") {
        const msg = currentAmounts.MSG;

        if (msg === undefined) return null;

        return msg >= 110
            ? 80
            : msg >= 90
              ? msg - 30
              : msg >= 40
                ? msg - 20
                : msg - 5;
    }

    return null;
}
