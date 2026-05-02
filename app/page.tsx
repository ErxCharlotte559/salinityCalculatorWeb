"use client";

import { Fragment, useState } from "react";
import type { ApiResult, CalculationItem } from "@/lib/types";
import type { StoreCode } from "@/lib/config";
import { STORES, getPotCapacity, getTargetSalinity } from "@/lib/config";
import {
    calculateIngredients,
    calculateSaltToAdd,
    recalculateItem,
} from "@/lib/formula";

export default function Home() {
    const [file, setFile] = useState<File | null>(null);

    const [selectedStore, setSelectedStore] = useState<StoreCode>("ew");
    const [showStoreModal, setShowStoreModal] = useState(false);

    const [resData, setResData] = useState<ApiResult | null>(null);
    const [editableData, setEditableData] = useState<CalculationItem[]>([]);
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>(
        {},
    );
    const [showRawJson, setShowRawJson] = useState(false);

    const [loading, setLoading] = useState(false);

    function openStoreModal(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!file) {
            alert("请先选择图片");
            return;
        }

        setShowStoreModal(true);
    }

    async function uploadWithStore(store: StoreCode) {
        if (!file) {
            alert("请先选择图片");
            return;
        }

        setSelectedStore(store);
        setShowStoreModal(false);

        const form = new FormData();
        form.append("image", file);
        form.append("store", store);

        setLoading(true);
        setResData(null);
        setEditableData([]);
        setExpandedRows({});
        setShowRawJson(false);

        try {
            const res = await fetch("/api/calculate", {
                method: "POST",
                body: form,
            });

            const data: ApiResult = await res.json();

            const calculationWithCapacity = (data.calculation ?? []).map(
                (item) => ({
                    ...item,
                    capacity: getPotCapacity(store, item.label),
                }),
            );

            setResData(data);
            setEditableData(calculationWithCapacity);
        } catch {
            setResData({
                ok: false,
                error: "请求失败，请检查服务器或 API",
            });
        } finally {
            setLoading(false);
        }
    }

    function updateSalinity(index: number, value: string) {
        setEditableData((prev) => {
            const copy = [...prev];

            copy[index] = {
                ...copy[index],
                salinity: value === "" ? null : Number(value),
            };

            return copy;
        });
    }

    function updateCapacity(index: number, value: string) {
        setEditableData((prev) => {
            const copy = [...prev];

            copy[index] = {
                ...copy[index],
                capacity: value === "" ? null : Number(value),
            };

            return copy;
        });
    }

    function updateWeightedValue(
        index: number,
        key:
            | "tare1"
            | "total1"
            | "salinity1"
            | "tare2"
            | "total2"
            | "temperature",
        value: string,
    ) {
        setEditableData((prev) => {
            const copy = [...prev];
            const item = copy[index];

            if (!item.weighted) return prev;

            const updated: CalculationItem = {
                ...item,
                weighted: {
                    ...item.weighted,
                    [key]: value === "" ? null : Number(value),
                },
            };

            copy[index] = recalculateItem(updated);
            return copy;
        });
    }

    function resetEditableData() {
        setEditableData(
            (resData?.calculation ?? []).map((item) => ({
                ...item,
                capacity: getPotCapacity(selectedStore, item.label),
            })),
        );
    }

    function toggleRow(index: number) {
        setExpandedRows((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    }

    function changeStore(store: StoreCode) {
        setSelectedStore(store);

        setEditableData((prev) =>
            prev.map((item) => ({
                ...item,
                capacity: getPotCapacity(store, item.label),
            })),
        );
    }

    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="mb-6 text-2xl font-bold">盐度计算</h1>

            <form onSubmit={openStoreModal} className="space-y-4">
                <div>
                    <label className="mb-2 block font-medium">选择图片</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            setFile(e.target.files?.[0] ?? null);
                        }}
                    />
                </div>

                {resData && (
                    <div className="mt-4">
                        <label className="mb-2 block font-medium">
                            当前门店
                        </label>

                        <div className="flex gap-2">
                            {STORES.map((store) => (
                                <button
                                    key={store.code}
                                    type="button"
                                    onClick={() => changeStore(store.code)}
                                    className={`rounded border px-4 py-2 ${
                                        selectedStore === store.code
                                            ? "bg-black text-white"
                                            : "bg-white text-black"
                                    }`}
                                >
                                    {store.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                    {loading ? "处理中..." : "上传"}
                </button>
            </form>

            {showStoreModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
                        <h2 className="mb-4 text-lg font-bold">请选择门店</h2>

                        <div className="grid gap-3">
                            {STORES.map((store) => (
                                <button
                                    key={store.code}
                                    type="button"
                                    onClick={() => uploadWithStore(store.code)}
                                    className="rounded border px-4 py-3 text-left hover:bg-gray-100"
                                >
                                    {store.name}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowStoreModal(false)}
                            className="mt-4 rounded border px-4 py-2 text-sm"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}

            {resData?.error && (
                <div className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-red-700">
                    {resData.error}
                </div>
            )}

            {editableData.length > 0 && (
                <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-lg font-bold">计算结果</h2>

                        <button
                            type="button"
                            onClick={resetEditableData}
                            className="rounded border px-3 py-1 text-sm"
                        >
                            恢复识别值
                        </button>
                    </div>

                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2">品类</th>
                                <th className="border p-2">真实盐度</th>
                                <th className="border p-2">目标盐度</th>
                                <th className="border p-2">锅容量(g)</th>
                                <th className="border p-2">温度</th>
                                <th className="border p-2">温度是否有效</th>
                                <th className="border p-2">提示</th>
                                <th className="border p-2">原始识别</th>
                            </tr>
                        </thead>

                        <tbody>
                            {editableData.map((item, index) => (
                                <Fragment key={`${item.label}-${index}`}>
                                    <tr>
                                        <td className="border p-2">
                                            {item.type === "weighted" ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleRow(index)
                                                    }
                                                    className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded border text-xs"
                                                >
                                                    {expandedRows[index]
                                                        ? "▼"
                                                        : "▶"}
                                                </button>
                                            ) : (
                                                <span className="mr-8" />
                                            )}

                                            {item.label}
                                        </td>

                                        <td className="border p-2">
                                            <input
                                                className="w-24 rounded border px-2 py-1"
                                                type="number"
                                                step="0.01"
                                                value={item.salinity ?? ""}
                                                onChange={(e) =>
                                                    updateSalinity(
                                                        index,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>

                                        <td className="border p-2">
                                            {getTargetSalinity(item.label) ??
                                                "-"}
                                        </td>

                                        <td className="border p-2">
                                            <input
                                                className="w-28 rounded border px-2 py-1"
                                                type="number"
                                                step="1"
                                                value={item.capacity ?? ""}
                                                onChange={(e) =>
                                                    updateCapacity(
                                                        index,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>

                                        <td className="border p-2">
                                            {item.temperature === null
                                                ? "-"
                                                : `${item.temperature}°C`}
                                        </td>

                                        <td
                                            className={`border p-2 ${
                                                item.temperatureValid
                                                    ? "text-green-700"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            {item.temperatureValid
                                                ? "有效"
                                                : "无效"}
                                        </td>

                                        <td className="border p-2 text-red-600">
                                            {item.temperatureWarning ?? "-"}
                                        </td>

                                        <td className="border p-2 text-gray-500">
                                            {item.raw}
                                        </td>
                                    </tr>

                                    {item.type === "weighted" &&
                                        item.weighted &&
                                        expandedRows[index] && (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="border bg-gray-50 p-3"
                                                >
                                                    <div className="grid grid-cols-6 gap-3 text-sm">
                                                        {(
                                                            [
                                                                [
                                                                    "tare1",
                                                                    "容器1",
                                                                ],
                                                                [
                                                                    "total1",
                                                                    "总重1",
                                                                ],
                                                                [
                                                                    "salinity1",
                                                                    "盐度1",
                                                                ],
                                                                [
                                                                    "tare2",
                                                                    "容器2",
                                                                ],
                                                                [
                                                                    "total2",
                                                                    "总重2",
                                                                ],
                                                                [
                                                                    "temperature",
                                                                    "温度2",
                                                                ],
                                                            ] as const
                                                        ).map(
                                                            ([key, label]) => (
                                                                <label
                                                                    key={key}
                                                                    className="space-y-1"
                                                                >
                                                                    <span className="block text-gray-600">
                                                                        {label}
                                                                    </span>
                                                                    <input
                                                                        className="w-full rounded border px-2 py-1"
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={
                                                                            item
                                                                                .weighted?.[
                                                                                key
                                                                            ] ??
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            updateWeightedValue(
                                                                                index,
                                                                                key,
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                    />
                                                                </label>
                                                            ),
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editableData.length > 0 && (
                <div className="mt-6 rounded border p-4">
                    <h2 className="mb-3 text-lg font-bold">添加结果</h2>

                    <div className="space-y-1 text-base">
                        {editableData.map((item, index) => {
                            const target = getTargetSalinity(item.label);
                            const saltToAdd = calculateSaltToAdd(
                                target,
                                item.salinity,
                                item.capacity,
                            );

                            const output = calculateIngredients(
                                item.label,
                                saltToAdd,
                            );

                            return (
                                <div key={index}>
                                    {item.label} {output ?? "-"}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {resData && (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => setShowRawJson((prev) => !prev)}
                        className="rounded border px-3 py-1 text-sm"
                    >
                        {showRawJson ? "隐藏原始 JSON" : "展开原始 JSON"}
                    </button>

                    {showRawJson && (
                        <pre className="mt-3 overflow-auto rounded bg-gray-100 p-4 text-sm">
                            {JSON.stringify(resData, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </main>
    );
}
