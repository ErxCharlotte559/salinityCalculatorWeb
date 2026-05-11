import type { StoreCode } from "@/lib/config";
import { STORES } from "@/lib/config";

type Props = {
    value: StoreCode;
    onChange: (value: StoreCode) => void;
};

export function StoreSelector({ value, onChange }: Props) {
    return (
        <div>
            <label className="mb-2 block font-medium">门店</label>

            <div className="flex gap-2">
                {STORES.map((store) => (
                    <button
                        key={store.code}
                        type="button"
                        onClick={() => onChange(store.code)}
                        className={`rounded border px-4 py-2 ${
                            value === store.code
                                ? "bg-black text-white"
                                : "bg-white text-black"
                        }`}
                    >
                        {store.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
