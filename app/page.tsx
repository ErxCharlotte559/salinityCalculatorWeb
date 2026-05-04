"use client";

import { Fragment, useMemo, useState } from "react";
import { useEffect } from "react";
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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [selectedStore, setSelectedStore] = useState<StoreCode>("ew");
    const [showStoreModal, setShowStoreModal] = useState(false);

    const [resData, setResData] = useState<ApiResult | null>(null);
    const [editableData, setEditableData] = useState<CalculationItem[]>([]);

    // const [showRawJson, setShowRawJson] = useState(false);
    const [showTopBtn, setShowTopBtn] = useState(false);

    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const outputText = useMemo(() => {
        return editableData
            .map((item) => {
                const target = getTargetSalinity(item.label);
                const saltToAdd = calculateSaltToAdd(
                    target,
                    item.salinity,
                    item.capacity,
                );
                const output = calculateIngredients(item.label, saltToAdd);

                return `${item.label}: ${output ?? "-"}`;
            })
            .join("\n");
    }, [editableData]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowTopBtn(true);
            } else {
                setShowTopBtn(false);
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function updateRawValue(
        index: number,
        key: "originalWeight" | "mixedWeight" | "meterReading",
        value: string,
    ) {
        setEditableData((prev) => {
            const copy = [...prev];

            const updated: CalculationItem = {
                ...copy[index],
                [key]: value === "" ? null : Number(value),
            };

            copy[index] = recalculateItem(updated);
            return copy;
        });
    }

    function handleFileChange(nextFile: File | null) {
        setFile(nextFile);
        setResData(null);
        setEditableData([]);
        setCopied(false);

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        if (nextFile) {
            setPreviewUrl(URL.createObjectURL(nextFile));
        } else {
            setPreviewUrl(null);
        }
    }

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
        setCopied(false);

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

    function resetEditableData() {
        setEditableData(
            (resData?.calculation ?? []).map((item) => ({
                ...item,
                capacity: getPotCapacity(selectedStore, item.label),
            })),
        );
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

    async function copyResult() {
        if (!outputText) return;

        await navigator.clipboard.writeText(outputText);
        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1500);
    }

    return (
        <main className="min-h-screen bg-gray-50 px-3 py-4">
            <div className="mx-auto w-full max-w-md space-y-5">
                <h1 className="text-center text-2xl font-bold">盐度计算</h1>

                <form onSubmit={openStoreModal} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            选择图片
                        </label>

                        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5 text-center shadow-sm active:scale-[0.99]">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                    handleFileChange(
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />

                            <div className="max-w-full break-all text-base font-semibold">
                                {file ? file.name : "点击选择盐度图片"}
                            </div>

                            <div className="mt-2 text-sm leading-6 text-gray-500">
                                支持手机拍照、截图、微信图片
                            </div>
                        </label>
                    </div>

                    {resData && (
                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                当前门店
                            </label>

                            <div className="grid grid-cols-3 gap-2">
                                {STORES.map((store) => (
                                    <button
                                        key={store.code}
                                        type="button"
                                        onClick={() => changeStore(store.code)}
                                        className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium ${
                                            selectedStore === store.code
                                                ? "border-black bg-black text-white"
                                                : "border-gray-300 bg-white text-black"
                                        }`}
                                    >
                                        {store.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {previewUrl && (
                        <div className="rounded-2xl border bg-white p-3 shadow-sm">
                            <div className="mb-2 text-sm font-semibold text-gray-700">
                                图片预览
                            </div>

                            <img
                                src={previewUrl}
                                alt="盐度图片预览"
                                className="max-h-[60vh] w-full rounded-xl object-contain"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full rounded-xl bg-black text-base font-semibold text-white disabled:opacity-50"
                    >
                        {loading ? "处理中..." : "上传"}
                    </button>
                </form>

                {showStoreModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
                        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                            <h2 className="mb-4 text-lg font-bold">
                                请选择门店
                            </h2>

                            <div className="grid gap-3">
                                {STORES.map((store) => (
                                    <button
                                        key={store.code}
                                        type="button"
                                        onClick={() =>
                                            uploadWithStore(store.code)
                                        }
                                        className="min-h-12 rounded-xl border bg-white px-4 py-3 text-left font-medium active:bg-gray-100"
                                    >
                                        {store.name}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowStoreModal(false)}
                                className="mt-4 h-11 w-full rounded-xl border text-sm font-medium"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {resData?.error && (
                    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                        {resData.error}
                    </div>
                )}

                {editableData.length > 0 && (
                    <div className="rounded-2xl border bg-white p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold">计算结果</h2>

                            <button
                                type="button"
                                onClick={resetEditableData}
                                className="shrink-0 rounded-xl border px-3 py-2 text-sm font-medium"
                            >
                                恢复识别值
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full table-fixed text-xs">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="w-[12%] border p-1">
                                            品类
                                        </th>
                                        <th className="w-[30%] border p-1">
                                            读数
                                        </th>
                                        <th className="w-[29%] border p-1">
                                            原液
                                        </th>
                                        <th className="w-[29%] border p-1">
                                            混合
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {editableData.map((item, index) => (
                                        <Fragment
                                            key={`${item.label}-${index}`}
                                        >
                                            <tr>
                                                <td className="sticky left-0 z-10 border p-1 text-center font-semibold text-sm">
                                                    {item.label}
                                                </td>

                                                <td className="border p-1 text-center font-medium">
                                                    <input
                                                        className="w-full rounded border px-1 py-1 text-center text-sm"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            item.meterReading ??
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            updateRawValue(
                                                                index,
                                                                "meterReading",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>

                                                <td className="border p-1 text-center font-medium">
                                                    <input
                                                        className="w-full rounded border px-1 py-1 text-center text-sm"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            item.originalWeight ??
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            updateRawValue(
                                                                index,
                                                                "originalWeight",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>

                                                <td className="border p-1 text-center font-medium">
                                                    <input
                                                        className="w-full rounded border px-1 py-1 text-center text-sm"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            item.mixedWeight ??
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            updateRawValue(
                                                                index,
                                                                "mixedWeight",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {editableData.length > 0 && (
                    <div className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold">添加结果</h2>

                            <button
                                type="button"
                                onClick={copyResult}
                                className="h-10 shrink-0 rounded-xl bg-black px-4 text-sm font-semibold text-white active:scale-95"
                            >
                                {copied ? "已复制" : "一键复制"}
                            </button>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-4">
                            <pre className="whitespace-pre-wrap wrap-break-word text-base font-semibold leading-8">
                                {outputText}
                            </pre>
                        </div>
                    </div>
                )}

                {/* {resData && (
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowRawJson((prev) => !prev)}
                            className="h-10 rounded-xl border px-3 text-sm font-medium"
                        >
                            {showRawJson ? "隐藏原始 JSON" : "展开原始 JSON"}
                        </button>

                        {showRawJson && (
                            <pre className="mt-3 max-h-[50vh] overflow-auto rounded-xl bg-gray-100 p-4 text-xs">
                                {JSON.stringify(resData, null, 2)}
                            </pre>
                        )}
                    </div>
                )} */}
            </div>

            {showTopBtn && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-black text-white shadow-lg active:scale-95"
                >
                    ↑
                </button>
            )}
        </main>
    );
}
