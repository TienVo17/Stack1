import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface FormData {
    hoTen: string;
    soDienThoai: string;
    diaChiNhanHang: string;
}

interface CartItem {
    sachDto: {
        giaBan: number;
        tenSach: string;
        maSach: number;
    };
    soLuong: number;
}

const DatHangNhanh: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        hoTen: "",
        soDienThoai: "",
        diaChiNhanHang: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!formData.hoTen || !formData.soDienThoai || !formData.diaChiNhanHang) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            setIsLoading(false);
            return;
        }

        try {
            const gioHang = localStorage.getItem("gioHang");
            const cartItems: CartItem[] = JSON.parse(gioHang || "[]");

            if (cartItems.length === 0) {
                toast.error("Giỏ hàng trống!");
                setIsLoading(false);
                return;
            }

            // Calculate total first
            const tongTien = cartItems.reduce(
                (total, item) => total + item.sachDto.giaBan * item.soLuong,
                0
            );

            const queryParams = new URLSearchParams({
                hoTen: formData.hoTen,
                soDienThoai: formData.soDienThoai,
                diaChiNhanHang: formData.diaChiNhanHang,
            });

            const response = await fetch(
                `http://localhost:8080/api/don-hang/them-don-hang-moi?${queryParams}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(cartItems),
                }
            );

            if (!response.ok || response.status === 204) {
                toast.error("Đặt hàng thất bại. Vui lòng thử lại.");
                setIsLoading(false);
                return;
            }

            const text = await response.text();
            const donHang = text ? JSON.parse(text) : null;

            if (donHang && donHang.maDonHang) {
                localStorage.setItem(
                    "orderData",
                    JSON.stringify({
                        formData,
                        cartItems,
                        tongTien,
                        maDonHang: donHang.maDonHang,
                    })
                );
                toast.success("Đặt hàng thành công!");
                navigate("/thanh-toan");
            } else {
                throw new Error("Invalid order data received");
            }
        } catch (error) {
            console.error("Lỗi đặt hàng:", error);
            toast.error("Có lỗi xảy ra khi đặt hàng");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="card shadow">
                        <div className="card-body p-4">
                            <h3 className="text-center mb-4">Đặt hàng nhanh</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Họ tên</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.hoTen}
                                        onChange={(e) =>
                                            setFormData({ ...formData, hoTen: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        value={formData.soDienThoai}
                                        onChange={(e) =>
                                            setFormData({ ...formData, soDienThoai: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Địa chỉ nhận hàng</label>
                                    <textarea
                                        className="form-control"
                                        value={formData.diaChiNhanHang}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                diaChiNhanHang: e.target.value,
                                            })
                                        }
                                        required
                                        rows={3}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Đang xử lý..." : "Đặt hàng"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatHangNhanh;