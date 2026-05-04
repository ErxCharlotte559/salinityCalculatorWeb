export type ExtractedItem = {
    label: string | null;
    originalWeight: number | null;
    mixedWeight: number | null;
    meterReading: number | null;
    raw: string;
};

export type ExtractedData = {
    items: ExtractedItem[];
};

export type CalculationItem = {
    label: string;
    originalWeight: number | null;
    mixedWeight: number | null;
    meterReading: number | null;
    salinity: number | null;
    raw: string;
    capacity?: number | null;
};

export type ApiResult = {
    ok: boolean;
    error?: string;
    data?: ExtractedData;
    calculation?: CalculationItem[];
};
